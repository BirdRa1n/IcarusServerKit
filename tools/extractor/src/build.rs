//! Generates the panel's static data from the game files:
//!
//! - `items.json`      item catalog (language-neutral: ids, icon, stack size, category)
//! - `creatures.json`  spawnable creatures (AI setups) with bestiary images
//! - `maps.json`       world bounds and map tiles per terrain
//! - `i18n/<lang>.json` item/creature/map names for every language shipped with the game
//! - `icons/`, `creatures/`, `maps/` images
//!
//! Dedicated-server paks contain no texture data. When an image cannot be decoded but already
//! exists in the output folder (from the downloadable data package), it is kept and referenced.

use crate::pak::{PakSet, Reader};
use crate::texture;
use anyhow::{anyhow, Result};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::path::Path;

type Tables = HashMap<String, Value>;
/// "namespace\u{1}key" -> localized string
type Locres = HashMap<String, String>;

pub fn run(game_dir: &Path, out: &Path) -> Result<()> {
    let paks = PakSet::open_dir(&game_dir.join("Icarus/Content/Paks"))?;
    let data = PakSet { paks: vec![crate::pak::Pak::open(&game_dir.join("Icarus/Content/Data/data.pak"))?] };
    let tables = load_tables(&data)?;
    let locales = load_all_locres(&paks);
    eprintln!("tables: {}  languages: {}", tables.len(), locales.keys().cloned().collect::<Vec<_>>().join(", "));

    for dir in ["icons", "creatures", "maps", "i18n"] {
        std::fs::create_dir_all(out.join(dir))?;
    }

    let mut i18n = I18n::new(&locales);
    build_items(&paks, &tables, &mut i18n, out)?;
    build_creatures(&paks, &tables, &mut i18n, out)?;
    build_maps(&paks, &tables, &mut i18n, out)?;
    i18n.write(&out.join("i18n"))?;
    Ok(())
}

// ------------------------------------------------------------------ data tables

fn load_tables(data: &PakSet) -> Result<Tables> {
    let mut t = HashMap::new();
    for n in data.all_names() {
        if !n.ends_with(".json") {
            continue;
        }
        let name = n.rsplit('/').next().unwrap().trim_end_matches(".json").to_string();
        let bytes = data.read(&n)?;
        let text = String::from_utf8_lossy(&bytes);
        match serde_json::from_str::<Value>(text.trim_start_matches('\u{feff}')) {
            Ok(v) => {
                t.insert(name, v);
            }
            Err(e) => eprintln!("warn: {n}: {e}"),
        }
    }
    Ok(t)
}

fn rows<'a>(tables: &'a Tables, name: &str) -> Result<HashMap<String, &'a Value>> {
    let t = tables.get(name).ok_or_else(|| anyhow!("missing table {name}"))?;
    let mut m = HashMap::new();
    for r in t["Rows"].as_array().ok_or_else(|| anyhow!("{name} has no rows"))? {
        if let Some(n) = r["Name"].as_str() {
            m.insert(n.to_string(), r);
        }
    }
    Ok(m)
}

fn row_ref(v: &Value) -> Option<&str> {
    v.get("RowName").and_then(|x| x.as_str()).filter(|s| !s.is_empty() && *s != "None")
}

/// "/Game/Foo/Bar.Bar" -> "Icarus/Content/Foo/Bar.uasset"
fn game_path(p: &str) -> Option<String> {
    let p = p.strip_prefix("/Game/")?;
    let p = p.split('.').next()?;
    Some(format!("Icarus/Content/{p}.uasset"))
}

// ------------------------------------------------------------------ localization

