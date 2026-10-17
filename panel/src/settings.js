'use strict';
// Server rules, bans and exemptions: settings.json in the mod folder (reloaded by the mod on change).

const fs = require('fs');
const { readJson, writeAtomic } = require('./config');

// Keep in sync with mod/IcarusServerKit/Scripts/isk/settings.lua
const DEFAULTS = {
  rules: {
    idle: { enabled: false, minutes: 20, warnMinutes: 3 },
    minPlayers: { enabled: false, players: 2, minutes: 10, warnEveryMinutes: 2 },
  },
  exempt: [],
  bans: [],
  messages: {
    idleWarning: '{name}, you seem to be away. You will be kicked for inactivity in {minutes} min.',
    idleKick: 'Kicked for inactivity.',
    soloWarning: 'At least {players} players are required to play here. Everyone will be kicked in {minutes} min.',
    soloKick: 'Not enough players online.',
    banKick: 'You are banned from this server.',
  },
};

const int = (v, lo, hi, def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
};
const text = (v, def, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : def);

/** Coerces user input into a valid settings object. */
function normalize(s = {}) {
  const d = DEFAULTS;
  const idle = s.rules?.idle || {};
  const mp = s.rules?.minPlayers || {};
  const msg = s.messages || {};
  return {
    rules: {
      idle: {
        enabled: !!idle.enabled,
        minutes: int(idle.minutes, 1, 1440, d.rules.idle.minutes),
        warnMinutes: int(idle.warnMinutes, 0, 60, d.rules.idle.warnMinutes),
      },
      minPlayers: {
        enabled: !!mp.enabled,
        players: int(mp.players, 2, 100, d.rules.minPlayers.players),
        minutes: int(mp.minutes, 1, 1440, d.rules.minPlayers.minutes),
        warnEveryMinutes: int(mp.warnEveryMinutes, 1, 120, d.rules.minPlayers.warnEveryMinutes),
      },
    },
    exempt: [...new Set((Array.isArray(s.exempt) ? s.exempt : []).map(String).filter(Boolean))],
    bans: (Array.isArray(s.bans) ? s.bans : [])
      .filter((b) => b && b.id)
      .map((b) => ({ id: String(b.id), name: text(b.name, String(b.id), 80), reason: text(b.reason, '', 200), at: Number(b.at) || Date.now() })),
    messages: Object.fromEntries(Object.keys(d.messages).map((k) => [k, text(msg[k], d.messages[k])])),
  };
}

function createSettings(file) {
  function get() {
    try {
      return normalize(readJson(file));
    } catch {
      return normalize({});
    }
  }
  function save(s) {
    const clean = normalize(s);
    writeAtomic(file, JSON.stringify(clean, null, 2));
    return clean;
  }
  function update(fn) {
    const s = get();
    fn(s);
    return save(s);
  }
  return { get, save, update, exists: () => fs.existsSync(file) };
}

module.exports = { createSettings, DEFAULTS };
