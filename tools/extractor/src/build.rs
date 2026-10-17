//! Generates the panel's static data: item catalog (with pt-BR/en names + icons) and map tiles.

use crate::pak::{PakSet, Reader};
use crate::texture;
use anyhow::{anyhow, Result};
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};
use std::path::Path;

pub fn run(client_dir: &Path, out: &Path) -> Result<()> {
    let paks = PakSet::open_dir(&client_dir.join("Icarus/Content/Paks"))?;
    let data = PakSet { paks: vec![crate::pak::Pak::open(&client_dir.join("Icarus/Content/Data/data.pak"))?] };
    let tables = load_tables(&data)?;
    let loc_pt = load_locres(&paks, "Icarus/Content/Localization/Game/pt-BR/Game.locres").unwrap_or_default();
    eprintln!("tables: {}  pt-BR strings: {}", tables.len(), loc_pt.len());

    std::fs::create_dir_all(out.join("icons"))?;
    std::fs::create_dir_all(out.join("maps"))?;

    build_items(&paks, &tables, &loc_pt, out)?;
    build_maps(&paks, &tables, &loc_pt, out)?;
    Ok(())
}

fn load_tables(data: &PakSet) -> Result<HashMap<String, Value>> {
    let mut t = HashMap::new();
    for n in data.all_names() {
        if !n.ends_with(".json") {
            continue;
        }
        let name = n.rsplit('/').next().unwrap().trim_end_matches(".json").to_string();
        let bytes = data.read(&n)?;
        let text = String::from_utf8_lossy(&bytes);
        let text = text.trim_start_matches('\u{feff}');
        match serde_json::from_str::<Value>(text) {
            Ok(v) => {
                t.insert(name, v);
            }
            Err(e) => eprintln!("warn: {n}: {e}"),
        }
    }
    Ok(t)
}

fn rows<'a>(tables: &'a HashMap<String, Value>, name: &str) -> Result<HashMap<String, &'a Value>> {
    let t = tables.get(name).ok_or_else(|| anyhow!("missing table {name}"))?;
    let mut m = HashMap::new();
    for r in t["Rows"].as_array().ok_or_else(|| anyhow!("{name} has no rows"))? {
        if let Some(n) = r["Name"].as_str() {
            m.insert(n.to_string(), r);
        }
    }
    Ok(m)
}

/// NSLOCTEXT("ns", "key", "source") -> (ns, key, source)
fn parse_nsloc(s: &str) -> Option<(String, String, String)> {
    if !s.starts_with("NSLOCTEXT(") {
        return None;
    }
    let mut parts = Vec::new();
    let mut cur = String::new();
    let mut inq = false;
    let mut esc = false;
    for c in s["NSLOCTEXT(".len()..].chars() {
        if inq {
            if esc {
                cur.push(c);
                esc = false;
            } else if c == '\\' {
                esc = true;
            } else if c == '"' {
                inq = false;
                parts.push(std::mem::take(&mut cur));
            } else {
                cur.push(c);
            }
        } else if c == '"' {
            inq = true;
        }
    }
    if parts.len() >= 3 {
        Some((parts[0].clone(), parts[1].clone(), parts[2].clone()))
    } else {
        None
    }
}

fn text(v: &Value, loc: &HashMap<String, String>) -> (String, String) {
    let s = v.as_str().unwrap_or("");
    match parse_nsloc(s) {
        Some((ns, key, src)) => {
            let pt = loc.get(&format!("{ns}\u{1}{key}")).cloned().unwrap_or_else(|| src.clone());
            (src, pt)
        }
        None => (s.to_string(), s.to_string()),
    }
}

pub fn load_locres(paks: &PakSet, path: &str) -> Result<HashMap<String, String>> {
    let b = paks.read(path)?;
    let mut r = Reader::new(&b);
    let magic = r.bytes(16)?;
    let version = if magic == [0x0E, 0x14, 0x74, 0x75, 0x67, 0x4A, 0x03, 0xFC, 0x4A, 0x15, 0x90, 0x9D, 0xC3, 0x37, 0x7F, 0x1B] {
        r.u8()?
    } else {
        r.pos = 0;
        0
    };
    let mut strings: Vec<String> = Vec::new();
    if version >= 1 {
        let off = r.i64()? as usize;
        let save = r.pos;
        r.pos = off;
        let n = r.i32()?;
        for _ in 0..n {
            strings.push(r.fstring()?);
            if version >= 2 {
                r.i32()?;
            }
        }
        r.pos = save;
    }
    if version >= 2 {
        r.u32()?; // entries count
    }
    let mut out = HashMap::new();
    let nns = r.u32()?;
    for _ in 0..nns {
        if version >= 2 {
            r.u32()?;
        }
        let ns = r.fstring()?;
        let nk = r.u32()?;
        for _ in 0..nk {
            if version >= 2 {
                r.u32()?;
            }
            let key = r.fstring()?;
            r.u32()?; // source hash
            let s = if version >= 1 {
                let i = r.i32()?;
                strings.get(i as usize).cloned().unwrap_or_default()
            } else {
                r.fstring()?
            };
            out.insert(format!("{ns}\u{1}{key}"), s);
        }
    }
    Ok(out)
}

