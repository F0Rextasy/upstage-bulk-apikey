#!/usr/bin/env node
'use strict';

/**
 * Stability screen for the Upstage flow ("warm pool").
 *
 * Ordinary screening proves a line is alive *now*; the measured half-life is
 * 1-3 minutes, which is why a 3-5 minute account flow dies mid-way. This keeps
 * only lines that answer console.upstage.ai on PROBES consecutive probes
 * spaced GAP ms apart, and keeps the survivors list fresh forever:
 *
 *   - pass 1: walk the candidate files, append 3/3 survivors
 *   - then:   re-probe the current warm set every ~60 s and rewrite the file
 *
 * Output: out/upstage-warm.txt  (plain `scheme://host:port` lines)
 *
 *   node src/warm.js [--conc 6] [--probes 3] [--gap 20000]
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');
const proxyLib = require('./proxy.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const CONC = L.int(opt('--conc', '6'), 6);
const PROBES = L.int(opt('--probes', '3'), 3);
const GAP = L.int(opt('--gap', '20000'), 20000);
const SLEEP = L.sleep;

const OUTS = path.join(__dirname, 'out');
const OUT = path.join(OUTS, 'upstage-warm.txt');

const FILES = [
  '../proxies.txt',
  'upstage-console-live.txt',
  'router-upstage-live.txt',
  'upstage-live.txt',
  'union-live.txt',
  'proxy-live-pool-recheck-live.txt',
  'new-live.txt',
];

function loadCandidates() {
  const seen = new Set();
  const out = [];
  for (const f of FILES) {
    let list = [];
    try {
      list = proxyLib.loadPoolFile(path.join(OUTS, f));
    } catch {
      continue;
    }
    for (const p of list) {
      const k = `${p.protocol}://${p.host}:${p.port}`;
      if (seen.has(k)) continue;
      seen.add(k);
      p.connectTimeoutMs = 8000;
      p.timeoutMs = 30000;
      out.push(p);
    }
  }
  return out;
}

function probeOnce(p) {
  return L.httpReq(p, 'https://console.upstage.ai/login', { timeoutMs: 20000 })
    .then((r) => r.status === 200 || r.status === 302 || r.status === 307)
    .catch(() => false);
}

async function stability(p, probes) {
  let ok = 0;
  for (let i = 0; i < probes; i++) {
    if (await probeOnce(p)) ok++;
    if (i < probes - 1) await SLEEP(GAP);
  }
  return ok;
}

function writeWarm(list) {
  const body = list.length ? list.map((p) => proxyLib.browserUrl(p)).join('\n') + '\n' : '';
  try {
    fs.writeFileSync(OUT + '.tmp', body);
    fs.renameSync(OUT + '.tmp', OUT);
  } catch {}
}

(async () => {
  console.log(`warm: files=${FILES.length} conc=${CONC} probes=${PROBES} gap=${GAP}ms -> ${OUT}`);
  const cands = loadCandidates();
  console.log(`warm: candidates ${cands.length}`);

  const warm = [];
  let i = 0;
  let done = 0;
  async function worker() {
    while (i < cands.length) {
      const p = cands[i++];
      const ok = await stability(p, PROBES);
      done++;
      if (ok >= PROBES) {
        warm.push(p);
        writeWarm(warm);
        console.log(`WARM ${proxyLib.browserUrl(p)} (${ok}/${PROBES}) warm=${warm.length}`);
      } else if (done % 25 === 0) {
        console.log(`... ${done}/${cands.length} probed, warm=${warm.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`warm: first pass done, warm=${warm.length} — keeping the set fresh`);

  // keep the warm set fresh: re-probe every ~20 s, drop the dead, pick up new
  while (true) {
    await SLEEP(20000);
    const alive = [];
    for (let k = 0; k < warm.length; k += CONC) {
      const batch = warm.slice(k, k + CONC);
      const res = await Promise.all(batch.map((p) => probeOnce(p)));
      res.forEach((r, idx) => {
        if (r) alive.push(batch[idx]);
      });
    }
    // add fresh candidates from the files as well
    for (const p of loadCandidates()) {
      if (warm.some((w) => w.host === p.host && w.port === p.port)) continue;
      if (await probeOnce(p)) alive.push(p);
    }
    const uniq = [];
    const seen = new Set();
    for (const p of alive) {
      const k = `${p.protocol}://${p.host}:${p.port}`;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(p);
    }
    warm.length = 0;
    warm.push(...uniq);
    writeWarm(warm);
    console.log(`warm refresh: ${warm.length} alive`);
  }
})().catch((e) => {
  console.error('WARM FAIL:', e.stack || e.message);
  process.exit(1);
});
