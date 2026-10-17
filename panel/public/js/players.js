// Players tab: list, detail card with stats/actions, inventory.
import { $, $$, esc, icon, modal, confirmDialog, bindButton, fmtDuration, initials, hydrateIcons } from './ui.js';
import { t, gameText } from './i18n.js';
import { store, command, player, players, emit, on } from './api.js';
import { centerOn, renderMarkers } from './map.js';
import { openSpawnFor } from './creatures.js';

const view = () => $('#view-players');
const STAT_COLORS = { health: '#ff5d6c', stamina: '#ffc44d', food: '#f2a541', water: '#5aa8ff', oxygen: '#3ec7b5' };
let inventory = null; // last loaded inventory of the selected player

export function selectPlayer(id) {
  store.selected = id;
  inventory = null;
  emit('tab', 'players');
  render();
  renderMarkers();
  centerOn(player(id));
  loadInventory();
}

export function render() {
  const list = players();
  const sel = player(store.selected);
  if (store.selected && !sel) store.selected = null;
  const v = view();
  v.innerHTML = `
    <div class="player-list stagger">${list.length ? list.map(row).join('') : empty()}</div>
    ${sel ? detail(sel) : ''}`;
  hydrateIcons(v);
  $$('.player-row', v).forEach((r) => (r.onclick = () => selectPlayer(r.dataset.id)));
  if (sel) bindDetail(sel);
}

/** Light refresh on every state tick: keeps the DOM (and animations) when the player set is unchanged. */
export function update() {
  const v = view();
  const ids = players().map((p) => p.id).join('|');
  if (v.dataset.ids !== ids || (store.selected && !player(store.selected))) {
    v.dataset.ids = ids;
    return render();
  }
  for (const p of players()) {
    const r = v.querySelector(`.player-row[data-id="${CSS.escape(p.id)}"]`);
    if (r) r.querySelector('.meta').innerHTML = meta(p);
  }
  const sel = player(store.selected);
  if (sel) {
    const s = v.querySelector('.stats');
    const keys = Object.keys(sel.stats || {}).filter((k) => STAT_COLORS[k]).join('|');
    if (s && s.dataset.keys !== keys) {
      s.outerHTML = stats(sel);
    } else if (s) {
      for (const k of keys.split('|').filter(Boolean)) {
        const [val, max] = sel.stats[k];
        const el = s.querySelector(`.stat[data-k="${k}"]`);
        el.querySelector('b').textContent = `${val}/${max}`;
        el.querySelector('.bar > i').dataset.w = Math.max(0, Math.min(100, (val / max) * 100)).toFixed(1);
      }
    }
    const pos = v.querySelector('#pdPos');
    if (pos) pos.textContent = fmtPos(sel);
    requestAnimationFrame(animateBars);
  }
}

const fmtPos = (p) => (p.pos ? `${p.pos.x.toFixed(0)}  ${p.pos.y.toFixed(0)}  ${p.pos.z.toFixed(0)}` : '—');

function empty() {
  return `<div class="empty">${icon('users')}<span>${esc(store.state.online ? t('players.empty') : t('players.waiting'))}</span></div>`;
}

function meta(p) {
  const parts = [];
  if (p.stats?.level != null) parts.push(`${t('stat.level')} ${p.stats.level}`);
  if (p.ping != null) parts.push(`${p.ping} ms`);
  if (!p.pos) parts.push(t('players.noChar'));
  if (p.idle > 60) parts.push(t('players.idle', { time: fmtDuration(p.idle) }));
  return parts.map((x) => `<span>${esc(x)}</span>`).join('');
}

function row(p, i) {
  return `<div class="player-row ${p.id === store.selected ? 'selected' : ''}" data-id="${esc(p.id)}" style="--i:${i}">
      <div class="avatar">${esc(initials(p.name))}</div>
      <div class="pname">${esc(p.name)} ${p.exempt ? `<span class="tag good">${esc(t('players.exempt'))}</span>` : ''}</div>
      <div class="meta">${meta(p)}</div>
    </div>`;
}

function stats(p) {
  const s = p.stats || {};
  const keys = Object.keys(s).filter((k) => STAT_COLORS[k]);
  const bars = ['health', 'stamina', 'food', 'water', 'oxygen']
    .filter((k) => s[k])
    .map((k) => {
      const [v, max] = s[k];
      const pct = Math.max(0, Math.min(100, (v / max) * 100));
      return `<div class="stat" data-k="${k}"><div class="stat-top"><span>${esc(t(`stat.${k}`))}</span><b>${v}/${max}</b></div>
        <div class="bar"><i style="--c:${STAT_COLORS[k]}" data-w="${pct.toFixed(1)}"></i></div></div>`;
    })
    .join('');
  return `<div class="stats" data-keys="${keys.join('|')}">${bars}</div>`;
}

