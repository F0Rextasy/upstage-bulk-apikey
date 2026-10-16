#!/usr/bin/env node
'use strict';

/**
 * Live verification for Upstage keys.
 *
 *   node src/verify.js <key> [--proxy <url>] [--proxy-list <file>] [--chat]
 *   node src/verify.js --file ../keys.txt [--limit 5] [--chat]
 *
 * Checks:
 *   1. GET  https://api.upstage.ai/v1/models                       -> 200
 *   2. POST https://api.upstage.ai/v1/chat/completions  (solar-mini4) -> 200
 *
 * Every call exits through a pool proxy; the home line is never used.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const proxyLib = require('./proxy.js');

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const flag = (name) => args.includes(name);
const API = 'https://api.upstage.ai/v1';

const POOL = [
  path.join(__dirname, 'proxies.txt'),
  path.join(__dirname, 'out', 'upstage-api-live.txt'),
  path.join(__dirname, 'out', 'up-api-ok.txt'),
  path.join(__dirname, 'out', 'union-live.txt'),
  path.join(__dirname, 'out', 'upstage-live.txt'),
  path.join(__dirname, 'out', 'up-usable.txt'),
  path.join(__dirname, 'out', 'proxy-live-pool-live.txt'),
];

function loadPool() {
  const seen = new Set();
  const out = [];
  for (const f of POOL) {
    let list = [];
    try {
      list = proxyLib.loadPoolFile(f);
    } catch {
      continue;
    }
    for (const p of list) {
      const k = `${p.protocol}://${p.host}:${p.port}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
  }
  if (!out.length) throw new Error('no proxy pool file');
  return out;
}

function req(proxy, method, url, { headers = {}, body, timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body === undefined ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const reqq = https.request(
      {
        method,
        host: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        agent: proxy ? proxyLib.createAgent(proxy) : undefined,
        headers: { 'User-Agent': 'upstage-verify/1.0', ...headers, ...(payload ? { 'Content-Length': payload.length } : {}) },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, text, json });
        });
      }
    );
    reqq.setTimeout(timeoutMs, () => reqq.destroy(new Error('timeout')));
    reqq.on('error', reject);
    if (payload) reqq.write(payload);
    reqq.end();
  });
}

async function models(key, proxy) {
  const r = await req(proxy, 'GET', `${API}/models`, { headers: { Authorization: `Bearer ${key}` } });
  const ids = r.json && Array.isArray(r.json.data) ? r.json.data.map((m) => m.id) : [];
  return { status: r.status, ids, text: r.text.slice(0, 200) };
}

async function chat(key, proxy, model = 'solar-mini4') {
  const r = await req(proxy, 'POST', `${API}/chat/completions`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: { model, messages: [{ role: 'user', content: 'Reply with the single word: ok' }], max_tokens: 8 },
  });
  const out = r.json && r.json.choices && r.json.choices[0] ? r.json.choices[0].message.content : null;
  return { status: r.status, out, text: r.text.slice(0, 300) };
}

async function main() {
  const pool = loadPool();
  let keys = [];
  if (opt('--file')) {
    keys = fs.readFileSync(opt('--file'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const lim = parseInt(opt('--limit', '0'), 10);
    if (lim) keys = keys.slice(0, lim);
  } else if (args[0] && !args[0].startsWith('--')) {
    keys = [args[0]];
  } else {
    console.error('usage: node src/verify.js <key> | --file keys.txt [--limit N] [--chat] [--proxy <url>]');
    process.exit(2);
  }

  let i = 0;
  let ok = 0;
  for (const key of keys) {
    const proxy = opt('--proxy') ? proxyLib.parseProxy(opt('--proxy')) : pool[i++ % pool.length];
    const label = `${key.slice(0, 4)}…${key.slice(-4)}`;
    let line = `${label}  proxy=${proxyLib.label(proxy)}`;
    try {
      const m = await models(key, proxy);
      line += `  models=${m.status}(${m.ids.length})`;
      if (m.status === 200) {
        ok++;
        if (flag('--chat')) {
          const c = await chat(key, proxy);
          line += `  chat=${c.status}${c.out ? ` "${c.out.trim().slice(0, 20)}"` : ` ${(c.text || '').slice(0, 80)}`}`;
        }
      } else {
        line += `  ${(m.text || '').slice(0, 120)}`;
      }
    } catch (e) {
      line += `  ERR ${e.message.slice(0, 100)}`;
    }
    console.log(line);
  }
  console.log(`\nverified ${ok}/${keys.length}`);
}

main().catch((e) => {
  console.error('VERIFY FAIL:', e.stack || e.message);
  process.exit(1);
});
