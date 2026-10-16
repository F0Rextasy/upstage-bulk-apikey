#!/usr/bin/env node
'use strict';

/**
 * Screen the upstage pool for exits that can reach api.upstage.ai over TLS.
 * A bogus bearer must come back 401 (JSON) — anything else means the exit is
 * unusable for key verification.
 *
 *   node src/screen-api.js [--conc 16] [--limit 200] [--out ../../out/up-api-ok.txt]
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');
const proxyLib = require('./proxy.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const CONC = parseInt(opt('--conc', '16'), 10);
const LIMIT = parseInt(opt('--limit', '200'), 10);
const OUT = opt('--out', path.join(__dirname, 'out', 'up-api-ok.txt'));

const FILES = [
  '../proxies.txt','new-live.txt', 'union-live.txt', 'upstage-live.txt', 'up-usable.txt', 'up-usable.txt.prev'].map((f) =>
  path.join(__dirname, 'out', f)
);

(async () => {
  const seen = new Set();
  const cands = [];
  for (const f of FILES) {
    let list = [];
    try {
      list = proxyLib.loadPoolFile(f);
    } catch {
      continue;
    }
    for (const p of list) {
      if (p.protocol === 'socks4') continue;
      const k = `${p.protocol}://${p.host}:${p.port}`;
      if (seen.has(k)) continue;
      seen.add(k);
      cands.push(p);
    }
    if (cands.length >= LIMIT) break;
  }
  console.log(`candidates ${cands.length}, conc ${CONC}`);
  if (fs.existsSync(OUT)) fs.copyFileSync(OUT, OUT + '.prev');
  fs.writeFileSync(OUT, '');

  let i = 0;
  let ok = 0;
  let done = 0;
  async function worker() {
    while (i < cands.length) {
      const p = cands[i++];
      try {
        const r = await L.httpReq(p, 'https://api.upstage.ai/v1/models', {
          timeoutMs: 20000,
          headers: { Authorization: 'Bearer sk-bogus' },
        });
        if (r.status === 401 || (r.status === 403 && r.json)) {
          ok++;
          fs.appendFileSync(OUT, `${proxyLib.browserUrl(p)}  # api=${r.status}\n`);
          console.log(`OK   ${proxyLib.browserUrl(p)} api=${r.status}`);
        } else {
          console.log(`bad  ${proxyLib.browserUrl(p)} -> ${r.status}`);
        }
      } catch (e) {
        // dead
      }
      if (++done % 50 === 0) console.log(`... ${done}/${cands.length} probed, ${ok} ok`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, cands.length) }, worker));
  console.log(`api-reachable: ${ok}/${cands.length} -> ${OUT}`);
})().catch((e) => {
  console.error('SCREEN FAIL:', e.stack || e.message);
  process.exit(1);
});
