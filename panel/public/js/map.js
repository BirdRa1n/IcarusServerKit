// World map: tiles positioned in screen space, live player markers, pan/zoom, context menu.
// World axes: +X is north (up), +Y is east (right).
import { $, $$, esc, icon, toast } from './ui.js';
import { t, gameText } from './i18n.js';
import { store, command, players, emit } from './api.js';

const M = { el: null, layer: null, markers: null, scale: 1, ox: 0, oy: 0, bounds: null, tiles: [], mapId: null, userMoved: false };

const W2P = (x, y) => [y - M.bounds.minY, M.bounds.maxX - x];
const P2W = (px, py) => [M.bounds.maxX - py, px + M.bounds.minY];

function screenToWorld(sx, sy) {
  const r = M.el.getBoundingClientRect();
  return P2W((sx - r.left - M.ox) / M.scale, (sy - r.top - M.oy) / M.scale);
}

function applyTransform() {
  for (const { el, t: tile } of M.tiles) {
    const [px, py] = W2P(tile.maxX, tile.minY);
    const l = Math.floor(M.ox + px * M.scale);
    const top = Math.floor(M.oy + py * M.scale);
    // round outward so neighbouring tiles overlap by a pixel (no hairline seams)
    el.style.left = `${l}px`;
    el.style.top = `${top}px`;
    el.style.width = `${Math.ceil(M.ox + (px + tile.maxY - tile.minY) * M.scale) - l + 1}px`;
    el.style.height = `${Math.ceil(M.oy + (py + tile.maxX - tile.minX) * M.scale) - top + 1}px`;
  }
  renderMarkers(true);
}

function fit() {
  if (!M.bounds) return;
  const r = M.el.getBoundingClientRect();
  if (!r.width || !r.height) return requestAnimationFrame(fit); // layout not ready yet
  const w = M.bounds.maxY - M.bounds.minY;
  const h = M.bounds.maxX - M.bounds.minX;
  M.scale = Math.min(r.width / w, r.height / h) * 0.94;
  M.ox = (r.width - w * M.scale) / 2;
  M.oy = (r.height - h * M.scale) / 2 + 18;
  applyTransform();
}

function zoomAt(mx, my, factor) {
  const ns = Math.min(Math.max(M.scale * factor, 0.00004), 0.25);
  M.ox = mx - ((mx - M.ox) * ns) / M.scale;
  M.oy = my - ((my - M.oy) * ns) / M.scale;
  M.scale = ns;
  M.userMoved = true;
  applyTransform();
}

export function loadMap(id) {
  const m = store.maps[id];
  if (!m) return;
  M.mapId = id;
  $('#mapSelect').value = id;
  M.bounds = m.bounds;
  M.userMoved = false;
  M.layer.innerHTML = '';
  let tiles = m.tiles;
  if (!tiles.length) {
    // no map images (data built from dedicated-server files only): coordinate grid
    const step = 100800;
    tiles = [];
    for (let x = m.bounds.minX; x < m.bounds.maxX; x += step)
      for (let y = m.bounds.minY; y < m.bounds.maxY; y += step) tiles.push({ minX: x, maxX: x + step, minY: y, maxY: y + step });
  }
  M.tiles = tiles.map((tile) => {
    let el;
    if (tile.file) {
      el = new Image();
      el.draggable = false;
      el.onload = () => el.classList.add('loaded');
      el.src = `data/maps/${tile.file}`;
    } else {
      el = document.createElement('div');
      el.className = 'grid-tile';
    }
    M.layer.appendChild(el);
    return { el, t: tile };
  });
  fit();
}

export function mapForLevel(level) {
  if (!level) return null;
  for (const [id, m] of Object.entries(store.maps)) {
    const base = String(m.level || '').split('/').pop().split('.')[0];
    if (base === level || id === level) return id;
  }
  return null;
}

export const currentMap = () => M.mapId;

export function centerOn(p) {
  if (!p?.pos || !M.bounds || !(M.scale > 0)) return;
  const r = M.el.getBoundingClientRect();
  const [px, py] = W2P(p.pos.x, p.pos.y);
  M.ox = r.width / 2 - px * M.scale;
  M.oy = r.height / 2 - py * M.scale;
  M.userMoved = true;
  applyTransform();
}

