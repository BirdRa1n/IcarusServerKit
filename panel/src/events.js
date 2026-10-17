'use strict';
// Live event feed: keeps the recent history and pushes state/events to browsers (server-sent events).

const MAX_HISTORY = 400;

function createEvents() {
  const history = [];
  const clients = new Set();

  function broadcast(type, data) {
    const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of clients) c.write(msg);
  }

  function push(ev) {
    ev.t = ev.t || Date.now();
    history.push(ev);
    if (history.length > MAX_HISTORY) history.shift();
    broadcast('log', ev);
  }

  function subscribe(res) {
    clients.add(res);
    const keepAlive = setInterval(() => res.write(': ka\n\n'), 20000);
    res.on('close', () => {
      clearInterval(keepAlive);
      clients.delete(res);
    });
  }

  return { push, broadcast, subscribe, history: () => history };
}

module.exports = { createEvents };
