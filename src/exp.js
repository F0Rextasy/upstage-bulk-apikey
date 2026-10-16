#!/usr/bin/env node
'use strict';

/**
 * Live exploration of the Upstage signup path (one throwaway account).
 *
 * Drives console.upstage.ai/login -> Cognito hosted UI -> create account ->
 * e-mail code -> console -> /api-keys, dumping the DOM and the wire at every
 * step into outputs/exp/.
 *
 *   node src/exp.js [--port 9290] [--headed] [--start N]
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const flag = (n) => args.includes(n);
const PORT = parseInt(opt('--port', '9290'), 10);
const START = parseInt(opt('--start', '0'), 10);

const DIR = path.join(L.OUT, 'exp');
fs.mkdirSync(DIR, { recursive: true });

function dump(name, data) {
  fs.writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

async function screen(page) {
  return page
    .eval(`(() => ({
      url: location.href,
      title: document.title,
      text: document.body ? document.body.innerText.slice(0, 4000) : '',
      inputs: [...document.querySelectorAll('input,select,textarea')].map(i => ({
        tag: i.tagName, type: i.type || '', id: i.id || '', name: i.name || '',
        ph: i.placeholder || '', value: (i.type === 'password' ? '' : (i.value || '').slice(0, 60)),
        maxlength: i.maxLength, autocomplete: i.autocomplete || '',
        visible: !!(i.offsetParent || i.getClientRects().length),
      })),
      buttons: [...document.querySelectorAll('button,[role=button],a,input[type=submit]')].map(b => ({
        tag: b.tagName, text: (b.innerText || b.value || '').trim().slice(0, 60), href: b.href || '',
      })).slice(0, 60),
    }))()`)
    .catch((e) => ({ error: e.message }));
}

async function shot(cdp, page, name) {
  try {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' }, page.s);
    fs.writeFileSync(path.join(DIR, `${name}.png`), Buffer.from(r.data, 'base64'));
  } catch {}
}

async function step(cdp, page, name) {
  const s = await screen(page);
  dump(name, s);
  await shot(cdp, page, name);
  L.log(`EXP ${name} url=${s.url} :: ${(s.text || '').replace(/\s+/g, ' ').slice(0, 260)}`);
  return s;
}

/** Click the first visible element whose text matches. */
async function clickText(page, rx, { tag = 'button,[role=button],a,input[type=submit]' } = {}) {
  const finder = `[...document.querySelectorAll(${JSON.stringify(tag)})].find(e => ${rx}.test(((e.innerText || e.value || '') + '').trim()) && e.offsetParent !== null && !e.disabled)`;
  if (await page.click(finder)) return 'mouse';
  const ok = await page.eval(`(() => { const e = ${finder}; if (!e) return false; e.click(); return true; })()`);
  return ok ? 'js' : 'none';
}

