#!/usr/bin/env node
'use strict';

/**
 * Upstage / Solar — batch mint: 30 accounts x 1 API key.
 *
 *   node src/mint.js [--count 30] [--conc 3] [--port 9290] [--headed]
 *                [--chat-min 5] [--limit N] [--attempts 4]
 *                [--preset=turbo|balanced|safe] [--gap S]
 *
 * Proxy exits [optional] (src/proxies.txt): free-proxy exits die within
 * minutes, so exits are screened *on demand* (api.upstage.ai must answer 401
 * for a bogus bearer and console.upstage.ai must deliver the full login page)
 * and handed out one per account. With no pool at all every account goes
 * direct — a proxy is recommended at scale, not required.
 *
 * One account = one fresh mailbox + one exit (or direct) + one isolated Chrome
 * context. Keys land in ../keys.txt (one per line, live-verified) and the
 * account record in ../accounts.json the moment GET /v1/models answered 200.
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');
const proxyLib = require('./proxy.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);

process.on('uncaughtException', (e) => {
  try {
    require('./lib').log(`UNCAUGHT: ${(e && e.stack) || e}`);
  } catch {}
});
process.on('unhandledRejection', (e) => {
  try {
    require('./lib').log(`UNHANDLED: ${(e && (e.stack || e.message)) || e}`);
  } catch {}
});
const flag = (n) => args.includes(n);

// Run-shape presets (operator standard v3): `--preset=turbo|balanced|safe` sets the
// browser concurrency (turbo = 5) and the pacing gap; an explicit `--conc` / `--gap`
// wins and no `--preset` keeps the historical conc 3. Headless stays the default
// (proven under the pinned UA); `--headed` or SD_HEADLESS=0 shows the browser.
const { presetArgv, resolvePreset } = require('./preset');
const gapArg = opt('--gap', null);
const PRESET = resolvePreset({
  preset: presetArgv(args) || opt('--preset', null),
  conc: null,
  gap: gapArg == null ? null : parseFloat(gapArg),
  defaultConc: 3,
});
const GAP_MS = PRESET.gap == null ? null : Math.max(0, PRESET.gap) * 1000;
if (!Number.isFinite(GAP_MS) && GAP_MS !== null) {
  console.error(`--gap needs a number of seconds, got ${JSON.stringify(gapArg)}`);
  process.exit(2);
}
// a bare flag (`--count` with nothing behind it, or an empty shell variable)
// used to parse as NaN: NaN workers, "MINT 0/NaN OK", exit 0
const COUNT = L.int(opt('--count', '30'), 30);
const CONC = Math.max(1, L.int(opt('--conc', String(PRESET.conc)), Number(PRESET.conc) || 3));
const PORT = L.int(opt('--port', '9290'), 9290);
const CHAT_MIN = L.int(opt('--chat-min', '5'), 5);
const ATTEMPTS = L.int(opt('--attempts', '4'), 4);
const LIMIT = flag('--limit') ? L.int(opt('--limit', '1'), 1) : COUNT;
const IDBASE = L.int(opt('--idbase', '0'), 0);
const HEADLESS = !flag('--headed') && process.env.SD_HEADLESS !== '0';
// Live console: keys landed in this run.
let okCount = 0;

const HERE = L.HERE;
const KEYS_TXT = path.join(HERE, 'keys.txt');
const ACCOUNTS = path.join(HERE, 'accounts.json');
const MIRROR = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'upstage-keys.txt');
const STATE = path.join(L.OUT, 'state2.json');
const OUTS = path.join(__dirname, 'out');

const sleep = L.sleep;
const withDeadline = (promise, ms) => Promise.race([promise.catch(() => null), sleep(ms).then(() => null)]);

// ------------------------------------------------------------------ storage

function readState() {
  return L.readJson(STATE, { done: {}, chatVerified: 0, screened: 0, exitsFound: 0 });
}

function writeState(s) {
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2), { mode: 0o600 });
}

function appendKey(key) {
  if (!fs.existsSync(KEYS_TXT)) fs.writeFileSync(KEYS_TXT, '', { mode: 0o600 });
  const have = new Set(fs.readFileSync(KEYS_TXT, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  if (have.has(key)) return false;
  fs.appendFileSync(KEYS_TXT, key + '\n');
  try {
    fs.appendFileSync(MIRROR, key + '\n');
  } catch {}
  return true;
}

function appendAccount(rec) {
  // accounts.json is the only copy of every account's password and mailbox:
  // reading an unparsable file as "[]" and writing one record over it threw the
  // whole history away, so refuse instead of overwriting
  const exists = fs.existsSync(ACCOUNTS);
  const list = exists ? L.readJson(ACCOUNTS, null) : [];
  if (list === null) throw new Error(`${ACCOUNTS} is not readable JSON — refusing to overwrite it (move it aside first)`);
  list.push(rec);
  fs.writeFileSync(ACCOUNTS, JSON.stringify(list, null, 2), { mode: 0o600 });
}

// -------------------------------------------------------------- proxy pool

/** api.upstage.ai reachability: a bogus bearer must come back 401 (or a WAF 403). */
async function apiCheck(p, timeoutMs = 30000) {
  try {
    const r = await L.httpReq(p, 'https://api.upstage.ai/v1/models', { timeoutMs, headers: { Authorization: 'Bearer sk-bogus' } });
    if (r.status === 401) return 401;
    if (r.status === 403) return 403;
    return 0;
  } catch {
    return 0;
  }
}