/** Positions markers; `instant` skips the smooth movement (used while panning/zooming). */
export function renderMarkers(instant = false) {
  if (!M.bounds) return;
  M.markers.classList.toggle('no-anim', instant);
  const seen = new Set();
  for (const p of players()) {
    if (!p.pos) continue;
    seen.add(p.id);
    let el = M.markers.querySelector(`[data-id="${CSS.escape(p.id)}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'marker';
      el.dataset.id = p.id;
      el.innerHTML = `<div class="m-body"><div class="dot"><div class="dir"></div></div><div class="label"></div></div>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        emit('select', p.id);
      });
      el.style.transition = 'none';
      M.markers.appendChild(el);
    }
    const [px, py] = W2P(p.pos.x, p.pos.y);
    el.style.transition = instant ? 'none' : '';
    el.style.transform = `translate(${M.ox + px * M.scale}px, ${M.oy + py * M.scale}px)`;
    el.querySelector('.label').textContent = p.name;
    // yaw 0 = +X (up); positive yaw turns toward +Y (right)
    el.querySelector('.dir').style.transform = `translate(-50%, -100%) rotate(${p.yaw || 0}deg) translateY(-10px)`;
    el.classList.toggle('selected', p.id === store.selected);
    el.classList.toggle('dead', p.stats?.health?.[0] === 0);
  }
  for (const el of $$('.marker', M.markers)) if (!seen.has(el.dataset.id)) el.remove();
}

function pingAt(x, y) {
  const [px, py] = W2P(x, y);
  const el = document.createElement('div');
  el.className = 'ping-mark';
  el.style.left = `${M.ox + px * M.scale}px`;
  el.style.top = `${M.oy + py * M.scale}px`;
  M.markers.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function hideMenu() {
  $('#mapMenu').hidden = true;
}

function openMenu(e) {
  if (!M.bounds) return;
  const [x, y] = screenToWorld(e.clientX, e.clientY);
  const menu = $('#mapMenu');
  const list = players();
  const sel = list.find((p) => p.id === store.selected);
  const ordered = sel ? [sel, ...list.filter((p) => p !== sel)] : list;
  let html = `<div class="ctx-title mono">X ${x.toFixed(0)} · Y ${y.toFixed(0)}</div>`;
  if (!list.length) html += `<div class="ctx-title">${esc(t('map.none'))}</div>`;
  for (const p of ordered) html += `<button data-tp="${esc(p.id)}">${icon('crosshair')}${esc(t('map.tpHere', { name: p.name }))}</button>`;
  if (list.length > 1) html += `<button data-all="1">${icon('group')}${esc(t('map.tpAll'))}</button>`;
  html += `<button data-copy="1">${icon('copy')}${esc(t('map.copy'))}</button>`;
  menu.innerHTML = html;
  const wr = $('.map-wrap').getBoundingClientRect();
  menu.style.left = `${Math.min(e.clientX - wr.left, wr.width - 260)}px`;
  menu.style.top = `${Math.min(e.clientY - wr.top, wr.height - 60 - 40 * (list.length + 2))}px`;
  menu.hidden = false;
  menu.onclick = async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    hideMenu();
    if (b.dataset.copy) {
      navigator.clipboard?.writeText(`${x.toFixed(0)} ${y.toFixed(0)}`);
      toast(t('map.copied'));
      return;
    }
    pingAt(x, y);
    const ids = b.dataset.all ? list.map((p) => p.id) : [b.dataset.tp];
    for (const id of ids) await command('teleport', { player: id, x, y });
  };
}

export function initMap() {
  M.el = $('#map');
  M.layer = $('#mapLayer');
  M.markers = $('#markerLayer');

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
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    M.ox = drag.ox + dx;
    M.oy = drag.oy + dy;
    M.userMoved = true;
    M.el.classList.add('dragging');
    applyTransform();
  });
  M.el.addEventListener('pointerup', (e) => {
    const click = drag && !drag.moved;
    drag = null;
    M.el.classList.remove('dragging');
    if (click) openMenu(e);
  });
  M.el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!e.target.closest('.marker')) openMenu(e);
  });
  M.el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = M.el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );
  const zoomCenter = (f) => {
    const r = M.el.getBoundingClientRect();
    zoomAt(r.width / 2, r.height / 2, f);
  };
  $('#zoomIn').onclick = () => zoomCenter(1.5);
  $('#zoomOut').onclick = () => zoomCenter(1 / 1.5);
  $('#zoomFit').onclick = () => {
    M.userMoved = false;
    fit();
  };
  $('#mapSelect').onchange = (e) => {
    $('#followMap').checked = false;
    loadMap(e.target.value);
  };
  new ResizeObserver(() => (M.userMoved && M.scale > 0 ? applyTransform() : fit())).observe(M.el);
  document.addEventListener('pointerdown', (e) => !e.target.closest('#mapMenu') && !e.target.closest('#map') && hideMenu());
}

/** Map selector with localized names (largest maps first). */
export function fillMapSelect() {
  const order = Object.entries(store.maps).sort((a, b) => b[1].tiles.length - a[1].tiles.length || a[0].localeCompare(b[0]));
  const sel = $('#mapSelect');
  sel.innerHTML = order.map(([id, m]) => `<option value="${esc(id)}">${esc(gameText('maps', id, m.name)[0])}</option>`).join('');
  if (M.mapId) sel.value = M.mapId;
  return order;
}
