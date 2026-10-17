// Icarus Server Kit - web panel backend.
// Zero dependencies (Node 18+). Talks to the UE4SS Lua mod through files in the IPC folder:
//   <ipc>/state.json          written by the mod every tick (players, world...)
//   <ipc>/commands.jsonl      appended here, one command per line (mod reads from its last offset)
//   <ipc>/results.jsonl       appended by the mod, one result per line; tailed here
//   <ipc>/events.jsonl        appended by the mod (chat, logs); tailed here
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const CONFIG_PATH = process.env.ISK_CONFIG ? path.resolve(process.env.ISK_CONFIG) : path.join(ROOT, 'config.json');
// The mod folder inside the dedicated server. The panel is normally installed at
// <server>\IcarusServerKit\panel; a kit placed next to the server folder is also supported.
function defaultIpcDir() {
  const sub = ['Icarus', 'Binaries', 'Win64', 'ue4ss', 'Mods', 'IcarusServerKit', 'ipc'];
  const candidates = [path.resolve(ROOT, '..', '..'), path.resolve(ROOT, '..', '..', 'ICARUS Dedicated Server')];
  for (const c of candidates) if (fs.existsSync(path.join(c, 'Icarus', 'Binaries', 'Win64'))) return path.join(c, ...sub);
  return path.join(candidates[0], ...sub);
}

const DEFAULT_CONFIG = {
  port: 8090,
  host: '0.0.0.0',
  // Default IPC location: the mod folder inside the dedicated server installation.
  ipcDir: defaultIpcDir(),
  users: [],
  commandTimeoutMs: 15000,
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const password = crypto.randomBytes(9).toString('base64url');
    const fresh = { ...DEFAULT_CONFIG, users: [{ name: 'admin', password, role: 'admin' }] };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(fresh, null, 2));
    console.log(`[panel] config.json criado em ${CONFIG_PATH}`);
    console.log(`[panel] usuário: admin   senha: ${password}   (altere em config.json)`);
  }
  // editors and Windows PowerShell 5.1 may save the file with a UTF-8 BOM, which JSON.parse rejects
  const text = fs.readFileSync(CONFIG_PATH, 'utf8').replace(/^﻿/, '');
  let user;
  try {
    user = JSON.parse(text);
  } catch (e) {
    console.error(`[panel] config.json inválido (${CONFIG_PATH}): ${e.message}`);
    process.exit(1);
  }
  const cfg = { ...DEFAULT_CONFIG, ...user };
  cfg.ipcDir = path.resolve(ROOT, cfg.ipcDir);
  return cfg;
}

const cfg = loadConfig();
fs.mkdirSync(cfg.ipcDir, { recursive: true });
const ipc = (f) => path.join(cfg.ipcDir, f);

// ---------------------------------------------------------------- auth
const sessions = new Map(); // token -> {name, role, expires}
const SESSION_MS = 12 * 3600 * 1000;

function checkLogin(name, password) {
  const u = cfg.users.find((x) => x.name === name);
  if (!u) return null;
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(u.password));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return u;
}

function getSession(req) {
  const m = /(?:^|;\s*)isk=([a-f0-9]+)/.exec(req.headers.cookie || '');
  const s = m && sessions.get(m[1]);
  if (!s || s.expires < Date.now()) return null;
  return s;
}

// ---------------------------------------------------------------- mod state
let state = { online: false, players: [], updatedAt: 0 };
let stateMtime = 0;
const sseClients = new Set();
const pending = new Map(); // id -> {resolve, timer}
const eventLog = []; // recent events (chat, joins, command results)
const MAX_EVENTS = 300;

function broadcast(type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of sseClients) c.write(msg);
}

function pushEvent(ev) {
  ev.t = ev.t || Date.now();
  eventLog.push(ev);
  if (eventLog.length > MAX_EVENTS) eventLog.shift();
  broadcast('log', ev);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function pollState() {
  const f = ipc('state.json');
  let st;
  try {
    st = fs.statSync(f);
  } catch {
    st = null;
  }
  const now = Date.now();
  if (st && st.mtimeMs !== stateMtime) {
    stateMtime = st.mtimeMs;
    const s = readJson(f);
    if (s) {
      const prev = new Map((state.players || []).map((p) => [p.id, p]));
      state = { ...s, online: true, updatedAt: now };
      for (const p of state.players || []) {
        if (!prev.has(p.id)) pushEvent({ kind: 'join', text: `${p.name} entrou no servidor`, player: p.name });
        prev.delete(p.id);
      }
      for (const p of prev.values()) pushEvent({ kind: 'leave', text: `${p.name} saiu do servidor`, player: p.name });
      broadcast('state', state);
    }
  }
  // mod considered offline if no update for 10s
  if (state.online && st && now - st.mtimeMs > 10000) {
    state = { ...state, online: false, players: [] };
    broadcast('state', state);
    pushEvent({ kind: 'system', text: 'Mod do servidor parou de responder' });
  }
}

// Tails an append-only JSONL file, calling onLine for every complete new line.
function makeTailer(file, onLine) {
  let offset = 0;
  try {
    offset = fs.statSync(file).size; // skip what was written before the panel started
  } catch {}
  return () => {
    let st;
    try {
      st = fs.statSync(file);
    } catch {
      return;
    }
    if (st.size < offset) offset = 0; // file was recreated (server restart)
    if (st.size === offset) return;
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(st.size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    const lastNl = buf.lastIndexOf(10);
    if (lastNl < 0) return;
    offset += lastNl + 1;
    for (const line of buf.slice(0, lastNl).toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        onLine(JSON.parse(line));
      } catch {}
    }
  };
}

const pollResults = makeTailer(ipc('results.jsonl'), (r) => {
  const p = pending.get(r.id);
  if (p) {
    clearTimeout(p.timer);
    pending.delete(r.id);
    p.resolve(r);
  }
});
const pollEvents = makeTailer(ipc('events.jsonl'), (ev) => pushEvent(ev));

setInterval(() => {
  pollState();
  pollResults();
  pollEvents();
}, 250);

// Keep commands.jsonl small: truncate it when nothing is pending (the mod resets its offset).
setInterval(() => {
  try {
    if (pending.size === 0 && fs.statSync(ipc('commands.jsonl')).size > 256 * 1024) fs.writeFileSync(ipc('commands.jsonl'), '');
  } catch {}
}, 30000);

let cmdSeq = 0;
function sendCommand(cmd, user) {
  const id = `${Date.now()}_${++cmdSeq}`;
  const payload = { ...cmd, id, by: user };
  fs.appendFileSync(ipc('commands.jsonl'), JSON.stringify(payload) + '\n');
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ id, ok: false, error: 'Tempo esgotado: o mod não respondeu (servidor ligado e mod instalado?)' });
    }, cfg.commandTimeoutMs);
    pending.set(id, { resolve, timer });
  });
}

