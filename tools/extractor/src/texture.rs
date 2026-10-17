//! Extracts the top mip of a cooked UE4.27 Texture2D (.uasset/.uexp/.ubulk) as RGBA8.
//!
//! Instead of fully parsing tagged/unversioned properties we locate the cooked
//! platform data by its signature: FName(PF_xxx) + int64 skip offset + SizeX/SizeY/
//! PackedData + FString "PF_xxx". This works regardless of how properties were saved.

use crate::pak::{PakSet, Reader};
use anyhow::{anyhow, bail, Result};

pub struct Image {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

struct Summary {
    names: Vec<String>,
    total_header_size: i64,
    bulk_start: i64,
}

fn parse_summary(asset: &[u8]) -> Result<Summary> {
    let mut r = Reader::new(asset);
    if r.u32()? != 0x9E2A83C1 {
        bail!("not a uasset");
    }
    let legacy = r.i32()?;
    if legacy != -4 {
        r.i32()?;
    }
    let _ue4 = r.i32()?;
    let _lic = r.i32()?;
    let ncustom = r.i32()?;
    r.bytes(ncustom as usize * 20)?;
    let total_header_size = r.i32()? as i64;
    r.fstring()?; // folder
    let pkg_flags = r.u32()?;
    let name_count = r.i32()?;
    let name_offset = r.i32()?;
    if pkg_flags & 0x8000_0000 == 0 {
        r.fstring()?; // localization id (only when editor data not filtered)
    }
    r.i32()?; // gatherable count
    r.i32()?; // gatherable offset
    let _export_count = r.i32()?;
    let _export_offset = r.i32()?;
    r.i32()?; // import count
    r.i32()?; // import offset
    r.i32()?; // depends
    r.i32()?; // soft refs count
    r.i32()?; // soft refs offset
    r.i32()?; // searchable names
    r.i32()?; // thumbnail
    r.bytes(16)?; // guid
    let gens = r.i32()?;
    r.bytes(gens as usize * 8)?;
    for _ in 0..2 {
        r.bytes(2 + 2 + 2 + 4)?;
        r.fstring()?;
    }
    r.u32()?; // compression flags
    let chunks = r.i32()?;
    r.bytes(chunks as usize * 16)?;
    r.u32()?; // package source
    let addl = r.i32()?;
    for _ in 0..addl {
        r.fstring()?;
    }
    if legacy > -7 {
        r.i32()?;
    }
    r.i32()?; // asset registry offset
    let bulk_start = r.i64()?;

    let mut nr = Reader::new(asset);
    nr.pos = name_offset as usize;
    let mut names = Vec::with_capacity(name_count as usize);
    for _ in 0..name_count {
        names.push(nr.fstring()?);
        nr.bytes(4)?; // hashes
    }
    Ok(Summary { names, total_header_size, bulk_start })
}

pub fn load_texture(paks: &PakSet, asset_path: &str) -> Result<Image> {
    let (pf, data, w, h) = load_raw(paks, asset_path)?;
    decode(&pf, &data, w, h)
}

/// Returns (pixel format, top mip bytes, width, height).
pub fn load_raw(paks: &PakSet, asset_path: &str) -> Result<(String, Vec<u8>, usize, usize)> {
    let base = asset_path.trim_end_matches(".uasset");
    let asset = paks.read(&format!("{base}.uasset"))?;
    let uexp = paks.read(&format!("{base}.uexp"))?;
    let sum = parse_summary(&asset)?;

    let pf_names: Vec<(usize, &String)> =
        sum.names.iter().enumerate().filter(|(_, n)| n.starts_with("PF_")).collect();
    if pf_names.is_empty() {
        bail!("no pixel format in name map");
    }
    // find the cooked platform data
    let mut found = None;
    'outer: for (idx, pf) in &pf_names {
        let mut pat = Vec::new();
        pat.extend_from_slice(&(*idx as i32).to_le_bytes());
        pat.extend_from_slice(&0i32.to_le_bytes());
        let mut start = 0;
        while let Some(p) = find(&uexp[start..], &pat) {
            let at = start + p;
            start = at + 1;
            // FName(8) skip(8) sx(4) sy(4) packed(4) FString
            let s = at + 8 + 8 + 12;
            if s + 4 + pf.len() + 1 > uexp.len() {
                continue;
            }
            let mut r = Reader::new(&uexp);
            r.pos = s;
            if let Ok(st) = r.fstring() {
                if &st == *pf {
                    found = Some((at, (*pf).clone()));
                    break 'outer;
                }
            }
        }
    }
    let (at, pf) = found.ok_or_else(|| anyhow!("platform data not found"))?;
    let mut r = Reader::new(&uexp);
    r.pos = at + 16;
    let _sx = r.i32()?;
    let _sy = r.i32()?;
    let packed = r.u32()?;
    r.fstring()?;
    if packed & (1 << 31) != 0 {
        r.u32()?;
        r.u32()?;
    }
    let _first_mip = r.i32()?;
    let nmips = r.i32()?;
    for _ in 0..nmips {
        let _cooked = r.i32()?;
        let flags = r.u32()?;
        let (count, disk) = if flags & 0x2000 != 0 {
            (r.i64()?, r.i64()?)
        } else {
            (r.i32()? as i64, r.i32()? as i64)
        };
        let _ = count;
        let mut offset = r.i64()?;
        let data: Option<Vec<u8>> = if flags & 0x20 != 0 || disk == 0 {
            None // unused
        } else if flags & 0x40 != 0 {
            Some(r.bytes(disk as usize)?.to_vec())
        } else if flags & 0x100 != 0 {
            // separate .ubulk file
            let ub = paks.read(&format!("{base}.ubulk")).ok();
            ub.and_then(|b| {
                let o = offset as usize;
                b.get(o..o + disk as usize).map(|s| s.to_vec())
            })
        } else {
            // end of uexp (offset relative to the combined package)
            if flags & 0x10000 == 0 {
                offset += sum.bulk_start;
            }
            let o = (offset - sum.total_header_size) as usize;
            uexp.get(o..o + disk as usize).map(|s| s.to_vec())
        };
        let w = r.i32()? as usize;
        let h = r.i32()? as usize;
        let _d = r.i32()?;
        if let Some(d) = data {
            return Ok((pf, d, w, h));
        }
    }
    bail!("no mip with data")
}

