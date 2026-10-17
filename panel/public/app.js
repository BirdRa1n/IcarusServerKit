'use strict';

// ------------------------------------------------------------------ helpers
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, ok = true) {
  const el = document.createElement('div');
  el.className = 'toast' + (ok ? '' : ' err');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), ok ? 4000 : 8000);
}

async function api(path, body) {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  if (res.status === 401 && path !== '/api/login') {
    showLogin();
    throw new Error('sessão expirada');
  }
  return res.json();
}

async function cmd(type, args = {}, { quiet = false } = {}) {
  const r = await api('/api/command', { type, ...args });
  if (!quiet) toast(r.ok ? r.message || 'OK' : r.error || 'erro', r.ok);
  return r;
}

function fmtUptime(s) {
  if (s == null) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

// ------------------------------------------------------------------ state
const S = {
  state: { online: false, players: [] },
  items: [],
  itemsById: new Map(),
  itemsByStatic: new Map(),
  maps: {},
  mapId: null,
  selected: null, // player id
  inventory: null,
  log: [],
  logFilter: '',
  unread: 0,
  me: null,
};

// ------------------------------------------------------------------ auth
function showLogin() {
  $('#app').classList.add('hidden');
  $('#login').classList.remove('hidden');
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const r = await api('/api/login', { name: f.get('name'), password: f.get('password') });
  if (!r.ok) {
    $('#loginError').textContent = r.error;
    return;
  }
  start();
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/api/logout');
  location.reload();
});

// ------------------------------------------------------------------ tabs
$$('.tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    $$('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
    if (b.dataset.tab === 'log') {
      S.unread = 0;
      renderBadge();
    }
  }),
);

// ------------------------------------------------------------------ map
const M = {
  el: $('#map'),
  layer: $('#mapLayer'),
  markers: $('#markerLayer'),
  scale: 1, // screen px per world unit
  ox: 0,
  oy: 0,
  bounds: null,
  tiles: [],
};

// world (X north, Y east) -> map px (before pan/zoom)
const W2P = (x, y) => [(y - M.bounds.minY), (M.bounds.maxX - x)];
const P2W = (px, py) => [M.bounds.maxX - py, px + M.bounds.minY];

function applyTransform() {
  for (const { img, t } of M.tiles) {
    const [px, py] = W2P(t.maxX, t.minY);
    const l = Math.floor(M.ox + px * M.scale);
    const tp = Math.floor(M.oy + py * M.scale);
    // round outward so neighbouring tiles overlap by a pixel (no hairline seams)
    img.style.left = l + 'px';
    img.style.top = tp + 'px';
    img.style.width = Math.ceil(M.ox + (px + t.maxY - t.minY) * M.scale) - l + 1 + 'px';
    img.style.height = Math.ceil(M.oy + (py + t.maxX - t.minX) * M.scale) - tp + 1 + 'px';
  }
  positionMarkers();
}

function screenToWorld(sx, sy) {
  const r = M.el.getBoundingClientRect();
  return P2W((sx - r.left - M.ox) / M.scale, (sy - r.top - M.oy) / M.scale);
}

function fitMap() {
  if (!M.bounds) return;
  const r = M.el.getBoundingClientRect();
  // layout not ready yet (panel just shown): try again on the next frame
  if (!r.width || !r.height) return requestAnimationFrame(fitMap);
  const w = M.bounds.maxY - M.bounds.minY;
  const h = M.bounds.maxX - M.bounds.minX;
  M.scale = Math.min(r.width / w, r.height / h) * 0.96;
  M.ox = (r.width - w * M.scale) / 2;
  M.oy = (r.height - h * M.scale) / 2;
  applyTransform();
}

