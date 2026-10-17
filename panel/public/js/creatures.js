// Creatures tab: bestiary catalog and spawn dialog (random points around a player).
import { $, $$, esc, icon, modal, normalize, hydrateIcons } from './ui.js';
import { t, gameText } from './i18n.js';
import { store, command, players } from './api.js';

const TAGS = ['passive', 'hostile', 'boss', 'special'];
let tag = '';
let query = '';
let index = [];

export function reindex() {
  index = store.creatures
    .map((c) => {
      const [name] = gameText('creatures', c.id, c.name);
      return { c, name, key: normalize(`${name} ${c.name} ${c.id}`) };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.c.id.localeCompare(b.c.id));
}

export function render() {
  const v = $('#view-creatures');
  v.innerHTML = `
    <div class="toolbar-sticky">
      <div class="search">${icon('search')}<input type="search" id="crSearch" placeholder="${esc(t('cr.search'))}" value="${esc(query)}"></div>
      <div class="pills">${['', ...TAGS].map((x) => `<button class="pill ${x === tag ? 'active' : ''}" data-tag="${x}">${esc(x ? t(`tag.${x}`) : t('all'))}</button>`).join('')}</div>
      <span class="count" id="crCount"></span>
    </div>
    <div class="catalog creatures" id="crGrid"></div>`;
  hydrateIcons(v);
  $('#crSearch').oninput = (e) => {
    query = e.target.value;
    renderGrid();
  };
  $$('.pill', v).forEach(
    (b) =>
      (b.onclick = () => {
        tag = b.dataset.tag;
        $$('.pill', v).forEach((x) => x.classList.toggle('active', x === b));
        renderGrid();
      }),
  );
  $('#crGrid').onclick = (e) => {
    const el = e.target.closest('.tile');
    if (el) openSpawn(el.dataset.id);
  };
  renderGrid();
}

const TAG_CLASS = { hostile: 'bad', boss: 'warn', passive: 'good', special: '' };

function renderGrid() {
  const q = normalize(query.trim());
  const list = index.filter((x) => (!tag || x.c.tag === tag) && (!q || x.key.includes(q)));
  $('#crCount').textContent = t('cr.count', { n: list.length });
  $('#crGrid').innerHTML = list
    .map(
      ({ c, name }, i) => `<div class="tile" data-id="${esc(c.id)}" title="${esc(c.id)}" style="animation: rise .4s var(--ease) both ${Math.min(i, 30) * 14}ms">
        <span class="tag ${TAG_CLASS[c.tag]}">${esc(t(`tag.${c.tag}`))}</span>
        ${c.image ? `<img src="data/creatures/${esc(c.image)}" loading="lazy" alt="">` : `<div class="ph">${icon('paw')}</div>`}
        <span class="tname">${esc(name)}</span><span class="muted mono" style="font-size:10px">${esc(c.id)}</span></div>`,
    )
    .join('');
}

/** Spawn dialog; `creatureId` optional (choose in the dialog), `playerId` preselects the player. */
export async function openSpawn(creatureId, playerId) {
  const list = players();
  const pre = playerId || store.selected;
  const c = store.creatures.find((x) => x.id === creatureId);
  const options = index.map(({ c: x, name }) => `<option value="${esc(x.id)}" ${x.id === creatureId ? 'selected' : ''}>${esc(name)} (${esc(x.id)})</option>`).join('');
  const r = await modal(
    `${c
      ? `<div class="modal-hero">${c.image ? `<img src="data/creatures/${esc(c.image)}" alt="">` : `<div class="ph">${icon('paw')}</div>`}
          <div><h2>${esc(gameText('creatures', c.id, c.name)[0])}</h2><div class="sub">${esc(c.id)}</div></div></div>
         <input type="hidden" name="creature" value="${esc(c.id)}">`
      : `<label>${esc(t('tab.creatures'))}<select name="creature">${options}</select></label>`}
     ${list.length
       ? `<label>${esc(t('spawn.near'))}<select name="player">${list.map((p) => `<option value="${esc(p.id)}" ${p.id === pre ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
          <div class="grid2">
            <label>${esc(t('spawn.amount'))}<input name="count" type="number" min="1" max="30" value="1" required></label>
            <label>${esc(t('spawn.level'))}<input name="level" type="number" min="1" max="200" value="10" required></label>
            <label>${esc(t('spawn.min'))}<input name="min" type="number" min="3" max="200" value="15" required></label>
            <label>${esc(t('spawn.max'))}<input name="max" type="number" min="3" max="300" value="40" required></label>
          </div>
          <p>${esc(t('spawn.hint'))}</p>`
       : `<p class="form-error">${esc(t('give.noPlayers'))}</p>`}`,
    {
      title: t('spawn.title'),
      submit: t('spawn.submit'),
      onOpen: (root) => {
        if (!list.length) $('[type=submit]', root).disabled = true;
      },
    },
  );
  if (!r) return;
  return command('spawn_creature', {
    player: r.player,
    creature: r.creature,
    count: Number(r.count),
    level: Number(r.level),
    minDistance: Number(r.min) * 100,
    maxDistance: Math.max(Number(r.min), Number(r.max)) * 100,
  });
}

export const openSpawnFor = (playerId) => openSpawn(null, playerId);
