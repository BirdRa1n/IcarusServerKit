// Log tab: chat, joins, admin actions, rule actions, errors.
import { $, $$, esc, toast } from './ui.js';
import { t } from './i18n.js';
import { store } from './api.js';

const FILTERS = [
  ['', 'log.all'],
  ['chat', 'log.chat'],
  ['admin', 'log.admin'],
  ['join', 'log.joins'],
  ['rule', 'log.rules'],
  ['error', 'log.errors'],
];
let filter = '';
let unread = 0;

/** Human text of an event, in the current language. */
function text(ev) {
  switch (ev.kind) {
    case 'join':
      return t('log.join', { name: ev.player });
    case 'leave':
      return t('log.leave', { name: ev.player });
    case 'system':
      return ev.code === 'mod_offline' ? t('log.offline') : ev.text;
    case 'admin':
    case 'error':
      return `[${ev.by}] ${ev.type === 'settings' ? t('log.settings') : ev.type}${ev.text ? `: ${ev.text}` : ''}`;
    default:
      return ev.text || '';
  }
}

const matches = (ev) => !filter || ev.kind === filter || (filter === 'join' && ev.kind === 'leave');

function row(ev) {
  const time = new Date(ev.t || Date.now()).toLocaleTimeString();
  return `<div class="log-item ${esc(ev.kind)}"><time>${time}</time><span>${esc(text(ev))}</span></div>`;
}

export function render() {
  const v = $('#view-log');
  v.innerHTML = `
    <div class="pills">${FILTERS.map(([k, label]) => `<button class="pill ${k === filter ? 'active' : ''}" data-k="${k}">${esc(t(label))}</button>`).join('')}</div>
    <div class="log-list" id="logList"></div>`;
  $$('.pill', v).forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.k;
        render();
      }),
  );
  const list = store.log.filter(matches).slice(-300).reverse();
  $('#logList').innerHTML = list.length ? list.map(row).join('') : `<div class="empty"><span>${esc(t('log.empty'))}</span></div>`;
}

export function add(ev, logVisible) {
  store.log.push(ev);
  if (store.log.length > 500) store.log.shift();
  if (ev.kind === 'chat') toast(text(ev), 'chat');
  if (logVisible) {
    if (!matches(ev)) return;
    const list = $('#logList');
    if (list.querySelector('.empty')) list.innerHTML = '';
    list.insertAdjacentHTML('afterbegin', row(ev));
  } else if (ev.kind !== 'admin') {
    unread++;
    badge();
  }
}

export function clearUnread() {
  unread = 0;
  badge();
}

function badge() {
  const b = $('#logBadge');
  b.textContent = unread > 99 ? '99+' : unread;
  b.hidden = !unread;
}
