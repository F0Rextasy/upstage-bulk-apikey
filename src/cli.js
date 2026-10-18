#!/usr/bin/env node
'use strict';

/**
 * Command dispatcher.
 *
 *   node src/cli.js mint   --count 30 --conc 3
 *   node src/cli.js finish --conc 2 [--only 25,108]
 *   node src/cli.js verify [--file keys.txt] [--chat]
 *   node src/cli.js screen --limit 200
 *   node src/cli.js harvest
 *   node src/cli.js help
 *
 * Every task spawns the matching module in this folder; nothing is required
 * into this process so a crash in one run never leaves state behind.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const TASKS = {
  mint: { file: 'mint.js', note: 'create fresh accounts and mint one key each' },
  finish: { file: 'finish.js', note: 'log in to accounts already created and finish their key' },
  verify: { file: 'verify.js', note: 're-check keys that are already on disk' },
  screen: { file: 'screen-api.js', note: 'screen the proxy pool for US API reachability' },
  harvest: { file: 'harvest.js', note: 'screen raw feed lists into a usable pool' },
  register: { file: 'register.js', note: 'signup only, no key step' },
  connect: { file: 'connect-9router.js', note: 'register the provider node + one API key with a local 9Router' },
};

function help() {
  console.log('upstage-bulk-apikey — one Upstage account per API key\n');
  console.log('usage: node src/cli.js <task> [options]\n');
  console.log('tasks:');
  for (const [name, t] of Object.entries(TASKS)) console.log(`  ${name.padEnd(9)} ${t.note}`);
  console.log('\ncommon options:');
  console.log('  --count N     keys to mint          --conc N     browser concurrency (2 is safe)');
  console.log('  --limit N     stop after N attempts --chat-min N require this many chat replies');
  console.log('  --headed      show the browser      --file F     keys file (verify)');
  console.log('  --preset P    run shape: turbo (5 workers, recommended) / balanced / safe');
  console.log('\nproxy pool:');
  console.log('  one exit per line in proxies.txt — scheme://host:port[#comment], user:pass@ supported');
  console.log('\n9Router (optional, local inference router):');
  console.log('  node src/cli.js connect --api-key <key>        register node + key (node src/connect-9router.js --help)');
  console.log('  node src/cli.js --connect-9router --api-key <key>   the same task');
  console.log('\nno options? run the interactive launcher:  node src/launcher.js');
}

const [rawTask, ...rest] = process.argv.slice(2);
const task = rawTask === '--connect-9router' ? 'connect' : rawTask;
if (!task || task === 'help' || task === '--help' || task === '-h') {
  help();
  process.exit(0);
}
const entry = TASKS[task];
if (!entry) {
  console.error(`unknown task: ${task}\n`);
  help();
  process.exit(1);
}

const child = spawnSync(process.execPath, [path.join(__dirname, entry.file), ...rest], {
  windowsHide: true,
  stdio: 'inherit',
  env: process.env,
});
process.exit(child.status === null ? 1 : child.status);