fn find(h: &[u8], n: &[u8]) -> Option<usize> {
    h.windows(n.len()).position(|w| w == n)
}

fn decode(pf: &str, data: &[u8], w: usize, h: usize) -> Result<Image> {
    let mut px = vec![0u32; w * h];
    let res = match pf {
        "PF_DXT1" => texture2ddecoder::decode_bc1(data, w, h, &mut px),
        "PF_DXT3" => texture2ddecoder::decode_bc2(data, w, h, &mut px),
        "PF_DXT5" => texture2ddecoder::decode_bc3(data, w, h, &mut px),
        "PF_BC4" => texture2ddecoder::decode_bc4(data, w, h, &mut px),
        "PF_BC5" => texture2ddecoder::decode_bc5(data, w, h, &mut px),
        "PF_BC7" => texture2ddecoder::decode_bc7(data, w, h, &mut px),
        "PF_B8G8R8A8" => {
            for (i, c) in data.chunks_exact(4).take(w * h).enumerate() {
                px[i] = u32::from_le_bytes([c[0], c[1], c[2], c[3]]);
            }
            Ok(())
        }
        "PF_G8" => {
            for (i, &g) in data.iter().take(w * h).enumerate() {
                px[i] = u32::from_le_bytes([g, g, g, 255]);
            }
            Ok(())
        }
        other => bail!("unsupported pixel format {other}"),
    };
    res.map_err(|e| anyhow!("decode {pf}: {e}"))?;
    // decoder output is BGRA packed; convert to RGBA bytes
    let mut rgba = Vec::with_capacity(w * h * 4);
    for p in px {
        let [b, g, r, a] = p.to_le_bytes();
        rgba.extend_from_slice(&[r, g, b, a]);
    }
    Ok(Image { width: w as u32, height: h as u32, rgba })
}

pub fn save_png(img: &Image, path: &std::path::Path) -> Result<()> {
    let f = std::fs::File::create(path)?;
    let mut enc = png::Encoder::new(std::io::BufWriter::new(f), img.width, img.height);
    enc.set_color(png::ColorType::Rgba);
    enc.set_depth(png::BitDepth::Eight);
    enc.set_compression(png::Compression::Fast);
    enc.write_header()?.write_image_data(&img.rgba)?;
    Ok(())
}

/// Box-downscale to at most `max` px on the longest side.
pub fn downscale(img: Image, max: u32) -> Image {
    let f = (img.width.max(img.height) + max - 1) / max;
    if f <= 1 {
        return img;
    }
    let (w, h) = (img.width / f, img.height / f);
    let mut out = vec![0u8; (w * h * 4) as usize];
    for y in 0..h {
        for x in 0..w {
            let mut acc = [0u32; 4];
            for dy in 0..f {
                for dx in 0..f {
                    let i = (((y * f + dy) * img.width + x * f + dx) * 4) as usize;
                    for c in 0..4 {
                        acc[c] += img.rgba[i + c] as u32;
                    }
                }
            }
            let o = ((y * w + x) * 4) as usize;
            for c in 0..4 {
                out[o + c] = (acc[c] / (f * f)) as u8;
            }
        }
    }
    Image { width: w, height: h, rgba: out }
}

pub fn load_png(path: &std::path::Path) -> Result<Image> {
    let dec = png::Decoder::new(std::io::BufReader::new(std::fs::File::open(path)?));
    let mut rd = dec.read_info()?;
    let mut buf = vec![0; rd.output_buffer_size().unwrap_or(0)];
    let info = rd.next_frame(&mut buf)?;
    buf.truncate(info.buffer_size());
    Ok(Image { width: info.width, height: info.height, rgba: buf })
}

/// Decodes the R channel of a PF_FloatRGBA (half float) texture.
pub fn half_r(data: &[u8], w: usize, h: usize) -> Vec<f32> {
    (0..w * h).map(|i| half_to_f32(u16::from_le_bytes([data[i * 8], data[i * 8 + 1]]))).collect()
}

fn half_to_f32(h: u16) -> f32 {
    let s = if h & 0x8000 != 0 { -1.0 } else { 1.0 };
    let e = ((h >> 10) & 0x1f) as i32;
    let m = (h & 0x3ff) as f32;
    if e == 0 {
        s * m * 2f32.powi(-24)
    } else if e == 31 {
        if m == 0.0 { s * f32::INFINITY } else { f32::NAN }
    } else {
        s * (1.0 + m / 1024.0) * 2f32.powi(e - 15)
    }
}
