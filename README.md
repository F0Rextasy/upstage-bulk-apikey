<div align="center">

```
██╗   ██╗██████╗ ███████╗████████╗ █████╗  ██████╗ ███████╗
██║   ██║██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔════╝ ██╔════╝
██║   ██║██████╔╝███████╗   ██║   ███████║██║  ███╗█████╗
██║   ██║██╔═══╝ ╚════██║   ██║   ██╔══██║██║   ██║██╔══╝
╚██████╔╝██║     ███████║   ██║   ██║  ██║╚██████╔╝███████╗
 ╚═════╝ ╚═╝     ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

# upstage-bulk-apikey

**Bulk-create Upstage (upstage.ai) accounts with auto-generated API keys — OpenAI-compatible inference + 9Router connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Quick start](#-quick-start) · [🎁 Free tier](#-free-tier--how-much-you-get) · [🤖 Models](#-models--all-16-of-them) · [🧪 Use the API](#-how-to-use-the-api) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Why this exists

Upstage gives every account a **$10 free credit** and its own API key, and both live on the **account** — so the useful unit is *one account per key*, never many keys from one account. Sign-up is a hosted page in a real browser; this tool walks the whole path unattended, over your proxy list, and only records a key after a real completion.

## 🎁 Free tier — how much you get

**Every new Upstage account gets a $10 free credit — no card — and the credit lives on the account, not on the key.**

| What | Value |
| --- | --- |
| Welcome credit | **$10.00** per account — the console's getting-started page says *“Sign up to receive $10 in free credit”* |
| Card required | **No** |
| Rate limit | per the account's plan/console; the verifier rotates exits on `403`/`429`/`5xx` instead of blaming the key |
| Sign-up | hosted page in a real browser: e-mail code read from a fresh inbox per account |
| The unit that scales | **one account = one key** → `--count N` is really "N × $10" |

A minted key answers **200** on both `GET /v1/models` and a real `solar-pro2` completion, so the credit is spendable without a card. **How to get more:** the credit lives on the account — `--count N` mints N accounts, each with its own key and $10.

> 💡 The free tier is set by Upstage and can change. Check the live numbers at [upstage.ai](https://upstage.ai) — and let the tool's own gate decide:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Models — all 16 of them

`models.json` is the live `GET /v1/models` answer of minted keys — **16 ids**, including:

| Model ID | Note |
| --- | --- |
| `solar-pro4`, `solar-pro3`, `solar-pro2` | pro line (newest first) |
| `solar-mini4`, `solar-mini` | small / fast |
| `solar-decide`, `solar-decide-flash` | task-specific endpoints |
| `solar-jev`, `syn-pro` | specialised / synchronous endpoints |
| `solar-pro4-260806`, `solar-pro3-260323`, `solar-pro2-251215`, `solar-mini4-260922`, `solar-mini-250422`, `syn-pro-251021`, `solar-pro4-solar-pro2-…` | dated snapshots of the above |

Live probe of one key:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 How to use the API

The base URL is **`https://api.upstage.ai/v1`** — OpenAI-compatible, so anything that speaks OpenAI works.

**Any SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Any agent / tool with a custom base URL** (Cursor, OpenCode, Kilo Code, …): base URL `https://api.upstage.ai/v1`, paste a key, pick any model id from `models.json`.

## 🛠 Quick start

```bash
git clone https://github.com/F0Rextasy/upstage-bulk-apikey.git
cd upstage-bulk-apikey

# 1) your proxy list, one line per exit (http://, socks5://, socks4:// or bare host:port)
printf 'socks5://127.0.0.1:1080\n' > src/proxies.txt

# 2) mailboxes — point the tool at your own mailbox (an inbox API token or IMAP):
#    the sign-up code is read from a fresh inbox per account

# 3) go
node src/launcher.js                 # interactive menu: mint / finish / verify / screen
# or drive it directly:
node src/cli.js mint   --count 30 --conc 2
node src/cli.js finish --conc 2      # finish accounts whose key step never completed
node src/cli.js verify --chat        # re-verify keys.txt (models + one chat completion)
```

Everything the tools write lands **next to the code**, in `src/`: `src/keys.txt`, `src/accounts.json`, `src/outputs/` and `src/out/`; the pool is read from `src/proxies.txt`. `node src/cli.js help` lists every task and flag.

### 🖱️ The launcher

The launcher asks for the count, concurrency and mailbox/proxy settings, remembers them in `launcher.config.json`, and dispatches the CLI tasks (mint / finish / verify / screen / connect).

## ✅ Verified working — every key is tested

A key is written to `keys.txt` only after the live API answers with it:

