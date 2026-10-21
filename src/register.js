#!/usr/bin/env node
'use strict';

/**
 * Upstage / Solar — one account + one API key per run.
 *
 *   node src/register.js [--count N] [--conc 4] [--headed] [--port 9290]
 *                    [--fresh-pool] [--limit 1]
 *
 * Flow per account:
 *   1. fresh mailbox (broker 9700 -> 9701) + fresh pool exit (the pool is
 *      optional: with no pool file at all the run goes direct)
 *   2. isolated Chrome context through that exit (no proxy when direct)
 *   3. /login -> e-mail -> Continue -> OTP code from the mailbox
 *   4. /api-keys -> Create new key -> capture the key off the wire
 *   5. live verify (GET /v1/models, POST /v1/chat/completions)
 *
 * Every artifact lands in outputs/; the account line is appended to
 * ../accounts.json and the key to ../keys.txt the moment it verifies.
 *
 * Selector knowledge is learned in "dump" files (outputs/step-*.json) —
 * screens change rarely, but the flow re-learns each step instead of
 * trusting hardcoded positions.
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const flag = (n) => args.includes(n);
// a bare flag used to parse as NaN: NaN ids made the worker loop below run
// forever (id >= NaN is never true)
const COUNT = L.int(opt('--count', '30'), 30);
const CONC = L.int(opt('--conc', '4'), 4);
const PORT = L.int(opt('--port', '9290'), 9290);
const HEADED = flag('--headed');
const KEEP_OPEN = flag('--keep-open');

const KEYS_TXT = path.join(L.HERE, 'keys.txt');
const ACCOUNTS = path.join(L.HERE, 'accounts.json');
const MIRROR = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'upstage-keys.txt');
const STATE = path.join(L.OUT, 'state.json');

// ------------------------------------------------------------------ utilities

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    return { accounts: [] };
  }
}

function writeState(s) {
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2), { mode: 0o600 });
}

/** Keys are only ever written after the API answered 200 for them. */
function appendKey(key) {
  if (!fs.existsSync(KEYS_TXT)) fs.writeFileSync(KEYS_TXT, '', { mode: 0o600 });
  const have = new Set(fs.readFileSync(KEYS_TXT, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  if (have.has(key)) return;
  fs.appendFileSync(KEYS_TXT, key + '\n');
  fs.appendFileSync(MIRROR, key + '\n');
}

function appendAccount(rec) {
  // accounts.json is the only copy of the account's password: never overwrite a
  // file this process could not read
  let list = [];
  if (fs.existsSync(ACCOUNTS)) {
    try {
      list = JSON.parse(fs.readFileSync(ACCOUNTS, 'utf8'));
    } catch (e) {
      throw new Error(`${ACCOUNTS} is not readable JSON — refusing to overwrite it (${e.message})`);
    }
  }
  list.push(rec);
  fs.writeFileSync(ACCOUNTS, JSON.stringify(list, null, 2), { mode: 0o600 });
}

/** Pool of verified exits (built by pool.js); never our own line. No pool file
 *  at all is DIRECT mode: `null` is the direct sentinel — a proxy is
 *  recommended at scale (per-IP limits, bans) but the tool works without one. */
let upPoolNoted = false;
function loadUpPool() {
  const files = [
    path.join(__dirname, 'proxies.txt'),
    path.join(__dirname, 'out', 'up-usable.txt'),
    ...['up-usable-2.txt', 'up-usable-3.txt'].map((f) => path.join(__dirname, 'out', f)),
  ];
  if (process.env.UPSTAGE_PROXIES) files.unshift(path.resolve(process.env.UPSTAGE_PROXIES)); // the file the READMEs document
  let list = [];
  for (const f of files) {
    try {
      list = list.concat(require('./proxy.js').loadProxyList(f));
    } catch {}
  }
  if (!list.length) {
    if (!upPoolNoted) {
      upPoolNoted = true;
      console.log('no up-usable pool — running WITHOUT a proxy (direct). Build one with src/pool.js to route through it.');
    }
    return [null];
  }
  return list.filter((p) => p.protocol !== 'socks4');
}

const sleep = L.sleep;

const CODE_RE = /\b\d{6}\b|\b\d{4}\b/;

/** Button label matchers (each used as a single regex literal). */
const RX_CREATE_KEY_BTN = /create\s*(new\s*)?(api\s*)?key|new\s*key|키\s*생성/i;
const RX_CONFIRM_KEY = /^create$|create\s*key|generate|^confirm$|^save$|^done$|생성|^yes$/i;
const RX_SKIP = /^skip$|skip\s*(for now)?|^later$|^not now$/i;
const RX_OK_CONTINUE = /^continue$|^next$|^create$|create organization|^done$|^start$|^get started$/i;
const RX_CLAIM = /claim|redeem|^accept$|^select$|^apply$/i;

/** Pull a verification code out of a mail body. */
function extractCode(msg) {
  const blob = `${msg.text || ''}\n${msg.html || ''}`.replace(/<[^>]+>/g, ' ');
  const m = blob.match(/\b(\d{6})\b/);
  if (m) return m[1];
  const m4 = blob.match(/\b(\d{4})\b/);
  return m4 ? m4[1] : null;
}

// --------------------------------------------------------------------- step 1

class Flow {
  constructor(id, cdp, proxy, mailbox) {
    this.id = id;
    this.cdp = cdp;
    this.proxy = proxy;
    this.mailbox = mailbox;
    this.log = (m) => L.log(`[${id}] ${m}`);
    this.files = [];
  }

  dump(name, data) {
    const file = path.join(L.OUT, `acct${this.id}-${name}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    this.files.push(file);
    return file;
  }

  async shot(page, name) {
    try {
      const r = await this.cdp.send('Page.captureScreenshot', { format: 'png' }, page.s);
      fs.writeFileSync(path.join(L.OUT, `acct${this.id}-${name}.png`), Buffer.from(r.data, 'base64'));
    } catch {}
  }

  async screen(page) {
    return page
      .eval(`(() => ({
        url: location.href,
        text: document.body ? document.body.innerText.slice(0, 4000) : '',
        inputs: [...document.querySelectorAll('input,select,textarea')].map(i => ({
          tag: i.tagName, type: i.type || '', id: i.id || '', name: i.name || '',
          ph: i.placeholder || '', visible: !!(i.offsetParent || i.getClientRects().length),
        })),
        buttons: [...document.querySelectorAll('button,[role=button],a')].map(b => (b.innerText || '').trim()).filter(Boolean).slice(0, 40),
      }))()`)
      .catch((e) => ({ error: e.message }));
  }

  async run() {
    const { cdp, proxy, log } = this;
    const { ctx, page, net, sessionId, detachProxyAuth } = await L.openContext(cdp, proxy, { capture: () => true });
    this.ctx = ctx;
    this.page = page;
    this.net = net;
    this.sessionId = sessionId;
    this.detachProxyAuth = detachProxyAuth;

    // capture API bodies (auth + key endpoints)
    this.bodies = [];
    cdp.on(
      'Network.loadingFinished',
      async (p) => {
        const r = net.responses.find((x) => x.requestId === p.requestId);
        if (!r || !/XHR|Fetch/i.test(r.type)) return;
        if (!/(apistage|cognito|upstage\.ai\/api|oauth|token)/i.test(r.url)) return;
        const text = await page.responseBody(p.requestId);
        this.bodies.push({ url: r.url, status: r.status, text: String(text).slice(0, 6000) });
      },
      sessionId
    );

    // --- login page
    log(`goto ${L.ORIGIN}/login`);
    await page.goto(`${L.ORIGIN}/login`, { waitMs: 1500 });
    const ok = await page.waitFor(`!!document.querySelector('input') || /Continue/i.test(document.body ? document.body.innerText : '')`, { timeoutMs: 45000, pollMs: 900 });
    await sleep(1200);
    let s = await this.screen(page);
    this.dump('01-login', s);
    await this.shot(page, '01-login');
    if (!ok) {
      // maybe still blank because a chunk hung; retry navigation once
      log('login page looked empty, reloading once');
      await page.goto(`${L.ORIGIN}/login`, { waitMs: 6000 });
      await page.waitFor(`!!document.querySelector('input')`, { timeoutMs: 40000, pollMs: 900 });
      s = await this.screen(page);
      this.dump('01b-login', s);
    }
    log(`login screen: inputs=${(s.inputs || []).map((i) => i.type || i.tag).join(',')} text=${(s.text || '').replace(/\s+/g, ' ').slice(0, 120)}`);

    // --- type e-mail
    const typed = await page.type('input[type=email], input[name*=email i], input[id*=email i], input:not([type])', this.mailbox.address, { clear: true });
    log(`typed email (${typed})`);
    await sleep(400);

    // --- continue
    const clicked = await this.clickContinue();
    log(`continue clicked: ${clicked}`);
    await sleep(4000);

    // --- wait for the next screen: code input, password, or error
    const next = await page.waitFor(
      `(() => {
        const t = document.body ? document.body.innerText : '';
        if (document.querySelector('input[autocomplete=one-time-code], input[inputmode=numeric], input[maxlength="6"], input[maxlength="4"]')) return 'code-form';
        if (/code|verification|인증/i.test(t) && document.querySelectorAll('input').length) return 'code-ish';
        if (/password|비밀번호/i.test(t)) return 'password';
        if (/already|error|went wrong|failed|invalid/i.test(t)) return 'error';
        return null;
      })()`,
      { timeoutMs: 45000, pollMs: 1200 }
    );
    await sleep(1500);
    s = await this.screen(page);
    this.dump('02-after-email', s);
    await this.shot(page, '02-after-email');
    log(`after email -> ${next}; text=${(s.text || '').replace(/\s+/g, ' ').slice(0, 200)}`);
    log(`net so far: ` + net.requests.filter((r) => /apistage|cognito|oauth|token/i.test(r.url)).map((r) => `${r.method} ${r.url.split('?')[0]}`).slice(0, 12).join(' | '));

    if (next === 'error') {
      throw new Error(`signup refused at email step: ${(s.text || '').replace(/\s+/g, ' ').slice(0, 200)}`);
    }

    // --- mail: code
    if (String(next).startsWith('code')) {
      const msg = await L.waitForMail(this.mailbox, (m) => CODE_RE.test(`${m.text || ''} ${m.html || ''}`), {
        timeoutMs: 180000,
        pollMs: 5000,
        note: (n) => log(`mail: ${n}`),
      });
      if (!msg) throw new Error('no verification mail arrived');
      const code = extractCode(msg);
      this.dump('03-mail', { subject: msg.subject, from: msg.from, code, text: String(msg.text || '').slice(0, 2000) });
      log(`code from mail: ${code} (subject: ${msg.subject})`);
      if (!code) throw new Error('mail had no code');

      // find the code input and type it (single box or one box per digit)
      const boxes = await page.eval(`(() => document.querySelectorAll('input[maxlength="1"], input[inputmode="numeric"][maxlength="1"]').length)()`);
      if (boxes >= 4) {
        const total = await page.type(`input[maxlength="1"]`, code, { clear: true }); // focus first box
        // type digit per box by keyboard: click each box then insert digit
        for (let bi = 0; bi < code.length && bi < boxes; bi++) {
          const r = await page.rect(`document.querySelectorAll('input[maxlength="1"]')[${bi}]`);
          if (!r) break;
          await page.mouseClick(r.x, r.y);
          await sleep(80);
          await this.cdp.send('Input.insertText', { text: code[bi] }, page.s);
          await sleep(90);
        }
        log(`typed split code into ${boxes} boxes (${total})`);
      } else {
        const codeSel = `input[autocomplete=one-time-code], input[inputmode=numeric], input[maxlength="6"], input[maxlength="4"], input[type=text]:not([name*=email i]), input[type=tel]`;
        const t1 = await page.type(codeSel, code, { clear: true });
        log(`typed code (${t1})`);
      }
      await sleep(400);
      const c2 = await this.clickContinue();
      log(`code submit: ${c2}`);
      await sleep(6000);
    }

    // --- optional onboarding survey ("Tell us a bit about you") and any
    //     intermediate "continue" screens between code and the console
    for (let pass = 0; pass < 4; pass++) {
      const st = await page.eval(`(() => { const t = document.body ? document.body.innerText : ''; return t.slice(0, 1200); })()`);
      if (/\$10 credit|receive the \$10/i.test(st) && /claim|redeem|accept|select/i.test(st)) {
        log('credit offer screen -> claim');
        await this.clickRe(RX_CLAIM);
        await sleep(3000);
        continue;
      }
      if (/Tell us a bit about you|personalize your Console|feel free to skip/i.test(st)) {
        log('onboarding survey -> skip');
        await this.clickRe(RX_SKIP);
        await sleep(3000);
        continue;
      }
      if (/Sign up for Upstage|Create your organization|organization name/i.test(st) && /Continue|Create/i.test(st)) {
        log('post-signup form -> continue');
        await this.fillIfPresent(`input[type=text], input[name*=name i]`, `Upstage ${this.id}`);
        await this.clickRe(RX_OK_CONTINUE);
        await sleep(3000);
        continue;
      }
      if (/One account for all Upstage products/i.test(st)) {
        log('back at login screen — resubmitting e-mail');
        await page.type('input[type=email], input[name*=email i], input[id*=email i], input:not([type])', this.mailbox.address, { clear: true });
        await sleep(300);
        await this.clickContinue();
        await sleep(4000);
        continue;
      }
      break;
    }

    // --- post-auth: are we in?
    const authed = await page.waitFor(
      `(() => { const t = document.body ? document.body.innerText : ''; if (/api key|API keys|api-keys/i.test(t)) return 'api-keys'; if (/dashboard|usage|billing|credits/i.test(t)) return 'console'; return null; })()`,
      { timeoutMs: 60000, pollMs: 1500 }
    );
    s = await this.screen(page);
    this.dump('04-post-auth', s);
    await this.shot(page, '04-post-auth');
    log(`post-auth: ${authed} url=${s.url} text=${(s.text || '').replace(/\s+/g, ' ').slice(0, 160)}`);

    // --- api keys page
    await page.goto(`${L.ORIGIN}/api-keys`, { waitMs: 5000 });
    await page.waitFor(`/api key|Create/i.test(document.body ? document.body.innerText : '')`, { timeoutMs: 45000, pollMs: 1200 });
    await sleep(1500);
    s = await this.screen(page);
    this.dump('05-api-keys', s);
    await this.shot(page, '05-api-keys');
    log(`api-keys page: buttons=${(s.buttons || []).join(' | ').slice(0, 200)}`);

    // pick a fresh exit BEFORE clicking continue
    await this.clickRe(RX_CREATE_KEY_BTN);
    await sleep(2500);
    s = await this.screen(page);
    this.dump('06-key-modal', s);
    await this.shot(page, '06-key-modal');
    log(`key modal: text=${(s.text || '').replace(/\s+/g, ' ').slice(0, 300)}`);

    // If a modal asks for a name, accept the default / type one, then confirm.
    await this.fillIfPresent(`input[type=text], input[name*=name i], input[placeholder*=name i]`, `key-${this.id}`);
    await this.clickRe(RX_CONFIRM_KEY);
    await sleep(5000);
    s = await this.screen(page);
    this.dump('07-key-shown', s);
    await this.shot(page, '07-key-shown');

    const key = await this.harvestKey();
    if (!key) throw new Error('no key captured from modal/API');
    log(`key captured: ${key.slice(0, 6)}…${key.slice(-4)}`);
    return key;
  }

  async clickContinue() {
    const page = this.page;
    const finder = `[...document.querySelectorAll('button,[role=button],input[type=submit],a')].find(e => /continue|next|submit|verify|sign\\s*in|log\\s*in|confirm|확인|계속/i.test((e.innerText || e.value || '').trim()) && e.offsetParent !== null)`;
    const r = await page.rect(finder);
    if (r) {
      await page.mouseClick(r.x, r.y);
      return 'mouse';
    }
    const ok = await page.eval(`(() => { const e = ${finder}; if (!e) return false; e.click(); return true; })()`);
    return ok ? 'js' : 'none';
  }

  async clickRe(rx) {
    const page = this.page;
    const finder = `[...document.querySelectorAll('button,[role=button],a')].find(e => ${rx}.test((e.innerText || e.value || '').trim()) && e.offsetParent !== null && !e.disabled)`;
    const r = await page.rect(finder);
    if (r) {
      await page.mouseClick(r.x, r.y);
      return true;
    }
    return page.eval(`(() => { const e = ${finder}; if (!e) return false; e.click(); return true; })()`);
  }

  async fillIfPresent(selector, value) {
    const page = this.page;
    const present = await page.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); return !!(e && e.offsetParent !== null); })()`);
    if (!present) return false;
    await page.type(selector, value, { clear: true });
    return true;
  }

  /** Key from: modal text, page text, or the response bodies. */
  async harvestKey() {
    const page = this.page;
    const inPage = await page.eval(`(() => { const t = document.body ? document.body.innerText : ''; const m = t.match(/\\b(up_[A-Za-z0-9_-]{16,}|[A-Za-z0-9]{8,}\\.[A-Za-z0-9]{8,}\\.[A-Za-z0-9_-]{16,})\\b/); return m ? m[1] : (t.match(/\\b[A-Za-z0-9_]{24,}\\b/) || [null])[0]; })()`);
    if (inPage) return inPage;
    for (const b of this.bodies.slice().reverse()) {
      const m = String(b.text).match(/"(?:api_?key|key|secret|token)"\s*:\s*"([^"]{16,})"/i);
      if (m) return m[1];
    }
    const all = this.net.responses.map((r) => `${r.url}`);
    const keyResp = this.bodies.find((b) => /api-?key/i.test(b.url));
    if (keyResp) {
      const m = String(keyResp.text).match(/\b(up_[A-Za-z0-9_-]{16,})\b/);
      if (m) return m[1];
    }
    return null;
  }
}

// ---------------------------------------------------------------- verification

async function verifyKey(key) {
  const proxyLib = require('./proxy.js');
  const pool = loadUpPool();
  const https = require('https');
  const call = (proxy, method, url, headers, body) =>
    new Promise((resolve, reject) => {
      const u = new URL(url);
      const payload = body ? Buffer.from(JSON.stringify(body)) : null;
      const rq = https.request(
        { method, host: u.hostname, port: 443, path: u.pathname + u.search, agent: proxy ? proxyLib.createAgent(proxy) : undefined, headers: { 'User-Agent': 'upstage-mint/1.0', ...headers, ...(payload ? { 'Content-Length': payload.length } : {}) } },
        (res) => {
          let t = '';
          res.on('data', (c) => (t += c));
          res.on('end', () => {
            let j = null;
            try {
              j = JSON.parse(t);
            } catch {}
            resolve({ status: res.statusCode, json: j, text: t });
          });
        }
      );
      rq.setTimeout(30000, () => rq.destroy(new Error('timeout')));
      rq.on('error', reject);
      if (payload) rq.write(payload);
      rq.end();
    });

  let lastBad = null;
  for (let i = 0; i < 6; i++) {
    const proxy = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    try {
      const m = await call(proxy, 'GET', `${L.API_BASE}/models`, { Authorization: `Bearer ${key}` });
      if (m.status === 401) return { ok: false, invalid: true, status: 401, note: (m.text || '').slice(0, 150) };
      if (m.status !== 200) {
        // 403/429/5xx is the exit, not the key (the same rule mint.verifyKey
        // follows): rotating, instead of stamping a good key "not verified"
        lastBad = { status: m.status, note: (m.text || '').slice(0, 150), proxy: proxyLib.label(proxy) };
        continue;
      }
      const models = (m.json && m.json.data ? m.json.data : []).map((x) => x.id);
      const c = await call(proxy, 'POST', `${L.API_BASE}/chat/completions`, { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, { model: 'solar-mini4', messages: [{ role: 'user', content: 'reply with the word ok' }], max_tokens: 8 });
      return { ok: true, models, chat: c.status, reply: c.json && c.json.choices ? c.json.choices[0].message.content.slice(0, 40) : null, proxy: proxyLib.label(proxy) };
    } catch (e) {
      lastBad = { status: null, note: `net: ${e.message.slice(0, 100)}` };
    }
  }
  return lastBad ? { ok: false, ...lastBad } : { ok: false, note: 'no exit answered' };
}

// --------------------------------------------------------------------- runner

async function main() {
  const N = flag('--limit') ? L.int(opt('--limit', '1'), 1) : COUNT;
  L.log(`upstage mint start: count=${N} conc=${CONC} port=${PORT}`);
  const pool = loadUpPool();
  // loadUpPool returns [null] (direct) when no pool file exists; an empty list
  // here means every line was a non-browser-capable exit (socks4)
  if (!pool.length) throw new Error('every pool line is socks4 (not browser-capable) — run pool.js first');
  L.log(`proxy pool: ${pool.length}`);

  await L.ensureChrome(PORT, path.join(L.HERE, `.up-chrome-${PORT}`), { headless: !HEADED });
  const ws = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).then((j) => j.webSocketDebuggerUrl);
  const cdp = new L.CDP(ws, {});
  await cdp.connect();

  const state = readState();
  const done = state.accounts.length;
  let next = done;
  const errors = [];
  let okKeys = 0;

  async function worker() {
    while (true) {
      const id = next++;
      if (id >= N) return;
      const proxy = pool[id % pool.length];
      let mailbox;
      let flow;
      try {
        mailbox = await L.newMailbox(id % 2 ? 'inboxes' : 'mailtrap');
      } catch (e) {
        errors.push(`#${id} mailbox: ${e.message.slice(0, 100)}`);
        continue;
      }
      try {
        flow = new Flow(id, cdp, proxy, mailbox);
        const key = await flow.run();
        const v = await verifyKey(key);
        const rec = {
          id,
          email: mailbox.address,
          mailbox: mailbox.provider,
          proxy: L.proxyLabel(proxy),
          key,
          keyMasked: `${key.slice(0, 4)}…${key.slice(-4)}`,
          verified: !!v.ok,
          verifyStatus: v.status || v.chat || null,
          verifyNote: v.note || null, // an indeterminate answer (429/5xx/transport) must be readable as such
          models: (v.models || []).slice(0, 8),
          chat: v.chat || null,
          credit: null,
          ts: new Date().toISOString(),
          screens: flow.files.map((p) => path.basename(p)),
          net: flow.net.requests.filter((r) => /apistage|cognito/i.test(r.url)).map((r) => `${r.method} ${r.url.split('?')[0]}`).slice(0, 25),
          apiBodies: (flow.bodies || []).map((b) => ({ url: b.url.split('?')[0], status: b.status, text: String(b.text).slice(0, 800) })).slice(0, 20),
        };
        if (v.ok) {
          okKeys++;
          appendKey(key);
          appendAccount(rec);
          L.log(`[${id}] verified ${rec.keyMasked} chat=${v.chat} void`);
        } else {
          fs.writeFileSync(path.join(L.OUT, `acct${id}-unverified.json`), JSON.stringify(rec, null, 2), { mode: 0o600 });
          errors.push(`#${id} key not verified: ${v.note || v.status}`);
          L.log(`[${id}] KEY UNVERIFIED ${v.note || v.status}`);
        }
      } catch (e) {
        errors.push(`#${id} ${L.proxyLabel(proxy)} ${e.message.slice(0, 160)}`);
        L.log(`[${id}] FAIL ${e.message.slice(0, 300)}`);
      } finally {
        if (flow) {
          try {
            await cdp.disposeBrowserContext(flow.ctx);
          } catch {}
          try {
            flow.detachProxyAuth && (await flow.detachProxyAuth());
          } catch {}
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONC, N) }, (_, i) => worker(i)));
  L.log(`done. keys=${fs.existsSync(KEYS_TXT) ? fs.readFileSync(KEYS_TXT, 'utf8').split(/\r?\n/).filter(Boolean).length : 0}`);
  if (errors.length) L.log(`errors:\n` + errors.join('\n'));
  if (okKeys === 0) process.exitCode = 1; // nothing minted is not a success
  if (!KEEP_OPEN) cdp.close();
}

main().catch((e) => {
  console.error('REGISTER FAIL:', e.stack || e.message);
  process.exit(1);
});
