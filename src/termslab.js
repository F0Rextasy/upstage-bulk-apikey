#!/usr/bin/env node
'use strict';

/**
 * Lab mode: walk one account to the /term gate and HALT there with the browser
 * alive, so the terms widget can be driven interactively via termsctl.js.
 *
 *   node src/termslab.js            (headless, port 9291)
 *   LAB_PORT=9292 node src/termslab.js
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');
const { ExitPool } = require('./mint');
const { mintAccount } = require('./flow');

const PORT = parseInt(process.env.LAB_PORT || '9291', 10);
const ID = parseInt(process.env.LAB_ID || '901', 10);
const LABFILE = path.join(L.OUT, 'lab-state.json');
const sleep = L.sleep;
const EXISTING = process.env.LAB_EMAIL && process.env.LAB_PASSWORD ? { email: process.env.LAB_EMAIL, password: process.env.LAB_PASSWORD } : null;

(async () => {
  const self = await L.ownIp();
  L.log(`LAB own ip: ${self || 'unknown'}`);

  const pool = new ExitPool({ selfIp: self, concurrency: 6 });
  await pool.pump(1);
  if (!pool.cands.length) pool.noteDirect();
  L.log(`LAB exits ready: ${pool.ready.length}`);

  await L.ensureChrome(PORT, path.join(L.HERE, `.up-chrome-${PORT}`), { headless: !process.argv.includes('--headed') });
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
  L.log('LAB CDP connected');

  const cdpAlive = async () => {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      return r.ok;
    } catch {
      return false;
    }
  };

  let res = null;
  let lastErr = null;
  for (let attempt = 1; attempt <= 4 && !(res && res.halt); attempt++) {
    // exits die within minutes: every attempt gets a fresh mailbox + fresh exit
    if (!(await cdpAlive())) {
      L.log(`LAB attempt ${attempt}: browser gone — relaunching`);
      await L.ensureChrome(PORT, path.join(L.HERE, `.up-chrome-${PORT}`), { headless: !process.argv.includes('--headed') });
      await connectCdp();
    }
    let mailbox = EXISTING ? { address: EXISTING.email } : null;
    if (!EXISTING) {
      try {
        mailbox = await L.newMailbox('mailtrap');
        L.log(`LAB attempt ${attempt}: mailbox ${mailbox.address} (${mailbox.provider}/${mailbox.base})`);
      } catch (e) {
        lastErr = e;
        L.log(`LAB attempt ${attempt}: no mailbox: ${e.message}`);
        await sleep(2000);
        continue;
      }
    }
    const slot = await pool.take();
    if (!slot) {
      lastErr = new Error('no exit slot');
      L.log(`LAB attempt ${attempt}: no exit slot`);
      break;
    }
    L.log(`LAB attempt ${attempt}: exit ${L.proxyLabel(slot.proxy)}`);
    try {
      res = await mintAccount({ id: ID, cdp, slot, mailbox, haltAtTerms: true, existing: EXISTING });
      if (!(res && res.halt)) L.log(`LAB attempt ${attempt}: unexpected result ${JSON.stringify(res).slice(0, 160)}`);
    } catch (e) {
      lastErr = e;
      L.log(`LAB attempt ${attempt} failed: ${String(e.message).slice(0, 180)}`);
      await sleep(1500);
    }
  }

  if (res && res.halt) {
    fs.writeFileSync(
      LABFILE,
      JSON.stringify({ port: PORT, id: ID, state: 'halted-terms', email: res.email, password: res.password, ts: new Date().toISOString() }, null, 2)
    );
    L.log(`LAB READY at terms — drive with: node src/termsctl.js eval "…"  (state: outputs/lab-state.json)`);
    try {
      cdp.close();
    } catch {}
    process.exit(0); // Chrome (detached) keeps the page alive
  } else {
    fs.writeFileSync(LABFILE, JSON.stringify({ port: PORT, id: ID, state: 'failed', error: lastErr ? String(lastErr.message).slice(0, 300) : 'no result', ts: new Date().toISOString() }, null, 2));
    L.log(`LAB gave up: ${lastErr ? lastErr.message : 'no result'}`);
    process.exit(4);
  }
})().catch((e) => {
  L.log(`LAB fatal: ${e.stack || e.message}`);
  process.exit(1);
});