/// NSLOCTEXT("ns", "key", "source") -> (ns, key, source)
fn parse_nsloc(s: &str) -> Option<(String, String, String)> {
    let body = s.strip_prefix("NSLOCTEXT(")?;
    let mut parts = Vec::new();
    let mut cur = String::new();
    let (mut inq, mut esc) = (false, false);
    for c in body.chars() {
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
    (parts.len() >= 3).then(|| (parts[0].clone(), parts[1].clone(), parts[2].clone()))
}

fn load_all_locres(paks: &PakSet) -> BTreeMap<String, Locres> {
    let mut out = BTreeMap::new();
    for name in paks.all_names() {
        let Some(rest) = name.strip_prefix("Icarus/Content/Localization/Game/") else { continue };
        let Some(lang) = rest.strip_suffix("/Game.locres") else { continue };
        match load_locres(paks, &name) {
            Ok(l) => {
                out.insert(lang.to_string(), l);
            }
            Err(e) => eprintln!("warn: {name}: {e:#}"),
        }
    }
    out
}

pub fn load_locres(paks: &PakSet, path: &str) -> Result<Locres> {
    const MAGIC: [u8; 16] = [0x0E, 0x14, 0x74, 0x75, 0x67, 0x4A, 0x03, 0xFC, 0x4A, 0x15, 0x90, 0x9D, 0xC3, 0x37, 0x7F, 0x1B];
    let b = paks.read(path)?;
    let mut r = Reader::new(&b);
    let version = if r.bytes(16)? == MAGIC {
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
        for _ in 0..r.i32()? {
            strings.push(r.fstring()?);
            if version >= 2 {
                r.i32()?; // ref count
            }
        }
        r.pos = save;
    }
    if version >= 2 {
        r.u32()?; // entries count
    }
    let mut out = HashMap::new();
    for _ in 0..r.u32()? {
        if version >= 2 {
            r.u32()?;
        }
        let ns = r.fstring()?;
        for _ in 0..r.u32()? {
            if version >= 2 {
                r.u32()?;
            }
            let key = r.fstring()?;
            r.u32()?; // source hash
            let s = if version >= 1 {
                strings.get(r.i32()? as usize).cloned().unwrap_or_default()
            } else {
                r.fstring()?
            };
            out.insert(format!("{ns}\u{1}{key}"), s);
        }
    }
    Ok(out)
}

/// Collects localized strings per language and writes one file per language.
struct I18n<'a> {
    locales: &'a BTreeMap<String, Locres>,
    /// lang -> section -> id -> value
    out: BTreeMap<String, BTreeMap<&'static str, Map<String, Value>>>,
}

impl<'a> I18n<'a> {
    fn new(locales: &'a BTreeMap<String, Locres>) -> Self {
        let mut out = BTreeMap::new();
        out.insert("en".to_string(), BTreeMap::new());
        for l in locales.keys() {
            out.insert(l.clone(), BTreeMap::new());
        }
        Self { locales, out }
    }

    /// Source (English) text of a localized field.
    fn source(v: &Value) -> String {
        let s = v.as_str().unwrap_or("");
        parse_nsloc(s).map(|(_, _, src)| src).unwrap_or_else(|| s.to_string())
    }

    /// Localized value of `v` for every language (falls back to the English source).
    fn all(&self, v: &Value) -> BTreeMap<String, String> {
        let s = v.as_str().unwrap_or("");
        let parsed = parse_nsloc(s);
        self.out
            .keys()
            .map(|lang| {
                let text = match &parsed {
                    Some((ns, key, src)) => self
                        .locales
                        .get(lang)
                        .and_then(|l| l.get(&format!("{ns}\u{1}{key}")))
                        .filter(|t| !t.is_empty())
                        .cloned()
                        .unwrap_or_else(|| src.clone()),
                    None => s.to_string(),
                };
                (lang.clone(), text)
            })
            .collect()
    }

    fn set(&mut self, section: &'static str, id: &str, fields: &[&Value]) {
        let per_field: Vec<BTreeMap<String, String>> = fields.iter().map(|f| self.all(f)).collect();
        for (lang, sections) in self.out.iter_mut() {
            let values: Vec<String> = per_field.iter().map(|m| m.get(lang).cloned().unwrap_or_default()).collect();
            let v = if values.len() == 1 { json!(values[0]) } else { json!(values) };
            sections.entry(section).or_default().insert(id.to_string(), v);
        }
    }

    fn write(&self, dir: &Path) -> Result<()> {
        for (lang, sections) in &self.out {
            let obj: Map<String, Value> = sections.iter().map(|(k, v)| (k.to_string(), Value::Object(v.clone()))).collect();
            std::fs::write(dir.join(format!("{lang}.json")), serde_json::to_string(&Value::Object(obj))?)?;
        }
        eprintln!("i18n: {} languages", self.out.len());
        Ok(())
    }
}

// ------------------------------------------------------------------ images

/// Decodes `asset` into `<out>/<folder>/<file>`; keeps an existing file when the paks have no texture data.
fn export_image(paks: &PakSet, asset: &str, out: &Path, folder: &str, max: u32, done: &mut HashSet<String>) -> Option<String> {
    let file = asset.rsplit('/').next()?.trim_end_matches(".uasset").to_string() + ".png";
    if done.contains(&file) {
        return Some(file);
    }
    let target = out.join(folder).join(&file);
    match texture::load_texture(paks, asset) {
        Ok(img) => texture::save_png(&texture::downscale(img, max), &target).ok()?,
        Err(_) if target.exists() => {}
        Err(_) => return None,
    }
    done.insert(file.clone());
    Some(file)
}