| Check | Call | Expected |
|---|---|---|
| auth + model list | `GET https://api.upstage.ai/v1/models` | `200` + the account's model ids |
| real generation | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + non-empty `choices[0].message.content` |
| the shipped batch | **each account minted its own key, every one verified** | `models` 200 + `solar-pro2` chat 200 |

The verifier **rotates exits on 403/429/5xx/transport errors** and only fails a key on `401`, so a key is never condemned because one exit was rejected. `node src/cli.js verify --chat` reproduces exactly that check for your own file.

> **Quality gates.** Every key here passed a live `chat-200` before it was written to `keys.txt`
> (dead keys are never shipped). Router combos follow the same rule at the model level: an entry is
> added **only if the model answers `chat-200` and can call tools** — a model without tool support,
> a dead key or a dead provider is dropped instead of added. Re-run the verify step any time;
> failures are reported, never hidden.

## 🧭 How it works

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

Per account, one isolated Chrome context (its own proxy + storage):

1. a fresh mailbox — codes usually arrive in seconds;
2. a fresh exit from `proxies.txt`, handed out only if it answers the console page check **right then**;
3. hosted sign-up → e-mail code → console;
4. the sign-up agreement → `/api-keys` → **Create key**;
5. the key is captured from the create-key **wire response** and verified live: `GET /v1/models` **and** a real `solar-pro2` completion;
6. state is checkpointed per account, so a dead exit costs one attempt, not the batch.

**Finish mode.** Accounts that already exist can be finished without any mail: `finish.js` signs **in** with the recorded credentials and mints the key — the cheapest way to grow a file you already own.

## ⚙️ CLI options

| Task | Flags |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — keep only exits that reach the provider API |
| `harvest` | screen raw feed lists into a usable pool |

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | pool file, one proxy per line |

Settings persist in `launcher.config.json`; keys land in `keys.txt`, one per line, with a mirror at `%USERPROFILE%\upstage-keys.txt`. `node src/cli.js help` is the authoritative list.

## 🛰️ Behind a proxy

* `src/proxies.txt` — one exit per line (the launcher and every task read it from `src/`); `scheme://user:pass@host:port`, `scheme://host:port` or bare `host:port` (defaults to `http://`). Comments after `#` and blank lines are ignored.
* Every exit gets a **point-of-use probe** before an account spends time on it; dead exits are dropped, and the pool is only re-read when the usable set runs dry.
* Nothing listens on your own interface: every request in the flow goes through the pool.

## 📄 Files

| Path | Contents |
| --- | --- |
| `src/keys.txt` | one verified key per line — git-ignored, never committed |
| `src/accounts.json` | e-mail / password / key / per-account state |
| [`models.json`](src/models.json) | the live `GET /v1/models` answer — 16 ids |
| `src/proxies.txt` | your exits, one per line — git-ignored |
| `src/outputs/`, `src/out/` | screenshots, DOM dumps and run state — git-ignored |

## 🔌 Connect to 9Router

[9Router](https://9router.com) is a self-hosted, OpenAI-compatible router. Upstage is OpenAI-compatible, so one `openai-compatible` node carries every key:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Defaults: base `http://localhost:20128`, password `123456`, node `Upstage`, prefix `upstage`, upstream `https://api.upstage.ai/v1`, default model `solar-mini4`. Register another minted key with `--name "<label 2>"` — every key becomes another connection 9Router can load-balance across. Models are then served as `upstage/<model id>`.

## 🔌 Connect to OmniRoute

[OmniRoute](https://omniroute.online) is a self-hosted, OpenAI-compatible router. Upstage is OpenAI-compatible, so one `openai-compatible` node carries every key:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Defaults: base `http://localhost:20128`, password `123456`, node `Upstage`, prefix `upstage`, upstream `https://api.upstage.ai/v1`, default model `solar-mini4`. Register another minted key with `--name "<label 2>"` — every key becomes another connection OmniRoute can load-balance across. Models are then served as `upstage/<model id>`.

## 🔑 What one key gets you

| | |
| --- | --- |
| 🏢 Provider | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 What the provider gives | $10 free credit per account — 16 Solar models, every key chat-verified |
| 🔑 What one key gets you | one API key scoped to its own account: the 16 model ids on the endpoint below, at your plan's limits. The quota lives on the **account**, which is exactly why this tool creates one account per key |
| 🌐 API shape | OpenAI-compatible: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Your data | only upstage.ai and the inbox backend you configure are contacted; keys stay on your machine |

## 🐞 Issues

Open an issue with the failing step, the exit used and the tool's stdout — the dumps in `outputs/` (screenshots + DOM at each step) make failures reproducible without leaking a key.

## 📄 License

MIT © 2026 — see [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>
