mod build;
mod pak;
mod texture;

use anyhow::Result;
use std::path::Path;

fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(|s| s.as_str()) {
        Some("list") => {
            let set = open_any(&args[2])?;
            for n in set.all_names() {
                println!("{n}");
            }
        }
        Some("dump") => {
            // dump <pak|dir> <substring> <outdir>
            let set = open_any(&args[2])?;
            let out = Path::new(&args[4]);
            for n in set.all_names().into_iter().filter(|n| n.contains(&args[3])) {
                let data = set.read(&n)?;
                let p = out.join(safe_rel(&n));
                std::fs::create_dir_all(p.parent().unwrap())?;
                std::fs::write(&p, data)?;
                println!("{n}");
            }
        }
        Some("build") => {
            // build <ICARUS client dir> <out dir>
            build::run(Path::new(&args[2]), Path::new(&args[3]))?;
        }
        Some("stitch") => {
            // stitch <data dir> <map id> <mode 0-7> <out.png>  (debug: orientation check)
            let dir = Path::new(&args[2]);
            let maps: serde_json::Value = serde_json::from_slice(&std::fs::read(dir.join("maps.json"))?)?;
            let m = &maps[&args[3]];
            let mode: u32 = args[4].parse()?;
            let b = &m["bounds"];
            let (minx, maxx, maxy) = (b["minX"].as_f64().unwrap(), b["maxX"].as_f64().unwrap(), b["maxY"].as_f64().unwrap());
            let tiles = m["tiles"].as_array().unwrap();
            let n = ((tiles.len() as f64).sqrt()) as u32;
            let ts = 64u32;
            let mut out = texture::Image { width: n * ts, height: n * ts, rgba: vec![0; (n * ts * n * ts * 4) as usize] };
            for t in tiles {
                let img = texture::downscale(texture::load_png(&dir.join("maps").join(t["file"].as_str().unwrap()))?, ts);
                let cx = ((t["minX"].as_f64().unwrap() - minx) / (maxx - minx) * n as f64).round() as u32;
                let cy = ((maxy - t["maxY"].as_f64().unwrap()) / (maxx - minx) * n as f64).round() as u32;
                let (gx, gy) = match mode & 3 { 0 => (cx, cy), 1 => (n - 1 - cy, n - 1 - cx), 2 => (cy, n - 1 - cx), _ => (n - 1 - cy, cx) };
                for y in 0..ts {
                    for x in 0..ts {
                        // mode bit 2: transpose the tile itself
                        let (sx, sy) = if mode & 4 != 0 { (y, x) } else { (x, y) };
                        let si = ((sy * img.width + sx) * 4) as usize;
                        let di = (((gy * ts + y) * out.width + gx * ts + x) * 4) as usize;
                        out.rgba[di..di + 4].copy_from_slice(&img.rgba[si..si + 4]);
                    }
                }
            }
            texture::save_png(&out, Path::new(&args[5]))?;
        }
        Some("hstat") => {
            let set = open_any(&args[2])?;
            let (pf, d, w, h) = texture::load_raw(&set, &args[3])?;
            let v = texture::half_r(&d, w, h);
            let (mn, mx) = v.iter().fold((f32::MAX, f32::MIN), |a, &x| (a.0.min(x), a.1.max(x)));
            let g: Vec<f32> = (0..d.len() / 8).take(4).flat_map(|i| (0..4).map(move |c| (i, c))).map(|(i, c)| texture::half_r(&d[i * 8 + c * 2..], 1, 1)[0]).collect();
            println!("{pf} {w}x{h} R min {mn} max {mx} first px rgba {:?}", g);
        }
        Some("tex") => {
            // tex <dir> <asset path> <out.png>
            let set = open_any(&args[2])?;
            let img = texture::load_texture(&set, &args[3])?;
            println!("{}x{}", img.width, img.height);
            texture::save_png(&img, Path::new(&args[4]))?;
        }
        _ => {
            eprintln!("usage: extractor build <icarus client dir> <outdir> | list <pak|dir> | dump <pak|dir> <filter> <outdir>");
        }
    }
    Ok(())
}

/// Turns a pak path (which may carry a build-machine drive letter, e.g. "C:/BA/...")
/// into a relative path that can never escape the output directory.
pub fn safe_rel(name: &str) -> std::path::PathBuf {
    name.split(['/', '\\'])
        .filter(|c| !c.is_empty() && *c != "." && *c != ".." && !c.ends_with(':'))
        .collect()
}

fn open_any(p: &str) -> Result<pak::PakSet> {
    let p = Path::new(p);
    if p.is_dir() {
        pak::PakSet::open_dir(p)
    } else {
        Ok(pak::PakSet { paks: vec![pak::Pak::open(p)?] })
    }
}
