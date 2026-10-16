#!/usr/bin/env node
'use strict';

/**
 * Attaches to the pilot Chrome (or launches it) and dumps what the auth page
 * really renders: full text, every input, the form's outerHTML, and the
 * bodies of XHR/fetch calls. Read-only.
 *
 *   node src/probe.js [--url <url>] [--wait <ms>] [--raw]
 */

const path = require('path');
const fs = require('fs');
const L = require('./lib');

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);

const PORT = parseInt(process.env.UP_CDP_PORT || '9271', 10);
const PROFILE = path.join(L.HERE, `.up-chrome-${PORT}`);

async function main() {
  const url = opt('--url', `${L.ORIGIN}/login`);
  const waitMs = parseInt(opt('--wait', '25000'), 10);

  await L.ensureChrome(PORT, PROFILE, { headless: true });
  const ws = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).then((j) => j.webSocketDebuggerUrl);
  const cdp = new L.CDP(ws, {});
  await cdp.connect();

  // reuse the proxy from the pilot if a context already exists? Simpler: fresh
  // context over a fresh live exit.
  const self = await L.ownIp();
  const { proxy, ip } = await L.pickExit(L.loadPool(), { start: 3, selfIp: self, timeoutMs: 9000 });
  console.log(`exit ${L.proxyLabel(proxy)} -> ${ip}`);
  const { page, net, sessionId } = await L.openContext(cdp, proxy, { capture: () => true });

  // capture XHR/fetch bodies
  const bodies = [];
  cdp.on(
    'Network.loadingFinished',
    async (p) => {
      const r = net.responses.find((x) => x.requestId === p.requestId);
      if (!r || !/XHR|Fetch/i.test(r.type)) return;
      const text = await page.responseBody(p.requestId);
      bodies.push({ url: r.url, status: r.status, text: String(text).slice(0, 4000) });
    },
    sessionId
  );

  await page.goto(url, { waitMs: 8000 });
  await L.sleep(4000);
  // wait for a form or 25s
  await page.waitFor(`!!document.querySelector('form') || !!document.querySelector('input[type=email]')`, { timeoutMs: waitMs, pollMs: 1000 }).catch(() => null);
  await L.sleep(2000);

  const info = await page.eval(`(() => {
    const root = document.querySelector('main') || document.body;
    return {
      url: location.href,
      title: document.title,
      text: root ? root.innerText.slice(0, 5000) : '',
      inputs: [...document.querySelectorAll('input,button,select,a[role=button]')].map(i => ({
        tag: i.tagName, type: i.type || '', name: i.name || '', id: i.id || '',
        placeholder: i.placeholder || '', text: (i.innerText || '').trim().slice(0, 50),
        disabled: i.disabled, hidden: i.offsetParent === null,
        accept: i.accept || '',
      })),
      html: (document.querySelector('form') ? document.querySelector('form').outerHTML : (root ? root.innerHTML : '')).slice(0, 12000),
    };
  })()`);

  fs.writeFileSync(path.join(L.OUT, 'probe-info.json'), JSON.stringify(info, null, 2));
  fs.writeFileSync(path.join(L.OUT, 'probe-bodies.json'), JSON.stringify(bodies, null, 1));
  const reqs = net.requests.map((r) => `${r.method} ${r.url}`).filter((u) => !/\.(png|jpe?g|svg|woff2?|css|ico)(\?|$)/.test(u));
  fs.writeFileSync(path.join(L.OUT, 'probe-net.txt'), `# ${info.url}\n` + reqs.join('\n'));

  console.log(`=== url: ${info.url}\ntitle: ${info.title}`);
  console.log('--- text ---\n' + info.text.slice(0, 3000));
  console.log('--- inputs ---\n' + JSON.stringify(info.inputs, null, 1).slice(0, 3000));
  console.log('--- xhr bodies ---\n' + JSON.stringify(bodies.slice(0, 12), null, 1).slice(0, 3000));
  console.log('--- net tail ---\n' + reqs.slice(-40).join('\n'));
  cdp.close();
}

main().catch((e) => {
  console.error('PROBE FAIL:', e.stack || e.message);
  process.exit(1);
});
