'use strict';
// Cookie sessions for the users listed in config.json.

const crypto = require('crypto');

const SESSION_MS = 12 * 3600 * 1000;
const COOKIE = 'isk';

function createAuth(cfg) {
  const sessions = new Map(); // token -> { name, role, expires }

  function login(name, password) {
    const u = cfg.users.find((x) => x.name === name);
    if (!u) return null;
    const a = Buffer.from(String(password ?? ''));
    const b = Buffer.from(String(u.password));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const token = crypto.randomBytes(24).toString('hex');
    const session = { name: u.name, role: u.role || 'admin', expires: Date.now() + SESSION_MS };
    sessions.set(token, session);
    return { token, session, cookie: `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}` };
  }

  function tokenOf(req) {
    const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]+)`).exec(req.headers.cookie || '');
    return m && m[1];
  }

  function session(req) {
    const s = sessions.get(tokenOf(req));
    if (!s) return null;
    if (s.expires < Date.now()) {
      sessions.delete(tokenOf(req));
      return null;
    }
    return s;
  }

  function logout(req) {
    sessions.delete(tokenOf(req));
    return `${COOKIE}=; Path=/; Max-Age=0`;
  }

  return { login, session, logout };
}

module.exports = { createAuth };
