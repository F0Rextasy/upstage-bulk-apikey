'use strict';

/**
 * Shared plumbing for the Upstage / Solar mint:
 *  - proxy pool [optional] (src/proxies.txt + the screened lists under out/)
 *    with proxied HTTP and a cookie jar
 *  - temp-mailbox brokers (mailtrap / inboxes.com)
 *  - Chrome + CDP page driver with network capture
 *
 * Egress: the pool is optional — with one every request goes through an exit
 * and a dead line fails that attempt (never a silent fall back to direct);
 * with no pool file the tool connects directly, `null` being the direct
 * sentinel every request layer here accepts.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const proxyLib = require('./proxy.js');
const { CDP } = require('./cdp.js');

const HERE = path.join(__dirname);
const OUT = path.join(HERE, 'outputs');
const ORIGIN = 'https://console.upstage.ai';
const API_BASE = 'https://api.upstage.ai/v1';
const PUBLIC_SITE = 'https://www.upstage.ai';
const { chromePath, uaPin, fingerprintForSeed } = require('./chrome-flags.js');
// SD_CHROME (chrome-flags.js) wins; the historical CHROME_PATH still works.
const CHROME = process.env.SD_CHROME || process.env.CHROME_PATH || chromePath();

const UA = process.env.SD_UA ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_METADATA = {
  brands: [
    { brand: 'Not_A Brand', version: '24' },
    { brand: 'Chromium', version: '141' },
    { brand: 'Google Chrome', version: '141' },
  ],
  fullVersionList: [
    { brand: 'Not_A Brand', version: '24.0.0.0' },
    { brand: 'Chromium', version: '141.0.0.0' },
    { brand: 'Google Chrome', version: '141.0.0.0' },
  ],
  fullVersion: '141.0.0.0',
  platform: 'Windows',
  platformVersion: '10.0.0',
  architecture: 'x86',
  model: '',
  mobile: false,
  bitness: '64',
  wow64: false,
};

const BROKER_MAILTRAP = 'http://127.0.0.1:9700';
const BROKER_INBOXES = 'http://127.0.0.1:9701';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** `parseInt` for a CLI flag: a flag typed bare (`--count` with no value, or an
 *  empty shell variable) yields NaN, and a NaN count silently ran zero workers. */
const int = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

/** Short non-guessable token: `rand()` is Math.random() and is fine for names,
 *  never for a password. */
const randHex = (n) => crypto.randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n);
const rand = (n) => Math.random().toString(36).slice(2, 2 + n);
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function log(msg) {
  const line = `[${now()}] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(OUT, { recursive: true });
    fs.appendFileSync(path.join(OUT, 'upstage.log'), line + '\n');
  } catch {}
}

// ------------------------------------------------------------------- proxies

const POOL_FILES = [
  path.join(__dirname, 'proxies.txt'),
  path.join(__dirname, 'out', 'proxy-live-pool-recheck-live.txt'),
  path.join(__dirname, 'out', 'proxy-live-pool-live.txt'),
  path.join(__dirname, 'out', 'pilot-proxies.txt'),
  path.join(__dirname, 'out', 'proxy-candidates-fresh.txt'),
];

/** Loads the proxy pool, skipping loopback/LAN lines. With no pool file — or
 *  none carrying a usable line — this is DIRECT mode: `null` is the direct
 *  sentinel, and a proxy is recommended at scale (per-IP limits, bans) but the
 *  tool works without one.
 *
 *  `UPSTAGE_PROXIES` (the pool file the READMEs document) is read first: a user
 *  who points it at his own pool must not end up on the home line because the
 *  code only ever opened its built-in paths. */
function loadPool() {
  const files = process.env.UPSTAGE_PROXIES ? [path.resolve(process.env.UPSTAGE_PROXIES), ...POOL_FILES] : POOL_FILES;
  const seen = new Set();
  const out = [];
  const blank = [];
  for (const f of files) {
    let list = [];
    try {
      list = fs.existsSync(f) ? proxyLib.loadPoolFile(f) : [];
    } catch {
      continue;
    }
    if (!list.length) {
      if (fs.existsSync(f)) blank.push(path.basename(f)); // present, no usable line
      continue;
    }
    for (const p of list) {
      if (proxyLib.isLocalHost && proxyLib.isLocalHost(p.host)) continue;
      const key = `${p.protocol}://${p.host}:${p.port}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    if (out.length) break; // first readable file wins
  }
  if (!out.length) {
    console.log('no proxy pool — running WITHOUT a proxy (direct). Put exits in src/proxies.txt to route through them.');
    if (blank.length) console.log(`  (a pool file was there but carried no usable line: ${blank.join(', ')})`);
    return [null];
  }
  return out;
}

