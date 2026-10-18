// Simulates the in-game mod for panel development: fake players walking around and canned
// command results. Usage: node tools/mock-mod.js <ipc dir>
'use strict';
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || 'mock-ipc');
fs.mkdirSync(dir, { recursive: true });
const f = (n) => path.join(dir, n);
for (const n of ['results.jsonl', 'events.jsonl']) fs.writeFileSync(f(n), '');
let offset = fs.existsSync(f('commands.jsonl')) ? fs.statSync(f('commands.jsonl')).size : 0;
const t0 = Date.now();
let hour = 9;

const stats = () => ({ health: [180, 200], stamina: [90, 100], food: [2100, 3000], water: [1800, 2500], oxygen: [600, 1000], level: 25, xp: 412300 });
const players = [
  { id: '76561190000000001:0', steamId: '76561190000000001', slot: 0, name: 'Dario Jr', pos: { x: 120000, y: -200000, z: 3000 }, yaw: 45, stats: stats(), ping: 40, idle: 12 },
  { id: '76561190000000002:1', steamId: '76561190000000002', slot: 1, name: 'Amigo', pos: { x: -250000, y: 150000, z: 100 }, yaw: 200, stats: stats(), ping: 80, idle: 840 },
];
const inv = {
  Quickbar: [{ slot: 0, item: 'Stone_Axe', count: 1, dyn: { Durability: 800 } }, { slot: 1, item: 'Wood_Bow', count: 1 }, { slot: 3, item: 'Wood', count: 87 }],
  Backpack: [{ slot: 0, item: 'Stone', count: 45 }, { slot: 2, item: 'Fiber', count: 120 }, { slot: 5, item: 'Wood_Arrow', count: 30 }],
};

function result(c) {
  const p = players.find((x) => x.id === c.player);
  switch (c.type) {
    case 'get_inventory':
      return { ok: true, inventories: Object.entries(inv).map(([id, items]) => ({ id, slots: id === 'Quickbar' ? 9 : 24, items })) };
    case 'teleport':
      if (p) p.pos = { x: c.x, y: c.y, z: c.z || 0 };
      return { ok: true, message: `[mock] ${p?.name} -> ${Math.round(c.x)}, ${Math.round(c.y)}` };
    case 'give_item':
      inv.Backpack.push({ slot: inv.Backpack.length + 6, item: c.static, count: c.count });
      return { ok: true, message: `[mock] ${c.count}x ${c.static}`, given: c.count };
    case 'heal':
      if (p) p.stats = { ...p.stats, health: [200, 200], food: [3000, 3000], water: [2500, 2500], oxygen: [1000, 1000], stamina: [100, 100] };
      return { ok: true, message: `[mock] healed ${p?.name}` };
    case 'set_time':
      hour = c.hour;
      return { ok: true, message: `[mock] ${hour}:00` };
    case 'selftest':
      return { ok: true, result: { map: 'Terrain_016', players: players.length, mock: true } };
    default:
      return { ok: true, message: `[mock] ${c.type} ok` };
  }
}

setInterval(() => {
  const t = (Date.now() - t0) / 1000;
  const p0 = players[0];
  p0.pos.x += Math.cos(t / 5) * 900;
  p0.pos.y += Math.sin(t / 5) * 900;
  p0.yaw = ((t / 5) * 57.3 + 90) % 360;
  if (!p0.perks?.stamina) p0.stats.stamina[0] = Math.round(60 + 40 * Math.abs(Math.sin(t / 3)));
  players[1].idle += 0.5;
  // perks come from settings.json (next to ipc/), like in the real mod
  let perks = {};
  try {
    perks = JSON.parse(fs.readFileSync(path.join(dir, '..', 'settings.json'), 'utf8').replace(/^﻿/, '')).perks || {};
  } catch {}
  for (const p of players) {
    p.perks = perks[p.steamId];
    if (p.perks?.stamina) p.stats.stamina[0] = p.stats.stamina[1];
  }
  const state = {
    version: 'mock', map: 'Terrain_016', hour, uptime: Math.floor(t), time: Date.now(), players,
    rules: { minPlayers: { remaining: Math.max(0, 600 - Math.floor(t)), required: 3 } },
  };
  fs.writeFileSync(f('state.tmp'), JSON.stringify(state));
  fs.renameSync(f('state.tmp'), f('state.json'));

  if (!fs.existsSync(f('commands.jsonl'))) return;
  const size = fs.statSync(f('commands.jsonl')).size;
  if (size < offset) offset = 0;
  if (size === offset) return;
  const buf = Buffer.alloc(size - offset);
  const fd = fs.openSync(f('commands.jsonl'), 'r');
  fs.readSync(fd, buf, 0, buf.length, offset);
  fs.closeSync(fd);
  offset = size;
  for (const line of buf.toString().split('\n').filter(Boolean)) {
    const c = JSON.parse(line);
    fs.appendFileSync(f('results.jsonl'), JSON.stringify({ ...result(c), id: c.id, type: c.type }) + '\n');
  }
}, 500);

setInterval(() => fs.appendFileSync(f('events.jsonl'), JSON.stringify({ kind: 'chat', text: 'Amigo: anyone has wood?', t: Date.now() }) + '\n'), 45000);
console.log('mock mod writing to', dir);