/** console reachable through the exit: any real console/edge answer (< 500).
 *  The full-page check lives in harvest.js; the browser is the final judge. */
async function consoleCheck(p, timeoutMs = 18000) {
  try {
    const r = await L.httpReq(p, 'https://console.upstage.ai/login', { timeoutMs });
    return r.status === 200 || r.status === 302 || r.status === 307;
  } catch {
    return false;
  }
}

/** Pool files, most recent first. Console-capable exits are the scarce good. */
const POOL_FILE_NAMES = [
  '../proxies.txt',
  'upstage-warm.txt',
  'upstage-console-live.txt',
  'router-upstage-live.txt',
  'new-live.txt',
  'union-live.txt',
  'upstage-live.txt',
  'pool-fresh-live-live.txt',
  'up-usable.txt',
  'proxy-live-pool-recheck-live.txt',
  'proxy-live-pool-live.txt',
  'up-usable.txt.prev',
];

/** The same list as absolute paths, with the pool file the READMEs document
 *  (`UPSTAGE_PROXIES`) in front when it is set — an ignored pool knob is how a
 *  run ends up on the home line without the operator noticing. */
function poolFiles() {
  const files = POOL_FILE_NAMES.map((f) => path.join(OUTS, f));
  return process.env.UPSTAGE_PROXIES ? [path.resolve(process.env.UPSTAGE_PROXIES), ...files] : files;
}

/**
 * Keeps a small stock of freshly screened exits. Candidates come from the
 * pool files (newest first) and then from the raw feed lists; every candidate
 * is checked right before it can be handed out.
 */
class ExitPool {
  constructor({ selfIp, concurrency = 40 }) {
    this.selfIp = selfIp;
    this.concurrency = concurrency;
    this.ready = [];
    this.used = new Set();
    this.recent = [];
    this.cands = [];
    this.seenAt = new Map();
    this.rawLoaded = false;
    this.idx = 0;
    this.screened = 0;
    this.found = 0;
    this.pumping = null;
    this.directNoted = false;
    this.blankFiles = [];
    this.loadCandidates(false);
  }

  addAll(list, { window = 0 } = {}) {
    for (const p of list) {
      if (p.protocol === 'socks4') continue;
      p.connectTimeoutMs = 8000;
      p.timeoutMs = 30000;
      const k = `${p.protocol}://${p.host}:${p.port}`;
      const t = this.seenAt.get(k);
      if (t !== undefined && (window === 0 || Date.now() - t < window)) continue;
      this.seenAt.set(k, Date.now());
      this.cands.push(p);
    }
  }

  /**
   * Pool files first (newest survivors). The raw feed lists are only pulled
   * in when everything above has been screened — harvest.js owns the deep
   * scan of those lists, so the mint does not duplicate that work.
   */
  loadCandidates(withRaw) {
    for (const f of poolFiles()) {
      try {
        const list = proxyLib.loadPoolFile(f);
        // the file is there, the lines are not usable (socks4, junk): the run
        // must be able to say so instead of just going direct
        if (!list.length && fs.existsSync(f)) this.blankFiles.push(path.basename(f));
        this.addAll(list, { window: 180000 });
      } catch {}
    }
    if (!withRaw || this.rawLoaded) return this.cands.length;
    this.rawLoaded = true;
    const LISTS = path.join(__dirname, 'lists-fresh');
    let files = [];
    try {
      files = fs.readdirSync(LISTS).filter((x) => /(?:http|https|socks5)\.txt$/.test(x));
    } catch {}
    files.sort();
    for (const f of files) {
      try {
        const list = proxyLib.loadProxyList(path.join(LISTS, f));
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        this.addAll(list);
      } catch {}
    }
    L.log(`POOL candidates loaded: ${this.cands.length} (raw feeds now included)`);
    return this.cands.length;
  }

