<div align="center">

```
███████╗ ██████╗ ██████╗ ███████╗██╗  ██╗████████╗ █████╗ ███████╗██╗   ██╗
██╔════╝██╔═████╗██╔══██╗██╔════╝╚██╗██╔╝╚══██╔══╝██╔══██╗██╔════╝╚██╗ ██╔╝
█████╗  ██║██╔██║██████╔╝█████╗   ╚███╔╝    ██║   ███████║███████╗ ╚████╔╝
██╔══╝  ████╔╝██║██╔══██╗██╔══╝   ██╔██╗    ██║   ██╔══██║╚════██║  ╚██╔╝
██║     ╚██████╔╝██║  ██║███████╗██╔╝ ██╗   ██║   ██║  ██║███████║   ██║
╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝   ╚═╝
```

# upstage-bulk-apikey

**Bulk API keys for [Upstage](https://upstage.ai) — one account per key, $10 free credit per account, 16 Solar models, real browser sign-up, live-verified, any number.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Quick start](#-quick-start) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🤖 Models & free tier](#-models--free-tier) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

---

> **Mint as many accounts/keys as you need — there is no cap.** `--count N` (default `30`)
> accepts any N; N accounts, N keys, one account per key.

## ✨ What this does

Upstage gives every account a **$10 free credit** and its own API key, and both live on the
**account** — so the useful unit is *one account per key*, never many keys from one account. Sign-up
is a hosted page in a real browser; this tool walks the whole path unattended, over your proxy list,
and only records a key after a real completion.

```
proxies.txt ──▶ exit probe (console.upstage.ai reachable?)
                    │
                    ▼
   isolated Chrome context  ──▶  console.upstage.ai/login
                                 └─▶ hosted sign-up ─▶ password ─▶ e-mail code (inbox)
                                     └─▶ console ─▶ agreement ─▶ /api-keys ─▶ Create key
                                                                         │
         GET /v1/models 200  ◀── live verification ──┘                 ▼
         POST /v1/chat/completions 200                              keys.txt
```

## 🛠 Quick start

```bash
git clone https://github.com/F0Rextasy/upstage-bulk-apikey.git
cd upstage-bulk-apikey

# 1) your proxy list, one line per exit (http://, socks5://, socks4:// or bare host:port)
printf 'socks5://127.0.0.1:1080\n' > proxies.txt

# 2) mailboxes — point the tool at your own mailbox (an inbox API token or IMAP):
#    the sign-up code is read from a fresh inbox per account

# 3) go
node launcher.js                 # interactive menu: mint / finish / verify / screen
# or drive it directly:
node cli.js mint   --count 30 --conc 2
node cli.js finish --conc 2      # finish accounts whose key step never completed
node cli.js verify --chat        # re-verify keys.txt (models + one chat completion)
```

`node cli.js help` lists every task and flag.

## ✅ Verified working — every key is tested

A key is written to `keys.txt` only after the live API answers with it:

| check | call | expected |
|---|---|---|
| auth + model list | `GET https://api.upstage.ai/v1/models` | `200` + the account's model ids |
| real generation | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + non-empty `choices[0].message.content` |

The batch this repository shipped from: **31 distinct accounts → 31 keys, every one verified
(`models` 200 + `solar-pro2` chat 200)**. `node cli.js verify --chat` reproduces exactly that check
for your own file. The verifier **rotates exits on 403/429/5xx/transport errors** and only fails a
key on `401`, so a key is never condemned because one exit was rejected.

## 🧭 How it works

Per account, one isolated Chrome context (its own proxy + storage):

1. a fresh mailbox — codes usually arrive in seconds;
2. a fresh exit from `proxies.txt`, handed out only if it answers the console page check **right then**;
3. hosted sign-up → e-mail code → console;
4. the sign-up agreement → `/api-keys` → **Create key**;
5. the key is captured from the create-key **wire response** and verified live:
   `GET /v1/models` **and** a real `solar-pro2` completion;
6. state is checkpointed per account, so a dead exit costs one attempt, not the batch.

**Finish mode.** Accounts that already exist can be finished without any mail: `finish.js` signs
**in** with the recorded credentials and mints the key — the cheapest way to grow a file you already own.

## 🤖 Models & free tier

`models.json` is the live `GET /v1/models` answer of minted keys — **16 ids**, including:

| id | note |
|---|---|
| `solar-pro2` | the verifier's default chat model |
| `solar-pro3`, `solar-pro4` | newest pro line |
| `solar-mini`, `solar-mini4` | small / fast |
| `solar-decide`, `solar-decide-flash`, `solar-jev`, `syn-pro` | task-specific endpoints |
| `solar-pro4-260806`, `solar-pro3-260323`, `solar-mini4-260922`, … | dated snapshots of the above |

**What a fresh account gets:** a **$10 free credit** — the console's own getting-started page says
*“Sign up to receive $10 in free credit”*, and a minted key answers **200** on both
`/v1/models` and a real `solar-pro2` completion, so the credit is spendable without a card.

**How to get more:** the credit lives on the **account** — one account per key, and a new account is
a new $10. `--count N` mints N accounts, each with its own key and credit.

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## ⚙️ CLI options

| task | flags |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — keep only exits that reach the provider API |
| `harvest` | screen raw feed lists into a usable pool |

Settings persist in `launcher.config.json` when you use the launcher. Keys land in `keys.txt`, one
per line, with a mirror at `%USERPROFILE%\upstage-keys.txt`; per-account detail lands in
`accounts.json`.

## 🛰️ Behind a proxy

* `proxies.txt` — one exit per line; `scheme://user:pass@host:port`, `scheme://host:port` or bare
  `host:port` (defaults to `http://`). Comments after `#` and blank lines are ignored.
* Every exit gets a **point-of-use probe** before an account spends time on it; dead exits are
  dropped, and the pool is only re-read when the usable set runs dry.
* Nothing listens on your own interface: every request in the flow goes through the pool.

## 🐞 Issues

Open an issue with the failing step, the exit used and the tool's stdout — the dumps in `outputs/`
(screenshots + DOM at each step) make failures reproducible without leaking a key.

## 📄 License

MIT — see [LICENSE](LICENSE). Use it on accounts you are allowed to create.

---

<div align="center">

**Built by F0REXTASY** · [github.com/F0Rextasy](https://github.com/F0Rextasy) · [x.com/bigbullapp](https://x.com/bigbullapp)

</div>
