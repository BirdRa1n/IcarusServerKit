'use strict';
// HTTP server: static files, JSON API and a server-sent events stream.

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Commands forwarded to the mod, with the role allowed to run them.
const MOD_COMMANDS = {
  ping: 'viewer',
  selftest: 'admin',
  get_inventory: 'viewer',
  teleport: 'admin',
  teleport_to_player: 'admin',
  bring_all: 'admin',
  give_item: 'admin',
  remove_item: 'admin',
  clear_inventory: 'admin',
  heal: 'admin',
  cure: 'admin',
  get_conditions: 'viewer',
  set_stat: 'admin',
  add_xp: 'admin',
  kill: 'admin',
  kick: 'admin',
  broadcast: 'admin',
  set_time: 'admin',
  stop_weather: 'admin',
  save_world: 'admin',
  spawn_creature: 'admin',
  console: 'admin',
};
const QUIET = new Set(['ping', 'get_inventory', 'selftest', 'get_conditions']);

function send(res, code, body, headers = {}) {
  const json = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': json ? MIME['.json'] : 'text/plain; charset=utf-8', ...headers });
  res.end(json ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
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

function createServer({ cfg, auth, link, settings, events }) {
  const publicDir = path.join(cfg.panelDir, 'public');

  function serveStatic(res, urlPath) {
    let p = decodeURIComponent(urlPath);
    if (p === '/') p = '/index.html';
    const file = path.normalize(path.join(publicDir, p));
    if (!file.startsWith(publicDir + path.sep)) return send(res, 403, 'forbidden');
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return send(res, 404, 'not found');
      const ext = path.extname(file).toLowerCase();
      // images under data/ are stable; JSON and app code change with every update
      const cache = p.startsWith('/data/') && ext !== '.json' ? 'public, max-age=86400' : 'no-cache';
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache });
      fs.createReadStream(file).pipe(res);
    });
  }

  /** Commands handled by the panel itself (they change settings.json). */
  async function panelCommand(cmd, user) {
    if (cmd.type === 'ban') {
      const p = (link.state.players || []).find((x) => x.id === cmd.player || x.steamId === cmd.player);
      const id = String(cmd.id || p?.steamId || p?.id || cmd.player || '');
      if (!id) return { ok: false, error: 'invalid player' };
      settings.update((s) => {
        s.bans = s.bans.filter((b) => b.id !== id);
        s.bans.push({ id, name: cmd.name || p?.name || id, reason: cmd.reason || '', at: Date.now() });
      });
      if (p) await link.send({ type: 'kick', player: p.id, reason: cmd.reason, ban: true }, user);
      return { ok: true, message: p?.name || id };
    }
    if (cmd.type === 'unban') {
      settings.update((s) => (s.bans = s.bans.filter((b) => b.id !== String(cmd.id))));
      return { ok: true, message: String(cmd.id) };
    }
    if (cmd.type === 'set_perks') {
      const id = String(cmd.id || '');
      if (!id) return { ok: false, error: 'invalid player' };
      settings.update((s) => {
        s.perks[id] = cmd.perks || {};
      });
      const enabled = Object.keys(settings.get().perks[id] || {});
      return { ok: true, message: `${cmd.name || id}: ${enabled.length ? enabled.join(', ') : '-'}` };
    }
    if (cmd.type === 'set_exempt') {
      const id = String(cmd.id || '');
      if (!id) return { ok: false, error: 'invalid player' };
      settings.update((s) => {
        s.exempt = s.exempt.filter((x) => x !== id);
        if (cmd.exempt) s.exempt.push(id);
      });
      return { ok: true, message: id };
    }
    return null;
  }

  async function api(req, res, p, s) {
    if (p === '/api/me') return send(res, 200, { name: s.name, role: s.role });
    if (p === '/api/state') return send(res, 200, link.state);

    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`event: state\ndata: ${JSON.stringify(link.state)}\n\n`);
      res.write(`event: history\ndata: ${JSON.stringify(events.history())}\n\n`);
      events.subscribe(res);
      return;
    }

    if (p === '/api/settings') {
      if (req.method === 'GET') return send(res, 200, settings.get());
      if (req.method === 'PUT') {
        if (s.role !== 'admin') return send(res, 403, { ok: false, error: 'forbidden' });
        const saved = settings.save(await readBody(req));
        events.push({ kind: 'admin', by: s.name, type: 'settings', ok: true });
        return send(res, 200, saved);
      }
    }

    if (p === '/api/command' && req.method === 'POST') {
      const cmd = await readBody(req);
      if (s.role !== 'admin' && MOD_COMMANDS[cmd.type] !== 'viewer') return send(res, 403, { ok: false, error: 'forbidden' });
      let r = await panelCommand(cmd, s.name);
      if (!r) {
        if (!MOD_COMMANDS[cmd.type]) return send(res, 400, { ok: false, error: `unknown command: ${cmd.type}` });
        r = await link.send(cmd, s.name);
      }
      if (!QUIET.has(cmd.type)) {
        events.push({ kind: r.ok ? 'admin' : 'error', by: s.name, type: cmd.type, ok: r.ok, text: r.ok ? r.message : r.error });
      }
      return send(res, 200, r);
    }
    send(res, 404, { ok: false, error: 'not found' });
  }

  return http.createServer(async (req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    try {
      if (p === '/api/login' && req.method === 'POST') {
        const b = await readBody(req);
        const r = auth.login(b.name, b.password);
        if (!r) return send(res, 401, { ok: false, error: 'invalid_login' });
        return send(res, 200, { ok: true, name: r.session.name, role: r.session.role }, { 'Set-Cookie': r.cookie });
      }
      if (p === '/api/logout') return send(res, 200, { ok: true }, { 'Set-Cookie': auth.logout(req) });
      if (p.startsWith('/api/')) {
        const s = auth.session(req);
        if (!s) return send(res, 401, { ok: false, error: 'not_logged_in' });
        return await api(req, res, p, s);
      }
      if (req.method === 'GET') return serveStatic(res, p);
      send(res, 405, 'method not allowed');
    } catch (e) {
      console.error(e);
      send(res, 500, { ok: false, error: String(e.message || e) });
    }
  });
}

module.exports = { createServer };