// ------------------------------------------------------------------ items

fn build_items(paks: &PakSet, tables: &Tables, i18n: &mut I18n, out: &Path) -> Result<()> {
    let statics = rows(tables, "D_ItemsStatic")?;
    let itemables = rows(tables, "D_Itemable")?;
    let templates = rows(tables, "D_ItemTemplate")?;

    let mut items = Vec::new();
    let mut icons: HashSet<String> = HashSet::new();
    let mut names: Vec<&String> = templates.keys().collect();
    names.sort();
    for id in names {
        let Some(static_row) = row_ref(&templates[id]["ItemStaticData"]) else { continue };
        let Some(st) = statics.get(static_row) else { continue };
        let Some(it) = row_ref(&st["Itemable"]).and_then(|n| itemables.get(n)) else { continue };

        let icon = it["Icon"].as_str().and_then(game_path).and_then(|p| export_image(paks, &p, out, "icons", 128, &mut icons));
        let tags: Vec<String> = st["Manual_Tags"]["GameplayTags"]
            .as_array()
            .map(|a| a.iter().filter_map(|g| g["TagName"].as_str().map(String::from)).collect())
            .unwrap_or_default();
        let mut traits: Vec<String> = st
            .as_object()
            .map(|o| o.iter().filter(|(k, v)| row_ref(v).is_some() && *k != "Itemable").map(|(k, _)| k.clone()).collect())
            .unwrap_or_default();
        traits.sort();

        i18n.set("items", id, &[&it["DisplayName"], &it["Description"]]);
        items.push(json!({
            "id": id,
            "static": static_row,
            "name": I18n::source(&it["DisplayName"]),
            "icon": icon,
            "weight": it["Weight"],
            "maxStack": it["MaxStack"].as_i64().unwrap_or(1),
            "category": category_for(&traits, &tags),
            "tags": tags.iter().filter(|t| t.starts_with("Item.")).collect::<Vec<_>>(),
        }));
    }
    eprintln!("items: {}  icons: {}", items.len(), icons.len());
    if icons.is_empty() {
        eprintln!("warning: no icons extracted (dedicated-server paks have no textures; use the game client folder)");
    }
    std::fs::write(out.join("items.json"), serde_json::to_string(&items)?)?;
    Ok(())
}

/// Language-neutral category key (translated by the panel). The first match wins.
fn category_for(traits: &[String], tags: &[String]) -> &'static str {
    let has = |t: &str| traits.iter().any(|x| x == t);
    let tag = |t: &str| tags.iter().any(|x| x == t || x.starts_with(&format!("{t}.")));
    if tag("Item.Meta") || tag("Item.Vestige") {
        "workshop"
    } else if tag("Item.Weapon") || tag("Item.LivingWeapon") || has("FirearmData") || has("RangedWeaponData") {
        "weapons"
    } else if tag("Item.Ammo") {
        "ammo"
    } else if tag("Item.Tool") || has("ToolDamage") {
        "tools"
    } else if tag("Item.Armor") || tag("Item.Envirosuit") || tag("Item.Backpack") || has("Armour") {
        "armor"
    } else if tag("Item.Attachment") || tag("Item.Upgrade") {
        "attachments"
    } else if tag("Item.Consumable") || tag("Item.Medicine") || has("Consumable") {
        "consumables"
    } else if tag("Item.Seed") || tag("Item.Plant") || has("Farmable") {
        "farming"
    } else if has("Buildable") || tag("Item.BuildingTrim") {
        "building"
    } else if tag("Item.Bench") || tag("Item.Machine") || has("Processing") || has("Generator") {
        "benches"
    } else if tag("Item.Decoration") || tag("Item.Rug") || tag("Item.NationalFlag") {
        "decoration"
    } else if has("Deployable") || tag("Item.Deployable") {
        "deployables"
    } else if tag("Item.Resource") || has("Resource") || has("Transmutable") {
        "resources"
    } else {
        "other"
    }
}

// ------------------------------------------------------------------ creatures