  async checkOne(p) {
    this.screened++;
    // console page first — a live line on a flapping path can take ~30 s
    const okConsole = await withDeadline(consoleCheck(p, 18000), 22000);
    if (!okConsole) return null;
    // then the egress address, once per survivor: a transparent "proxy" passes
    // every TLS test and still presents the home line, and this field used to be
    // a constant null that the log printed as `ip=?`
    const ip = (await withDeadline(L.exitIp(p, 12000), 15000)) || null;
    if (this.selfIp && ip === this.selfIp) {
      L.log(`POOL own line ${L.proxyLabel(p)} — skipped`);
      return null;
    }
    this.found++;
    try {
      fs.appendFileSync(path.join(OUTS, 'upstage-console-live.txt'), `${proxyLib.browserUrl(p)}\n`);
    } catch {}
    return { proxy: p, ip, api: 0, checkedAt: Date.now() };
  }

  /** Screens candidates concurrently until `want` usable exits are ready. */
  async pump(want) {
    if (this.pumping) return this.pumping;
    this.pumping = (async () => {
      try {
        while (this.ready.length < want) {
          // pull in anything new that landed in the pool files meanwhile
          const freshList = [];
          for (const f of poolFiles()) {
            try {
              freshList.push(...proxyLib.loadPoolFile(f));
            } catch {}
          }
          const added = [];
          for (const p of freshList) {
            if (p.protocol === 'socks4') continue;
            p.connectTimeoutMs = 8000;
            p.timeoutMs = 30000;
            const k = `${p.protocol}://${p.host}:${p.port}`;
            const t = this.seenAt.get(k);
            if (t !== undefined && Date.now() - t < 180000) continue;
            this.seenAt.set(k, Date.now());
            added.push(p);
          }
          if (added.length) this.cands.splice(this.idx, 0, ...added);

          if (this.idx >= this.cands.length) {
            const before = this.cands.length;
            this.loadCandidates(true);
            if (this.cands.length === before) {
              // a real pool that ran dry is logged; no pool at all is direct
              // mode, and take() hands out the direct slot for it
              if (this.cands.length) L.log(`POOL exhausted (${this.screened} screened, ${this.found} usable)`);
              return;
            }
          }
          const batch = this.cands.slice(this.idx, this.idx + this.concurrency);
          this.idx += batch.length;
          if (!batch.length) return;
          const res =
            (await Promise.race([
              Promise.all(batch.map((p) => this.checkOne(p).catch(() => null))),
              sleep(150000).then(() => null),
            ])) || [];
          if (!res.length) L.log(`POOL batch watchdog fired (${this.screened} screened)`);
          for (const r of res) if (r) this.ready.push(r);
          L.log(`POOL screened=${this.screened} usable=${this.found} ready=${this.ready.length}`);
        }
      } finally {
        this.pumping = null;
      }
    })();
    return this.pumping;
  }

  /** The direct slot (no pool anywhere): the one sentinel every account reuses. */
  directSlot() {
    return { proxy: null, ip: null, api: 0, checkedAt: Date.now() };
  }

  /** Prints the direct-mode notice once per process. */
  noteDirect() {
    if (this.directNoted) return;
    this.directNoted = true;
    console.log('no proxy pool — running WITHOUT a proxy (direct). Put exits in src/proxies.txt to route through them.');
    // "no pool file" and "a pool file with nothing usable in it" are different
    // problems: the second one is a typo, not an empty pool
    if (this.blankFiles.length) console.log(`  (pool file(s) present but no usable line: ${[...new Set(this.blankFiles)].join(', ')})`);
  }