/// "/Game/Foo/Bar.Bar" -> "Icarus/Content/Foo/Bar.uasset"
fn game_path(p: &str) -> Option<String> {
    let p = p.strip_prefix("/Game/")?;
    let p = p.split('.').next()?;
    Some(format!("Icarus/Content/{p}.uasset"))
}

fn row_ref(v: &Value) -> Option<&str> {
    v.get("RowName").and_then(|x| x.as_str()).filter(|s| !s.is_empty() && *s != "None")
}

fn build_items(paks: &PakSet, tables: &HashMap<String, Value>, loc: &HashMap<String, String>, out: &Path) -> Result<()> {
    let statics = rows(tables, "D_ItemsStatic")?;
    let itemables = rows(tables, "D_Itemable")?;
    let templates = rows(tables, "D_ItemTemplate")?;

    let mut items = Vec::new();
    let mut icons_done: HashSet<String> = HashSet::new();
    let mut icon_fail = 0;
    let mut names: Vec<&String> = templates.keys().collect();
    names.sort();
    for tname in names {
        let t = templates[tname];
        let Some(sname) = row_ref(&t["ItemStaticData"]) else { continue };
        let Some(st) = statics.get(sname) else { continue };
        let Some(iname) = row_ref(&st["Itemable"]) else { continue };
        let Some(it) = itemables.get(iname) else { continue };
        let (name_en, name_pt) = text(&it["DisplayName"], loc);
        let (desc_en, desc_pt) = text(&it["Description"], loc);

        // icon
        let mut icon = Value::Null;
        if let Some(ip) = it["Icon"].as_str().and_then(game_path) {
            let file = ip.rsplit('/').next().unwrap().trim_end_matches(".uasset").to_string() + ".png";
            if icons_done.contains(&file) {
                icon = json!(file);
            } else {
                match texture::load_texture(paks, &ip) {
                    Ok(img) => {
                        let img = texture::downscale(img, 128);
                        texture::save_png(&img, &out.join("icons").join(&file))?;
                        icons_done.insert(file.clone());
                        icon = json!(file);
                    }
                    Err(e) => {
                        icon_fail += 1;
                        if icon_fail < 3 {
                            eprintln!("icon {ip}: {e:#}");
                        }
                    }
                }
            }
        }

        // tags / traits
        let mut tags: Vec<String> = Vec::new();
        if let Some(arr) = st["Manual_Tags"]["GameplayTags"].as_array() {
            for g in arr {
                if let Some(n) = g["TagName"].as_str() {
                    tags.push(n.to_string());
                }
            }
        }
        let mut traits: Vec<String> = Vec::new();
        if let Some(obj) = st.as_object() {
            for (k, v) in obj {
                if row_ref(v).is_some() && k != "Itemable" {
                    traits.push(k.clone());
                }
            }
        }
        traits.sort();
        let category = category_for(&traits, &tags);

        items.push(json!({
            "id": tname,
            "static": sname,
            "name": name_pt,
            "name_en": name_en,
            "desc": desc_pt,
            "desc_en": desc_en,
            "icon": icon,
            "weight": it["Weight"],
            "maxStack": it["MaxStack"].as_i64().unwrap_or(1),
            "category": category,
            "traits": traits,
            "tags": tags.iter().filter(|t| t.starts_with("Item.")).collect::<Vec<_>>(),
        }));
    }
    eprintln!("items: {}  icons: {}  icon failures: {}", items.len(), icons_done.len(), icon_fail);
    if icons_done.is_empty() {
        eprintln!("aviso: nenhum ícone extraído (os paks do servidor dedicado não têm texturas; use a pasta do jogo cliente)");
    }
    std::fs::write(out.join("items.json"), serde_json::to_string(&items)?)?;
    Ok(())
}

