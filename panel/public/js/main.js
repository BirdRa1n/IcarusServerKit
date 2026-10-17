// Entry point: login, tabs, live updates, language switching.
import { $, $$, hydrateIcons, countTo, fmtDuration, fmtClock } from './ui.js';
import { t, setLanguage, detectLanguage, onLanguageChange, fillLanguageSelects, gameText } from './i18n.js';
import { store, api, on, emit } from './api.js';
import { initMap, loadMap, mapForLevel, currentMap, renderMarkers, fillMapSelect } from './map.js';
import * as Players from './players.js';
import * as Items from './items.js';
import * as Creatures from './creatures.js';
import * as World from './world.js';
import * as Rules from './rules.js';
import * as Log from './log.js';

const VIEWS = { players: Players, items: Items, creatures: Creatures, world: World, rules: Rules, log: Log };
let activeTab = 'players';
let started = false;

// ---------------------------------------------------------------- tabs

function moveInk() {
  const btn = $(`.tabs button[data-tab="${activeTab}"]`);
  const ink = $('.tab-ink');
  if (!btn || !ink) return;
  ink.style.left = `${btn.offsetLeft + btn.offsetWidth * 0.2}px`;
  ink.style.width = `${btn.offsetWidth * 0.6}px`;
}

function showTab(name) {
  if (!VIEWS[name]) return;
  const order = Object.keys(VIEWS);
  const prev = activeTab;
  activeTab = name;
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.view').forEach((v) => {
    const id = v.id.replace('view-', '');
    v.classList.toggle('active', id === name);
    v.classList.toggle('leave-left', id !== name && order.indexOf(id) < order.indexOf(name));
  });
  moveInk();
  if (name === 'log') Log.clearUnread();
  if (name !== prev || name === 'world' || name === 'rules') VIEWS[name].render();
}

// ---------------------------------------------------------------- status

function renderStatus() {
  const st = store.state;
  const chip = $('#statusChip');
  chip.className = `chip-status ${st.online ? 'on' : 'off'}`;
  chip.querySelector('span').textContent = st.online ? t('top.online') : t('top.offline');
  countTo($('#statPlayers'), (st.players || []).length);
  const mapId = mapForLevel(st.map);
  $('#statMap').textContent = mapId ? gameText('maps', mapId, store.maps[mapId].name)[0] : st.map || '—';
  $('#statUptime').textContent = st.online ? fmtDuration(st.uptime) : '—';
  $('#chipHour').hidden = !(st.online && st.hour != null);
  $('#statHour').textContent = `${String(st.hour ?? 0).padStart(2, '0')}:00`;
  const cd = st.rules?.minPlayers;
  $('#chipCountdown').hidden = !cd;
  if (cd) $('#statCountdown').textContent = fmtClock(cd.remaining);
  if ($('#followMap').checked && mapId && mapId !== currentMap()) loadMap(mapId);
}

function onState(s) {
  store.state = s;
  renderStatus();
  renderMarkers();
  Players.update();
  Rules.tick();
}

// ---------------------------------------------------------------- live updates

function connect() {
  const es = new EventSource('/api/events');
  es.addEventListener('state', (e) => onState(JSON.parse(e.data)));
  es.addEventListener('history', (e) => {
    store.log = JSON.parse(e.data);
    if (activeTab === 'log') Log.render();
  });
  es.addEventListener('log', (e) => Log.add(JSON.parse(e.data), activeTab === 'log'));
  es.onerror = () => {
    es.close();
    setTimeout(() => api('/api/me').then(connect, () => {}), 3000);
  };
}

// ---------------------------------------------------------------- login / boot

function showLogin() {
  $('#app').hidden = true;
  $('#login').hidden = false;
}

async function start() {
  const me = await api('/api/me').catch(() => null);
  if (!me?.name) return showLogin();
  store.me = me;
  $('#userName').textContent = me.name;
  $('#login').hidden = true;
  $('#app').hidden = false;
  if (started) return;
  started = true;

  const json = (p) => fetch(p, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null));
  const [items, maps, creatures] = await Promise.all([json('data/items.json'), json('data/maps.json'), json('data/creatures.json')]);
  store.items = items || [];
  store.maps = maps || {};
  store.creatures = creatures || [];
  for (const it of store.items) {
    store.itemsById.set(it.id, it);
    if (!store.itemsByStatic.has(it.static)) store.itemsByStatic.set(it.static, it);
  }
  Items.reindex();
  Creatures.reindex();
  initMap();
  const order = fillMapSelect();
  if (order.length) loadMap(order[0][0]);
  Players.render();
  moveInk();
  connect();
}

function boot() {
  hydrateIcons();
  fillLanguageSelects();

  $$('.tabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
  window.addEventListener('resize', moveInk);
  on('tab', showTab);
  on('select', (id) => Players.selectPlayer(id));
  on('logout', showLogin);
  on('settings-changed', () => Rules.load().then(() => activeTab === 'rules' && Rules.render()));

  onLanguageChange(() => {
    if (!started) return;
    Items.reindex();
    Creatures.reindex();
    fillMapSelect();
    renderStatus();
    VIEWS[activeTab].render();
    if (activeTab !== 'players') Players.render();
    requestAnimationFrame(moveInk);
  });

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const r = await api('/api/login', { name: f.get('name'), password: f.get('password') });
    if (!r.ok) {
      $('#loginError').textContent = t('login.invalid');
      const card = $('.login-card');
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      return;
    }
    $('#loginError').textContent = '';
    start();
  });
  $('#logoutBtn').onclick = async () => {
    await api('/api/logout', {});
    location.reload();
  };

  start();
}

setLanguage(detectLanguage()).then(boot);
