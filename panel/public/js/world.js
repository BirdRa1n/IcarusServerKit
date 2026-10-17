// World tab: time of day, weather, save, broadcast, gather players, console, diagnostics.
import { $, esc, icon, bindButton, hydrateIcons } from './ui.js';
import { t } from './i18n.js';
import { store, command, players } from './api.js';

const card = (ic, title, desc, body) => `<div class="card"><h3>${icon(ic)}${esc(t(title))}</h3>${desc ? `<p>${esc(t(desc))}</p>` : ''}${body}</div>`;

export function render() {
  const v = $('#view-world');
  const hour = store.state.hour;
  v.innerHTML = `<div class="stagger" style="display:flex;flex-direction:column;gap:12px">
    ${card('sun', 'world.time', 'world.timeDesc', `
      <div class="row"><input id="wHour" type="range" min="0" max="23" value="${hour ?? 12}" style="flex:1;padding:0">
        <b class="mono" id="wHourLabel" style="width:48px;text-align:right">${String(hour ?? 12).padStart(2, '0')}:00</b>
        <button class="btn" id="wSetTime">${esc(t('world.setTime'))}</button></div>`)}
    ${card('cloud', 'world.weather', 'world.weatherDesc', `<div class="row end"><button class="btn" id="wWeather">${icon('cloud')}${esc(t('world.stopWeather'))}</button></div>`)}
    ${card('save', 'world.save', 'world.saveDesc', `<div class="row end"><button class="btn" id="wSave">${icon('save')}${esc(t('world.saveBtn'))}</button></div>`)}
    ${card('send', 'world.broadcast', '', `<form class="row" id="wBroadcast"><input name="message" placeholder="${esc(t('world.message'))}" required maxlength="200"><button class="btn primary" type="submit">${icon('send')}${esc(t('world.send'))}</button></form>`)}
    ${card('group', 'world.bringAll', 'world.bringAllDesc', `<div class="row"><select id="wGather">${players().map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select><button class="btn" id="wGatherBtn" ${players().length > 1 ? '' : 'disabled'}>${icon('group')}${esc(t('act.bringAll'))}</button></div>`)}
    ${card('terminal', 'world.console', '', `<form class="row" id="wConsole"><input name="command" class="mono" required><button class="btn" type="submit">${esc(t('world.run'))}</button></form>`)}
    ${card('activity', 'world.diag', 'world.diagDesc', `<div class="row end"><button class="btn" id="wTest">${icon('activity')}${esc(t('world.test'))}</button></div><pre class="pre" id="wTestOut" hidden></pre>`)}
  </div>`;
  hydrateIcons(v);
  [...v.querySelectorAll('.stagger > *')].forEach((el, i) => el.style.setProperty('--i', i));

  const slider = $('#wHour');
  slider.oninput = () => ($('#wHourLabel').textContent = `${String(slider.value).padStart(2, '0')}:00`);
  bindButton($('#wSetTime'), () => command('set_time', { hour: Number(slider.value) }));
  bindButton($('#wWeather'), () => command('stop_weather'));
  bindButton($('#wSave'), () => command('save_world'));
  bindButton($('#wGatherBtn'), () => command('bring_all', { player: $('#wGather').value }));
  bindButton($('#wTest'), async () => {
    const r = await command('selftest', {}, { quiet: true });
    const out = $('#wTestOut');
    out.hidden = false;
    out.textContent = JSON.stringify(r.ok ? r.result : { error: r.errorText }, null, 2);
  });
  $('#wBroadcast').onsubmit = async (e) => {
    e.preventDefault();
    const r = await command('broadcast', { message: e.target.message.value });
    if (r.ok) e.target.reset();
  };
  $('#wConsole').onsubmit = (e) => {
    e.preventDefault();
    command('console', { command: e.target.command.value });
  };
}