function loadMap(id) {
  const m = S.maps[id];
  if (!m) return;
  S.mapId = id;
  $('#mapSelect').value = id;
  M.bounds = m.bounds;
  M.userMoved = false;
  M.layer.innerHTML = '';
  let tiles = m.tiles;
  if (!tiles.length) {
    // no map images (panel data built from dedicated-server files only): draw a coordinate grid
    const step = 100800;
    tiles = [];
    for (let x = m.bounds.minX; x < m.bounds.maxX; x += step)
      for (let y = m.bounds.minY; y < m.bounds.maxY; y += step) tiles.push({ minX: x, maxX: x + step, minY: y, maxY: y + step });
  }
  M.tiles = tiles.map((t) => {
    const img = document.createElement(t.file ? 'img' : 'div');
    if (t.file) {
      img.src = 'data/maps/' + t.file;
      img.draggable = false;
    } else img.className = 'grid-tile';
    M.layer.appendChild(img);
    return { img, t };
  });
  fitMap();
}

function mapForLevel(level) {
  if (!level) return null;
  for (const [id, m] of Object.entries(S.maps)) {
    const base = String(m.level || '').split('/').pop().split('.')[0];
    if (base === level || id === level) return id;
  }
  return null;
}

// pan / zoom
let drag = null;
M.el.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.marker')) return;
  hideMenu();
  drag = { x: e.clientX, y: e.clientY, ox: M.ox, oy: M.oy, moved: false };
  M.el.setPointerCapture(e.pointerId);
});
M.el.addEventListener('pointermove', (e) => {
  if (M.bounds) {
    const [x, y] = screenToWorld(e.clientX, e.clientY);
    $('#cursorPos').textContent = `X ${x.toFixed(0)}  Y ${y.toFixed(0)}`;
  }
  if (!drag) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  M.ox = drag.ox + dx;
  if (drag.moved) M.userMoved = true;
  M.oy = drag.oy + dy;
  M.el.classList.toggle('dragging', drag.moved);
  applyTransform();
});
M.el.addEventListener('pointerup', (e) => {
  const wasClick = drag && !drag.moved;
  drag = null;
  M.el.classList.remove('dragging');
  if (wasClick) openMapMenu(e);
});
M.el.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!e.target.closest('.marker')) openMapMenu(e);
});
M.el.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const r = M.el.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const f = Math.exp(-e.deltaY * 0.0015);
    const ns = Math.min(Math.max(M.scale * f, 0.00005), 0.2);
    M.ox = mx - ((mx - M.ox) * ns) / M.scale;
    M.oy = my - ((my - M.oy) * ns) / M.scale;
    M.scale = ns;
    M.userMoved = true;
    applyTransform();
  },
  { passive: false },
);
// refit while the user has not panned/zoomed (also fixes the first fit before layout settles)
new ResizeObserver(() => (M.userMoved && M.scale > 0 ? applyTransform() : fitMap())).observe(M.el);
$('#zoomFit').addEventListener('click', () => {
  M.userMoved = false;
  fitMap();
});
$('#mapSelect').addEventListener('change', (e) => {
  $('#followMap').checked = false;
  loadMap(e.target.value);
});

function pingAt(x, y) {
  const [px, py] = W2P(x, y);
  const el = document.createElement('div');
  el.className = 'ping-mark';
  el.style.left = M.ox + px * M.scale + 'px';
  el.style.top = M.oy + py * M.scale + 'px';
  M.markers.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function hideMenu() {
  $('#mapMenu').classList.add('hidden');
}

function openMapMenu(e) {
  if (!M.bounds) return;
  const [x, y] = screenToWorld(e.clientX, e.clientY);
  const menu = $('#mapMenu');
  const players = S.state.players || [];
  const sel = players.find((p) => p.id === S.selected);
  let html = `<div class="ctx-title mono">X ${x.toFixed(0)} · Y ${y.toFixed(0)}</div>`;
  if (!players.length) html += `<div class="ctx-title">Nenhum jogador online</div>`;
  if (sel) html += `<button data-tp="${esc(sel.id)}"><b>Teleportar ${esc(sel.name)} aqui</b></button>`;
  for (const p of players) if (p !== sel) html += `<button data-tp="${esc(p.id)}">Teleportar ${esc(p.name)} aqui</button>`;
  if (players.length > 1) html += `<button data-tpall="1">Teleportar todos aqui</button>`;
  html += `<button data-copy="1">Copiar coordenadas</button>`;
  menu.innerHTML = html;
  const wr = $('.map-wrap').getBoundingClientRect();
  menu.style.left = Math.min(e.clientX - wr.left, wr.width - 240) + 'px';
  menu.style.top = Math.min(e.clientY - wr.top, wr.height - 200) + 'px';
  menu.classList.remove('hidden');
  menu.onclick = async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    hideMenu();
    if (b.dataset.copy) {
      navigator.clipboard?.writeText(`${x.toFixed(0)} ${y.toFixed(0)}`);
      toast('Coordenadas copiadas');
      return;
    }
    pingAt(x, y);
    const targets = b.dataset.tpall ? players.map((p) => p.id) : [b.dataset.tp];
    for (const id of targets) await cmd('teleport', { player: id, x, y });
  };
}

