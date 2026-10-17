//! Minimal reader for UE4 .pak files (version 11 / "Fnv64BugFix"), as shipped by Icarus.
//! Supports Zlib and Oodle compressed entries. Encrypted paks are not supported.

use anyhow::{anyhow, bail, Context, Result};
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const PAK_MAGIC: u32 = 0x5A6F12E1;

pub struct Reader<'a> {
    pub buf: &'a [u8],
    pub pos: usize,
}

impl<'a> Reader<'a> {
    pub fn new(buf: &'a [u8]) -> Self {
        Self { buf, pos: 0 }
    }
    pub fn bytes(&mut self, n: usize) -> Result<&'a [u8]> {
        if self.pos + n > self.buf.len() {
            bail!("read past end ({} + {} > {})", self.pos, n, self.buf.len());
        }
        let s = &self.buf[self.pos..self.pos + n];
        self.pos += n;
        Ok(s)
    }
    pub fn u8(&mut self) -> Result<u8> {
        Ok(self.bytes(1)?[0])
    }
    pub fn u32(&mut self) -> Result<u32> {
        Ok(u32::from_le_bytes(self.bytes(4)?.try_into()?))
    }
    pub fn i32(&mut self) -> Result<i32> {
        Ok(i32::from_le_bytes(self.bytes(4)?.try_into()?))
    }
    pub fn u64(&mut self) -> Result<u64> {
        Ok(u64::from_le_bytes(self.bytes(8)?.try_into()?))
    }
    pub fn i64(&mut self) -> Result<i64> {
        Ok(i64::from_le_bytes(self.bytes(8)?.try_into()?))
    }
    pub fn f32(&mut self) -> Result<f32> {
        Ok(f32::from_le_bytes(self.bytes(4)?.try_into()?))
    }
    /// UE FString: int32 length (negative = UTF-16), includes null terminator.
    pub fn fstring(&mut self) -> Result<String> {
        let len = self.i32()?;
        if len == 0 {
            return Ok(String::new());
        }
        if len > 0 {
            let b = self.bytes(len as usize)?;
            Ok(String::from_utf8_lossy(&b[..b.len() - 1]).into_owned())
        } else {
            let n = (-len) as usize;
            let b = self.bytes(n * 2)?;
            let w: Vec<u16> = b.chunks(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
            Ok(String::from_utf16_lossy(&w[..n - 1]))
        }
    }
}

#[derive(Clone, Debug)]
pub struct Entry {
    pub offset: u64,
    pub size: u64,
    pub uncompressed: u64,
    pub method: u32, // 0 = none, else index into compression names (1-based)
    pub blocks: Vec<(u64, u64)>,
    pub block_size: u32,
    pub encrypted: bool,
}

pub struct Pak {
    pub path: PathBuf,
    file: Mutex<File>,
    pub mount: String,
    pub methods: Vec<String>,
    pub entries: HashMap<String, Entry>,
}