fn build_creatures(paks: &PakSet, tables: &Tables, i18n: &mut I18n, out: &Path) -> Result<()> {
    let setups = rows(tables, "D_AISetup")?;
    let types = rows(tables, "D_AICreatureType")?;
    let bestiary = rows(tables, "D_BestiaryData").unwrap_or_default();

    let mut list = Vec::new();
    let mut images: HashSet<String> = HashSet::new();
    let mut ids: Vec<&String> = setups.keys().collect();
    ids.sort();
    for id in ids {
        let s = setups[id];
        if id == "Invalid" || s["ActorClass"].as_str().map_or(true, |c| c.is_empty() || c == "None") {
            continue;
        }
        let Some(ctype) = row_ref(&s["CreatureType"]).and_then(|t| types.get(t).map(|r| (t, r))) else { continue };
        let descriptors: Vec<String> = s["Descriptors"]
            .as_array()
            .map(|a| a.iter().filter_map(|d| row_ref(d).map(String::from)).collect())
            .unwrap_or_default();
        let best = row_ref(&s["BestiaryGroup"]).and_then(|b| bestiary.get(b));
        let image = best
            .and_then(|b| b["Image"].as_str())
            .and_then(game_path)
            .and_then(|p| export_image(paks, &p, out, "creatures", 160, &mut images));
        let lower = id.to_lowercase();
        let tag = if lower.contains("boss") {
            "boss"
        } else if lower.starts_with("quest_") || lower.starts_with("tamed_") || lower.starts_with("mount_") {
            "special"
        } else if descriptors.iter().any(|d| d.contains("Hostile") || d.contains("Predator") || d.contains("Carnivore")) {
            "hostile"
        } else {
            "passive"
        };

        i18n.set("creatures", id, &[&ctype.1["CreatureName"]]);
        list.push(json!({
            "id": id,
            "type": ctype.0,
            "name": I18n::source(&ctype.1["CreatureName"]),
            "image": image,
            "tag": tag,
            "descriptors": descriptors,
        }));
    }
    eprintln!("creatures: {}  images: {}", list.len(), images.len());
    std::fs::write(out.join("creatures.json"), serde_json::to_string(&list)?)?;
    Ok(())
}

// ------------------------------------------------------------------ maps

fn build_maps(paks: &PakSet, tables: &Tables, i18n: &mut I18n, out: &Path) -> Result<()> {
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
        let name_field = terrains.get(k.as_str()).map(|t| t["TerrainName"].clone()).unwrap_or_else(|| json!(k));
        let display = I18n::source(&name_field);
        if display.starts_with("INVTEXT") || display.contains("[DNT]") {
            continue; // unreleased / internal maps
        }
        i18n.set("maps", k, &[&name_field]);

        let dir = out.join("maps").join(k);
        std::fs::create_dir_all(&dir)?;
        // tile bounds come from the data tables, so they are known even without textures
        let f = |v: &Value| v.as_f64().unwrap_or(0.0);
        let mut tiles: Vec<Value> = grid
            .iter()
            .enumerate()
            .map(|(i, g)| {
                let (o, e) = (&g["Origin"], &g["BoxExtent"]);
                json!({
                    "file": format!("{k}/{i}.jpg"),
                    "minX": f(&o["X"]) - f(&e["X"]), "maxX": f(&o["X"]) + f(&e["X"]),
                    "minY": f(&o["Y"]) - f(&e["Y"]), "maxY": f(&o["Y"]) + f(&e["Y"]),
                })
            })
            .collect();
        let bound = |key: &str, pick: fn(f64, f64) -> f64, init: f64| tiles.iter().fold(init, |a, t| pick(a, t[key].as_f64().unwrap()));
        let bounds = json!({
            "minX": bound("minX", f64::min, f64::MAX), "maxX": bound("maxX", f64::max, f64::MIN),
            "minY": bound("minY", f64::min, f64::MAX), "maxY": bound("maxY", f64::max, f64::MIN),
        });

        let mut complete = true;
        for (i, t) in texs.iter().enumerate() {
            let target = dir.join(format!("{i}.jpg"));
            match t.as_str().and_then(game_path).and_then(|p| texture::load_texture(paks, &p).ok()) {
                Some(img) => texture::save_jpeg(&img, &target, 85)?,
                None if target.exists() => {} // tile from the data package
                None => {
                    complete = false;
                    break;
                }
            }
        }
        if complete {
            eprintln!("map {k} ({display}): {} tiles", tiles.len());
        } else {
            eprintln!("map {k} ({display}): no textures (coordinates only)");
            tiles.clear();
        }
        let mm = &w["MinimapData"];
        maps.insert(
            k.clone(),
            json!({
                "name": display,
                "level": w["MainLevel"],
                "bounds": bounds,
                "worldMin": mm["WorldBoundaryMin"], "worldMax": mm["WorldBoundaryMax"],
                "tiles": tiles,
            }),
        );
    }
    std::fs::write(out.join("maps.json"), serde_json::to_string(&Value::Object(maps))?)?;
    Ok(())
}
