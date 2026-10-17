// Rules tab: inactivity kick, minimum players, in-game messages, exempt players, bans.
import { $, $$, esc, icon, bindButton, toast, hydrateIcons, fmtClock } from './ui.js';
import { t } from './i18n.js';
import { store, api, command, emit } from './api.js';

const MESSAGES = ['idleWarning', 'idleKick', 'soloWarning', 'soloKick', 'banKick'];

export async function load() {
  try {
    store.settings = await api('/api/settings');
  } catch {}
}

export async function render() {
  const v = $('#view-rules');
  if (!store.settings) await load();
  const s = store.settings;
  if (!s) return;
  const idle = s.rules.idle;
  const mp = s.rules.minPlayers;
  const countdown = store.state.rules?.minPlayers;
  const num = (name, value, min, max) => `<input name="${name}" type="number" min="${min}" max="${max}" value="${value}" required>`;
  const sw = (name, on) => `<label class="switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><i></i></label>`;

  v.innerHTML = `<form id="rulesForm" class="stagger" style="display:flex;flex-direction:column;gap:12px">
    <div class="card ${idle.enabled ? '' : 'disabled'}" data-toggle="idle" style="--i:0">
      <div class="row"><h3 style="flex:1">${icon('moon')}${esc(t('rules.idle'))}</h3>${sw('idle.enabled', idle.enabled)}</div>
      <p>${esc(t('rules.idleDesc'))}</p>
      <div class="grid2">
        <label>${esc(t('rules.minutes'))}${num('idle.minutes', idle.minutes, 1, 1440)}</label>
        <label>${esc(t('rules.warn'))}${num('idle.warnMinutes', idle.warnMinutes, 0, 60)}</label>
      </div>
    </div>
    <div class="card ${mp.enabled ? '' : 'disabled'}" data-toggle="mp" style="--i:1">
      <div class="row"><h3 style="flex:1">${icon('users')}${esc(t('rules.min'))}</h3>${sw('mp.enabled', mp.enabled)}</div>
      <p>${esc(t('rules.minDesc'))}</p>
      ${countdown ? `<div class="countdown">${icon('timer')}<span style="flex:1">${esc(t('rules.countdown'))}</span><b id="rulesCountdown">${fmtClock(countdown.remaining)}</b></div>` : ''}
      <div class="grid3">
        <label>${esc(t('rules.players'))}${num('mp.players', mp.players, 2, 100)}</label>
        <label>${esc(t('rules.after'))}${num('mp.minutes', mp.minutes, 1, 1440)}</label>
        <label>${esc(t('rules.every'))}${num('mp.warnEveryMinutes', mp.warnEveryMinutes, 1, 120)}</label>
      </div>
    </div>
    <div class="card" style="--i:2">
      <h3>${icon('chat')}${esc(t('rules.messages'))}</h3>
      <p>${esc(t('rules.placeholders'))}</p>
      ${MESSAGES.map((k) => `<label>${esc(t(`msg.${k}`))}<input name="msg.${k}" value="${esc(s.messages[k])}" maxlength="300"></label>`).join('')}
    </div>
    <div class="card" style="--i:3">
      <h3>${icon('shield')}${esc(t('rules.exempt'))}</h3>
      <p>${esc(t('rules.exemptDesc'))}</p>
      <div class="list">${s.exempt.length
        ? s.exempt.map((id) => `<div class="list-item"><div class="grow mono">${esc(nameOf(id))}</div><button type="button" class="btn ghost sm" data-unexempt="${esc(id)}">${esc(t('rules.remove'))}</button></div>`).join('')
        : `<p>${esc(t('rules.noExempt'))}</p>`}</div>
      <div class="row"><input id="exemptId" class="mono" placeholder="${esc(t('rules.exemptAdd'))}"><button type="button" class="btn" id="exemptAdd">${esc(t('rules.add'))}</button></div>
    </div>
    <div class="card" style="--i:4">
      <h3>${icon('ban')}${esc(t('rules.bans'))}</h3>
      <div class="list">${s.bans.length
        ? s.bans.map((b) => `<div class="list-item"><div class="grow"><div><b>${esc(b.name)}</b></div><div class="muted mono">${esc(b.id)}${b.reason ? ` · ${esc(b.reason)}` : ''}</div></div>
            <button type="button" class="btn ghost sm" data-unban="${esc(b.id)}">${esc(t('rules.unban'))}</button></div>`).join('')
        : `<p>${esc(t('rules.noBans'))}</p>`}</div>
    </div>
    <div class="save-bar"><button class="btn primary" type="submit">${icon('save')}${esc(t('rules.save'))}</button></div>
  </form>`;
  hydrateIcons(v);

  const form = $('#rulesForm');
  $$('[data-toggle] .switch input', v).forEach((cb) => (cb.onchange = () => cb.closest('.card').classList.toggle('disabled', !cb.checked)));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const next = structuredClone(store.settings);
    next.rules.idle = { enabled: f.has('idle.enabled'), minutes: Number(f.get('idle.minutes')), warnMinutes: Number(f.get('idle.warnMinutes')) };
    next.rules.minPlayers = { enabled: f.has('mp.enabled'), players: Number(f.get('mp.players')), minutes: Number(f.get('mp.minutes')), warnEveryMinutes: Number(f.get('mp.warnEveryMinutes')) };
    for (const k of MESSAGES) next.messages[k] = f.get(`msg.${k}`);
    store.settings = await api('/api/settings', next, 'PUT');
    toast(t('rules.saved'));
    render();
  };
  $$('[data-unban]', v).forEach((b) => bindButton(b, async () => {
    await command('unban', { id: b.dataset.unban });
    await reload();
  }));
  $$('[data-unexempt]', v).forEach((b) => bindButton(b, async () => {
    await command('set_exempt', { id: b.dataset.unexempt, exempt: false });
    await reload();
  }));
  bindButton($('#exemptAdd'), async () => {
    const id = $('#exemptId').value.trim();
    if (!id) return;
    await command('set_exempt', { id, exempt: true });
    await reload();
  });
}

function nameOf(id) {
  const p = (store.state.players || []).find((x) => x.steamId === id || x.id === id);
  return p ? `${p.name} (${id})` : id;
}

async function reload() {
  await load();
  render();
  emit('settings-reloaded');
}

/** Live countdown of the minimum-players rule. */
export function tick() {
  const el = $('#rulesCountdown');
  const c = store.state.rules?.minPlayers;
  if (el && c) el.textContent = fmtClock(c.remaining);
}
