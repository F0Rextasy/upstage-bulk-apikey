#!/usr/bin/env node
'use strict';

/**
 * Rescue finisher: walk already-created Upstage accounts (credentials from
 * outputs/acct*-unverified.json) through login -> terms -> create key -> live
 * verify. One browser, one isolated context per account, rotating exits.
 *
 *   node src/finish.js [--conc 2] [--port 9292] [--attempts 3] [--limit N] [--only 28,27]
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');
const M = require('./mint');
const signup = require('./flow');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const CONC = parseInt(opt('--conc', '2'), 10);
const PORT = parseInt(opt('--port', '9292'), 10);
const ATTEMPTS = parseInt(opt('--attempts', '3'), 10);
const LIMIT = parseInt(opt('--limit', '0'), 10);
const ONLY = opt('--only', '');
const STATE = path.join(L.OUT, 'finish-state.json');

function candidates() {
  const out = [];
  for (const f of fs.readdirSync(L.OUT)) {
    const m = f.match(/^acct(\d+)-unverified\.json$/);
    if (!m) continue;
    try {
      const d = L.readJson(path.join(L.OUT, f), {});
      if (d.email && d.password) out.push({ id: Number(m[1]), email: d.email, password: d.password });
    } catch {}
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

(async () => {
  const state = L.readJson(STATE, { done: {} });
  let list = candidates();
  if (ONLY) {
    const set = new Set(ONLY.split(',').map(Number));
    list = list.filter((c) => set.has(c.id));
  }
  list = list.filter((c) => !state.done[c.id]);
  if (LIMIT > 0) list = list.slice(0, LIMIT);
  L.log(`FINISH start: ${list.length} accounts, conc=${CONC}, port=${PORT}, attempts=${ATTEMPTS}`);

  const self = await L.ownIp();
  const pool = new M.ExitPool({ selfIp: self, concurrency: 6 });
  await pool.pump(1);
  L.log(`FINISH exits ready: ${pool.ready.length}`);

  const profile = path.join(L.HERE, `.up-chrome-${PORT}`);
  const launch = () => L.ensureChrome(PORT, profile, { headless: !args.includes('--headed') });
  await launch();
  let cdp = null;
  const connectCdp = async () => {
    try {
      cdp && cdp.close();
    } catch {}
    const ws = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).then((j) => j.webSocketDebuggerUrl);
    cdp = new L.CDP(ws, {});
    cdp.on('error', () => {});
    await cdp.connect();
  };
  await connectCdp();
  const browserAlive = async () => {
    try {
      return (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok;
    } catch {
      return false;
    }
  };

  let cursor = 0;
  let keys = 0;
  const tally = { ok: 0, unconfirmed: 0, gaveUp: 0 };

  async function worker() {
    while (true) {
      const c = list[cursor++];
      if (!c) return;
      let made = false;
      let lastErr = null;
      for (let attempt = 1; attempt <= ATTEMPTS && !made; attempt++) {
        if (!(await browserAlive())) {
          L.log(`[${c.id}] browser gone — relaunching`);
          await launch();
          await connectCdp();
        }
        pool.topUp(CONC).catch(() => {});
        const slot = await pool.take();
        if (!slot) {
          lastErr = new Error('no exit slot');
          continue;
        }
        let res = null;
        try {
          res = await signup.mintAccount({ id: c.id, cdp, slot, mailbox: { address: c.email }, existing: { email: c.email, password: c.password } });
          if (!res || !res.key) throw new Error('no key');
          const v = await M.verifyKey(res.key, { chat: true, pool });
          if (!v.ok) {
            fs.writeFileSync(path.join(L.OUT, `finish${c.id}-unverified.json`), JSON.stringify({ email: c.email, key: res.key, verify: v }, null, 2));
            L.log(`[${c.id}] KEY UNVERIFIED ${v.status || ''} ${v.note || ''}`.slice(0, 220));
            made = true;
            break;
          }
          M.appendKey(res.key);
          M.appendAccount({
            id: c.id,
            email: c.email,
            password: c.password,
            key: res.key,
            keyMasked: `${res.key.slice(0, 6)}…${res.key.slice(-4)}`,
            verified: true,
            verifyProxy: v.proxy,
            models: v.models,
            chat: v.chat,
            chatModel: v.chatModel || null,
            chatReply: v.chatReply || null,
            source: 'finish-login',
            ts: new Date().toISOString(),
          });
          const st = L.readJson(STATE, { done: {} });
          st.done[c.id] = `${res.key.slice(0, 6)}…${res.key.slice(-4)}`;
          L.saveJson(STATE, st);
          keys++;
          tally.ok++;
          L.log(`[${c.id}] OK ${res.key.slice(0, 8)}…${res.key.slice(-4)} chat=${v.chat} models=${(v.models || []).length}`);
          made = true;
        } catch (e) {
          lastErr = e;
          L.log(`[${c.id}] FAIL try${attempt} ${String(e.message).slice(0, 200)}`);
          await L.sleep(800);
        } finally {
          if (res && res.cleanup) {
            try {
              await res.cleanup();
            } catch {}
          }
          pool.release(slot);
        }
      }
      if (!made) {
        tally.gaveUp++;
        if (lastErr && /unconfirmed/i.test(lastErr.message)) tally.unconfirmed++;
        L.log(`[${c.id}] GAVE UP: ${lastErr ? String(lastErr.message).slice(0, 160) : 'no result'}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONC, list.length) }, worker));
  L.log(`FINISH done. keys=${keys} ok=${tally.ok} unconfirmed=${tally.unconfirmed} gaveUp=${tally.gaveUp}`);
  try {
    cdp.close();
  } catch {}
  process.exit(0);
})().catch((e) => {
  L.log(`FINISH fatal: ${e.stack || e.message}`);
  process.exit(1);
});
