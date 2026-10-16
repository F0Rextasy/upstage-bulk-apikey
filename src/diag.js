#!/usr/bin/env node
'use strict';

/**
 * Diagnostic: why do pool candidates fail against the Upstage console?
 * Prints one line per proxy with the exact failure (connect/dns/status/size).
 *
 *   node src/diag.js <file> [--conc 24] [--timeout 15000] [--url https://console.upstage.ai/login] [--min 40000]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const proxyLib = require('./proxy.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const FILE = args[0];
const CONC = parseInt(opt('--conc', '24'), 10);
const TO = parseInt(opt('--timeout', '15000'), 10);
const URL_ = opt('--url', 'https://console.upstage.ai/login');
const MIN = parseInt(opt('--min', '40000'), 10);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

function get(proxy, url, timeoutMs = TO) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const t0 = Date.now();
    const req = https.request(
      { method: 'GET', host: u.hostname, port: 443, path: u.pathname + u.search, agent: proxyLib.createAgent(proxy), headers: { 'User-Agent': UA, Accept: '*/*' } },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode, len: text.length, ms: Date.now() - t0, text }));
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const list = proxyLib.loadProxyList(FILE).filter((p) => p.protocol !== 'socks4');
  console.log(`${FILE}: ${list.length} candidates, conc ${CONC}, timeout ${TO}ms, min ${MIN}`);
  let i = 0;
  const stat = {};
  async function worker() {
    while (i < list.length) {
      const p = list[i++];
      const label = proxyLib.browserUrl(p);
      try {
        const r = await get(p, URL_);
        const why = r.status !== 200 ? `status ${r.status}` : r.len < MIN ? `short ${r.len}` : 'USABLE';
        stat[why.startsWith('status') ? 'status-' + r.status : why.split(' ')[0]] = (stat[why.startsWith('status') ? 'status-' + r.status : why.split(' ')[0]] || 0) + 1;
        console.log(`${why === 'USABLE' ? 'OK  ' : 'no  '} ${label}  ${why}  ${r.ms}ms`);
      } catch (e) {
        const k = e.message.split('(')[0].trim().slice(0, 40);
        stat[k] = (stat[k] || 0) + 1;
        console.log(`no   ${label}  ${k}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, list.length) }, worker));
  console.log('\nsummary:', JSON.stringify(stat, null, 1));
})().catch((e) => {
  console.error('DIAG FAIL:', e.stack || e.message);
  process.exit(1);
});