function animateBars() {
  $$('.bar > i[data-w]', view()).forEach((b) => (b.style.width = `${b.dataset.w}%`));
}

function detail(p) {
  const others = players().length > 1;
  const a = (act, ic, label, cls = '') => `<button class="btn ${cls}" data-a="${act}">${icon(ic)}<span>${esc(t(label))}</span></button>`;
  return `<div class="detail card">
      <div class="detail-head">
        <div class="avatar">${esc(initials(p.name))}</div>
        <div style="flex:1;min-width:0">
          <h2>${esc(p.name)}</h2>
          <div class="sub">${esc(p.steamId || p.id)}${p.stats?.level != null ? ` · ${esc(t('stat.level'))} ${p.stats.level}` : ''}${p.stats?.xp != null ? ` · ${p.stats.xp.toLocaleString()} ${esc(t('stat.xp'))}` : ''}</div>
          <div class="sub" id="pdPos">${esc(fmtPos(p))}</div>
        </div>
        <button class="btn icon ghost" data-a="close">${icon('x')}</button>
      </div>
      ${stats(p)}
      <div class="actions">
        ${a('heal', 'heart', 'act.heal')}${a('xp', 'star', 'act.xp')}${a('give', 'gift', 'act.give')}
        ${a('spawn', 'paw', 'act.spawn')}${a('tp', 'crosshair', 'act.tp')}${a('stats', 'sliders', 'act.stats')}
        ${others ? a('goto', 'goto', 'act.goto') + a('bring', 'bring', 'act.bring') + a('bringAll', 'group', 'act.bringAll') : ''}
        ${a('exempt', 'shield', p.exempt ? 'act.unexempt' : 'act.exempt')}${a('kill', 'skull', 'act.kill', 'danger')}${a('clear', 'trash', 'act.clear', 'danger')}
        ${a('kick', 'logout', 'act.kick', 'danger')}${a('ban', 'ban', 'act.ban', 'danger')}
      </div>
      <div class="row"><b style="flex:1">${esc(t('inv.title'))}</b><button class="btn ghost sm" data-a="refresh">${icon('refresh')}${esc(t('inv.refresh'))}</button></div>
      <div id="invBox">${inventoryHtml()}</div>
    </div>`;
}

function bindDetail(p) {
  const v = view();
  requestAnimationFrame(animateBars);
  $$('[data-a]', v).forEach((b) => bindButton(b, () => action(b.dataset.a, p)));
  bindSlots();
}

async function pickOther(p, title) {
  const others = players().filter((x) => x.id !== p.id);
  if (others.length === 1) return others[0].id;
  const r = await modal(
    `<label>${esc(t('dlg.player'))}<select name="target">${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('')}</select></label>`,
    { title },
  );
  return r?.target;
}

async function action(a, p) {
  switch (a) {
    case 'close':
      store.selected = null;
      render();
      renderMarkers();
      return;
    case 'refresh':
      return loadInventory();
    case 'heal':
      return command('heal', { player: p.id });
    case 'xp': {
      const r = await modal(`<label>${esc(t('dlg.amount'))}<input name="value" type="number" min="1" value="10000" required></label>`, { title: t('act.xp'), submit: t('act.xp') });
      if (r) return command('add_xp', { player: p.id, value: Number(r.value) });
      return;
    }
    case 'give':
      store.giveTo = p.id;
      return emit('tab', 'items');
    case 'spawn':
      return openSpawnFor(p.id);
    case 'tp': {
      const def = p.pos ? `${p.pos.x.toFixed(0)} ${p.pos.y.toFixed(0)}` : '0 0';
      const r = await modal(`<label>${esc(t('dlg.coords'))}<input name="c" value="${esc(def)}" required class="mono"></label>`, { title: t('act.tp'), submit: t('act.tp') });
      if (!r) return;
      const [x, y, z] = r.c.trim().split(/[\s,;]+/).map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      return command('teleport', { player: p.id, x, y, z: Number.isFinite(z) ? z : undefined });
    }
    case 'stats': {
      const opts = ['health', 'stamina', 'food', 'water', 'oxygen'].map((k) => `<option value="${k}">${esc(t(`stat.${k}`))}</option>`).join('');
      const r = await modal(
        `<div class="grid2"><label>${esc(t('dlg.stat'))}<select name="stat">${opts}</select></label>
         <label>${esc(t('dlg.percent'))}<input name="value" type="number" min="0" max="100" value="100" required></label></div>`,
        { title: t('act.stats') },
      );
      if (r) return command('set_stat', { player: p.id, stat: r.stat, value: Number(r.value) });
      return;
    }
    case 'goto': {
      const target = await pickOther(p, t('act.goto'));
      if (target) return command('teleport_to_player', { player: p.id, target });
      return;
    }
    case 'bring': {
      const target = await pickOther(p, t('act.bring'));
      if (target) return command('teleport_to_player', { player: target, target: p.id });
      return;
    }
    case 'bringAll':
      return command('bring_all', { player: p.id });
    case 'exempt':
      await command('set_exempt', { id: p.steamId || p.id, exempt: !p.exempt });
      emit('settings-changed');
      return;
    case 'kill':
      if (await confirmDialog(t('confirm.kill', { name: p.name }))) return command('kill', { player: p.id });
      return;
    case 'clear':
      if (await confirmDialog(t('confirm.clear', { name: p.name }))) {
        await command('clear_inventory', { player: p.id });
        return loadInventory();
      }
      return;
    case 'kick': {
      const r = await modal(`<p>${esc(t('confirm.kick', { name: p.name }))}</p><label>${esc(t('dlg.reason'))}<input name="reason"></label>`, { title: t('act.kick'), submit: t('act.kick'), danger: true });
      if (r) return command('kick', { player: p.id, reason: r.reason });
      return;
    }
    case 'ban': {
      const r = await modal(`<p>${esc(t('confirm.ban', { name: p.name }))}</p><label>${esc(t('dlg.reason'))}<input name="reason"></label>`, { title: t('act.ban'), submit: t('act.ban'), danger: true });
      if (r) {
        await command('ban', { player: p.id, reason: r.reason });
        emit('settings-changed');
      }
      return;
    }
  }
}

