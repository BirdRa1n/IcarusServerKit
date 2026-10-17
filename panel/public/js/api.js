// Panel API client and shared application state.
import { t } from './i18n.js';
import { toast } from './ui.js';

export const store = {
  me: null,
  state: { online: false, players: [] },
  items: [],
  itemsById: new Map(),
  itemsByStatic: new Map(),
  creatures: [],
  maps: {},
  selected: null, // selected player id
  settings: null,
  log: [],
};

const listeners = new Map();
export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
}
export function emit(event, data) {
  for (const fn of listeners.get(event) || []) fn(data);
}

export async function api(path, body, method) {
  const opts = body === undefined ? {} : { method: method || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const res = await fetch(path, opts);
  if (res.status === 401 && path !== '/api/login') {
    emit('logout');
    throw new Error('not logged in');
  }
  return res.json();
}

function errorText(r) {
  if (r.code === 'timeout' || r.error === 'timeout') return t('err.timeout');
  if (r.error === 'forbidden') return t('err.forbidden');
  return r.error || 'error';
}

/** Sends a command; shows a toast with the result unless quiet. */
export async function command(type, args = {}, { quiet = false } = {}) {
  let r;
  try {
    r = await api('/api/command', { type, ...args });
  } catch (e) {
    r = { ok: false, error: e.message };
  }
  if (!r.ok) r.errorText = errorText(r);
  if (!quiet) toast(r.ok ? r.message || t('ok') : r.errorText, r.ok ? 'ok' : 'err');
  return r;
}

export const player = (id) => (store.state.players || []).find((p) => p.id === id);
export const players = () => store.state.players || [];
