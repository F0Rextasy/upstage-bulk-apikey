#!/usr/bin/env node
'use strict';

/**
 * Interactive launcher — a menu over the task modules, with settings persisted to
 * launcher.config.json next to this file.
 *
 *   node src/launcher.js          menu
 *   node src/launcher.js --help   same help as cli.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

// Keep the menu alive when a task's socket dies mid-run.
process.on('uncaughtException', (e) => console.log(`WARN uncaught: ${String(e && e.message).slice(0, 180)}`));

const HERE = __dirname;
const CONFIG = path.join(HERE, 'launcher.config.json');
const POOL = path.join(HERE, 'proxies.txt');
const KEYS = path.join(HERE, 'keys.txt');

const defaults = { count: 30, conc: 2, chatMin: 1, headed: false, limit: 0, file: 'keys.txt', preset: '' };
let cfg = { ...defaults };
try {
  Object.assign(cfg, JSON.parse(fs.readFileSync(CONFIG, 'utf8')));
} catch (e) {}

const save = () => fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + '\n');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, fallback) =>
  new Promise((resolve) => rl.question(`${q}${fallback !== undefined ? ` [${fallback}]` : ''}: `, (a) => resolve(String(a).trim() || fallback)));
// same as ask(), but nothing that is typed is echoed — the prompt stays visible, the key never does
const askSecret = (q) => new Promise((resolve) => {
  const write = rl._writeToOutput;
  const prompt = q + ': ';
  rl._writeToOutput = function (s) {
    if (s === prompt) rl.output.write(s);
    else if (s === '\r\n' || s === '\n') rl.output.write('\n');
  };
  rl.question(prompt, (a) => {
    rl._writeToOutput = write;
    resolve(String(a).trim());
  });
});

const LOGO = String.raw`
  ██╗   ██╗██████╗ ███████╗████████╗ █████╗  ██████╗ ███████╗
  ██║   ██║██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔════╝ ██╔════╝
  ██║   ██║██████╔╝███████╗   ██║   ███████║██║  ███╗█████╗
  ██║   ██║██╔═══╝ ╚════██║   ██║   ██╔══██║██║   ██║██╔══╝
  ╚██████╔╝██║     ███████║   ██║   ██║  ██║╚██████╔╝███████╗
   ╚═════╝ ╚═╝     ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝`;

function banner() {
  const text = ['upstage-bulk-apikey  ·  one Upstage account per API key, live-verified', 'MIT  ·  OpenAI-compatible  ·  9Router connector'];
  const width = Math.max(78, Math.max(...LOGO.split('\n').map((l) => [...l].length)) - 4, ...text.map((l) => l.length));
  const box = (s) => '  │ ' + s.padEnd(width) + ' │';
  console.log(LOGO);
  console.log('  ┌' + '─'.repeat(width + 2) + '┐');
  for (const line of text) console.log(box(line));
  console.log('  └' + '─'.repeat(width + 2) + '┘');
  console.log('');
}

function poolState() {
  let n = 0;
  try {
    n = fs.readFileSync(POOL, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#')).length;
  } catch (e) {}
  return n;
}

function keyState() {
  let n = 0;
  try {
    n = fs.readFileSync(KEYS, 'utf8').split(/\r?\n/).filter((l) => l.trim()).length;
  } catch (e) {}
  return n;
}

function run(args) {
  console.log(`\n▶ node src/${args.join(' ')}\n`);
  const r = spawnSync(process.execPath, args.map((a) => (a.startsWith('--') ? a : a)), {
    windowsHide: true,
    cwd: HERE,
    stdio: 'inherit',
  });
  if (r.status !== 0) console.log(`\n⚠ task exited with code ${r.status}`);
}

async function settings() {
  console.log('\nSettings');
  console.log(`  1) keys to mint        ${cfg.count}`);
  console.log(`  2) browser concurrency ${cfg.conc}`);
  console.log(`  3) chat proofs / key   ${cfg.chatMin}`);
  console.log(`  4) show browser        ${cfg.headed ? 'yes' : 'no'}`);
  console.log(`  5) attempt limit       ${cfg.limit || 'unlimited'}`);
  console.log(`  6) keys file           ${cfg.file}`);
  console.log(`  7) preset              ${cfg.preset || '(none — the task default)'}`);
  console.log('  0) back');
  const pick = await ask('choose', '0');
  if (pick === '1') cfg.count = parseInt(await ask('keys to mint', cfg.count), 10) || cfg.count;
  if (pick === '2') cfg.conc = parseInt(await ask('concurrency', cfg.conc), 10) || cfg.conc;
  if (pick === '3') cfg.chatMin = parseInt(await ask('chat proofs', cfg.chatMin), 10) || 0;
  if (pick === '4') cfg.headed = String(await ask('show browser (y/n)', cfg.headed ? 'y' : 'n')).toLowerCase().startsWith('y');
  if (pick === '5') cfg.limit = parseInt(await ask('attempt limit', cfg.limit), 10) || 0;
  if (pick === '6') cfg.file = await ask('keys file', cfg.file);
  if (pick === '7') cfg.preset = String(await ask('preset (turbo/balanced/safe, blank = none)', cfg.preset)).trim().toLowerCase();
  save();
}

function common() {
  const a = ['--conc', String(cfg.conc)];
  if (cfg.headed) a.push('--headed');
  if (cfg.limit) a.push('--limit', String(cfg.limit));
  // Run-shape presets (operator standard v3): turbo = 5 workers (recommended),
  // balanced = 4, safe = 2. Empty keeps the task's own historical conc 3.
  if (cfg.preset) a.push('--preset=' + cfg.preset);
  return a;
}

async function connectFlow() {
  console.log('\n9Router — register this provider node and one API key with a local 9Router instance');
  const base = await ask('9Router base URL', 'http://localhost:20128');
  const password = await ask('9Router password', '123456');
  const apiKey = await askSecret('API key to register (blank = skip)');
  if (!apiKey) {
    console.log('  no key given — nothing to register');
    return;
  }
  const name = await ask('connection label', 'Upstage');
  const model = await ask('default model', 'solar-mini4');
  process.env.NINEROUTER_API_KEY = apiKey;
  run(['connect-9router.js', '--base', base, '--password', password, '--name', name, '--model', model]);
}

async function main() {
  process.stdout.write('\x1b[2J\x1b[H');
  banner();
  console.log(`  proxy exits: ${poolState() || 'none — put exits in proxies.txt'}     keys on disk: ${keyState()}\n`);
  console.log('  1) Mint keys           create fresh accounts, one key each, verify by chat');
  console.log('  2) Finish accounts     log in to accounts already created and finish their key');
  console.log('  3) Verify keys         re-check everything in the keys file');
  console.log('  4) Screen the pool     keep only exits that reach the provider API');
  console.log('  5) Settings');
  console.log('  6) Help / command line');
  console.log('  7) 9Router             register a key with a local 9Router instance (asks for base/password/key)');
  console.log('  0) Exit\n');
  const choice = await ask('choose', '1');

  if (choice === '1') {
    run(['mint.js', '--count', String(cfg.count), '--chat-min', String(cfg.chatMin), ...common()]);
  } else if (choice === '2') {
    const only = await ask('account ids (comma separated, blank = all)', '');
    run(['finish.js', ...(only ? ['--only', only] : []), ...common()]);
  } else if (choice === '3') {
    const chat = String(await ask('also send a chat completion per key (y/n)', 'y')).toLowerCase().startsWith('y');
    run(['verify.js', '--file', cfg.file, ...(chat ? ['--chat'] : [])]);
  } else if (choice === '4') {
    const limit = await ask('exits to test', '200');
    run(['screen-api.js', '--limit', String(limit), '--conc', '16']);
  } else if (choice === '5') {
    await settings();
  } else if (choice === '6') {
    run(['cli.js', 'help']);
  } else if (choice === '7') {
    await connectFlow();
  } else {
    rl.close();
    return;
  }
  await ask('\npress enter for the menu', '');
  return main();
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.argv = [process.argv[0], path.join(HERE, 'cli.js'), 'help'];
  require('./cli.js');
} else if (process.argv.includes('--connect-9router')) {
  connectFlow()
    .then(() => rl.close())
    .catch((e) => {
      console.error('launcher failed:', e.stack || e.message);
      process.exit(1);
    });
} else {
  main().catch((e) => {
    console.error('launcher failed:', e.stack || e.message);
    process.exit(1);
  });
}
