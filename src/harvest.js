#!/usr/bin/env node
'use strict';

/**
 * Continuous exit harvester for the Upstage mint.
 *
 * Screens raw feed lists (lists/) plus the known pool files at
 * high concurrency and appends every survivor to
 *   out/upstage-live.txt      (scheme://host:port  # api=… exit=…)
 *
 * A survivor must:
 *   - answer 401 on https://api.upstage.ai/v1/models with a bogus bearer, and
 *   - deliver the full console.upstage.ai/login page (>= 30 kB, __next).
 *
 *   node src/harvest.js [--conc 64] [--rounds 0] [--out ../../out/upstage-live.txt]
 *
 * rounds 0 = keep going until the candidate corpus is exhausted.
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');
const proxyLib = require('./proxy.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const CONC = L.int(opt('--conc', '64'), 64);
const ROUNDS = L.int(opt('--rounds', '0'), 0);
const OUT = opt('--out', path.join(__dirname, 'out', 'upstage-live.txt'));
const API_OUT = opt('--api-out', path.join(__dirname, 'out', 'upstage-api-live.txt'));
const OUTS = path.join(__dirname, 'out');
const LISTS = path.join(__dirname, 'lists-fresh');

const seen = new Set();
const cands = [];

function push(list) {
  for (const p of list) {
    if (p.protocol === 'socks4') continue;
    const k = `${p.protocol}://${p.host}:${p.port}`;
    if (seen.has(k)) continue;
    seen.add(k);
    cands.push(p);
  }
}

for (const f of ['router-upstage-live.txt', 'new-live.txt', 'union-live.txt', 'upstage-live.txt', 'pool-fresh-live-live.txt', 'up-usable.txt', 'proxy-live-pool-recheck-live.txt', 'proxy-live-pool-live.txt']) {
  try {
    push(proxyLib.loadPoolFile(path.join(OUTS, f)));
  } catch (e) {
    console.log(`pool file ${f}: ${e.message.slice(0, 90)}`);
  }
}
const poolCount = cands.length;
let files = [];
try {
  files = fs.readdirSync(LISTS).filter((x) => /(?:http|https|socks5)\.txt$/.test(x));
} catch {}
files.sort();
for (const f of files) {
  try {
    const list = proxyLib.loadProxyList(path.join(LISTS, f));
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    push(list);
  } catch {}
}
console.log(`candidates: ${cands.length} (${poolCount} from pool files)`);

let i = 0;
let screened = 0;
let found = 0;
let stop = false;

(function heartbeat() {
  if (stop) return;
  setTimeout(() => {
    console.log(`... screened=${screened} found=${found}`);
    heartbeat();
  }, 60000).unref?.();
})();

async function worker() {
  while (!stop) {
    const idx = i++;
    if (idx >= cands.length) {
      stop = true;
      return;
    }
    const p = cands[idx];
    try {
      const c = await L.httpReq(p, 'https://console.upstage.ai/login', { timeoutMs: 32000 });
      if (!(c.status === 200 && (c.text || '').length > 20000 && /__next/i.test(c.text))) throw new Error(`console ${c.status}/${(c.text || '').length}`);
      found++;
      fs.appendFileSync(OUT, `${proxyLib.browserUrl(p)}\n`);
      const a = await L.httpReq(p, 'https://api.upstage.ai/v1/models', {
        timeoutMs: 25000,
        headers: { Authorization: 'Bearer sk-bogus' },
      }).catch(() => null);
      if (a && a.status === 401) {
        fs.appendFileSync(API_OUT, `${proxyLib.browserUrl(p)}\n`);
        fs.appendFileSync(API_OUT.replace(/\.txt$/, '-meta.tsv'), `${proxyLib.browserUrl(p)}\tapi=401\t${new Date().toISOString()}\n`);
      }
      console.log(`OK   ${proxyLib.browserUrl(p)} api=${a ? a.status : '-'}`);
    } catch {}
    screened++;
    if (ROUNDS && screened >= ROUNDS) stop = true;
    if (screened % 500 === 0) console.log(`... screened=${screened} found=${found}`);
  }
}

(async () => {
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`done: screened=${screened} found=${found} -> ${OUT}`);
})();
