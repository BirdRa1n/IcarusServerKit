'use strict';
// Panel configuration (config.json next to server.js, or the file in ISK_CONFIG).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PANEL_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = process.env.ISK_CONFIG ? path.resolve(process.env.ISK_CONFIG) : path.join(PANEL_DIR, 'config.json');

/** Reads a JSON file, tolerating the UTF-8 BOM that Windows PowerShell 5.1 and some editors add. */
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

/** Writes a file atomically (temp file + rename), UTF-8 without BOM. */
function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

/**
 * The mod folder inside the dedicated server. The panel is normally installed at
 * <server>/IcarusServerKit/panel; a kit placed next to the server folder is also supported.
 */
function defaultModDir() {
  const sub = ['Icarus', 'Binaries', 'Win64', 'ue4ss', 'Mods', 'IcarusServerKit'];
  const candidates = [path.resolve(PANEL_DIR, '..', '..'), path.resolve(PANEL_DIR, '..', '..', 'ICARUS Dedicated Server')];
  const server = candidates.find((c) => fs.existsSync(path.join(c, 'Icarus', 'Binaries', 'Win64'))) || candidates[0];
  return path.join(server, ...sub);
}

const DEFAULTS = {
  port: 8090,
  host: '0.0.0.0',
  ipcDir: path.join(defaultModDir(), 'ipc'),
  users: [],
  commandTimeoutMs: 15000,
};

function load() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const password = crypto.randomBytes(9).toString('base64url');
    writeAtomic(CONFIG_PATH, JSON.stringify({ ...DEFAULTS, users: [{ name: 'admin', password, role: 'admin' }] }, null, 2));
    console.log(`[panel] created ${CONFIG_PATH}`);
    console.log(`[panel] user: admin   password: ${password}   (change it in config.json)`);
  }
  let user;
  try {
    user = readJson(CONFIG_PATH);
  } catch (e) {
    console.error(`[panel] invalid config.json (${CONFIG_PATH}): ${e.message}`);
    process.exit(1);
  }
  const cfg = { ...DEFAULTS, ...user };
  cfg.ipcDir = path.resolve(PANEL_DIR, cfg.ipcDir);
  // settings.json (rules, bans) lives in the mod folder, one level above ipc/
  cfg.settingsPath = path.join(path.dirname(cfg.ipcDir), 'settings.json');
  cfg.panelDir = PANEL_DIR;
  if (!cfg.users.length) console.warn('[panel] no users in config.json - nobody can log in');
  return cfg;
}

module.exports = { load, readJson, writeAtomic };
