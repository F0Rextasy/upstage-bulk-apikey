#!/usr/bin/env node
'use strict';

/**
 * Step 1 pilot: what does Upstage's signup/login flow actually look like?
 *
 * Launches Chrome on a fresh profile, opens one isolated context pinned to a
 * live pool proxy (or direct when no pool is provided), walks login -> signup,
 * and dumps:
 *   - visible text per screen
 *   - every network request/response (to find the auth REST endpoints)
 *   - form fields + their attributes
 *
 * Read-only: no account is created, no button that submits a real
 * registration is pressed.
 *
 *   node src/pilot.js [--headed] [--url <url>]
 */

const path = require('path');
const fs = require('fs');
const L = require('./lib');

const args = process.argv.slice(2);
const HEADED = args.includes('--headed');

function output(rel) {
  return path.join(L.OUT, rel);
}

async function dumpScreen(page, name, net) {
  const info = await page.eval(`(() => {
    const forms = [...document.querySelectorAll('form')].map(f => ({
      action: f.action || '', method: f.method || '',
      fields: [...f.querySelectorAll('input,select,textarea')].map(i => ({
        tag: i.tagName, type: i.type || '', name: i.name || '', id: i.id || '',
        placeholder: i.placeholder || '', required: i.required, autocomplete: i.autocomplete || '',
        aria: i.getAttribute('aria-label') || '',
      })),
    }));
    const buttons = [...document.querySelectorAll('button,a[role=button],input[type=submit]')].map(b => ({
      text: (b.innerText || b.value || '').trim().slice(0, 60), type: b.type || '',
    })).filter(b => b.text);
    const iframes = [...document.querySelectorAll('iframe')].map(f => ({ src: f.src || '', w: f.getBoundingClientRect().width }));
    return {
      url: location.href,
      title: document.title,
      text: (document.body ? document.body.innerText : '').slice(0, 4000),
      forms, buttons, iframes,
    };
  })()`).catch((e) => ({ error: e.message }));
  fs.writeFileSync(output(`pilot-${name}.json`), JSON.stringify(info, null, 2));
  const reqs = net.requests.map((r) => `${r.method} ${r.url}`).filter((u) => !/\.(png|jpe?g|svg|woff2?|css|ico)(\?|$)/.test(u));
  fs.writeFileSync(output(`pilot-${name}-net.txt`), `# final url: ${info.url}\n` + reqs.join('\n'));
  console.log(`\n===== ${name} @ ${info.url}`);
  console.log(`title: ${info.title}`);
  console.log('--- text ---');
  console.log((info.text || '').slice(0, 2500));
  console.log('--- forms ---');
  console.log(JSON.stringify(info.forms, null, 1).slice(0, 2500));
  console.log('--- buttons ---');
  console.log(info.buttons.map((b) => b.text).join(' | ').slice(0, 800));
  console.log('--- iframes ---');
  console.log(JSON.stringify(info.iframes).slice(0, 500));
  console.log('--- net (non-static) ---');
  console.log(reqs.slice(-60).join('\n'));
  return info;
}

async function main() {
  const self = await L.ownIp();
  console.log(`own ip: ${self}`);
  const pool = L.loadPool();
  console.log(`pool size: ${pool.length}`);
  const { proxy, ip } = await L.pickExit(pool, { start: 0, selfIp: self });
  console.log(`exit: ${L.proxyLabel(proxy)} -> ${ip}`);

  const port = 9271;
  const profile = path.join(L.HERE, `.up-chrome-${port}`);
  await L.ensureChrome(port, profile, { headless: !HEADED });
  const ws = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).then((j) => j.webSocketDebuggerUrl);
  const cdp = new L.CDP(ws, {});
  await cdp.connect();
  const { page, net } = await L.openContext(cdp, proxy, { capture: () => true });

  const startUrl = (args.includes('--url') && args[args.indexOf('--url') + 1]) || `${L.ORIGIN}/login`;
  await page.goto(startUrl, { waitMs: 7000 });
  await dumpScreen(page, '01-login', net);

  // Look for the sign-up affordance (link or tab) and follow it.
  const clicked = await page.eval(`(() => {
    const cand = [...document.querySelectorAll('a,button,[role=tab],[role=button]')]
      .find(e => /sign\\s*up|create\\s*(an\\s*)?account|register|회원가입/i.test((e.innerText || '').trim()));
    if (!cand) return null;
    cand.scrollIntoView({ block: 'center' });
    return { text: (cand.innerText || '').trim().slice(0, 60), href: cand.href || '' };
  })()`);
  console.log('signup affordance:', JSON.stringify(clicked));
  if (clicked) {
    await page.click(`[...document.querySelectorAll('a,button,[role=tab],[role=button]')].find(e => /sign\\s*up|create\\s*(an\\s*)?account|register|회원가입/i.test((e.innerText || '').trim()))`);
    await L.sleep(6000);
    await dumpScreen(page, '02-signup', net);
  } else if (startUrl.endsWith('/login')) {
    await page.goto(`${L.ORIGIN}/signup`, { waitMs: 7000 });
    await dumpScreen(page, '02-signup-direct', net);
  }

  fs.writeFileSync(output('pilot-net-full.json'), JSON.stringify({ proxy: L.proxyLabel(proxy), ip, requests: net.requests, responses: net.responses }, null, 1));
  console.log('\nfull net -> outputs/pilot-net-full.json');
  cdp.close();
}

main().catch((e) => {
  console.error('PILOT FAIL:', e.stack || e.message);
  process.exit(1);
});