  /** One exit, probed against the console right now (point-of-use). */
  async take() {
    // Nothing to screen — no pool file (or raw list) carried a single line:
    // DIRECT mode. A proxy is recommended at scale (per-IP limits, bans) but
    // the tool works without one; `null` is the direct sentinel.
    if (!this.cands.length && !this.rawLoaded) this.loadCandidates(true);
    if (!this.cands.length) {
      this.noteDirect();
      return this.directSlot();
    }
    for (let round = 0; round < 3; round++) {
      this.ready = this.ready.filter((e) => Date.now() - e.checkedAt < 180000);

      if (!this.ready.length) {
        const recents = this.recent.slice(-4).reverse();
        if (recents.length) {
          const oks = await Promise.all(
            recents.map(async (e) => ((await consoleCheck(e.proxy, 22000)) ? { ...e, checkedAt: Date.now() } : null))
          );
          const hit = oks.find(Boolean);
          if (hit) {
            L.log(`POOL reused exit ${L.proxyLabel(hit.proxy)}`);
            this.recent = this.recent.filter((x) => x.proxy !== hit.proxy);
            return hit;
          }
        }
        await this.pump(1);
        if (!this.ready.length) return null;
      }

      const e = this.ready.pop();
      const k = `${e.proxy.protocol}://${e.proxy.host}:${e.proxy.port}`;
      if (this.used.has(k)) continue;
      // a freshly screened entry is used as-is; only an older one is re-probed
      if (Date.now() - e.checkedAt > 25000) {
        if (!(await withDeadline(consoleCheck(e.proxy, 18000), 22000))) {
          L.log(`POOL point-of-use dead ${L.proxyLabel(e.proxy)}`);
          continue;
        }
        e.checkedAt = Date.now();
      }
      this.used.add(k);
      return e;
    }
    return null;
  }

  async topUp(n = 2) {
    if (this.ready.length < n) await this.pump(n);
  }

  /** Records an exit just used, so it can be re-checked and reused. */
  release(slot) {
    if (!slot || !slot.proxy) return;
    this.recent.push({ ...slot, checkedAt: Date.now() });
    if (this.recent.length > 12) this.recent.shift();
  }
}

// ------------------------------------------------------------- verification

const API = 'https://api.upstage.ai/v1';

function apiCall(proxy, method, url, { headers = {}, body, timeoutMs = 40000 } = {}) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const u = new URL(url);
    const payload = body === undefined ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const rq = https.request(
      {
        method,
        host: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        agent: proxy ? proxyLib.createAgent(proxy) : undefined,
        headers: { 'User-Agent': 'upstage-mint/1.0', ...headers, ...(payload ? { 'Content-Length': payload.length } : {}) },
      },
      (res) => {
        let t = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (t += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(t);
          } catch {}
          resolve({ status: res.statusCode, json, text: t });
        });
      }
    );
    rq.setTimeout(timeoutMs, () => rq.destroy(new Error('timeout')));
    rq.on('error', reject);
    if (payload) rq.write(payload);
    rq.end();
  });
}

/** Proxy candidates for verification: everything the pool knows plus the pool files. */
function verifyProxies(pool) {
  const out = pool.ready.map((e) => e.proxy);
  const files = ['upstage-api-live.txt', 'up-api-ok.txt', 'union-live.txt', 'upstage-live.txt', 'up-usable.txt', 'new-live.txt', 'up-usable.txt.prev'].map((f) => path.join(OUTS, f));
  for (const f of process.env.UPSTAGE_PROXIES ? [path.resolve(process.env.UPSTAGE_PROXIES), ...files] : files) {
    try {
      out.push(...proxyLib.loadPoolFile(f));
    } catch {}
  }
  return out;
}

/** models + chat through rotating exits; retries on transport errors. */
async function verifyKey(key, { chat = false, pool, tries = 8 } = {}) {
  const list = verifyProxies(pool);
  if (!list.length) list.push(null);
  let lastBad = null;
  for (let i = 0; i < tries; i++) {
    // the api-capable exits live at the head of the list — try them in order
    // before falling back to random picks from the broader pool
    const proxy = i < Math.min(list.length, 24) ? list[i] : list[Math.floor(Math.random() * list.length)];
    try {
      const m = await apiCall(proxy, 'GET', `${API}/models`, { headers: { Authorization: `Bearer ${key}` }, timeoutMs: 30000 });
      if (m.status === 401) return { ok: false, status: 401, note: (m.text || '').slice(0, 160), proxy: L.proxyLabel(proxy) };
      if (m.status !== 200) {
        // the api edge 403s/429s/5xxs a lot of exits — that is the exit, not the key
        lastBad = { status: m.status, note: (m.text || '').slice(0, 120), proxy: L.proxyLabel(proxy) };
        continue;
      }
      const models = (m.json && m.json.data ? m.json.data : []).map((x) => x.id);
      const out = { ok: true, models, chat: null, chatReply: null, proxy: L.proxyLabel(proxy) };
      if (chat) {
        const model = models.includes('solar-pro2') ? 'solar-pro2' : models[0];
        const c = await apiCall(proxy, 'POST', `${API}/chat/completions`, {
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: { model, messages: [{ role: 'user', content: 'Reply with the single word: ok' }], max_tokens: 8 },
          timeoutMs: 45000,
        });
        out.chat = c.status;
        out.chatModel = model;
        out.chatReply = c.json && c.json.choices && c.json.choices[0] ? String(c.json.choices[0].message.content).trim().slice(0, 40) : (c.text || '').slice(0, 120);
      }
      return out;
    } catch (e) {
      if (i === tries - 1) return { ok: false, note: `net: ${e.message.slice(0, 120)}`, lastBad };
      await sleep(400);
    }
  }
  return lastBad ? { ok: false, status: lastBad.status, note: lastBad.note, proxy: lastBad.proxy } : { ok: false, note: 'no exit answered' };
}

