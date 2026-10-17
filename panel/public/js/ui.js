// Shared UI helpers: DOM shortcuts, icons, toasts, modals, button feedback.
import { t } from './i18n.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Line icons (24x24, stroke-based)
const ICONS = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  paw: '<circle cx="5" cy="10" r="2"/><circle cx="9" cy="5.5" r="2"/><circle cx="15" cy="5.5" r="2"/><circle cx="19" cy="10" r="2"/><path d="M12 11c-3 0-6 4.5-6 7a3 3 0 0 0 3 3c1.2 0 2-.6 3-.6s1.8.6 3 .6a3 3 0 0 0 3-3c0-2.5-3-7-6-7z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  crosshair: '<circle cx="12" cy="12" r="9"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
  goto: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bring: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  group: '<circle cx="12" cy="7" r="3"/><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="m8 15 2.5-5M16 15l-2.5-5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  skull: '<circle cx="12" cy="10" r="7"/><path d="M9 21v-3M15 21v-3M12 21v-3"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4 12a4 4 0 0 0 0 7z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3"/>',
};

export function icon(name, cls = 'ic') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/** Fills every <svg data-icon="..."> placeholder. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('svg[data-icon]').forEach((svg) => {
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.innerHTML = ICONS[svg.dataset.icon] || '';
    svg.removeAttribute('data-icon');
  });
}

// ---------------------------------------------------------------- toasts

export function toast(message, kind = 'ok') {
  const el = document.createElement('div');
  const life = kind === 'err' ? 7000 : 4000;
  el.className = `toast ${kind}`;
  el.style.setProperty('--life', `${life}ms`);
  el.innerHTML = `${icon(kind === 'err' ? 'alert' : kind === 'chat' ? 'chat' : 'check')}<span>${esc(message)}</span>`;
  $('#toasts').appendChild(el);
  const close = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  };
  el.onclick = close;
  setTimeout(close, life);
}

// ---------------------------------------------------------------- modals

/**
 * Opens a modal. `body` is HTML; returns a promise resolved with the form values (or null on cancel).
 * opts: { title, submit, danger, onOpen(root) }
 */
export function modal(body, opts = {}) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<form class="modal glass" novalidate>
        ${opts.title ? `<h2>${esc(opts.title)}</h2>` : ''}
        ${body}
        <div class="row end">
          <button type="button" class="btn ghost" data-cancel>${esc(t('dlg.cancel'))}</button>
          <button type="submit" class="btn ${opts.danger ? 'danger' : 'primary'}">${esc(opts.submit || t('dlg.confirm'))}</button>
        </div>
      </form>`;
    $('#modalRoot').appendChild(back);
    hydrateIcons(back);
    const form = $('form', back);
    const close = (value) => {
      back.classList.add('closing');
      setTimeout(() => back.remove(), 200);
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = (e) => e.key === 'Escape' && close(null);
    document.addEventListener('keydown', onKey);
    back.addEventListener('mousedown', (e) => e.target === back && close(null));
    $('[data-cancel]', back).onclick = () => close(null);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      close(data);
    };
    opts.onOpen?.(back);
    setTimeout(() => (form.querySelector('input:not([type=hidden]),select,textarea') || $('[type=submit]', form)).focus(), 60);
  });
}

export const confirmDialog = (text, opts = {}) => modal(`<p>${esc(text)}</p>`, { danger: true, ...opts }).then((r) => r !== null);

// ---------------------------------------------------------------- buttons

/** Ripple on click + spinner while the returned promise runs. */
export function bindButton(btn, fn) {
  btn.addEventListener('click', async (e) => {
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    Object.assign(ripple.style, { width: `${d}px`, height: `${d}px`, left: `${e.clientX - r.left - d / 2}px`, top: `${e.clientY - r.top - d / 2}px` });
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    if (!fn) return;
    btn.classList.add('busy');
    try {
      await fn(e);
    } finally {
      btn.classList.remove('busy');
    }
  });
}

// ---------------------------------------------------------------- formatting

export function fmtDuration(s) {
  if (s == null) return '—';
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}

export function fmtClock(s) {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function initials(name) {
  return (String(name || '?').trim()[0] || '?').toUpperCase();
}

/** Animates a number change on an element. */
export function countTo(el, value) {
  const from = Number(el.dataset.value || 0);
  el.dataset.value = value;
  if (from === value || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = value;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / 500);
    el.textContent = Math.round(from + (value - from) * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