function positionMarkers() {
  if (!M.bounds) return;
  const players = S.state.players || [];
  const seen = new Set();
  for (const p of players) {
    if (!p.pos) continue;
    seen.add(p.id);
    let el = M.markers.querySelector(`[data-id="${CSS.escape(p.id)}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'marker';
      el.dataset.id = p.id;
      el.innerHTML = `<div class="dot"><div class="dir"></div></div><div class="label"></div>`;
      el.addEventListener('click', () => selectPlayer(p.id));
      M.markers.appendChild(el);
    }
    const [px, py] = W2P(p.pos.x, p.pos.y);
    el.style.left = M.ox + px * M.scale + 'px';
    el.style.top = M.oy + py * M.scale + 'px';
    el.querySelector('.label').textContent = p.name;
    // yaw 0 = +X (north/up on our map), positive yaw turns toward +Y (east/right)
    el.querySelector('.dir').style.transform = `translate(-50%, -100%) rotate(${p.yaw || 0}deg) translateY(-9px)`;
    el.classList.toggle('selected', p.id === S.selected);
    el.classList.toggle('dead', p.health === 0);
  }
  for (const el of $$('.marker', M.markers)) if (!seen.has(el.dataset.id)) el.remove();
}

// ------------------------------------------------------------------ players
function renderStatus() {
  const st = S.state;
  const on = $('#modStatus');
  on.textContent = st.online ? 'Servidor online' : 'Mod offline';
  on.className = 'pill ' + (st.online ? 'on' : 'off');
  $('#statPlayers').textContent = (st.players || []).length;
  const mapId = mapForLevel(st.map);
  $('#statMap').textContent = mapId ? S.maps[mapId].name : st.map || '—';
  $('#statUptime').textContent = st.online ? fmtUptime(st.uptime) : '—';
  if ($('#followMap').checked && mapId && mapId !== S.mapId) loadMap(mapId);
}

function renderPlayers() {
  const list = $('#playerList');
  const players = S.state.players || [];
  if (!players.length) {
    list.innerHTML = `<div class="empty">${S.state.online ? 'Nenhum jogador online.' : 'Aguardando o mod do servidor…'}</div>`;
  } else {
    list.innerHTML = players
      .map((p) => {
        const hp = p.maxHealth ? Math.max(0, Math.min(100, (p.health / p.maxHealth) * 100)) : null;
        return `<div class="player-row ${p.id === S.selected ? 'selected' : ''}" data-id="${esc(p.id)}">
          <span class="pname">${esc(p.name)}</span>
          <span class="muted small-text">${p.ping != null ? p.ping + ' ms' : ''}</span>
          <span class="muted mono">${p.pos ? `${p.pos.x.toFixed(0)}, ${p.pos.y.toFixed(0)}, ${p.pos.z.toFixed(0)}` : 'sem personagem'}</span>
          <span class="muted small-text">${hp != null ? `${p.health}/${p.maxHealth} HP` : ''}</span>
          ${hp != null ? `<div class="hp"><div style="width:${hp}%"></div></div>` : ''}
        </div>`;
      })
      .join('');
    $$('.player-row', list).forEach((r) => r.addEventListener('click', () => selectPlayer(r.dataset.id)));
  }
  if (S.selected && !players.find((p) => p.id === S.selected)) {
    S.selected = null;
    $('#playerDetail').classList.add('hidden');
  } else if (S.selected) updateDetailHeader();
  fillPlayerSelect();
}

function fillPlayerSelect() {
  const sel = $('#givePlayer');
  const cur = sel.value;
  sel.innerHTML = (S.state.players || []).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  if (cur) sel.value = cur;
  if (!sel.value && S.selected) sel.value = S.selected;
}

function selectPlayer(id) {
  S.selected = id;
  S.inventory = null;
  $$('.tabs button').find((b) => b.dataset.tab === 'players').click();
  renderPlayers();
  renderDetail();
  positionMarkers();
  const p = S.state.players.find((x) => x.id === id);
  if (p?.pos && M.bounds && M.scale > 0) {
    const r = M.el.getBoundingClientRect();
    const [px, py] = W2P(p.pos.x, p.pos.y);
    M.ox = r.width / 2 - px * M.scale;
    M.oy = r.height / 2 - py * M.scale;
    M.userMoved = true;
    applyTransform();
  }
  loadInventory();
}

function updateDetailHeader() {
  const p = S.state.players.find((x) => x.id === S.selected);
  if (!p) return;
  const kv = $('#pdKv');
  if (kv)
    kv.innerHTML = `
    <span>Steam ID</span><span class="mono">${esc(p.steamId || '—')}</span>
    <span>Slot</span><span>${esc(p.slot ?? '—')}</span>
    <span>Vida</span><span>${p.health ?? '—'} / ${p.maxHealth ?? '—'}</span>
    <span>Posição</span><span class="mono">${p.pos ? `${p.pos.x.toFixed(0)} ${p.pos.y.toFixed(0)} ${p.pos.z.toFixed(0)}` : '—'}</span>`;
}

function renderDetail() {
  const d = $('#playerDetail');
  const p = S.state.players.find((x) => x.id === S.selected);
  if (!p) return d.classList.add('hidden');
  d.classList.remove('hidden');
  const others = S.state.players.filter((x) => x.id !== p.id);
  d.innerHTML = `
    <div class="pd-head"><h2>${esc(p.name)}</h2><button class="btn ghost small" id="pdClose">✕</button></div>
    <div class="kv" id="pdKv"></div>
    <div class="actions">
      <button class="btn" data-a="heal">Curar tudo</button>
      <button class="btn" data-a="xp">+ XP</button>
      <button class="btn" data-a="give">Dar item</button>
      <button class="btn" data-a="tpcoords">Teleporte XYZ</button>
      <button class="btn" data-a="tpto" ${others.length ? '' : 'disabled'}>Ir até jogador</button>
      <button class="btn" data-a="bring" ${others.length ? '' : 'disabled'}>Trazer jogador</button>
      <button class="btn" data-a="stats">Status…</button>
      <button class="btn danger" data-a="kill">Matar</button>
      <button class="btn danger" data-a="clear">Limpar inv.</button>
      <button class="btn danger" data-a="kick">Expulsar</button>
      <button class="btn danger" data-a="ban">Banir</button>
    </div>
    <div class="row"><b style="flex:1">Inventário</b><button class="btn ghost small" id="invRefresh">↻ Atualizar</button></div>
    <div id="invBox" class="muted">Carregando…</div>`;
  updateDetailHeader();
  $('#pdClose').onclick = () => {
    S.selected = null;
    d.classList.add('hidden');
    renderPlayers();
    positionMarkers();
  };
  $('#invRefresh').onclick = loadInventory;
  $$('[data-a]', d).forEach((b) => (b.onclick = () => playerAction(b.dataset.a, p)));
}

function pickPlayer(title, list) {
  const names = list.map((x, i) => `${i + 1}) ${x.name}`).join('\n');
  const n = parseInt(prompt(`${title}\n${names}`, '1'), 10);
  return list[n - 1] || null;
}

async function playerAction(a, p) {
  const others = S.state.players.filter((x) => x.id !== p.id);
  switch (a) {
    case 'heal':
      return cmd('heal', { player: p.id });
    case 'xp': {
      const v = parseInt(prompt('Quanto XP adicionar?', '10000'), 10);
      if (v > 0) return cmd('add_xp', { player: p.id, value: v });
      return;
    }
    case 'give':
      $$('.tabs button').find((b) => b.dataset.tab === 'items').click();
      $('#itemSearch').focus();
      return;
    case 'tpcoords': {
      const def = p.pos ? `${p.pos.x.toFixed(0)} ${p.pos.y.toFixed(0)} ${p.pos.z.toFixed(0)}` : '0 0';
      const s = prompt('Coordenadas "X Y" ou "X Y Z" (sem Z = altura do terreno):', def);
      if (!s) return;
      const [x, y, z] = s.trim().split(/[\s,;]+/).map(Number);
      if (!isFinite(x) || !isFinite(y)) return toast('Coordenadas inválidas', false);
      return cmd('teleport', { player: p.id, x, y, z: isFinite(z) ? z : undefined });
    }
    case 'tpto': {
      const t = others.length === 1 ? others[0] : pickPlayer('Ir até qual jogador?', others);
      if (t) return cmd('teleport_to_player', { player: p.id, target: t.id });
      return;
    }
    case 'bring': {
      const t = others.length === 1 ? others[0] : pickPlayer(`Trazer qual jogador até ${p.name}?`, others);
      if (t) return cmd('teleport_to_player', { player: t.id, target: p.id });
      return;
    }
    case 'stats': {
      const stat = prompt('Qual status? (health, food, water, oxygen, stamina)', 'health');
      if (!stat) return;
      const v = parseInt(prompt(`Valor de ${stat} em % (0-100)`, '100'), 10);
      if (isFinite(v)) return cmd('set_stat', { player: p.id, stat: stat.trim(), value: v, percent: true });
      return;
    }
    case 'kill':
      if (confirm(`Matar ${p.name}?`)) return cmd('kill', { player: p.id });
      return;
    case 'clear':
      if (confirm(`Apagar TODOS os itens da mochila e barra rápida de ${p.name}? Isto não pode ser desfeito.`)) {
        await cmd('clear_inventory', { player: p.id });
        loadInventory();
      }
      return;
    case 'kick': {
      const reason = prompt(`Motivo para expulsar ${p.name}:`, 'Expulso pelo administrador');
      if (reason != null) return cmd('kick', { player: p.id, reason });
      return;
    }
    case 'ban': {
      const reason = prompt(`Motivo para BANIR ${p.name}:`, 'Banido pelo administrador');
      if (reason != null && confirm(`Confirmar banimento de ${p.name}?`)) return cmd('kick', { player: p.id, reason, ban: true });
      return;
    }
  }
}

const INV_LABEL = { Quickbar: 'Barra rápida', Backpack: 'Mochila', Equipment: 'Equipamento', Suit: 'Traje', General: 'Geral' };

async function loadInventory() {
  const id = S.selected;
  if (!id) return;
  const r = await cmd('get_inventory', { player: id }, { quiet: true });
  if (S.selected !== id) return;
  const box = $('#invBox');
  if (!box) return;
  if (!r.ok) {
    box.innerHTML = `<span class="error">${esc(r.error)}</span>`;
    return;
  }
  S.inventory = r.inventories;
  box.classList.remove('muted');
  box.innerHTML = r.inventories
    .filter((inv) => inv.slots > 0 || inv.items.length)
    .map((inv) => {
      const bySlot = new Map(inv.items.map((it) => [it.slot, it]));
      const n = Math.max(inv.slots, ...inv.items.map((it) => it.slot + 1), 0);
      let cells = '';
      for (let i = 0; i < n; i++) {
        const it = bySlot.get(i);
        if (!it) {
          cells += `<div class="slot" title="vazio"></div>`;
          continue;
        }
        const info = S.itemsByStatic.get(it.item);
        const name = info ? info.name : it.item;
        const dur = it.dyn?.Durability;
        cells += `<div class="slot" data-inv="${esc(inv.id)}" data-slot="${it.slot}" data-item="${esc(it.item)}" data-count="${it.count}"
            title="${esc(name)} ×${it.count}${dur != null ? ` · durabilidade ${dur}` : ''}\n(clique para remover)">
          ${info?.icon ? `<img src="data/icons/${esc(info.icon)}" loading="lazy" alt="">` : `<span class="noicon">${esc(it.item)}</span>`}
          ${it.count > 1 ? `<span class="qty">${it.count}</span>` : ''}
        </div>`;
      }
      return `<div class="inv-section"><h4>${esc(INV_LABEL[inv.id] || inv.id)}</h4><div class="inv-grid">${cells}</div></div>`;
    })
    .join('') || '<span class="muted">Inventário vazio.</span>';
  $$('.slot[data-slot]', box).forEach(
    (s) =>
      (s.onclick = async () => {
        const info = S.itemsByStatic.get(s.dataset.item);
        const total = +s.dataset.count;
        const q = prompt(`Remover quantos "${info ? info.name : s.dataset.item}" (de ${total})?`, String(total));
        const amount = parseInt(q, 10);
        if (!(amount > 0)) return;
        await cmd('remove_item', { player: S.selected, inventory: s.dataset.inv, slot: +s.dataset.slot, amount });
        loadInventory();
      }),
  );
}

// ------------------------------------------------------------------ items
const ITEM_PAGE = 240;
let itemLimit = ITEM_PAGE;
let itemCat = '';

function itemMatches(it, q) {
  if (itemCat && it.category !== itemCat) return false;
  if (!q) return true;
  return it._search.includes(q);
}

function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function renderItems() {
  const q = normalize($('#itemSearch').value.trim());
  const list = S.items.filter((it) => itemMatches(it, q));
  $('#itemCount').textContent = `${list.length} itens`;
  $('#itemGrid').innerHTML = list
    .slice(0, itemLimit)
    .map(
      (it) => `<div class="item" data-id="${esc(it.id)}" title="${esc(it.name)}\n${esc(it.id)}">
        ${it.icon ? `<img src="data/icons/${esc(it.icon)}" loading="lazy" alt="">` : '<div style="height:56px"></div>'}
        <span class="iname">${esc(it.name)}</span></div>`,
    )
    .join('');
  $('#itemMore').classList.toggle('hidden', list.length <= itemLimit);
}

function renderCats() {
  const cats = [...new Set(S.items.map((i) => i.category))].sort();
  $('#itemCats').innerHTML = ['', ...cats].map((c) => `<button class="chip ${c === itemCat ? 'active' : ''}" data-c="${esc(c)}">${esc(c || 'Todos')}</button>`).join('');
}

$('#itemCats').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  itemCat = b.dataset.c;
  itemLimit = ITEM_PAGE;
  renderCats();
  renderItems();
});
$('#itemSearch').addEventListener('input', () => {
  itemLimit = ITEM_PAGE;
  renderItems();
});
$('#itemMore').addEventListener('click', () => {
  itemLimit += ITEM_PAGE;
  renderItems();
});
$('#itemGrid').addEventListener('click', (e) => {
  const el = e.target.closest('.item');
  if (el) openGive(S.itemsById.get(el.dataset.id));
});

let giveItem = null;
function openGive(it) {
  if (!it) return;
  giveItem = it;
  $('#giveIcon').src = it.icon ? 'data/icons/' + it.icon : '';
  $('#giveName').textContent = it.name;
  $('#giveId').textContent = it.id + (it.name_en && it.name_en !== it.name ? ` · ${it.name_en}` : '');
  $('#giveDesc').textContent = it.desc || '';
  $('#giveMeta').textContent = `Categoria: ${it.category} · Pilha máx.: ${it.maxStack}${it.weight != null ? ` · Peso: ${it.weight / 1000} kg` : ''}`;
  $('#giveCount').value = 1;
  fillPlayerSelect();
  if (S.selected) $('#givePlayer').value = S.selected;
  $('#giveSubmit').disabled = !(S.state.players || []).length;
  $('#giveDialog').showModal();
}

$$('[data-qty]').forEach(
  (b) => (b.onclick = () => ($('#giveCount').value = b.dataset.qty === 'stack' ? giveItem?.maxStack || 1 : b.dataset.qty)),
);

$('#giveDialog').addEventListener('close', async () => {
  if ($('#giveDialog').returnValue !== 'ok' || !giveItem) return;
  const player = $('#givePlayer').value;
  const count = parseInt($('#giveCount').value, 10) || 1;
  if (!player) return toast('Nenhum jogador selecionado', false);
  await cmd('give_item', { player, item: giveItem.id, static: giveItem.static, count, maxStack: giveItem.maxStack });
  if (player === S.selected) loadInventory();
});

// ------------------------------------------------------------------ server tab
$('#broadcastForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await cmd('broadcast', { message: e.target.message.value });
  if (r.ok) e.target.reset();
});
$('#dilationForm').addEventListener('submit', (e) => {
  e.preventDefault();
  cmd('set_time_dilation', { value: parseFloat(e.target.value.value) });
});
$('#consoleForm').addEventListener('submit', (e) => {
  e.preventDefault();
  cmd('console', { command: e.target.command.value });
});
$('#selftestBtn').addEventListener('click', async () => {
  const r = await cmd('selftest', {}, { quiet: true });
  const out = $('#selftestOut');
  out.classList.remove('hidden');
  out.textContent = JSON.stringify(r, null, 2);
});

// ------------------------------------------------------------------ log
function renderBadge() {
  const b = $('#logBadge');
  b.textContent = S.unread;
  b.classList.toggle('hidden', !S.unread);
}

function logRow(ev) {
  const t = new Date(ev.t || Date.now()).toLocaleTimeString();
  return `<div class="log-item ${esc(ev.kind)}"><time>${t}</time><span>${esc(ev.text)}</span></div>`;
}

function renderLog() {
  const list = S.log.filter((e) => !S.logFilter || e.kind === S.logFilter || (S.logFilter === 'join' && e.kind === 'leave'));
  $('#logList').innerHTML = list.slice(-300).reverse().map(logRow).join('') || '<div class="empty">Sem eventos.</div>';
}

$$('.log-filters .chip').forEach(
  (b) =>
    (b.onclick = () => {
      $$('.log-filters .chip').forEach((x) => x.classList.toggle('active', x === b));
      S.logFilter = b.dataset.kind;
      renderLog();
    }),
);

function addLog(ev) {
  S.log.push(ev);
  if (S.log.length > 500) S.log.shift();
  if (!$('#tab-log').classList.contains('active') && ev.kind !== 'admin') {
    S.unread++;
    renderBadge();
  }
  if (ev.kind === 'chat') toast('💬 ' + ev.text);
  renderLog();
}

// ------------------------------------------------------------------ live updates
function connectEvents() {
  const es = new EventSource('/api/events');
  es.addEventListener('state', (e) => {
    S.state = JSON.parse(e.data);
    renderStatus();
    renderPlayers();
    positionMarkers();
  });
  es.addEventListener('history', (e) => {
    S.log = JSON.parse(e.data);
    renderLog();
  });
  es.addEventListener('log', (e) => addLog(JSON.parse(e.data)));
  es.onerror = () => {
    es.close();
    setTimeout(async () => {
      try {
        await api('/api/me');
        connectEvents();
      } catch {}
    }, 3000);
  };
}

// ------------------------------------------------------------------ boot
async function start() {
  const me = await api('/api/me').catch(() => null);
  if (!me || !me.name) return showLogin();
  S.me = me;
  $('#userName').textContent = me.name;
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');

  const [items, maps] = await Promise.all([fetch('data/items.json', { cache: 'no-cache' }).then((r) => r.json()), fetch('data/maps.json', { cache: 'no-cache' }).then((r) => r.json())]);
  S.items = items
    .filter((i) => i.name && !/^INVTEXT|\[DNT\]/.test(i.name))
    .map((i) => ({ ...i, _search: normalize(`${i.name} ${i.name_en} ${i.id}`) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  for (const i of items) {
    S.itemsById.set(i.id, i);
    if (!S.itemsByStatic.has(i.static)) S.itemsByStatic.set(i.static, i);
  }
  S.maps = maps;
  const order = Object.entries(maps).sort((a, b) => b[1].tiles.length - a[1].tiles.length || a[0].localeCompare(b[0]));
  $('#mapSelect').innerHTML = order.map(([id, m]) => `<option value="${esc(id)}">${esc(m.name)}</option>`).join('');
  loadMap(order[0][0]);
  renderCats();
  renderItems();
  connectEvents();
}

start();
