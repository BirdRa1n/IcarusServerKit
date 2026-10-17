'use strict';
// Icarus Server Kit - web panel. No dependencies (Node 18+).
// Talks to the UE4SS mod running inside the dedicated server through files (src/mod-link.js).

const config = require('./src/config');
const { createAuth } = require('./src/auth');
const { ModLink } = require('./src/mod-link');
const { createSettings } = require('./src/settings');
const { createEvents } = require('./src/events');
const { createServer } = require('./src/http');

const cfg = config.load();
const auth = createAuth(cfg);
const events = createEvents();
const settings = createSettings(cfg.settingsPath);
const link = new ModLink(cfg);

link.on('state', (s) => events.broadcast('state', s));
link.on('event', (e) => events.push(e));
link.start();

createServer({ cfg, auth, link, settings, events }).listen(cfg.port, cfg.host, () => {
  console.log(`[panel] Icarus Server Kit on http://localhost:${cfg.port}`);
  console.log(`[panel] mod folder: ${cfg.ipcDir}`);
});