fn category_for(traits: &[String], tags: &[String]) -> &'static str {
    let has = |t: &str| traits.iter().any(|x| x == t);
    let tag = |t: &str| tags.iter().any(|x| x == t || x.starts_with(&format!("{t}.")));
    // order matters: the first match wins
    if tag("Item.Meta") || tag("Item.Vestige") {
        "Workshop"
    } else if tag("Item.Weapon") || tag("Item.LivingWeapon") || has("FirearmData") || has("RangedWeaponData") {
        "Armas"
    } else if tag("Item.Ammo") {
        "Munição"
    } else if tag("Item.Tool") || has("ToolDamage") {
        "Ferramentas"
    } else if tag("Item.Armor") || tag("Item.Envirosuit") || tag("Item.Backpack") || has("Armour") {
        "Armaduras"
    } else if tag("Item.Attachment") || tag("Item.Upgrade") {
        "Acessórios"
    } else if tag("Item.Consumable") || tag("Item.Medicine") || has("Consumable") {
        "Consumíveis"
    } else if tag("Item.Seed") || tag("Item.Plant") || has("Farmable") {
        "Agricultura"
    } else if has("Buildable") || tag("Item.BuildingTrim") {
        "Construção"
    } else if tag("Item.Bench") || tag("Item.Machine") || has("Processing") || has("Generator") {
        "Bancadas"
    } else if tag("Item.Decoration") || tag("Item.Rug") || tag("Item.NationalFlag") {
        "Decoração"
    } else if has("Deployable") || tag("Item.Deployable") {
        "Implantáveis"
    } else if tag("Item.Resource") || has("Resource") || has("Transmutable") {
        "Recursos"
    } else {
        "Outros"
    }
}

fn build_maps(paks: &PakSet, tables: &HashMap<String, Value>, loc: &HashMap<String, String>, out: &Path) -> Result<()> {
    let world = rows(tables, "D_WorldData")?;
    let terrains = rows(tables, "D_Terrains")?;
    let mut maps = Map::new();
    let mut keys: Vec<&String> = world.keys().collect();
    keys.sort();
    for k in keys {
        let w = world[k];
        let texs = w["MinimapData"]["MapTextures"].as_array().cloned().unwrap_or_default();
        let grid = w["GridBounds"].as_array().cloned().unwrap_or_default();
        if texs.is_empty() || texs.len() != grid.len() {
            continue;
        }
        let display = terrains
            .get(k.as_str())
            .map(|t| text(&t["TerrainName"], loc).1)
            .unwrap_or_else(|| k.clone());
        let dir = out.join("maps").join(k);
        std::fs::create_dir_all(&dir)?;
        // tile bounds come from the data tables, so they are known even without textures
        let mut tiles: Vec<Value> = grid
            .iter()
            .enumerate()
            .map(|(i, g)| {
                let (o, e) = (&g["Origin"], &g["BoxExtent"]);
                let f = |v: &Value| v.as_f64().unwrap_or(0.0);
                json!({
                    "file": format!("{k}/{i}.png"),
                    "minX": f(&o["X"]) - f(&e["X"]), "maxX": f(&o["X"]) + f(&e["X"]),
                    "minY": f(&o["Y"]) - f(&e["Y"]), "maxY": f(&o["Y"]) + f(&e["Y"]),
                })
            })
            .collect();
        let (mut minx, mut maxx, mut miny, mut maxy) = (f64::MAX, f64::MIN, f64::MAX, f64::MIN);
        for t in &tiles {
            minx = minx.min(t["minX"].as_f64().unwrap());
            maxx = maxx.max(t["maxX"].as_f64().unwrap());
            miny = miny.min(t["minY"].as_f64().unwrap());
            maxy = maxy.max(t["maxY"].as_f64().unwrap());
        }
        let mut ok = true;
        for (i, t) in texs.iter().enumerate() {
            // dedicated-server paks ship without texture data
            let img = t.as_str().and_then(game_path).and_then(|p| texture::load_texture(paks, &p).ok());
            let Some(img) = img else {
                ok = false;
                break;
            };
            texture::save_png(&img, &dir.join(format!("{i}.png")))?;
        }
        if ok {
            eprintln!("map {k} ({display}): {} tiles", tiles.len());
        } else {
            eprintln!("map {k} ({display}): sem texturas (só coordenadas)");
            let _ = std::fs::remove_dir_all(&dir);
            tiles.clear();
        }
        let mm = &w["MinimapData"];
        maps.insert(
            k.clone(),
            json!({
                "name": display,
                "level": w["MainLevel"],
                "bounds": {"minX": minx, "maxX": maxx, "minY": miny, "maxY": maxy},
                "worldMin": mm["WorldBoundaryMin"], "worldMax": mm["WorldBoundaryMax"],
                "tiles": tiles,
            }),
        );
    }
    std::fs::write(out.join("maps.json"), serde_json::to_string_pretty(&Value::Object(maps))?)?;
    Ok(())
}
