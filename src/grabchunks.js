#!/usr/bin/env node
'use strict';

/**
 * Download every webpack chunk of the console build (map comes from the
 * runtime) so endpoints/selectors can be read statically.
 *
 *   node src/grabchunks.js [--out out/chunks2]
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const OUT = opt('--out', path.join(__dirname, 'out', 'up', 'chunks2'));

const BASE = `${L.ORIGIN}/_next/static/chunks/`;

async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await L.httpReq(PROXY(), url, { timeoutMs: 25000 });
      if (r.status === 200) return r.text;
      if (r.status === 404) return null;
    } catch {}
    await L.sleep(500);
  }
  return undefined; // transient failure
}

let _proxy = undefined;
function PROXY() {
  if (_proxy === undefined) {
    const proxyLib = require('./proxy.js');
    const cands = [];
    for (const f of ['new-live.txt', 'up-usable.txt', 'up-usable.txt.prev']) {
      try {
        cands.push(...proxyLib.loadProxyList(path.join(__dirname, 'out', f)));
      } catch {}
    }
    const live = cands.filter((p) => p.protocol !== 'socks4');
    _proxy = live[Math.floor(Math.random() * live.length)] || null;
    console.log(`chunk fetches via ${proxyLib.label(_proxy)}`);
  }
  return _proxy;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const quick = (await L.httpReq(PROXY(), `${L.ORIGIN}/_next/static/chunks/webpack-1ebd4b6ef90712fe.js`, { timeoutMs: 30000 })).text;
  const m = quick.match(/static\/chunks\/"\+e\+"\."\+\((\{[\s\S]*?\})\)\[e\]/);
  if (!m) throw new Error('chunk map not found');
  const map = eval(`(${m[1]})`);
  const ids = Object.keys(map);
  console.log(`chunk ids: ${ids.length} -> ${OUT}`);

  const targets = ids.map((id) => ({ id, file: `${id}.${map[id]}.js` }));
  let i = 0;
  let ok = 0;
  async function worker() {
    while (i < targets.length) {
      const t = targets[i++];
      const dest = path.join(OUT, t.file);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
        ok++;
        continue;
      }
      const text = await get(BASE + t.file);
      if (text) {
        fs.writeFileSync(dest, text);
        ok++;
      }
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker));
  console.log(`downloaded ${ok}/${targets.length}`);
}

main().catch((e) => {
  console.error('GRAB FAIL:', e.stack || e.message);
  process.exit(1);
});