impl Pak {
    pub fn open(path: &Path) -> Result<Pak> {
        let mut f = File::open(path).with_context(|| format!("open {}", path.display()))?;
        let len = f.metadata()?.len();
        // v8+ footer: guid(16) encIdx(1) magic(4) ver(4) off(8) size(8) hash(20) names(5*32)
        let footer_len = 16 + 1 + 4 + 4 + 8 + 8 + 20 + 5 * 32;
        f.seek(SeekFrom::Start(len - footer_len))?;
        let mut foot = vec![0u8; footer_len as usize];
        f.read_exact(&mut foot)?;
        let mut r = Reader::new(&foot);
        r.bytes(16)?;
        let enc_index = r.u8()? != 0;
        let magic = r.u32()?;
        let version = r.u32()?;
        let index_off = r.u64()?;
        let index_size = r.u64()?;
        r.bytes(20)?;
        if magic != PAK_MAGIC {
            bail!("{}: bad pak magic", path.display());
        }
        if version < 10 {
            bail!("{}: unsupported pak version {}", path.display(), version);
        }
        if enc_index {
            bail!("{}: encrypted pak index not supported", path.display());
        }
        let mut methods = Vec::new();
        for _ in 0..5 {
            let n = r.bytes(32)?;
            let s = String::from_utf8_lossy(n).trim_end_matches('\0').to_string();
            if !s.is_empty() {
                methods.push(s);
            }
        }

        f.seek(SeekFrom::Start(index_off))?;
        let mut index = vec![0u8; index_size as usize];
        f.read_exact(&mut index)?;
        let mut r = Reader::new(&index);
        let mount = r.fstring()?;
        let _num_entries = r.i32()?;
        let _seed = r.u64()?;
        if r.u32()? != 0 {
            r.bytes(8 + 8 + 20)?; // path hash index (unused)
        }
        let (fdi_off, fdi_size) = if r.u32()? != 0 {
            let o = r.u64()?;
            let s = r.u64()?;
            r.bytes(20)?;
            (o, s)
        } else {
            bail!("{}: pak has no full directory index", path.display());
        };
        let enc_size = r.u32()? as usize;
        let encoded = r.bytes(enc_size)?.to_vec();
        let num_files = r.u32()? as usize;
        let mut plain = Vec::with_capacity(num_files);
        for _ in 0..num_files {
            plain.push(read_entry(&mut r)?);
        }

        f.seek(SeekFrom::Start(fdi_off))?;
        let mut fdi = vec![0u8; fdi_size as usize];
        f.read_exact(&mut fdi)?;
        let mut r = Reader::new(&fdi);
        let mut entries = HashMap::new();
        let ndirs = r.u32()?;
        let mount_clean = mount.trim_start_matches("../../../").to_string();
        for _ in 0..ndirs {
            let dir = r.fstring()?;
            let nfiles = r.u32()?;
            for _ in 0..nfiles {
                let name = r.fstring()?;
                let loc = r.i32()?;
                let e = if loc >= 0 {
                    decode_entry(&encoded, loc as usize)?
                } else {
                    plain[(-loc - 1) as usize].clone()
                };
                let full = format!("{}{}{}", mount_clean, dir.trim_start_matches('/'), name);
                entries.insert(full, e);
            }
        }
        Ok(Pak { path: path.to_path_buf(), file: Mutex::new(f), mount, methods, entries })
    }

    pub fn read(&self, name: &str) -> Result<Vec<u8>> {
        let e = self.entries.get(name).ok_or_else(|| anyhow!("not found: {name}"))?;
        if e.encrypted {
            bail!("encrypted entry {name}");
        }
        let mut f = self.file.lock().unwrap();
        if e.method == 0 {
            let hdr = entry_header_size(e);
            f.seek(SeekFrom::Start(e.offset + hdr))?;
            let mut out = vec![0u8; e.size as usize];
            f.read_exact(&mut out)?;
            return Ok(out);
        }
        let method = self
            .methods
            .get(e.method as usize - 1)
            .ok_or_else(|| anyhow!("bad compression method index"))?
            .to_lowercase();
        let mut out = Vec::with_capacity(e.uncompressed as usize);
        for (i, &(s, end)) in e.blocks.iter().enumerate() {
            f.seek(SeekFrom::Start(e.offset + s))?;
            let mut cbuf = vec![0u8; (end - s) as usize];
            f.read_exact(&mut cbuf)?;
            let remaining = e.uncompressed as usize - out.len();
            let want = remaining.min(e.block_size as usize);
            let _ = i;
            match method.as_str() {
                "zlib" => {
                    let mut d = flate2::read::ZlibDecoder::new(&cbuf[..]);
                    let mut tmp = Vec::with_capacity(want);
                    d.read_to_end(&mut tmp)?;
                    out.extend_from_slice(&tmp);
                }
                "oodle" => {
                    let mut tmp = vec![0u8; want];
                    let n = oozextract::Extractor::new()
                        .read_from_slice(&cbuf, &mut tmp)
                        .map_err(|e| anyhow!("oodle: {e:?}"))?;
                    tmp.truncate(n);
                    out.extend_from_slice(&tmp);
                }
                m => bail!("unsupported compression {m}"),
            }
        }
        Ok(out)
    }
}

