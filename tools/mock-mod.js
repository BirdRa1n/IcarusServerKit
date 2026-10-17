// Simulates the in-game mod for panel development: fake players walking around + canned command results.
// usage: node tools/mock-mod.js <ipc dir>
'use strict';
const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.argv[2] || 'mock-ipc');
fs.mkdirSync(dir, { recursive: true });
const f = (n) => path.join(dir, n);
for (const n of ['results.jsonl', 'events.jsonl']) fs.writeFileSync(f(n), '');
let offset = fs.existsSync(f('commands.jsonl')) ? fs.statSync(f('commands.jsonl')).size : 0;
const t0 = Date.now();
const players = [
  { id: '76561190000000001:0', steamId: '76561190000000001', slot: 0, name: 'Dario Jr', pos: { x: 120000, y: -200000, z: 3000 }, yaw: 45, health: 180, maxHealth: 200, ping: 40 },
  { id: '76561190000000002:1', steamId: '76561190000000002', slot: 1, name: 'Amigo', pos: { x: -250000, y: 150000, z: 100 }, yaw: 200, health: 200, maxHealth: 200, ping: 80 },
];
const inv = {
  Quickbar: [{ slot: 0, item: 'Stone_Axe', count: 1, dyn: { Durability: 800 } }, { slot: 1, item: 'Wood_Bow', count: 1 }, { slot: 3, item: 'Wood', count: 87 }],
  Backpack: [{ slot: 0, item: 'Stone', count: 45 }, { slot: 2, item: 'Fiber', count: 120 }, { slot: 5, item: 'Wood_Arrow', count: 30 }],
};
setInterval(() => {
  const t = (Date.now() - t0) / 1000;
  players[0].pos.x += Math.cos(t / 5) * 800;
  players[0].pos.y += Math.sin(t / 5) * 800;
  players[0].yaw = ((t / 5) * 57.3 + 90) % 360;
  const s = { version: 'mock', map: 'Terrain_016', uptime: Math.floor(t), time: Date.now(), players };
  fs.writeFileSync(f('state.tmp'), JSON.stringify(s));
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
    const p = players.find((x) => x.id === c.player);
    let r = { ok: true, message: `[mock] ${c.type} ok` };
    if (c.type === 'get_inventory') r = { ok: true, inventories: Object.entries(inv).map(([id, items]) => ({ id, slots: id === 'Quickbar' ? 9 : 24, items })) };
    if (c.type === 'teleport' && p) { p.pos = { x: c.x, y: c.y, z: c.z || 0 }; r.message = `[mock] ${p.name} -> ${c.x.toFixed(0)}, ${c.y.toFixed(0)}`; }
    if (c.type === 'give_item') { inv.Backpack.push({ slot: inv.Backpack.length + 6, item: c.static, count: c.count }); r.message = `[mock] ${c.count}x ${c.static} entregue`; }
    fs.appendFileSync(f('results.jsonl'), JSON.stringify({ ...r, id: c.id, type: c.type }) + '\n');
  }
}, 500);
setInterval(() => fs.appendFileSync(f('events.jsonl'), JSON.stringify({ kind: 'chat', text: 'Amigo: alguém tem madeira?', t: Date.now() }) + '\n'), 45000);
console.log('mock mod writing to', dir);
