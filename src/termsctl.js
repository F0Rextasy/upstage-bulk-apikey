#!/usr/bin/env node
'use strict';

/**
 * Interactively drive the lab browser (src/termslab.js) over CDP.
 *
 *   node src/termsctl.js eval "<js expression>"
 *   node src/termsctl.js click "<css selector>"      real mouse click at centre
 *   node src/termsctl.js rect "<css selector>"
 *   node src/termsctl.js html "<css selector>"       outerHTML (capped 30k)
 *   node src/termsctl.js nav "<url>"
 *   node src/termsctl.js shot "<file.png>"
 *   node src/termsctl.js cookie                      console.upstage.ai cookies
 *
 * LAB_PORT env (default 9291) picks the browser.
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');

const PORT = parseInt(process.env.LAB_PORT || '9291', 10);
const [cmd, arg] = process.argv.slice(2);
const sleep = L.sleep;

function out(v) {
  console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
}

(async () => {
  const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
  const pages = list.filter((t) => t.type === 'page');
  pages.sort((a, b) => (/console\.upstage\.ai/.test(b.url) ? 1 : 0) - (/console\.upstage\.ai/.test(a.url) ? 1 : 0));
  const page = pages[0];
  if (!page) throw new Error('no page target');
  const cdp = new L.CDP(page.webSocketDebuggerUrl, { commandTimeoutMs: 60000 });
  cdp.on('error', () => {});
  await cdp.connect();

  const evalx = (expr) => cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });

  const rectOf = async (sel) => {
    const r = await evalx(
      `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({block:'center'}); const b = el.getBoundingClientRect(); return { x: b.left + b.width/2, y: b.top + b.height/2, w: b.width, h: b.height, left: b.left, top: b.top }; })()`
    );
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  switch (cmd) {
    case 'eval': {
      const r = await evalx(arg);
      if (r.exceptionDetails) out({ error: r.exceptionDetails.text, desc: r.exceptionDetails.exception && r.exceptionDetails.exception.description });
      else out(r.result.value);
      break;
    }
    case 'rect': {
      out(await rectOf(arg));
      break;
    }
    case 'html': {
      const r = await evalx(`(() => { const el = document.querySelector(${JSON.stringify(arg)}); return el ? el.outerHTML : null; })()`);
      out(String(r.result.value || '').slice(0, 30000));
      break;
    }
    case 'click': {
      const r = await rectOf(arg);
      if (!r) {
        out({ ok: false, note: 'no rect' });
        break;
      }
      const p = L.Page.prototype;
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y });
      await sleep(60);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(70);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', buttons: 0, clickCount: 1 });
      out({ ok: true, at: [Math.round(r.x), Math.round(r.y)] });
      break;
    }
    case 'nav': {
      await cdp.send('Page.enable').catch(() => {});
      await cdp.send('Page.navigate', { url: arg });
      out({ ok: true });
      break;
    }
    case 'shot': {
      const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const f = path.resolve(arg);
      fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
      out({ ok: true, file: f });
      break;
    }
    case 'cookie': {
      const r = await cdp.send('Network.getCookies', {});
      const keep = (r.cookies || []).filter((c) => /upstage/.test(c.domain)).map((c) => `${c.name}=${String(c.value).slice(0, 40)}… (${c.domain})`);
      out(keep);
      break;
    }
    default:
      out({ usage: 'eval|click|rect|html|nav|shot|cookie' });
  }
  cdp.close();
  process.exit(0);
})().catch((e) => {
  console.error(`termsctl error: ${e.message}`);
  process.exit(1);
});
