'use strict';

/**
 * One Upstage account -> one API key, driven through an isolated Chrome
 * context pinned to a single pool exit (direct when the slot has no proxy).
 *
 *   mintAccount({ id, cdp, slot, mailbox }) -> { key, screens, apiTrace, cleanup }
 *
 * Observed path (2026-10):
 *   console.upstage.ai/login  --[Continue]-->  auth.console.upstage.ai/login
 *     --[Create an account]-->  auth.console.upstage.ai/signup
 *       (username=email, password, confirmPassword)  --[Sign up]-->
 *         auth.console.upstage.ai/signup/confirm      (code from mail)
 *           --[Confirm account]-->  console.upstage.ai  -->  /api-keys
 *
 * The e-mail typed on the console login form is not required — the hosted UI
 * takes it — so a failed fill there never blocks the run.
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');

const ORIGIN = L.ORIGIN;
const sleep = L.sleep;

const RX = {
  continueBtn: /^(continue|next|submit|confirm|verify|sign\s?in|log\s?in|계속|확인)$/i,
  createAccount: /create an account|^sign\s?up$|^register$/i,
  signupSubmit: /^sign\s?up$|^create account$|^register$|^create$/i,
  confirmAccount: /confirm account|^confirm$|^verify$|^continue$/i,
  keyCreate: /create\s*(new\s*)?(api\s*)?key|new\s*key|generate\s*key|발급|키\s*생성/i,
  keySubmit: /^create$|create key|generate|^confirm$|^save$|^done$|^submit$|생성/i,
  claim: /claim|redeem|^accept$|^select$|^apply$|get started/i,
  skip: /^skip$|skip\s*(for now)?|^later$|^not now$|^no thanks$/i,
};

const CODE_SEL = 'input[name=code], input[autocomplete=one-time-code], input[inputmode=numeric], input[maxlength="6"], input[maxlength="4"]';

class Flow {
  constructor({ id, cdp, slot, mailbox, haltAtTerms, existing }) {
    this.id = id;
    this.cdp = cdp;
    this.slot = slot;
    this.mailbox = mailbox;
    this.haltAtTerms = !!haltAtTerms;
    this.existing = existing || null; // { email, password } — sign in instead of sign up
    this.screens = [];
    this.apiTrace = [];
    this.password = `${['Solar', 'Nova', 'Orbit', 'Vega'][Math.floor(Math.random() * 4)]}!${L.rand(4)}${Math.floor(Math.random() * 90 + 10)}Aa`;
    this.log = (m) => L.log(`[${id}] ${m}`);
  }

  async screen() {
    return this.page
      .eval(`(() => ({
        url: location.href,
        title: document.title,
        text: document.body ? document.body.innerText.slice(0, 3600) : '',
        inputs: [...document.querySelectorAll('input,select,textarea')].map(i => ({
          tag: i.tagName, type: i.type || '', id: i.id || '', name: i.name || '',
          ph: i.placeholder || '', value: (i.type === 'password' ? '' : String(i.value || '').slice(0, 80)),
          maxlength: i.maxLength, visible: !!(i.offsetParent || i.getClientRects().length),
        })),
        buttons: [...document.querySelectorAll('button,[role=button],a,input[type=submit]')]
          .map(b => ({ text: (b.innerText || b.value || '').trim().slice(0, 60), href: String(b.href || '').slice(0, 120) }))
          .filter(b => b.text).slice(0, 50),
      }))()`)
      .catch((e) => ({ error: e.message }));
  }

  async dump(name) {
    const s = await this.screen();
    const file = path.join(L.OUT, `m${this.id}-${name}.json`);
    fs.writeFileSync(file, JSON.stringify(s, null, 2));
    this.screens.push(path.basename(file));
    try {
      const r = await this.cdp.send('Page.captureScreenshot', { format: 'png' }, this.page.s);
      fs.writeFileSync(file.replace(/\.json$/, '.png'), Buffer.from(r.data, 'base64'));
    } catch {}
    this.log(`${name} url=${String(s.url).slice(0, 110)} :: ${(s.text || '').replace(/\s+/g, ' ').slice(0, 170)}`);
    return s;
  }

  /** Click first visible element matching rx; mouse first, JS fallback. */
  async clickText(rx, { tag = 'button,[role=button],a,input[type=submit]' } = {}) {
    const finder = `[...document.querySelectorAll(${JSON.stringify(tag)})].find(e => ${rx}.test(((e.innerText || e.value || '') + '').trim()) && e.offsetParent !== null && !e.disabled)`;
    if (await this.page.click(finder)) return 'mouse';
    const ok = await this.page.eval(`(() => { const e = ${finder}; if (!e) return false; e.click(); return true; })()`);
    return ok ? 'js' : 'none';
  }

  async waitAny(branches, timeoutMs) {
    const expr = `(() => {
      const t = document.body ? document.body.innerText : '';
      const u = location.href;
      ${branches.map((b) => `if (${b.expr}) return ${JSON.stringify(b.name)};`).join('\n      ')}
      return null;
    })()`;
    return this.page.waitFor(expr, { timeoutMs, pollMs: 1200 });
  }

  /** Real keystrokes into a fresh field, then a read-back check. */
  async typeInto(sel, value) {
    const present = await this.page.eval(
      `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!(e && e.offsetParent !== null); })()`
    );
    if (!present) return false;
    const ok = await this.page.type(sel, value, { clear: true });
    const got = await this.page.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? e.value : null; })()`);
    return !!ok && got === value;
  }

  async setValue(sel, value) {
    return this.page.eval(`(() => {
      const e = document.querySelector(${JSON.stringify(sel)});
      if (!e) return false;
      e.focus();
      const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      d.set.call(e, ${JSON.stringify(value)});
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
      return e.value === ${JSON.stringify(value)};
    })()`);
  }

  // ---------------------------------------------------------------- the run

  async run() {
    const att = await L.openContext(this.cdp, this.slot.proxy, { capture: () => true });
    this.att = att;
    const { page, net, sessionId } = att;
    this.page = page;
    this.net = net;

    const bodies = [];
    this.cdp.on(
      'Network.loadingFinished',
      async (p) => {
        const r = net.responses.find((x) => x.requestId === p.requestId);
        if (!r) return;
        if (!/(console\.upstage\.ai\/api|api\.upstage\.ai|amazoncognito)/i.test(r.url)) return;
        let text = '';
        try {
          text = await page.responseBody(p.requestId);
        } catch {}
        const req = net.requests.filter((x) => x.url === r.url).sort((a, b) => Math.abs(a.ts - r.ts) - Math.abs(b.ts - r.ts))[0];
        bodies.push({
          method: req ? req.method : '?',
          url: r.url.split('?')[0],
          status: r.status,
          reqBody: req && req.postData ? String(req.postData).slice(0, 1500) : '',
          text: String(text || '').slice(0, 3000),
        });
      },
      sessionId
    );
    this.bodies = bodies;

    let key;
    try {
      key = await this.signup();
      if (key && key.__halt) {
        // lab mode: leave the context (and its session) alive
        return { halt: true, screens: this.screens, email: this.mailbox.address, password: this.password, cleanup: null };
      }
    } catch (e) {
      try {
        fs.writeFileSync(path.join(L.OUT, `m${this.id}-bodies.json`), JSON.stringify(bodies, null, 2));
        fs.writeFileSync(path.join(L.OUT, `m${this.id}-net.txt`), net.requests.map((r) => `${r.method} ${r.url}`).join('\n'));
      } catch {}
      await att.detachProxyAuth().catch(() => {});
      await this.cdp.disposeBrowserContext(att.ctx).catch(() => {});
      throw e;
    }
    this.apiTrace = bodies.map((b) => ({ method: b.method, url: b.url, status: b.status, req: b.reqBody.slice(0, 400), res: b.text.slice(0, 400) }));
    return {
      key,
      screens: this.screens,
      apiTrace: this.apiTrace,
      email: this.mailbox.address,
      password: this.password,
      cleanup: async () => {
        try {
          await this.cdp.disposeBrowserContext(att.ctx);
        } catch {}
        try {
          await att.detachProxyAuth();
        } catch {}
      },
    };
  }

  async signup() {
    const { page, log } = this;

    // 1. console login -> Continue -> hosted UI
    await page.goto(`${ORIGIN}/login`);
    let ok = await page.waitFor(`document.body && /Continue|Sign in to your Upstage/i.test(document.body.innerText || '')`, { timeoutMs: 60000, pollMs: 1500 });
    if (!ok) {
      await page.goto(`${ORIGIN}/login`);
      ok = await page.waitFor(`document.body && /Continue|Sign in to your Upstage/i.test(document.body.innerText || '')`, { timeoutMs: 60000, pollMs: 1500 });
    }
    if (!ok) throw new Error('console login page did not load');
    await sleep(1200);
    await this.dump('01-console-login');

    // the console form's e-mail box is optional (the hosted UI asks anyway)
    const emailFilled = await this.setValue('input[type=email], input[name*=email i]', this.mailbox.address).catch(() => false);
    log(`console email prefilled: ${emailFilled}`);

    let branch = null;
    for (let i = 0; i < 5 && !branch; i++) {
      log(`continue click #${i}: ${await this.clickText(RX.continueBtn)}`);
      branch = await this.waitAny(
        [
          { name: 'hosted', expr: `/auth\\.console\\.upstage\\.ai/.test(u)` },
          { name: 'console-code', expr: `document.querySelector('input[maxlength="6"], input[autocomplete=one-time-code]')` },
          { name: 'error', expr: `/too many|went wrong|something failed/i.test(t)` },
        ],
        22000
      );
    }
    let s = await this.dump('02-after-continue');
    log(`branch after continue: ${branch}`);

    let code = null;
    if (branch === 'hosted') {
      // 2. hosted login -> create an account
      await page.waitFor(`document.body && document.body.innerText.length > 30`, { timeoutMs: 45000, pollMs: 1200 });
      await this.dump('03-hosted-login');
      if (this.existing) {
        // known credentials: sign in instead of signing up (no mail needed)
        for (let li = 0; li < 3; li++) {
          const f1 = await this.typeInto('input[name=username], input[type=email]', this.existing.email);
          const f2 = await this.typeInto('input[name=password]', this.existing.password);
          log(`login fills#${li}: email=${f1} pw=${f2}`);
          if (!f1 || !f2) {
            await this.setValue('input[name=username], input[type=email]', this.existing.email);
            await this.setValue('input[name=password]', this.existing.password);
          }
          await sleep(500);
          log(`login submit#${li}: ${await this.clickText(/^sign in$|^log in$/i, { tag: 'button[type=submit], button, input[type=submit]' })}`);
          const lr = await this.waitAny(
            [
              { name: 'in', expr: `/console\\.upstage\\.ai/.test(u) && !/\\/login|\\/signup|\\/callback/.test(u)` },
              { name: 'badcreds', expr: `/incorrect username or password|user does not exist/i.test(t)` },
              { name: 'unconfirmed', expr: `/not confirmed|confirm your account|Please confirm/i.test(t)` },
              { name: 'continue', expr: `/still signed in|sign in as a different user/i.test(t)` },
            ],
            25000
          );
          log(`login result#${li}: ${lr}`);
          if (lr === 'in') break;
          if (lr === 'badcreds') throw new Error(`login rejected: bad credentials for ${this.existing.email}`);
          if (lr === 'unconfirmed') {
            // the code would go to a dead mailbox — not finishable this way
            throw new Error(`account unconfirmed (mailbox dead): ${this.existing.email}`);
          }
          if (lr === 'continue') {
            // a lingering session screen: pick the account we actually want
            const picked = await page
              .eval(`(() => { const e=[...document.querySelectorAll('button, a, [role=button]')].find(x=>new RegExp(${JSON.stringify(this.existing.email)}, 'i').test((x.innerText||''))); if (!e) return false; e.click(); return true; })()`)
              .catch(() => false);
            log(`still-signed-in screen, picked our account: ${picked}`);
            await sleep(3000);
            const again = await this.waitAny(
              [
                { name: 'in', expr: `/console\\.upstage\\.ai/.test(u) && !/\\/login|\\/signup|\\/callback/.test(u)` },
                { name: 'stuck', expr: `/still signed in/i.test(t)` },
              ],
              25000
            );
            log(`continue result: ${again}`);
            if (again === 'in') break;
            continue;
          }
          // hydration race: retype with real key events before resubmitting
          await this.page.typeKeys('input[name=username], input[type=email]', this.existing.email).catch(() => {});
          await this.page.typeKeys('input[name=password]', this.existing.password).catch(() => {});
          await sleep(400);
        }
      } else {
        let href = await page.eval(
          `(() => { const a=[...document.querySelectorAll('a')].find(e=>/create an account/i.test((e.innerText||'').trim())); return a ? a.href : null; })()`
        );
        if (href) {
          log(`signup href: ${String(href).slice(0, 60)}…`);
          await page.goto(href);
        } else {
          log(`create-account click: ${await this.clickText(RX.createAccount)}`);
        }
      await sleep(5000);
      const onSignup = await page.waitFor(
        `(() => { const e=[...document.querySelectorAll('input[type=password]')].find(i=>i.offsetParent!==null); return !!(e && /signup|sign\\s?up/i.test(location.pathname)); })()`,
        { timeoutMs: 45000, pollMs: 1200 }
      );
      s = await this.dump('04-signup-form');
      if (!onSignup) throw new Error(`signup form did not open; url=${String(s.url).slice(0, 100)}`);

      // 3. fill and submit
      const f1 = await this.typeInto('input[name=username], input[type=email]', this.mailbox.address);
      const f2 = await this.typeInto('input[name=password]', this.password);
      const f3 = await this.typeInto('input[name=confirmPassword], input[name*=confirm i]', this.password);
      log(`signup fills: email=${f1} pw=${f2} confirm=${f3}`);
      if (!f1 || !f2) {
        // fall back to value injection
        await this.setValue('input[name=username], input[type=email]', this.mailbox.address);
        await this.setValue('input[name=password]', this.password);
        await this.setValue('input[name=confirmPassword], input[name*=confirm i]', this.password);
      }
      await sleep(500);
      log(`signup submit: ${await this.clickText(RX.signupSubmit, { tag: 'button[type=submit], button, input[type=submit]' })}`);
      await sleep(6000);
      let confirmReady = await this.waitAny(
        [
          { name: 'confirm', expr: `!!document.querySelector('input[name=code], input[autocomplete=one-time-code]') || /confirm/i.test(u)` },
          { name: 'exists', expr: `/already exists|already registered|please sign in/i.test(t)` },
          { name: 'badpw', expr: `/password must|at least|too short/i.test(t)` },
        ],
        30000
      );
      s = await this.dump('05-after-signup');
      log(`after signup: ${confirmReady}`);
      if (confirmReady === 'badpw') {
        // policy complaint: retype both password fields with a fresh, guaranteed-strong one
        this.password = `Orbit!${L.rand(4)}${Math.floor(Math.random() * 90 + 10)}Bb9`;
        log(`badpw -> retry with new password`);
        await this.setValue('input[name=password]', this.password);
        await this.setValue('input[name=confirmPassword], input[name*=confirm i]', this.password);
        await sleep(400);
        log(`signup submit#2: ${await this.clickText(RX.signupSubmit, { tag: 'button[type=submit], button, input[type=submit]' })}`);
        await sleep(6000);
        confirmReady = await this.waitAny(
          [
            { name: 'confirm', expr: `!!document.querySelector('input[name=code], input[autocomplete=one-time-code]') || /confirm/i.test(u)` },
            { name: 'exists', expr: `/already exists|already registered|please sign in/i.test(t)` },
            { name: 'badpw', expr: `/password must|at least|too short/i.test(t)` },
          ],
          30000
        );
        s = await this.dump('05b-after-signup');
        log(`after signup#2: ${confirmReady}`);
      }
      if (confirmReady !== 'confirm') {
        throw new Error(`signup blocked: ${confirmReady} :: ${(s.text || '').replace(/\s+/g, ' ').slice(0, 160)}`);
      }
      }
    } else if (branch !== 'console-code') {
      throw new Error(`unexpected state after continue: ${branch} url=${String(s.url).slice(0, 100)}`);
    }

    // 4. e-mail code (skipped when signing in with existing credentials)
    if (!this.existing)
    try {
      const test = (m) => /\b\d{6}\b/.test(`${m.text || ''}\n${m.html || ''}`);
      let msg = await L.waitForMail(this.mailbox, test, {
        timeoutMs: 110000,
        pollMs: 4000,
        note: (x) => log(`mail: ${x}`),
      });
      if (!msg) {
        log('no mail yet — clicking Resend code once');
        await this.clickText(/resend/i).catch(() => {});
        await sleep(3000);
        msg = await L.waitForMail(this.mailbox, test, {
          timeoutMs: 190000,
          pollMs: 5000,
          note: (x) => log(`mail: ${x}`),
        });
      }
      if (!msg) throw new Error('no verification mail arrived');
      const blob = `${msg.text || ''}\n${msg.html || ''}`;
      code = (blob.match(/\b(\d{6})\b/) || blob.match(/\b(\d{4})\b/) || [])[1];
      fs.writeFileSync(path.join(L.OUT, `m${this.id}-mail.json`), JSON.stringify({ subject: msg.subject, from: msg.from, code, text: String(msg.text || '').slice(0, 1500) }, null, 2));
      log(`code from mail: ${code} (${msg.subject})`);
      if (!code) throw new Error('mail had no code');
    } catch (e) {
      await this.dump('06-no-mail');
      throw e;
    }

    if (!this.existing) {
      const typedCode = await this.typeInto(CODE_SEL, code);
      if (!typedCode) await this.setValue(CODE_SEL, code);
      log(`code typed: ${typedCode}`);
      await sleep(400);
      log(`confirm click: ${await this.clickText(RX.confirmAccount)}`);
      await sleep(7000);
      await this.dump('07-after-code');
    } else {
      await sleep(6000);
      log('existing account — code step skipped');
    }

    // 5. console reached?
    let landed = await page.waitFor(
      `(() => { const u = location.href; if (/console\\.upstage\\.ai/.test(u) && !/\\/login|\\/signup|\\/callback/.test(u)) return location.pathname; return null; })()`,
      { timeoutMs: 90000, pollMs: 2000 }
    );
    if (!landed) {
      // nudge: sometimes the hosted UI needs another confirm click
      log(`not landed yet; confirm click again: ${await this.clickText(RX.confirmAccount)}`);
      landed = await page.waitFor(
        `(() => { const u = location.href; if (/console\\.upstage\\.ai/.test(u) && !/\\/login|\\/signup|\\/callback/.test(u)) return location.pathname; return null; })()`,
        { timeoutMs: 60000, pollMs: 2000 }
      );
    }
    log(`landed: ${landed}`);
    if (!landed) {
      const s2 = await this.dump('08-stuck');
      throw new Error(`auth did not complete; url=${String(s2.url).slice(0, 100)} :: ${(s2.text || '').replace(/\s+/g, ' ').slice(0, 140)}`);
    }

    if (this.haltAtTerms) {
      const p0 = String(await page.eval('location.pathname'));
      if (/term/i.test(p0)) {
        const dom = await page.eval(
          `(() => { try { return (document.documentElement ? document.documentElement.outerHTML : '').slice(0, 600000); } catch (e) { return 'ERR ' + e.message; } })()`
        );
        fs.writeFileSync(path.join(L.OUT, `m${this.id}-terms-dom.html`), String(dom || ''));
        log(`HALT at ${p0} (lab mode) -> m${this.id}-terms-dom.html`);
        return { __halt: true };
      }
    }

    // 6. dismiss onboarding/credit/terms screens if present
    for (let pass = 0; pass < 6; pass++) {
      const st = await page.eval(`document.body ? document.body.innerText.slice(0, 1500) : ''`);
      const here = await page.eval('location.pathname');
      if (/\/term/i.test(here) || /Terms and privacy policy|I am a|agree to the terms|Complete signup/i.test(st)) {
        log(`terms page -> accept`);
        // The agreement switches are Radix checkboxes: the visible control is
        // button[role=checkbox] ("Accept all" + three required ones); the native
        // input is pointer-events:none and off-screen, so mouse coordinates must
        // target the button, and a JS .click() is the reliable fallback.
        let after = await page.eval(`[...document.querySelectorAll('[role=checkbox]')].map(b => b.getAttribute('data-state')).join(',')`);
        log(`terms boxes: ${after}`);
        if (/unchecked/.test(String(after))) {
          for (let bi = 0; bi < 6; bi++) {
            const sel = `[...document.querySelectorAll('[role=checkbox]')][${bi}]`;
            const exists = await page.eval(`!!(${sel})`);
            if (!exists) break;
            if (bi > 0) {
              const st0 = await page.eval(`(() => { const b=${sel}; return b ? b.getAttribute('data-state') : null; })()`);
              if (st0 === 'checked') continue;
            }
            const r = await page.rect(sel);
            if (r) await page.mouseClick(r.x, r.y).catch(() => {});
            await sleep(350);
            let st1 = await page.eval(`(() => { const b=${sel}; return b ? b.getAttribute('data-state') : null; })()`);
            if (st1 !== 'checked') {
              await page.eval(`(() => { const b=${sel}; if (b) b.click(); return true; })()`).catch(() => {});
              await sleep(250);
              st1 = await page.eval(`(() => { const b=${sel}; return b ? b.getAttribute('data-state') : null; })()`);
            }
            if (bi === 0) {
              // "Accept all" checks everything — no need to poke the rest
              after = await page.eval(`[...document.querySelectorAll('[role=checkbox]')].map(b => b.getAttribute('data-state')).join(',')`);
              if (!/unchecked/.test(String(after))) break;
            }
          }
          after = await page.eval(`[...document.querySelectorAll('[role=checkbox]')].map(b => b.getAttribute('data-state')).join(',')`);
          log(`terms boxes after clicks: ${after}`);
        }
        // legacy fallback for a non-Radix variant of the page
        if (!after || /unchecked/.test(String(after))) {
          const state = await page.eval(`(() => [...document.querySelectorAll('input[type=checkbox]')].map((b,i)=>({i, vis:!!b.offsetParent, checked:!!b.checked})))()`);
          for (const b of state || []) {
            if (!b.vis || b.checked) continue;
            const r = await page.rect(`document.querySelectorAll('input[type=checkbox]')[${b.i}].parentElement`);
            if (r) await page.mouseClick(r.x, r.y).catch(() => {});
            await sleep(250);
          }
        }
        // "Complete signup" enables only once the required boxes are on
        await page.waitFor(
          `(() => { const b=[...document.querySelectorAll('button[type=submit], button')].find(x=>/complete signup/i.test(x.innerText||'')); return b && !b.disabled; })()`,
          { timeoutMs: 20000, pollMs: 600 }
        );
        const doneFind = `[...document.querySelectorAll('button[type=submit], button')].find(x => /complete signup|^accept all$/i.test((x.innerText||'').trim()))`;
        let done = 'none';
        if (await page.click(doneFind)) done = 'mouse';
        else if (await page.eval(`(() => { const b=${doneFind}; if (!b) return false; b.click(); return true; })()`).catch(() => false)) done = 'js';
        log(`terms submit: ${done}`);
        await sleep(3000);
        const still = await page.eval('location.pathname');
        if (!/term/i.test(String(still))) {
          log(`terms passed -> ${still}`);
          await this.dump('07b-after-terms');
        }
        continue;
      }
      if (/Tell us a bit about you|personalize|feel free to skip/i.test(st) && RX.skip.test(st)) {
        log(`onboarding -> skip`);
        await this.clickText(RX.skip);
        await sleep(2500);
        continue;
      }
      if (/\$10|credit/i.test(st) && /claim|redeem|accept|get started/i.test(st)) {
        log(`credit/onboarding -> claim`);
        await this.clickText(RX.claim);
        await sleep(2500);
        continue;
      }
      break;
    }

    // 7. api-keys + create
    await page.goto(`${ORIGIN}/api-keys`);
    await sleep(5000);
    await page.waitFor(`document.body && /key/i.test(document.body.innerText || '')`, { timeoutMs: 45000, pollMs: 1500 });
    await this.dump('09-api-keys');

    let modalOpen = false;
    for (let i = 0; i < 5 && !modalOpen; i++) {
      const cl = await this.clickText(RX.keyCreate);
      log(`create-key click #${i}: ${cl}`);
      await sleep(2500);
      modalOpen = await page.eval(`!!([...document.querySelectorAll('[role=dialog]')].find(d => /Create API key/i.test(d.innerText || '')))`);
    }
    log(`key modal open: ${modalOpen}`);
    await this.dump('10-key-modal');
    const named = await this.setValue(`[role=dialog] input[type=text]:not([readonly])`, `key-${this.id}`).catch(() => false);
    log(`key name set: ${named}`);
    await sleep(300);
    let created = false;
    for (let i = 0; i < 3 && !created; i++) {
      const c = await this.clickText(RX.keySubmit);
      log(`key confirm click #${i}: ${c}`);
      await sleep(3000);
      created = await page.eval(`/API key created|created\\./i.test(document.body.innerText || '')`);
      if (c === 'none') break;
    }
    log(`key created UI: ${created}`);
    const s3 = await this.dump('11-key-created');

    // Upstage masks the key in the list, but every row's "Copy full key" control
    // writes the plaintext to the clipboard: patch writeText, click the first
    // copy control, read the captured value back.
    await page
      .eval(`(() => { window.__copied = null; try { const ow = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = (t) => { window.__copied = String(t); try { return ow(t).catch(() => {}); } catch (e) { return Promise.resolve(); } }; } catch (e) {} return true; })()`)
      .catch(() => {});
    const clickedCopy = await page
      .eval(`(() => { const b = [...document.querySelectorAll('[aria-label="Copy full key"], [aria-label*="copy" i]')].find(x => x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`)
      .catch(() => false);
    await sleep(1200);
    const copied = await page.eval(`window.__copied || null`).catch(() => null);
    log(`copy control: clicked=${clickedCopy} captured=${copied ? 'yes' : 'no'}`);
    try {
      fs.writeFileSync(path.join(L.OUT, `m${this.id}-bodies.json`), JSON.stringify(this.bodies, null, 2));
    } catch {}
    if (copied && /^up_[A-Za-z0-9_-]{16,}$/.test(String(copied))) {
      this.log(`key captured: ${String(copied).slice(0, 8)}…${String(copied).slice(-4)}`);
      return String(copied);
    }

    const key = await this.harvestKey(s3);
    if (!key) throw new Error('no key captured from modal/wire');
    this.log(`key captured: ${key.slice(0, 8)}…${key.slice(-4)}`);
    return key;
  }

  async harvestKey(s) {
    const pats = [
      /\b(up_[A-Za-z0-9_-]{16,})\b/,
      /\b([A-Za-z0-9]{8,}\.[A-Za-z0-9]{8,}\.[A-Za-z0-9_-]{16,})\b/,
      /\b([a-zA-Z0-9_-]{32,64})\b/,
    ];
    const bad = (v) => !v || /^eyJ[A-Za-z0-9_-]{6,}/.test(v) || /^sk-/.test(v) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(v);
    // 1. the wire: the create-key response carries the real key (skip auth
    //    endpoints — their bodies carry Cognito JWTs, not API keys)
    for (const b of (this.bodies || []).slice().reverse()) {
      if (/\/api\/auth\/|amazoncognito|cognito/i.test(b.url)) continue;
      const m = String(b.text).match(/"(?:api_?key|keyName|key|secret|value|token)"\s*:\s*"([^"]{16,})"/i);
      if (m && !bad(m[1])) return m[1];
      for (const p of pats) {
        const mm = String(b.text).match(p);
        if (mm && !bad(mm[1])) return mm[1];
      }
    }
    // 2. the modal text
    const text = (s && s.text) || (await this.screen()).text || '';
    for (const p of pats) {
      const m = text.match(p);
      if (m && !bad(m[1])) return m[1];
    }
    return null;
  }
}

async function mintAccount(opts) {
  return new Flow(opts).run();
}

module.exports = { mintAccount, Flow, RX, ORIGIN, CODE_SEL };