function proxyLabel(p) {
  return p ? `${p.protocol}://${p.host}:${p.port}` : '(none)';
}

/** One exit check: returns the egress IP as the site would see it. */
async function exitIp(proxy, timeoutMs = 12000) {
  const urls = [
    'https://api.ipify.org/?format=text',
    'https://icanhazip.com/',
    'https://ifconfig.me/ip',
    'https://www.cloudflare.com/cdn-cgi/trace',
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const text = await proxyLib.fetchText(proxy, url, { timeoutMs: Math.max(8000, Math.round(timeoutMs / 2)), headers: { 'User-Agent': 'curl/8.5.0' } });
      const m = String(text).match(/(\d{1,3}(?:\.\d{1,3}){3})/);
      if (m) return m[1];
      lastErr = new Error(`no ip in ${url.split('/')[2]}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('no ip echo');
}

/** Finds a pool entry that (a) tunnels and (b) is not our own line. The direct
 *  sentinel passes straight through — with no pool there is no own line to
 *  avoid — and only a pool that is entirely dead still throws (fail-closed). */
async function pickExit(pool, { start = 0, selfIp = null, timeoutMs = 12000 } = {}) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[(start + i) % pool.length];
    try {
      const ip = await exitIp(p, timeoutMs);
      if (selfIp && p && ip === selfIp) {
        log(`exit ${proxyLabel(p)} -> ${ip} == own line, skip`);
        continue;
      }
      return { proxy: p, ip };
    } catch (e) {
      log(`exit dead ${proxyLabel(p)}: ${e.message.slice(0, 60)}`);
    }
  }
  throw new Error('no working exit in pool');
}

async function ownIp() {
  try {
    const text = await proxyLib.fetchText(null, 'https://api.ipify.org/?format=text', { timeoutMs: 8000 });
    const ip = String(text || '').trim();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip;
  } catch {}
  try {
    return fs.readFileSync(path.join(__dirname, 'out', 'own-ip.txt'), 'utf8').trim();
  } catch {
    return null;
  }
}

// ----------------------------------------------------------- HTTP (proxied)

/** Tiny cookie jar keyed by host. */
class Jar {
  constructor() {
    this.cookies = new Map(); // host -> Map(name -> value)
  }
  setFromResponse(host, setCookie) {
    const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    for (const raw of list) {
      const [pair] = String(raw).split(';');
      const i = pair.indexOf('=');
      if (i <= 0) continue;
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (!this.cookies.has(host)) this.cookies.set(host, new Map());
      this.cookies.get(host).set(name, value);
    }
  }
  header(host) {
    const m = this.cookies.get(host);
    if (!m || !m.size) return '';
    return [...m.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  get(host, name) {
    const m = this.cookies.get(host);
    return m ? m.get(name) : undefined;
  }
  dump() {
    const out = {};
    for (const [h, m] of this.cookies) out[h] = Object.fromEntries(m);
    return out;
  }
  load(dump) {
    for (const [h, m] of Object.entries(dump || {})) this.cookies.set(h, new Map(Object.entries(m)));
  }
}

/**
 * One HTTP round-trip through `proxy` (or direct when null). Returns
 * { status, headers, text, json }. Follows redirects when `follow` is set,
 * keeping cookies.
 */
function httpReq(proxy, url, { method = 'GET', headers = {}, body, timeoutMs = 30000, jar, follow = 0, agent } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const payload =
      body === undefined || body === null
        ? null
        : Buffer.isBuffer(body)
          ? body
          : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const finalHeaders = { 'User-Agent': UA, ...headers };
    if (payload && !Object.keys(finalHeaders).some((h) => h.toLowerCase() === 'content-length')) {
      finalHeaders['Content-Length'] = payload.length;
    }
    if (jar) {
      const c = jar.header(u.hostname);
      if (c) finalHeaders.Cookie = finalHeaders.Cookie ? `${finalHeaders.Cookie}; ${c}` : c;
    }
    const req = lib.request(
      {
        method,
        host: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        agent: agent || (proxy ? proxyLib.createAgent(proxy) : undefined),
        headers: finalHeaders,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          if (jar) jar.setFromResponse(u.hostname, res.headers['set-cookie']);
          if (follow > 0 && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const next = new URL(res.headers.location, url).toString();
            const m = res.statusCode === 303 ? 'GET' : method;
            return resolve(
              httpReq(proxy, next, { method: m, headers, body: m === 'GET' ? undefined : body, timeoutMs, jar, follow: follow - 1, agent })
            );
          }
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, text, json, url });
        });
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ------------------------------------------------------------- mail provider

async function brokerJson(base, pathname, { method = 'GET', timeoutMs = 45000, body } = {}) {
  const res = await httpReq(null, base + pathname, { method, timeoutMs, body });
  if (res.status !== 200 || !res.json) throw new Error(`broker ${base}${pathname} -> ${res.status}: ${res.text.slice(0, 120)}`);
  return res.json;
}

/** Every mailbox ever created is appended to outputs/mailboxes.jsonl so any
 *  pending account's inbox can be re-checked later (tokens are otherwise lost). */
function persistMailbox(mb) {
  try {
    fs.mkdirSync(OUT, { recursive: true });
    fs.appendFileSync(path.join(OUT, 'mailboxes.jsonl'), JSON.stringify({ ts: now(), ...mb }) + '\n', { mode: 0o600 }); // mailbox tokens
  } catch {}
}

/** mailtrap via broker 9700, inboxes.com via broker 9701. 'mailtrap-only' skips the fallback. */
async function newMailbox(prefer = 'mailtrap') {
  const order = prefer === 'inboxes' ? ['inboxes', 'mailtrap'] : prefer === 'mailtrap-only' ? ['mailtrap'] : ['mailtrap', 'inboxes'];
  let lastErr;
  // the broker's proxy chain is the flaky path: when mailtrap is wanted, try the
  // Mailtrap API directly first (env or a token file)
  if (prefer !== 'inboxes') {
    try {
      return await newMailtrapDirect();
    } catch (e) {
      lastErr = e;
    }
  }
  for (const p of order) {
    try {
      const base = p === 'mailtrap' ? BROKER_MAILTRAP : BROKER_INBOXES;
      const out = await brokerJson(base, '/create', {
        method: 'POST',
        timeoutMs: 150000,
        body: p === 'mailtrap' ? { folder: 'upstage-bulk' } : undefined,
      });
      if (!out.address || !out.token) throw new Error(`broker ${p} answered ${JSON.stringify(out).slice(0, 120)}`);
      // the inboxes.com upstream flaps: an inbox that cannot be listed right away
      // is worthless (the code would be unreadable), so fall through to the next
      try {
        await brokerJson(base, `/list?token=${encodeURIComponent(out.token)}`, { timeoutMs: 45000 });
      } catch (e) {
        lastErr = new Error(`${p} unreadable: ${e.message.slice(0, 100)}`);
        continue;
      }
      const mb = { provider: p, address: out.address, token: out.token, base };
      persistMailbox(mb);
      return mb;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`no mailbox provider: ${lastErr && lastErr.message}`);
}

async function listMail(mailbox) {
  if (mailbox.base === 'direct') {
    const r = await mailtrapApi(`/inbound/inboxes/${encodeURIComponent(mailbox.token)}/messages`);
    const msgs = Array.isArray(r) ? r : (r && r.data) || [];
    return msgs.map((m) => ({
      id: String(m.id),
      subject: m.subject || '',
      from: m.from_email || '',
      text: '',
      html: '',
    }));
  }
  try {
    const out = await brokerJson(mailbox.base, `/list?token=${encodeURIComponent(mailbox.token)}`);
    return out.messages || [];
  } catch (e) {
    if (mailbox.provider !== 'mailtrap') throw e;
    // broker's proxy chain is the slow path: read Mailtrap directly
    const msgs = await mailtrapApi(`/inbound/inboxes/${encodeURIComponent(mailbox.token)}/messages`);
    return (Array.isArray(msgs) ? msgs : []).map((m) => ({
      id: String(m.id),
      subject: m.subject || '',
      from: m.from_email || '',
      text: '',
      html: '',
    }));
  }
}

async function readMail(mailbox, id) {
  const direct = async () => {
    const base = `/inbound/inboxes/${encodeURIComponent(mailbox.token)}/messages/${encodeURIComponent(id)}`;
    const text = await mailtrapApi(`${base}/body.txt`).catch(() => '');
    const html = await mailtrapApi(`${base}/body.html`).catch(() => '');
    return { id: String(id), text: typeof text === 'string' ? text : '', html: typeof html === 'string' ? html : '' };
  };
  if (mailbox.base === 'direct') return direct();
  try {
    return await brokerJson(mailbox.base, `/read?id=${encodeURIComponent(id)}&token=${encodeURIComponent(mailbox.token)}`);
  } catch (e) {
    if (mailbox.provider !== 'mailtrap') throw e;
    return direct();
  }
}

/** Direct Mailtrap API (no broker): token from env or a token file. */
function mailtrapToken() {
  if (process.env.MAILTRAP_TOKEN) return process.env.MAILTRAP_TOKEN.trim();
  try {
    return fs.readFileSync(path.join(os.homedir(), '.river-mailtrap-token'), 'utf8').trim();
  } catch {
    return '';
  }
}

/** One fresh inbox straight from the Mailtrap API (no broker in the middle).
 *  Note: the payload is flat `{name}` (an `{inbox:{…}}` wrapper answers 422),
 *  and mailtrap.io intermittently blackholes the first connects (AggregateError
 *  ETIMEDOUT) — hence the retries. */
async function newMailtrapDirect() {
  const tok = mailtrapToken();
  if (!tok) throw new Error('no mailtrap token on disk');
  let lastErr;
  for (let i = 0; i < 5; i++) {
    const name = `up-${Date.now().toString(36)}-${rand(4)}`;
    try {
      const r = await httpReq(null, 'https://mailtrap.io/api/inbound/folders/1693/inboxes', {
        method: 'POST',
        timeoutMs: 25000,
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: { name },
      });
      if ((r.status === 200 || r.status === 201) && r.json && r.json.id) {
        // the create response carries the routed address in `address` (the
        // 8-hex suffix is added by Mailtrap; signup with anything else cannot
        // receive mail)
        const address = r.json.address || r.json.email || `${name}@inbound-mailtrap.io`;
        const mb = { provider: 'mailtrap', address, token: String(r.json.id), base: 'direct' };
        persistMailbox(mb);
        return mb;
      }
      lastErr = new Error(`mailtrap direct create -> ${r.status}: ${(r.text || '').slice(0, 120)}`);
      if (r.status === 422) break; // payload problem, retrying will not help
    } catch (e) {
      lastErr = e;
    }
    await sleep(1500 + i * 500);
  }
  throw lastErr || new Error('mailtrap direct create failed');
}

async function mailtrapApi(pathname, { timeoutMs = 25000, tries = 3 } = {}) {
  const tok = mailtrapToken();
  if (!tok) throw new Error('no mailtrap token on disk');
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await httpReq(null, 'https://mailtrap.io/api' + pathname, {
        timeoutMs,
        headers: { Authorization: `Bearer ${tok}`, Accept: 'application/json' },
      });
      if (r.status === 200) return r.json !== null && r.json !== undefined ? r.json : r.text;
      lastErr = new Error(`mailtrap ${pathname} -> ${r.status}: ${(r.text || '').slice(0, 100)}`);
      if (r.status === 404 || r.status === 422) break; // real answer, not a transport blip
    } catch (e) {
      lastErr = e; // mailtrap.io blackholes the first connects from this line
    }
    await sleep(800 + i * 400);
  }
  throw lastErr || new Error(`mailtrap ${pathname} failed`);
}

/** Polls the mailbox until `test(message)` passes. Returns the message. */
async function waitForMail(mailbox, test, { timeoutMs = 150000, pollMs = 5000, note } = {}) {
  const deadline = Date.now() + timeoutMs;
  let seen = new Set();
  while (Date.now() < deadline) {
    let msgs = [];
    try {
      msgs = await listMail(mailbox);
    } catch (e) {
      if (note) note(`mail list error: ${e.message.slice(0, 80)}`);
    }
    for (const m of msgs) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      let full = m;
      try {
        full = await readMail(mailbox, m.id);
      } catch {}
      if (test(full)) return full;
    }
    await sleep(pollMs);
  }
  return null;
}

/** All http(s) links in a mail body, decoded, deduped. */
function extractLinks(msg) {
  const blob = `${msg.html || ''}\n${msg.text || ''}`;
  const hrefs = [...blob.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const bare = [...blob.matchAll(/https?:\/\/[^\s"'<>\\]+/g)].map((m) => m[0]);
  const all = [...hrefs, ...bare]
    .map((s) => s.replace(/&amp;/g, '&').replace(/&#x2F;/g, '/'))
    .map((s) => s.replace(/[).,;]+$/, ''));
  return [...new Set(all)];
}

// ------------------------------------------------------------------- chrome

function launchChrome(port, profileDir, { headless = true } = {}) {
  let lean = [];
  try {
    lean = require('./chrome-flags.js').leanArgs(); // across runs memory trim
  } catch {}
  // One fingerprint per profile: UA (headless only), viewport, timezone and
  // locale come from this profile's index. SD_UA / SD_UA_POOL pin a UA instead.
  const fp = fingerprintForSeed(profileDir);
  const flags = [
    ...lean, // the memory trim chrome-flags.js measured: it was computed and dropped
    headless ? '--headless=new' : '--start-maximized',
    // A headless run must not advertise `HeadlessChrome`.
    ...(headless ? [`--user-agent=${fp.userAgent || uaPin()}`] : []),
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--disable-domain-reliability',
    '--disable-breakpad',
    '--disable-default-apps',
    '--no-service-autorun',
    '--metrics-recording-only',
    '--disable-blink-features=AutomationControlled',
    '--password-store=basic',
    `--lang=${fp.locale.lang}`,
    `--window-size=${fp.windowSize}`,
    'about:blank',
  ];
  const child = spawn(CHROME, flags, { detached: true, stdio: 'ignore', windowsHide: true, env: { ...process.env, TZ: fp.timezone } });
  child.unref();
  return child.pid;
}

async function waitForPort(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return true;
    } catch {}
    await sleep(600);
  }
  return false;
}

/** Attaches to an already-running debug port, otherwise launches Chrome. */
async function ensureChrome(port, profileDir, { headless = true } = {}) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (r.ok) return 'attached';
  } catch {}
  launchChrome(port, profileDir, { headless });
  if (!(await waitForPort(port))) throw new Error(`chrome did not open port ${port}`);
  return 'launched';
}

class Page {
  constructor(cdp, sessionId) {
    this.cdp = cdp;
    this.s = sessionId;
  }
  async eval(expr) {
    const r = await this.cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, this.s);
    if (r.exceptionDetails) {
      throw new Error(`eval: ${r.exceptionDetails.text} ${(r.exceptionDetails.exception && r.exceptionDetails.exception.description) || ''}`.slice(0, 300));
    }
    return r.result.value;
  }
  async goto(url, { waitMs = 0 } = {}) {
    await this.cdp.send('Page.navigate', { url }, this.s);
    if (waitMs) await sleep(waitMs);
  }
  async body() {
    try {
      return await this.eval('document.body ? document.body.innerText : ""');
    } catch {
      return '';
    }
  }
  async html() {
    try {
      return await this.eval('document.documentElement ? document.documentElement.outerHTML : ""');
    } catch {
      return '';
    }
  }
  async url() {
    try {
      return await this.eval('location.href');
    } catch {
      return '';
    }
  }
  async waitFor(expr, { timeoutMs = 30000, pollMs = 500 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const v = await this.eval(expr);
        if (v) return v;
      } catch {}
      await sleep(pollMs);
    }
    return null;
  }
  async rect(finder) {
    return this.eval(
      `(() => { try { const el = ${finder}; if (!el) return null; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, left: r.left }; } catch (e) { return null; } })()`
    );
  }
  async mouseClick(x, y) {
    await this.cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, this.s);
    await sleep(40 + Math.random() * 90);
    await this.cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }, this.s);
    await sleep(50 + Math.random() * 80);
    await this.cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 }, this.s);
  }
  async click(finder, { scroll = true } = {}) {
    if (scroll) {
      try {
        await this.eval(`(() => { const el = ${finder}; if (el) el.scrollIntoView({block:'center'}); return !!el; })()`);
        await sleep(120);
      } catch {}
    }
    const r = await this.rect(finder);
    if (!r) return false;
    await this.mouseClick(r.x, r.y);
    return true;
  }
  async type(selector, text, { clear = true } = {}) {
    if (!(await this.click(`document.querySelector(${JSON.stringify(selector)})`))) return false;
    await sleep(90);
    if (clear) {
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 }, this.s);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 }, this.s);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, this.s);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, this.s);
      await sleep(60);
    }
    const chunks = text.match(/.{1,4}/g) || [text];
    for (const ch of chunks) {
      await this.cdp.send('Input.insertText', { text: ch }, this.s);
      await sleep(25 + Math.random() * 55);
    }
    const got = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? el.value : null; })()`);
    if (got !== text) {
      await this.eval(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value'); el.focus(); d.set.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`
      );
    }
    return true;
  }
  /** Human-ish per-key typing (fires real keydown/input events). */
  async typeKeys(selector, text, { clear = true } = {}) {
    if (!(await this.click(`document.querySelector(${JSON.stringify(selector)})`))) return false;
    await sleep(120);
    if (clear) {
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 }, this.s);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 }, this.s);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, this.s);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, this.s);
      await sleep(80);
    }
    for (const ch of String(text)) {
      const code = /[0-9]/.test(ch) ? `Digit${ch}` : /[a-zA-Z]/.test(ch) ? `Key${ch.toUpperCase()}` : '';
      const vk = /[0-9]/.test(ch) ? 48 + Number(ch) : /[a-zA-Z]/.test(ch) ? ch.toUpperCase().charCodeAt(0) : 0;
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, code, windowsVirtualKeyCode: vk, text: ch, unmodifiedText: ch }, this.s);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, code, windowsVirtualKeyCode: vk }, this.s);
      await sleep(30 + Math.random() * 50);
    }
    return true;
  }
  /** Clicks the Turnstile widget if one is present (real click). */
  async pokeTurnstile() {
    const info = await this.eval(
      `(() => { const f = [...document.querySelectorAll('iframe')].find(f => /challenges\\.cloudflare\\.com/.test(f.src || '')); if (!f) return null; const r = f.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`
    );
    if (!info || info.w < 10) return false;
    await this.mouseClick(info.x + Math.min(30, info.w / 2), info.y + info.h / 2);
    return true;
  }
}

