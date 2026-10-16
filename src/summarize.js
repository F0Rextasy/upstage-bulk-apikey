#!/usr/bin/env node
'use strict';

/**
 * Emit the final artifacts from the run data:
 *   models.json  — every model id seen on GET /v1/models (union, sorted)
 *   README.md    — install / options / models / verification
 *   report.md    — what was minted, measured hit rates, blockers
 *
 *   node src/summarize.js
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib');

const HERE = L.HERE;
const KEYS = path.join(HERE, 'keys.txt');
const ACCOUNTS = path.join(HERE, 'accounts.json');
const STATE = path.join(L.OUT, 'state2.json');

const accounts = L.readJson(ACCOUNTS, []);
const state = L.readJson(STATE, { done: {}, chatVerified: 0 });
const keys = fs.existsSync(KEYS)
  ? fs.readFileSync(KEYS, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  : [];

// ---------------------------------------------------------------- models.json

const models = new Set();
for (const a of accounts) for (const m of a.models || []) models.add(m);
const modelsSorted = [...models].sort();
fs.writeFileSync(path.join(HERE, 'models.json'), JSON.stringify(modelsSorted, null, 2) + '\n');

// ------------------------------------------------------------------ README.md

const nAccounts = accounts.length;
const nChat = accounts.filter((a) => a.chat === 200).length;
const emails = new Set(accounts.map((a) => a.email));

const readme = `# upstage — account + API key mint

One Upstage account per run, one API key per account, everything over a proxy
(the home line is never the egress).

## What it does

\`\`\`
node src/mint.js --count 30 --conc 3            # 30 accounts, 3 at a time
node src/mint.js --count 5  --conc 2 --headed    # watch a small batch
node src/verify.js --file keys.txt --chat        # re-verify what is already on disk
\`\`\`

Per account:

1. fresh mailbox (local broker on :9700 mailtrap / :9701 inboxes.com)
2. fresh exit from the verified pool, one exit per account, never the home line
3. isolated Chrome context (its own proxy + storage) walks
   \`console.upstage.ai/login\` -> e-mail -> Cognito hosted UI -> *create an account*
   -> password -> e-mail code -> console -> \`/api-keys\` -> *create key*
4. the key is harvested from the page and from the wire (\`/api\` responses),
   then live-verified before it is written

Artifacts (repo root of this provider dir):

| file | contents |
|---|---|
| \`keys.txt\` | one key per line — **only** keys that answered 200 on \`GET /v1/models\` |
| \`accounts.json\` | per-account record: e-mail, proxy/exit, key, verification result, model list |
| \`report.md\` | batch report: counts, hit rates, blockers |
| \`outputs/\` | per-step DOM dumps + screenshots + \`upstage.log\` |

A mirror of \`keys.txt\` is appended at \`%USERPROFILE%\\upstage-keys.txt\`.

## Options (\`src/mint.js\`)

| flag | default | meaning |
|---|---|---|
| \`--count N\` | 30 | how many accounts to mint (no upper bound) |
| \`--conc N\` | 3 | accounts in flight (one Chrome context each) |
| \`--port N\` | 9290 | Chrome debug port |
| \`--headed\` | off | run a visible Chrome |
| \`--chat-min N\` | 5 | how many keys get an extra \`chat/completions\` check |
| \`--limit N\` | — | mint at most N accounts this run (checkpointed in \`outputs/state2.json\`) |

## Proxy pool

\`src/mint.js\` reads exits from \`out/{new-live.txt,up-usable.txt}\`
(\`scheme://host:port  # comment\`) and keeps only those that

* tunnel to \`api.upstage.ai\` (a bogus bearer must come back 401/403), and
* carry the full \`console.upstage.ai/login\` page (>= 30 kB of Next payload).

\`src/screen-api.js\` re-screens the current pool against \`api.upstage.ai\`.
\`src/pool.js\` builds the pool from the fresh feed lists.

## Models

\`models.json\` is the live \`GET https://api.upstage.ai/v1/models\` answer of the
minted keys (${modelsSorted.length} ids): ${modelsSorted.slice(0, 12).join(', ')}${modelsSorted.length > 12 ? ', …' : ''}.

## Verification

* every key: \`GET https://api.upstage.ai/v1/models\` -> 200 (and the returned id list is stored per account)
* ${nChat}${nChat === nAccounts ? ' of ' + nAccounts : ''} key(s): \`POST https://api.upstage.ai/v1/chat/completions\` with \`solar-pro2\`, \`max_tokens: 8\` -> 200
* verification calls go through pool exits; the home line is not used
`;

fs.writeFileSync(path.join(HERE, 'README.md'), readme);

// ------------------------------------------------------------------ report.md

const byStatus = {};
for (const a of accounts) byStatus[a.chat === 200 ? 'chat-200' : 'models-only'] = (byStatus[a.chat === 200 ? 'chat-200' : 'models-only'] || 0) + 1;
const proxies = new Set(accounts.map((a) => a.proxy));
const lines = [];
lines.push('# Upstage mint — batch report');
lines.push('');
lines.push(`Run date: ${new Date().toISOString().slice(0, 10)}`);
lines.push('');
lines.push('## Result');
lines.push('');
lines.push(`- keys.txt: **${keys.length}** line(s), one key per line`);
lines.push(`- accounts.json: **${nAccounts}** account record(s) for **${emails.size}** distinct mailbox(es)`);
lines.push(`- keys per account: ${nAccounts ? (keys.length / nAccounts).toFixed(2) : '0'} (target 1.00)`);
lines.push(`- verification: all ${nAccounts} via \`GET /v1/models\`; ${nChat} via \`POST /v1/chat/completions\` (solar-pro2)`);
lines.push(`- distinct exits used: ${proxies.size}`);
lines.push('');
lines.push('## Endpoints');
lines.push('');
lines.push('| endpoint | use |');
lines.push('|---|---|');
lines.push('| `https://console.upstage.ai/login` | sign-up entry (e-mail first) |');
lines.push('| `https://auth.console.upstage.ai/signup` | Cognito hosted UI sign-up form (username/password/confirmPassword) |');
lines.push('| `https://auth.console.upstage.ai/signup/confirm` | e-mail code confirmation |');
lines.push('| `https://console.upstage.ai/api-keys` | API keys page; key created there |');
lines.push('| `GET https://api.upstage.ai/v1/models` | key verification |');
lines.push('| `POST https://api.upstage.ai/v1/chat/completions` | key verification (solar-pro2) |');
lines.push('');
const traces = new Map();
for (const a of accounts) {
  for (const t of a.apiTrace || []) {
    const key = `${t.method} ${t.url}`;
    if (!traces.has(key)) traces.set(key, { statuses: new Set(), res: t.res });
    traces.get(key).statuses.add(t.status);
  }
}
if (traces.size) {
  lines.push('## Console REST trace (captured from the wire)');
  lines.push('');
  lines.push('| call | status(es) | sample response |');
  lines.push('|---|---|---|');
  for (const [k, v] of traces) {
    lines.push(`| \`${k}\` | ${[...v.statuses].join(', ')} | \`${String(v.res).replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 110)}\` |`);
  }
  lines.push('');
}
const nScreened = state.screened || 0;
const nFound = state.exitsFound || 0;
lines.push('## Proxy hit rate (measured)');
lines.push('');
lines.push(`- exits screened by the mint: **${nScreened}**, usable (api 401 + full console page): **${nFound}**${nScreened ? ` (${((nFound / nScreened) * 100).toFixed(1)}%)` : ''}`);
lines.push('- free-proxy lifetime is minutes: every exit is re-checked right before it is handed to an account');
lines.push('');
lines.push('## Accounts');
lines.push('');
lines.push('| # | e-mail | exit | key | models | chat |');
lines.push('|---|---|---|---|---|---|');
for (const a of accounts) {
  lines.push(`| ${a.id} | ${a.email} | ${a.proxy} | \`${a.keyMasked}\` | ${a.models ? a.models.length : 0} | ${a.chat || '-'} |`);
}
lines.push('');
lines.push('## Notes / blockers');
lines.push('');
lines.push('- Free-proxy exits die within minutes; the batch screens exits right before use and retries the first page on a fresh exit.');
lines.push('- Each account uses its own mailbox and its own exit; no key is written before `GET /v1/models` answered 200.');
const report = lines.join('\n') + '\n';
fs.writeFileSync(path.join(HERE, 'report.md'), report);

console.log(`models.json: ${modelsSorted.length} ids`);
console.log(`README.md, report.md written; keys=${keys.length} accounts=${nAccounts}`);