// ---------------------------------------------------------------- http
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const PUBLIC = path.join(ROOT, 'public');

function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? MIME['.json'] : 'text/plain; charset=utf-8', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(new Error('body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(urlPath);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found');
    const ext = path.extname(file).toLowerCase();
    // icons/map tiles can be cached; items.json/maps.json change whenever the data is rebuilt
    const cache = p.startsWith('/data/') && ext !== '.json' ? 'public, max-age=86400' : 'no-cache';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  });
}

// Commands the panel accepts, with the role needed. Validation happens again in the mod.
const COMMANDS = {
  teleport: 'admin',
  teleport_to_player: 'admin',
  give_item: 'admin',
  get_inventory: 'viewer',
  remove_item: 'admin',
  clear_inventory: 'admin',
  heal: 'admin',
  set_stat: 'admin',
  add_xp: 'admin',
  kill: 'admin',
  kick: 'admin',
  broadcast: 'admin',
  set_time_dilation: 'admin',
  console: 'admin',
  ping: 'viewer',
  selftest: 'admin',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/api/login' && req.method === 'POST') {
      const b = await readBody(req);
      const u = checkLogin(b.name, b.password);
      if (!u) return send(res, 401, { ok: false, error: 'Usuário ou senha inválidos' });
      const token = crypto.randomBytes(24).toString('hex');
      sessions.set(token, { name: u.name, role: u.role || 'admin', expires: Date.now() + SESSION_MS });
      return send(res, 200, { ok: true, name: u.name, role: u.role }, {
        'Set-Cookie': `isk=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`,
      });
    }
    if (p === '/api/logout') {
      const m = /(?:^|;\s*)isk=([a-f0-9]+)/.exec(req.headers.cookie || '');
      if (m) sessions.delete(m[1]);
      return send(res, 200, { ok: true }, { 'Set-Cookie': 'isk=; Path=/; Max-Age=0' });
    }

    if (p.startsWith('/api/')) {
      const s = getSession(req);
      if (!s) return send(res, 401, { ok: false, error: 'not logged in' });

      if (p === '/api/me') return send(res, 200, { name: s.name, role: s.role });
      if (p === '/api/state') return send(res, 200, state);
      if (p === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
        res.write(`event: history\ndata: ${JSON.stringify(eventLog)}\n\n`);
        sseClients.add(res);
        const ka = setInterval(() => res.write(': ka\n\n'), 20000);
        req.on('close', () => {
          clearInterval(ka);
          sseClients.delete(res);
        });
        return;
      }
      if (p === '/api/command' && req.method === 'POST') {
        const cmd = await readBody(req);
        const need = COMMANDS[cmd.type];
        if (!need) return send(res, 400, { ok: false, error: `comando desconhecido: ${cmd.type}` });
        if (need === 'admin' && s.role !== 'admin') return send(res, 403, { ok: false, error: 'sem permissão' });
        const r = await sendCommand(cmd, s.name);
        if (cmd.type !== 'get_inventory' && cmd.type !== 'ping') {
          pushEvent({ kind: r.ok ? 'admin' : 'error', text: `[${s.name}] ${cmd.type}: ${r.ok ? r.message || 'ok' : r.error}` });
        }
        return send(res, 200, r);
      }
      return send(res, 404, { ok: false, error: 'not found' });
    }

    if (req.method === 'GET') return serveStatic(req, res, p);
    send(res, 405, 'method not allowed');
  } catch (e) {
    console.error(e);
    send(res, 500, { ok: false, error: String(e.message || e) });
  }
});

server.listen(cfg.port, cfg.host, () => {
  console.log(`[panel] Icarus Server Kit em http://localhost:${cfg.port}`);
  console.log(`[panel] IPC: ${cfg.ipcDir}`);
});