/**
 * Opens an isolated browser context (its own proxy + storage) and wires up
 * network capture: every request whose URL matches `capture` is recorded with
 * method/headers/postData, responses by requestId.
 */
async function openContext(cdp, proxy, { capture } = {}) {
  const ctx = await cdp.createBrowserContext(proxy ? { proxyServer: proxyLib.browserUrl(proxy) } : {});
  const { targetId, sessionId } = await cdp.newPage({ browserContextId: ctx, url: 'about:blank' });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Network.enable', {}, sessionId);
  // NOTE: no Emulation.setUserAgentOverride — an engine/UA mismatch (real Chrome
  // 155 vs a spoofed 141 string) is a first-class bot signal for Cloudflare,
  // Turnstile and DataDome; letting Chrome send its own UA is the safe default.
  const detachProxyAuth = proxy && proxy.username ? await proxyLib.attachProxyAuth(cdp, sessionId, proxy) : async () => {};
  const net = { requests: [], responses: [] };
  const want = capture || (() => true);
  cdp.on(
    'Network.requestWillBeSent',
    (p) => {
      if (!want(p.request.url)) return;
      net.requests.push({
        method: p.request.method,
        url: p.request.url,
        headers: p.request.headers,
        postData: p.request.postData || '',
        type: p.type,
        ts: Date.now(),
      });
    },
    sessionId
  );
  cdp.on(
    'Network.responseReceived',
    (p) => {
      if (!want(p.response.url)) return;
      net.responses.push({ url: p.response.url, status: p.response.status, requestId: p.requestId, type: p.type, ts: Date.now() });
    },
    sessionId
  );
  const page = new Page(cdp, sessionId);
  page.responseBody = async (requestId) => {
    const r = await cdp.send('Network.getResponseBody', { requestId }, sessionId).catch(() => null);
    if (!r) return '';
    return r.base64Encoded ? Buffer.from(r.body, 'base64').toString('utf8') : r.body;
  };
  page.cookies = async () => {
    const r = await cdp.send('Network.getCookies', {}, sessionId).catch(() => null);
    return (r && r.cookies) || [];
  };
  page.setCookies = async (cookies) => {
    for (const c of cookies) {
      await cdp
        .send('Network.setCookie', { name: c.name, value: c.value, domain: c.domain, path: c.path || '/', url: `https://${String(c.domain).replace(/^\./, '')}${c.path || '/'}` }, sessionId)
        .catch(() => {});
    }
  };
  return { ctx, targetId, sessionId, page, net, detachProxyAuth };
}