fn entry_header_size(e: &Entry) -> u64 {
    // offset, size, usize (8 each) + method (4) + hash (20) + [blocks] + flags(1) + blocksize(4)
    let mut s = 8 + 8 + 8 + 4 + 20 + 1 + 4;
    if e.method != 0 {
        s += 4 + 16 * e.blocks.len() as u64;
    }
    s
}

fn read_entry(r: &mut Reader) -> Result<Entry> {
    let offset = r.u64()?;
    let size = r.u64()?;
    let uncompressed = r.u64()?;
    let method = r.u32()?;
    r.bytes(20)?;
    let mut blocks = Vec::new();
    if method != 0 {
        let n = r.u32()?;
        for _ in 0..n {
            blocks.push((r.u64()?, r.u64()?));
        }
    }
    let encrypted = r.u8()? != 0;
    let block_size = r.u32()?;
    Ok(Entry { offset, size, uncompressed, method, blocks, block_size, encrypted })
}

fn decode_entry(buf: &[u8], at: usize) -> Result<Entry> {
    let mut r = Reader::new(buf);
    r.pos = at;
    let v = r.u32()?;
    let block_size = if v & 0x3f == 0x3f { r.u32()? } else { (v & 0x3f) << 11 };
    let nblocks = (v >> 6) & 0xffff;
    let encrypted = (v >> 22) & 1 != 0;
    let method = (v >> 23) & 0x3f;
    let offset = if v & (1 << 31) != 0 { r.u32()? as u64 } else { r.u64()? };
    let uncompressed = if v & (1 << 30) != 0 { r.u32()? as u64 } else { r.u64()? };
    let size = if method != 0 {
        if v & (1 << 29) != 0 { r.u32()? as u64 } else { r.u64()? }
    } else {
        uncompressed
    };
    let mut e = Entry { offset, size, uncompressed, method, blocks: Vec::new(), block_size, encrypted };
    if nblocks > 0 {
        // header size depends on block count, so fill placeholders first
        e.blocks = vec![(0, 0); nblocks as usize];
        let hdr = entry_header_size(&e);
        if nblocks == 1 && !encrypted {
            e.blocks[0] = (hdr, hdr + size);
        } else {
            let mut cur = hdr;
            for b in e.blocks.iter_mut() {
                let bs = r.u32()? as u64;
                let aligned = if encrypted { (bs + 15) & !15 } else { bs };
                *b = (cur, cur + bs);
                cur += aligned;
            }
        }
    }
    Ok(e)
}

/// A set of paks searched in order (later patch paks would override earlier).
pub struct PakSet {
    pub paks: Vec<Pak>,
}

impl PakSet {
    pub fn open_dir(dir: &Path) -> Result<PakSet> {
        let mut files: Vec<PathBuf> = std::fs::read_dir(dir)?
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().map(|x| x == "pak").unwrap_or(false))
            .collect();
        files.sort();
        let mut paks = Vec::new();
        for p in files {
            match Pak::open(&p) {
                Ok(pk) => paks.push(pk),
                Err(e) => eprintln!("warn: skipping {}: {e:#}", p.display()),
            }
        }
        Ok(PakSet { paks })
    }
    pub fn find(&self, name: &str) -> Option<&Pak> {
        self.paks.iter().rev().find(|p| p.entries.contains_key(name))
    }
    pub fn read(&self, name: &str) -> Result<Vec<u8>> {
        self.find(name).ok_or_else(|| anyhow!("not found: {name}"))?.read(name)
    }
    pub fn exists(&self, name: &str) -> bool {
        self.find(name).is_some()
    }
    pub fn all_names(&self) -> Vec<String> {
        let mut v: Vec<String> = self.paks.iter().flat_map(|p| p.entries.keys().cloned()).collect();
        v.sort();
        v.dedup();
        v
    }
}