async function main() {
  const proxyLib = require('./proxy.js');
  const seen = new Set();
  let cands = [];
  const push = (l) => {
    for (const p of l) {
      if (p.protocol === 'socks4') continue;
      const k = `${p.protocol}://${p.host}:${p.port}`;
      if (seen.has(k)) continue;
      seen.add(k);
      cands.push(p);
    }
  };
  for (const f of ['new-live.txt', 'union-live.txt', 'upstage-live.txt', 'up-usable.txt', 'up-usable.txt.prev']) {
    try {
      push(proxyLib.loadPoolFile(path.join(__dirname, 'out', f)));
    } catch {}
  }
  push(L.loadPool());
  L.log(`EXP candidates: ${cands.length} (start ${START})`);

  const mailbox = await L.newMailbox('mailtrap');
  L.log(`EXP mailbox: ${mailbox.address} (${mailbox.provider})`);
  const password = L.randomPassword();
  L.log(`EXP password: ${password}`);

  await L.ensureChrome(PORT, path.join(L.HERE, `.up-chrome-${PORT}`), { headless: !flag('--headed') });
  const ws = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).then((j) => j.webSocketDebuggerUrl);
  const cdp = new L.CDP(ws, {});
  await cdp.connect();

  const self = await L.ownIp();
  L.log(`EXP own ip: ${self}`);

  let att = null;
  for (let i = START; i < Math.min(cands.length, START + 20); i++) {
    const proxy = cands[i];
    try {
      // cheap pre-check over plain HTTP: can this exit carry the console page?
      const pre = await L.httpReq(proxy, 'https://console.upstage.ai/login', { timeoutMs: 25000 }).catch(() => null);
      if (!pre || pre.status !== 200 || (pre.text || '').length < 30000 || !/__next/i.test(pre.text)) {
        L.log(`EXP pre-fail ${L.proxyLabel(proxy)} (${pre ? pre.status + '/' + (pre.text || '').length : 'dead'})`);
        continue;
      }
      const ip = await L.exitIp(proxy, 10000);
      if (self && ip === self) {
        L.log(`EXP skip own line ${L.proxyLabel(proxy)}`);
        continue;
      }
      L.log(`EXP trying exit ${L.proxyLabel(proxy)} -> ${ip}`);
      att = await L.openContext(cdp, proxy, { capture: () => true });
      await att.page.goto('https://console.upstage.ai/login');
      const ok = await att.page.waitFor(
        `document.body && /Continue|Sign in to your Upstage/i.test(document.body.innerText || '')`,
        { timeoutMs: 50000, pollMs: 1500 }
      );
      if (ok) {
        L.log(`EXP exit ok: ${L.proxyLabel(proxy)} (exit=${ip})`);
        att.exit = { proxy, ip };
        break;
      }
      L.log(`EXP exit page hung: ${L.proxyLabel(proxy)}`);
      await cdp.disposeBrowserContext(att.ctx).catch(() => {});
      att = null;
    } catch (e) {
      L.log(`EXP exit err ${L.proxyLabel(proxy)}: ${e.message.slice(0, 80)}`);
      if (att) await cdp.disposeBrowserContext(att.ctx).catch(() => {});
      att = null;
    }
  }
  if (!att) throw new Error('no working exit for console page');

  const { page, net, sessionId } = att;

  // capture API bodies
  const bodies = [];
  cdp.on(
    'Network.loadingFinished',
    async (p) => {
      const r = net.responses.find((x) => x.requestId === p.requestId);
      if (!r || !/XHR|Fetch|Document/i.test(r.type)) return;
      if (!/(upstage|cognito|amazoncognito|oauth)/i.test(r.url)) return;
      const text = await page.responseBody(p.requestId);
      if (text) bodies.push({ url: r.url.split('?')[0], full: r.url.slice(0, 300), status: r.status, text: String(text).slice(0, 4000) });
    },
    sessionId
  );

  // ---------- 1. console login: type email, continue
  let s = await step(cdp, page, '01-console-login');
  let typed = false;
  for (const sel of ['input[type=email]', 'input[name*=email i]', 'input[id*=email i]']) {
    const vis = await page.eval(
      `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!(e && e.offsetParent !== null); })()`
    );
    if (vis) {
      typed = await page.type(sel, mailbox.address, { clear: true }).catch(() => false);
      break;
    }
  }
  if (!typed) {
    await page.eval(
      `(() => { const e=[...document.querySelectorAll('input')].find(i=>i.offsetParent!==null && (i.type==='' || i.type==='text' || i.type==='email')); if(!e) return false; e.focus(); const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(e, ${JSON.stringify(mailbox.address)}); e.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`
    );
  }
  L.log(`EXP email typed (${typed})`);
  const c1 = await clickText(page, `/^continue$/i`);
  L.log(`EXP continue: ${c1}`);
  await L.sleep(7000);
  s = await step(cdp, page, '02-after-email');

  // ---------- 2. hosted UI: create account link
  const signup = await page.eval(
    `(() => { const a=[...document.querySelectorAll('a,button,[role=button]')].find(e=>/create an account|sign\\s?up|register/i.test((e.innerText||e.value||'').trim())); return a ? { text: (a.innerText||'').trim(), href: a.href || '' } : null; })()`
  );
  L.log(`EXP signup link: ${JSON.stringify(signup)}`);
  if (signup && signup.href) {
    await page.goto(signup.href);
  } else {
    await clickText(page, `/create an account|sign\\s?up|register/i`);
  }
  await L.sleep(6000);
  await page.waitFor(`document.body && document.body.innerText.length > 30`, { timeoutMs: 60000, pollMs: 1200 });
  s = await step(cdp, page, '03-signup-page');

  // ---------- 3. fill signup form
  const fill = async (sel, value) => {
    const ok = await page.type(sel, value, { clear: true }).catch(() => false);
    L.log(`EXP fill ${sel} -> ${ok}`);
    return ok;
  };
  const listed = (s.inputs || []).filter((i) => i.visible).map((i) => `${i.type}:${i.name || i.id || i.ph}`);
  L.log(`EXP visible inputs: ${listed.join(' | ')}`);
  // email (maybe prefilled)
  await page.eval(`(() => {
    const e=[...document.querySelectorAll('input')].find(i=>i.offsetParent!==null && (i.type==='email'||/email/i.test(i.name+i.id+i.placeholder)));
    if (e && !e.value) { const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); e.focus(); d.set.call(e, ${JSON.stringify(mailbox.address)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }
    return true; })()`);
  await fill(`input[name=password], input[type=password]`, password);
  await fill(`input[name=password2], input[name=confirmPassword], input[autocomplete=new-password] ~ input, input[type=password]:nth-of-type(2)`, password).catch(() => {});
  const pwds = await page.eval(`document.querySelectorAll('input[type=password]').length`);
  L.log(`EXP password boxes: ${pwds}`);
  if (pwds >= 2) {
    await page.eval(`(() => { const a=[...document.querySelectorAll('input[type=password]')]; const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); for (const e of a) { e.focus(); d.set.call(e, ${JSON.stringify(password)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); } return true; })()`);
  }
  say(s, 'form filled');
  await sleep(600);
  const sub = await clickText(page, /^sign\s?up$|^register$|^create account$|^sign up for/i);
  L.log(`EXP submit: ${sub}`);
  await L.sleep(8000);
  await page.waitFor(`document.body && document.body.innerText.length > 30`, { timeoutMs: 60000, pollMs: 1200 });
  s = await step(cdp, page, '04-after-signup-submit');

  // ---------- 4. e-mail code
  let code = null;
  try {
    const msg = await L.waitForMail(mailbox, (m) => /\b\d{6}\b/.test(`${m.text || ''}\n${m.html || ''}`), {
      timeoutMs: 180000,
      pollMs: 4000,
      note: (n) => L.log(`EXP mail: ${n}`),
    });
    if (msg) {
      dump('05-mail', { subject: msg.subject, from: msg.from, text: String(msg.text || '').slice(0, 3000) });
      const m = `${msg.text || ''}\n${msg.html || ''}`.match(/\b(\d{6})\b/);
      code = m ? m[1] : null;
    }
  } catch (e) {
    L.log(`EXP mail error: ${e.message}`);
  }
  L.log(`EXP code: ${code}`);
  if (code) {
    const before = await page.eval(`location.href`);
    // likely already on a code screen; type into the plausible box
    await page.eval(`(() => {
      const e=[...document.querySelectorAll('input')].find(i=>i.offsetParent!==null && (i.maxLength===6 || i.maxLength===1 || /code/i.test(i.name+i.id+i.placeholder)));
      if (!e) return false;
      const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); e.focus(); d.set.call(e, ${JSON.stringify(code)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    await sleep(500);
    const c3 = await clickText(page, /^confirm$|^verify$|^submit$|^continue$|^verify email$/i);
    L.log(`EXP code submit: ${c3}`);
    await L.sleep(8000);
    await page.waitFor(`document.body && document.body.innerText.length > 30`, { timeoutMs: 60000, pollMs: 1200 });
    s = await step(cdp, page, '06-after-code');
    if (s.url === before) L.log('EXP WARNING url unchanged after code');
  }

  // ---------- 5. wait for console, go to api-keys
  const inConsole = await page.waitFor(
    `(() => { const u = location.href; const t = document.body ? document.body.innerText : ''; if (/console\\.upstage\\.ai/.test(u) && !/\\/login/.test(u)) return 'console'; return null; })()`,
    { timeoutMs: 90000, pollMs: 2000 }
  );
  L.log(`EXP inConsole: ${inConsole} (${await page.eval('location.href')})`);
  await page.goto('https://console.upstage.ai/api-keys');
  await L.sleep(6000);
  await page.waitFor(`document.body && document.body.innerText.length > 30`, { timeoutMs: 60000, pollMs: 1200 });
  s = await step(cdp, page, '07-api-keys');

  // ---------- 6. create key
  const ck = await clickText(page, /create|new key|generate|발급|생성/i);
  L.log(`EXP create-key click: ${ck}`);
  await L.sleep(3500);
  s = await step(cdp, page, '08-key-modal');
  await page.eval(`(() => {
    const e=[...document.querySelectorAll('input')].find(i=>i.offsetParent!==null && (i.type==='' || i.type==='text') && !i.value);
    if (!e) return false;
    const d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); e.focus(); d.set.call(e, 'key-exp'); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
  await sleep(400);
  const ck2 = await clickText(page, /^create$|create key|generate|^confirm$|^save$|^done$|^submit$|생성/i);
  L.log(`EXP confirm-key click: ${ck2}`);
  await L.sleep(6000);
  s = await step(cdp, page, '09-key-created');

  const pageKey = await page.eval(
    `(() => { const t = document.body ? document.body.innerText : ''; const m = t.match(/\\b(up_[A-Za-z0-9_-]{16,}|[A-Za-z0-9]{8,}\\.[A-Za-z0-9]{8,}\\.[A-Za-z0-9_-]{16,})\\b/); return m ? m[1] : null; })()`
  );
  const wireKey = bodies.slice().reverse().map((b) => (String(b.text).match(/"?(?:api_?key|key|secret|apiKey)"?\s*[":=]\s*"([^"]{16,})"/i) || [])[1]).find(Boolean);
  L.log(`EXP key in page: ${pageKey ? pageKey.slice(0, 8) + '…' : null}; wire: ${wireKey ? wireKey.slice(0, 8) + '…' : null}`);
  dump('10-bodies', bodies);
  dump('11-net', net.requests.map((r) => `${r.method} ${r.url}`));
  dump('00-summary', {
    mailbox: mailbox.address,
    password,
    exit: att.exit,
    code,
    pageKey,
    wireKey,
    url: await page.eval('location.href'),
  });
  L.log('EXP done');
  cdp.close();
}

function say(s, m) {
  L.log(`EXP ${m}`);
}

const sleep = L.sleep;
main().catch((e) => {
  console.error('EXP FAIL:', e.stack || e.message);
  process.exit(1);
});