/**
 * Clicks `finder` repeatedly until `checkExpr` is truthy — survives React
 * hydration lag on first paint.
 */
async function clickUntil(page, finder, checkExpr, { attempts = 12, gapMs = 1100 } = {}) {
  for (let i = 0; i < attempts; i++) {
    await page.click(finder).catch(() => {});
    await sleep(gapMs);
    const ok = await page.eval(`(() => { try { return !!(${checkExpr}); } catch (e) { return false; } })()`).catch(() => false);
    if (ok) return true;
  }
  return false;
}

/** State/record files: `saveJson` is used for account state, so keep them
 *  readable by this user only. */
function saveJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function randomPassword() {
  const words = ['Solar', 'Polaris', 'Nova', 'Lumen', 'Delta', 'Orbit', 'Quartz', 'Vega', 'Juno', 'Kappa'];
  return `${words[crypto.randomInt(words.length)]}!${randHex(4)}${crypto.randomInt(10, 100)}`;
}

module.exports = {
  HERE,
  OUT,
  ORIGIN,
  API_BASE,
  PUBLIC_SITE,
  CHROME,
  UA,
  UA_METADATA,
  BROKER_MAILTRAP,
  BROKER_INBOXES,
  POOL_FILES,
  sleep,
  rand,
  now,
  log,
  loadPool,
  proxyLabel,
  exitIp,
  pickExit,
  ownIp,
  Jar,
  httpReq,
  newMailbox,
  listMail,
  readMail,
  waitForMail,
  extractLinks,
  launchChrome,
  waitForPort,
  ensureChrome,
  Page,
  openContext,
  saveJson,
  int,
  randHex,
  readJson,
  randomPassword,
  proxyLib,
  CDP,
  os,
};
