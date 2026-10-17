// Items tab: searchable catalog with categories, give-item dialog.
import { $, $$, esc, icon, modal, normalize, hydrateIcons } from './ui.js';
import { t, gameText } from './i18n.js';
import { store, command, players, emit } from './api.js';

const PAGE = 240;
const CATEGORIES = ['weapons', 'ammo', 'tools', 'armor', 'attachments', 'consumables', 'farming', 'building', 'benches', 'decoration', 'deployables', 'resources', 'workshop', 'other'];
let limit = PAGE;
let category = '';
let query = '';
let searchIndex = [];

/** Rebuilds names/search text for the current language. */
export function reindex() {
  searchIndex = store.items
    .map((it) => {
      const [name, desc] = gameText('items', it.id, it.name);
      return { it, name, desc, key: normalize(`${name} ${it.name} ${it.id}`) };
    })
    .filter((x) => x.name && !/^INVTEXT|\[DNT\]/.test(x.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function render() {
  const v = $('#view-items');
  const cats = CATEGORIES.filter((c) => store.items.some((i) => i.category === c));
  v.innerHTML = `
    <div class="toolbar-sticky">
      <div class="search">${icon('search')}<input type="search" id="itemSearch" placeholder="${esc(t('items.search'))}" value="${esc(query)}"></div>
      <div class="pills">${['', ...cats].map((c) => `<button class="pill ${c === category ? 'active' : ''}" data-c="${c}">${esc(c ? t(`cat.${c}`) : t('all'))}</button>`).join('')}</div>
      <span class="count" id="itemCount"></span>
    </div>
    <div class="catalog" id="itemGrid"></div>
    <button class="btn ghost" id="itemMore" hidden>${esc(t('items.more'))}</button>`;
  hydrateIcons(v);
  $('#itemSearch').oninput = (e) => {
    query = e.target.value;
    limit = PAGE;
    renderGrid();
  };
  $$('.pill', v).forEach(
    (b) =>
      (b.onclick = () => {
        category = b.dataset.c;
        limit = PAGE;
        $$('.pill', v).forEach((x) => x.classList.toggle('active', x === b));
        renderGrid();
      }),
  );
  $('#itemMore').onclick = () => {
    limit += PAGE;
    renderGrid();
  };
  $('#itemGrid').onclick = (e) => {
    const el = e.target.closest('.tile');
    if (el) openGive(store.itemsById.get(el.dataset.id));
  };
  renderGrid();
}

function renderGrid() {
  const q = normalize(query.trim());
  const list = searchIndex.filter((x) => (!category || x.it.category === category) && (!q || x.key.includes(q)));
  $('#itemCount').textContent = t('items.count', { n: list.length.toLocaleString() });
  $('#itemGrid').innerHTML = list
    .slice(0, limit)
    .map(
      ({ it, name }, i) => `<div class="tile" data-id="${esc(it.id)}" title="${esc(name)}\n${esc(it.id)}" style="animation: rise .4s var(--ease) both ${Math.min(i, 30) * 12}ms">
        ${it.icon ? `<img src="data/icons/${esc(it.icon)}" loading="lazy" alt="">` : `<div class="ph">${icon('box')}</div>`}
        <span class="tname">${esc(name)}</span></div>`,
    )
    .join('');
  $('#itemMore').hidden = list.length <= limit;
}

export async function openGive(it) {
  if (!it) return;
  const [name, desc] = gameText('items', it.id, it.name);
  const list = players();
  const preselect = store.giveTo || store.selected;
  const r = await modal(
    `<div class="modal-hero">
        ${it.icon ? `<img src="data/icons/${esc(it.icon)}" alt="">` : `<div class="ph">${icon('box')}</div>`}
        <div><h2>${esc(name)}</h2><div class="sub">${esc(it.id)}</div></div>
      </div>
      ${desc ? `<p>${esc(desc)}</p>` : ''}
      <div class="row muted" style="font-size:12px;gap:14px">
        <span>${esc(t(`cat.${it.category}`))}</span><span>${esc(t('give.maxStack'))}: ${it.maxStack}</span>
        ${it.weight != null ? `<span>${esc(t('give.weight'))}: ${(it.weight / 1000).toLocaleString()} kg</span>` : ''}
      </div>
      ${list.length
        ? `<label>${esc(t('give.player'))}<select name="player">${list.map((p) => `<option value="${esc(p.id)}" ${p.id === preselect ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
           <label>${esc(t('give.qty'))}<div class="qty-row"><input name="count" type="number" min="1" max="100000" value="1" required>
             <button type="button" class="btn ghost sm" data-q="1">1</button><button type="button" class="btn ghost sm" data-q="10">10</button>
             <button type="button" class="btn ghost sm" data-q="${it.maxStack}">${esc(t('give.stack'))}</button><button type="button" class="btn ghost sm" data-q="100">100</button></div></label>`
        : `<p class="form-error">${esc(t('give.noPlayers'))}</p>`}`,
    {
      submit: t('give.submit'),
      onOpen: (root) => {
        $$('[data-q]', root).forEach((b) => (b.onclick = () => ($('[name=count]', root).value = b.dataset.q)));
        if (!list.length) $('[type=submit]', root).disabled = true;
      },
    },
  );
  store.giveTo = null;
  if (!r) return;
  const res = await command('give_item', { player: r.player, item: it.id, static: it.static, count: Number(r.count), maxStack: it.maxStack });
  if (res.ok) emit('inventory-changed', r.player);
}