// ---------------------------------------------------------------- inventory

function inventoryHtml() {
  if (!inventory) {
    return `<div class="inv-grid">${Array.from({ length: 9 }, () => '<div class="slot skeleton"></div>').join('')}</div>`;
  }
  if (inventory.error) return `<p class="form-error">${esc(inventory.error)}</p>`;
  const sections = inventory.list
    .filter((inv) => inv.slots > 0 || inv.items.length)
    .map((inv) => {
      const bySlot = new Map(inv.items.map((it) => [it.slot, it]));
      const n = Math.max(inv.slots, ...inv.items.map((it) => it.slot + 1), 0);
      let cells = '';
      for (let i = 0; i < n; i++) {
        const it = bySlot.get(i);
        if (!it) {
          cells += '<div class="slot"></div>';
          continue;
        }
        const info = store.itemsByStatic.get(it.item);
        const name = info ? gameText('items', info.id, info.name)[0] : it.item;
        const dur = it.dyn?.Durability;
        cells += `<div class="slot filled" data-inv="${esc(inv.id)}" data-slot="${it.slot}" data-item="${esc(it.item)}" data-count="${it.count}"
            title="${esc(name)} ×${it.count}${dur != null ? ` · ${esc(t('inv.durability'))} ${dur}` : ''}">
          ${info?.icon ? `<img src="data/icons/${esc(info.icon)}" loading="lazy" alt="">` : `<span class="noicon">${esc(it.item)}</span>`}
          ${it.count > 1 ? `<span class="qty">${it.count}</span>` : ''}
        </div>`;
      }
      return `<div class="inv-section"><h4>${esc(t(`inv.${inv.id}`))}</h4><div class="inv-grid">${cells}</div></div>`;
    })
    .join('');
  return sections || `<p class="muted">${esc(t('inv.empty'))}</p>`;
}

function bindSlots() {
  $$('.slot.filled', view()).forEach(
    (s) =>
      (s.onclick = async () => {
        const info = store.itemsByStatic.get(s.dataset.item);
        const name = info ? gameText('items', info.id, info.name)[0] : s.dataset.item;
        const total = Number(s.dataset.count);
        const r = await modal(
          `<div class="modal-hero">${info?.icon ? `<img src="data/icons/${esc(info.icon)}" alt="">` : ''}<div><h2>${esc(name)}</h2><div class="sub">×${total}</div></div></div>
           <label>${esc(t('inv.howMany'))}<input name="amount" type="number" min="1" max="${total}" value="${total}" required></label>`,
          { title: t('inv.remove'), submit: t('inv.remove'), danger: true },
        );
        if (!r) return;
        await command('remove_item', { player: store.selected, inventory: s.dataset.inv, slot: Number(s.dataset.slot), amount: Number(r.amount) });
        loadInventory();
      }),
  );
}

export async function loadInventory() {
  const id = store.selected;
  if (!id) return;
  inventory = null;
  const box = $('#invBox');
  if (box) box.innerHTML = inventoryHtml();
  const r = await command('get_inventory', { player: id }, { quiet: true });
  if (store.selected !== id) return;
  inventory = r.ok ? { list: r.inventories } : { error: r.errorText };
  const b = $('#invBox');
  if (b) {
    b.innerHTML = inventoryHtml();
    bindSlots();
  }
}

on('inventory-changed', (id) => id === store.selected && loadInventory());
