#!/usr/bin/env node
'use strict';

/**
 * Build the proxy pool for the Upstage mint.
 *
 * A candidate is usable when it (1) carries the real console login page over
 * TLS (>= 40 kB, contains the Next payload) and (2) presents an exit IP that is
 * not our own line. Free proxies to Korea are slow, so each candidate gets a
 * 20 s budget and one retry before it is written off.
 *
 *   node src/pool.js [--candidates 4000] [--conc 30] [--timeout 20000] [--out file]
 *
 * Results are appended to the output file as they are found, so a mint run can
 * start while the rest of the pool is still being probed.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const proxyLib = require('./proxy.js');

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1];
  return a;
}
const args = parseArgs(process.argv.slice(2));
const LIMIT = parseInt(args.candidates || '4000', 10);
const CONC = parseInt(args.conc || '30', 10);
const TO = parseInt(args.timeout || '20000', 10);
const OUT = args.out || path.join(__dirname, 'out', 'up-usable.txt');
const LISTS = path.join(__dirname, 'lists-fresh');
const OUTS = path.join(__dirname, 'out');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const LIVE = [
  path.join(OUTS, 'proxy-live-pool-recheck-live.txt'),
  path.join(OUTS, 'proxy-live-pool-live.txt'),
  path.join(OUTS, 'proxy-candidates-fresh.txt'),
];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Live pools first (cheapest wins), then a fresh scrape sample. */
function candidates() {
  const seen = new Set();
  const out = [];
  const push = (p) => {
    if (/^(socks4)$/.test(p.protocol)) return;
    if (proxyLib.isLocalHost && proxyLib.isLocalHost(p.host)) return;
    const key = `${p.host}:${p.port}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(p);
  };
  for (const f of LIVE) {
    try {
      proxyLib.loadProxyList(f).forEach(push);
    } catch {}
  }
  const rest = [];
  for (const f of fs.readdirSync(LISTS).filter((x) => /(?:http|https|socks5)\.txt$/.test(x))) {
    try {
      proxyLib.loadProxyList(path.join(LISTS, f)).forEach((p) => rest.push(p));
    } catch {}
  }
  shuffle(rest).forEach(push);
  return out.slice(0, LIMIT);
}

function get(proxy, url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { method: 'GET', host: u.hostname, port: 443, path: u.pathname + u.search, agent: proxyLib.createAgent(proxy), headers: { 'User-Agent': UA, Accept: '*/*' } },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode, text }));
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

async function probe(p) {
  let page = null;
  try {
    page = await get(p, 'https://console.upstage.ai/login', TO);
  } catch {
    page = await get(p, 'https://console.upstage.ai/login', Math.round(TO * 1.5)).catch(() => null);
  }
  if (!page || page.status !== 200 || page.text.length < 40000 || !/__next|upstage/i.test(page.text)) {
    throw new Error(`page ${page ? page.status + '/' + page.text.length : 'dead'}`);
  }
  const ipr = await get(p, 'https://api.ipify.org/?format=text', Math.min(TO, 12000));
  const ip = String(ipr.text || '').trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) throw new Error(`bad ip`);
  return ip;
}

(async () => {
  const cands = candidates();
  console.log(`candidates: ${cands.length}, conc ${CONC}, timeout ${TO}ms`);
  const self = await proxyLib.fetchText(null, 'https://api.ipify.org/?format=text', { timeoutMs: 8000 }).then((t) => t.trim()).catch(() => null);
  console.log(`own ip: ${self}`);
  if (fs.existsSync(OUT)) fs.copyFileSync(OUT, OUT + '.prev');
  fs.writeFileSync(OUT, '');
  const usedIps = new Set();
  let i = 0;
  let done = 0;
  let us = 0;

  async function worker() {
    while (i < cands.length) {
      const p = cands[i++];
      try {
        const ip = await probe(p);
        if (self && ip === self) throw new Error('own line');
        if (usedIps.has(ip)) throw new Error('dup exit');
        usedIps.add(ip);
        us++;
        fs.appendFileSync(OUT, `${proxyLib.browserUrl(p)}\n`);
        fs.appendFileSync(OUT + '-meta.tsv', `${proxyLib.browserUrl(p)}\texit=${ip}\t${new Date().toISOString()}\n`);
        console.log(`OK   ${proxyLib.browserUrl(p)}  exit=${ip}`);
      } catch {}
      done++;
      if (done % 100 === 0) console.log(`... ${done}/${cands.length} probed, ${us} usable`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONC, cands.length) }, worker));
  console.log(`\nusable: ${us}\n-> ${OUT}`);
})().catch((e) => {
  console.error('POOL FAIL:', e.stack || e.message);
  process.exit(1);
});