// ---------------------------------------------------------------------- run

async function main() {
  const N = LIMIT;
  const state = readState();
  L.log(`MINT start: count=${N} conc=${CONC} port=${PORT} chatMin=${CHAT_MIN} attempts=${ATTEMPTS}`);

  const self = await L.ownIp();
  L.log(`MINT own ip: ${self || 'unknown'}`);
  const pool = new ExitPool({ selfIp: self, concurrency: 6 });
  await pool.pump(1);
  if (!pool.cands.length) pool.noteDirect();
  L.log(`MINT initial exits: ${pool.ready.length}`);

  await L.ensureChrome(PORT, path.join(HERE, `.up-chrome-${PORT}`), { headless: HEADLESS });

  let cdp = null;
  let cdpAlive = false;
  let cdpConnecting = null;
  async function connectCdp() {
    if (cdpConnecting) return cdpConnecting;
    cdpConnecting = (async () => {
      try {
        cdp && cdp.close();
      } catch {}
      const ws = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).then((j) => j.webSocketDebuggerUrl);
      cdp = new L.CDP(ws, {});
      cdp.on('error', (e) => {
        cdpAlive = false;
        L.log(`CDP error: ${String((e && e.message) || e).slice(0, 140)}`);
      });
      cdp.on('disconnect', () => {
        cdpAlive = false;
        L.log('CDP disconnected');
      });
      await cdp.connect();
      cdpAlive = true;
      L.log('CDP connected');
      return cdp;
    })().finally(() => {
      cdpConnecting = null;
    });
    return cdpConnecting;
  }
  await connectCdp();

  const signup = require('./flow');
  const errors = [];
  const done = new Set(Object.keys(state.done || {}).map(Number));

  let next = IDBASE;

  async function worker() {
    while (true) {
      const id = next++;
      if (id >= IDBASE + N) return;
      if (done.has(id)) continue;

      let made = false;
      let lastSlot = null;
      for (let attempt = 1; attempt <= ATTEMPTS && !made; attempt++) {
        // mailbox first: creating it takes tens of seconds and the exit must be
        // probed & used back-to-back or it dies in between
        const t0 = Date.now();
        let mailbox;
        L.log(`[${id}] creating mailbox…`);
        // inboxes.com is the only family that has ever delivered an Upstage code
        // (3/3 reads); Mailtrap addresses have never received one, so it is only
        // used when inboxes is unreachable
        for (let mi = 0; mi < 2 && !mailbox; mi++) {
          try {
            // inboxes.com family (broker 9701) has the proven code-delivery record
            // for this provider; mailtrap (broker/direct) is the fallback
            mailbox = await L.newMailbox('inboxes');
          } catch (e) {
            errors.push(`#${id} mailbox(inboxes#${mi}): ${String(e.message).slice(0, 100)}`);
            await sleep(3000);
          }
        }
        if (!mailbox) break;
        L.log(`[${id}] mailbox ready ${mailbox.address} (${Math.round((Date.now() - t0) / 1000)}s)`);

        pool.topUp(CONC + 1).catch(() => {});
        let slot = null;
        const t1 = Date.now();
        if (lastSlot && (await withDeadline(consoleCheck(lastSlot.proxy, 18000), 22000))) {
          slot = { ...lastSlot, checkedAt: Date.now() };
          L.log(`[${id}] attempt ${attempt}: reusing exit ${L.proxyLabel(slot.proxy)}`);
        } else {
          slot = await pool.take();
        }
        if (!slot) {
          errors.push(`#${id} no exit slot left`);
          break;
        }
        lastSlot = slot;

        L.log(`[${id}] attempt ${attempt}: mailbox=${mailbox.address} exit=${L.proxyLabel(slot.proxy)} (take ${Math.round((Date.now() - t1) / 1000)}s) ip=${slot.ip || '?'} api=${slot.api}`);
        console.log(`… #${id} başladı (${slot.proxy ? L.proxyLabel(slot.proxy) : 'direct'})`);
        let res = null;
        try {
          res = await signup.mintAccount({ id, cdp, slot, mailbox });
          if (!res || !res.key) throw new Error(res ? res.error || 'no key' : 'no result');

          const st = readState();
          const chat = (st.chatVerified || 0) < CHAT_MIN;
          const v = await verifyKey(res.key, { chat, pool });
          if (!v.ok) {
            errors.push(`#${id} unverified key: ${v.note || v.status}`);
            fs.writeFileSync(path.join(L.OUT, `acct${id}-unverified.json`), JSON.stringify({ ...res, key: res.key }, null, 2), { mode: 0o600 });
            L.log(`[${id}] KEY UNVERIFIED ${v.note || v.status}`);
            made = true; // account exists; key just did not verify — do not re-mint
            break;
          }
          const rec = {
            id,
            email: mailbox.address,
            mailbox: mailbox.provider,
            proxy: L.proxyLabel(slot.proxy),
            exitIp: slot.ip,
            key: res.key,
            keyMasked: `${res.key.slice(0, 6)}…${res.key.slice(-4)}`,
            verified: true,
            verifyProxy: v.proxy,
            models: v.models,
            chat: v.chat,
            chatModel: v.chatModel || null,
            chatReply: v.chatReply || null,
            password: res.password,
            screens: res.screens || [],
            apiTrace: res.apiTrace || [],
            ts: new Date().toISOString(),
          };
          appendKey(res.key);
          appendAccount(rec);
          const st2 = readState();
          st2.done[id] = rec.keyMasked;
          if (v.chat === 200) st2.chatVerified = (st2.chatVerified || 0) + 1;
          st2.screened = pool.screened;
          st2.exitsFound = pool.found;
          writeState(st2);
          L.log(`[${id}] OK ${rec.keyMasked} email=${rec.email} chat=${v.chat} models=${(v.models || []).length}`);
          okCount++;
          console.log(`✓ #${id} KEY ALINDI: ${rec.key.slice(0, 22)}…   [${okCount} ok / ${N} hedef]`);
          made = true;
        } catch (e) {
          errors.push(`#${id} try${attempt} ${L.proxyLabel(slot.proxy)} ${String(e.message).slice(0, 200)}`);
          L.log(`[${id}] FAIL try${attempt} ${String(e.message).slice(0, 240)}`);
          console.log(`✗ #${id} key yok: ${String(e.message).slice(0, 200)}`);
          if (res && res.screens) L.log(`[${id}] screens: ${res.screens.slice(-3).join(', ')}`);
          await sleep(800);
        } finally {
          if (res && res.cleanup) {
            try {
              await res.cleanup();
            } catch {}
          }
          pool.release(slot);
        }
      }
      if (!made) continue;
      if (GAP_MS) await sleep(GAP_MS);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONC, N) }, worker));
  const nKeys = fs.existsSync(KEYS_TXT) ? fs.readFileSync(KEYS_TXT, 'utf8').split(/\r?\n/).filter(Boolean).length : 0;
  L.log(`MINT done. keys=${nKeys} screened=${pool.screened} exitsFound=${pool.found}`);
  console.log(`MINT ${okCount}/${N} ${okCount >= N ? 'OK' : '— short of the target'}`);
  if (errors.length) {
    L.log(`MINT errors:\n` + errors.join('\n'));
    fs.writeFileSync(path.join(L.OUT, 'mint-errors.txt'), errors.join('\n'));
  }
  // a batch that produced nothing must not look like a success to a driver
  if (okCount < N) process.exitCode = 1;
  try {
    cdp.close();
  } catch {}
}

if (require.main === module) {
  main().catch((e) => {
    console.error('MINT FAIL:', e.stack || e.message);
    process.exit(1);
  });
}

module.exports = { main, ExitPool, apiCheck, consoleCheck, verifyKey, appendKey, appendAccount, readState, writeState, KEYS_TXT, ACCOUNTS };
