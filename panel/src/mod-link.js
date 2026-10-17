'use strict';
/*
 * File-based link with the UE4SS mod (see mod/IcarusServerKit/Scripts/isk/ipc.lua):
 *   state.json      written by the mod every second
 *   commands.jsonl  appended here; the mod reads from its last offset
 *   results.jsonl   appended by the mod; tailed here and matched to pending commands
 *   events.jsonl    appended by the mod (chat, rule actions); tailed here
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const POLL_MS = 250;
const OFFLINE_AFTER_MS = 10000;

/** Returns a function that calls onLine(obj) for every complete JSON line appended to `file`. */
function tail(file, onLine) {
  let offset = 0;
  try {
    offset = fs.statSync(file).size; // skip what was written before the panel started
  } catch {}
  return () => {
    let size;
    try {
      size = fs.statSync(file).size;
    } catch {
      return;
    }
    if (size < offset) offset = 0; // recreated by the mod (server restart)
    if (size === offset) return;
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    const lastNl = buf.lastIndexOf(10);
    if (lastNl < 0) return;
    offset += lastNl + 1;
    for (const line of buf.subarray(0, lastNl).toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        onLine(JSON.parse(line));
      } catch {}
    }
  };
}

class ModLink extends EventEmitter {
  constructor(cfg) {
    super();
    this.dir = cfg.ipcDir;
    this.timeoutMs = cfg.commandTimeoutMs;
    this.state = { online: false, players: [] };
    this.pending = new Map(); // id -> { resolve, timer }
    this.seq = 0;
    this.stateMtime = 0;
    fs.mkdirSync(this.dir, { recursive: true });
    this.pollResults = tail(this.file('results.jsonl'), (r) => this.onResult(r));
    this.pollEvents = tail(this.file('events.jsonl'), (e) => this.emit('event', e));
  }

  file(name) {
    return path.join(this.dir, name);
  }

  start() {
    setInterval(() => {
      this.pollState();
      this.pollResults();
      this.pollEvents();
    }, POLL_MS);
    // keep commands.jsonl small: truncate it while nothing is pending (the mod resets its offset)
    setInterval(() => {
      try {
        if (this.pending.size === 0 && fs.statSync(this.file('commands.jsonl')).size > 256 * 1024) {
          fs.writeFileSync(this.file('commands.jsonl'), '');
        }
      } catch {}
    }, 30000);
  }

  pollState() {
    let st = null;
    try {
      st = fs.statSync(this.file('state.json'));
    } catch {}
    const now = Date.now();
    if (st && st.mtimeMs !== this.stateMtime) {
      this.stateMtime = st.mtimeMs;
      let s;
      try {
        s = JSON.parse(fs.readFileSync(this.file('state.json'), 'utf8'));
      } catch {
        return; // being replaced right now
      }
      const before = new Map((this.state.players || []).map((p) => [p.id, p]));
      this.state = { ...s, online: true, updatedAt: now };
      for (const p of this.state.players || []) {
        if (!before.has(p.id)) this.emit('event', { kind: 'join', player: p.name, t: now });
        before.delete(p.id);
      }
      for (const p of before.values()) this.emit('event', { kind: 'leave', player: p.name, t: now });
      this.emit('state', this.state);
    }
    if (this.state.online && (!st || now - st.mtimeMs > OFFLINE_AFTER_MS)) {
      this.state = { ...this.state, online: false, players: [] };
      this.emit('state', this.state);
      this.emit('event', { kind: 'system', code: 'mod_offline', t: now });
    }
  }

  onResult(r) {
    const p = this.pending.get(r.id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(r.id);
    p.resolve(r);
  }

  /** Queues a command for the mod and resolves with its result (or a timeout error). */
  send(cmd, by) {
    const id = `${Date.now()}_${++this.seq}`;
    fs.appendFileSync(this.file('commands.jsonl'), JSON.stringify({ ...cmd, id, by }) + '\n');
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ id, type: cmd.type, ok: false, error: 'timeout', code: 'timeout' });
      }, this.timeoutMs);
      this.pending.set(id, { resolve, timer });
    });
  }
}

module.exports = { ModLink };
