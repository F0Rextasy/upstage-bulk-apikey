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

**Upstage (upstage.ai) アカウントを自動生成された API キーとともに一括作成 — OpenAI 互換の推論 + 9Router コネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-16-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 検証済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 問題報告](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ これが存在する理由

Upstage はすべてのアカウントに **$10 の無料クレジット** と専用の API キーを付与し、その両方は **アカウント** に紐づきます — つまり有用な単位は *キーごとに 1 アカウント* であり、1 つのアカウントから多数のキーを取ることではありません。サインアップは実ブラウザ上のホスト型ページで行われるため、このツールはプロキシリストを経由してその全経路を無人でたどり、実際の補完が成功した後にのみキーを記録します。

## 🎁 無料枠 — どれだけ得られるか

**新規の Upstage アカウントにはカード不要で $10 の無料クレジットが付与され、そのクレジットはキーではなくアカウントに紐づきます。**

| 項目 | 値 |
| --- | --- |
| ウェルカムクレジット | アカウントあたり **$10.00** — コンソールの入門ページには *「Sign up to receive $10 in free credit」* と記載 |
| カード要否 | **不要** |
| レート制限 | アカウントのプラン/コンソールに準拠。検証ツールは `403`/`429`/`5xx` で出口をローテーションし、キーのせいにしない |
| サインアップ | 実ブラウザ上のホスト型ページ: メールコードはアカウントごとに新しい受信箱から読み取る |
| スケールする単位 | **1 アカウント = 1 キー** → `--count N` は実質「N × $10」 |

発行されたキーは `GET /v1/models` と実際の `solar-pro2` 補完の両方で **200** を返すため、カードなしでクレジットを消費できます。**もっと得る方法:** クレジットはアカウントに紐づくので、`--count N` で N 個のアカウントを作成し、それぞれが独自のキーと $10 を持ちます。

> 💡 無料枠は Upstage が設定するもので変更される可能性があります。最新の数値は [upstage.ai](https://upstage.ai) で確認してください — そしてツール自身のゲートに判断させましょう:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — 全 16 種類

`models.json` は発行済みキーの実際の `GET /v1/models` 応答です — **16 個の id** を含みます:

|Model|✓|
|---|---|
|`solar-pro2`|✓|

1 つのキーのライブプローブ:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 API の使い方

ベース URL は **`https://api.upstage.ai/v1`** です — OpenAI 互換なので、OpenAI に対応するものなら何でも動作します。

**任意の SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**カスタムベース URL を持つ任意のエージェント / ツール** (Cursor、OpenCode、Kilo Code など): ベース URL に `https://api.upstage.ai/v1`、キーを貼り付け、`models.json` から任意のモデル id を選択します。

## 🛠 クイックスタート

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

ツールが書き込むものはすべて **コードの隣**、`src/` 内に置かれます: `src/keys.txt`、`src/accounts.json`、`src/outputs/`、`src/out/`。プールは `src/proxies.txt` から読み込まれます。`node src/cli.js help` で全タスクとフラグを一覧できます。

### 🖱️ ランチャー

ランチャーは件数、並列度、メールボックス/プロキシ設定を尋ね、それらを `launcher.config.json` に記憶し、CLI タスク (mint / finish / verify / screen / connect) をディスパッチします。

## ✅ 動作検証済み — すべてのキーがテストされる

キーは、実際の API がそれに応答した後にのみ `keys.txt` に書き込まれます:

| チェック | 呼び出し | 期待値 |
|---|---|---|
| 認証 + モデル一覧 | `GET https://api.upstage.ai/v1/models` | `200` + アカウントのモデル id |
| 実際の生成 | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + 空でない `choices[0].message.content` |
| 出荷済みバッチ | **31 個の異なるアカウント → 31 個のキー、すべて検証済み** | `models` 200 + `solar-pro2` chat 200 |

検証ツールは **403/429/5xx/トランスポートエラーで出口をローテーション** し、`401` の場合にのみキーを失敗とします。そのため、1 つの出口が拒否されただけでキーが断罪されることはありません。`node src/cli.js verify --chat` は、あなた自身のファイルに対してまさにそのチェックを再現します。

## 🧭 仕組み

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

アカウントごとに、1 つの分離された Chrome コンテキスト (独自のプロキシ + ストレージ):

1. 新しいメールボックス — コードは通常数秒で届きます;
2. `proxies.txt` からの新しい出口。**その時点で** コンソールページのチェックに応答した場合にのみ割り当てられます;
3. ホスト型サインアップ → メールコード → コンソール;
4. サインアップ同意 → `/api-keys` → **Create key**;
5. キーは create-key の **ワイヤレスポンス** から取得され、ライブで検証されます: `GET /v1/models` **および** 実際の `solar-pro2` 補完;
6. 状態はアカウントごとにチェックポイントされるため、死んだ出口のコストはバッチ全体ではなく 1 回の試行で済みます。

**Finish モード。** すでに存在するアカウントはメールなしで完了できます: `finish.js` は記録された認証情報で **サインイン** し、キーを発行します — すでに所有しているファイルを増やす最も安価な方法です。

## ⚙️ CLI オプション

| タスク | フラグ |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (conc + pacing gap) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — keep only exits that reach the provider API |
| `harvest` | screen raw feed lists into a usable pool |

Turbo önerilir (5); daha fazlası zayıf bilgisayarda yük/ban riski.

| 環境変数 | デフォルト | 意味 |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | プールファイル、1 行につき 1 プロキシ |

設定は `launcher.config.json` に永続化されます。キーは `keys.txt` に 1 行ずつ保存され、`%USERPROFILE%\upstage-keys.txt` にミラーされます。`node src/cli.js help` が正式な一覧です。

## 🛰️ プロキシの背後で

* `src/proxies.txt` — 1 行につき 1 出口 (ランチャーとすべてのタスクが `src/` から読み込みます); `scheme://user:pass@host:port`、`scheme://host:port`、またはベアの `host:port` (`http://` がデフォルト)。`#` 以降のコメントと空行は無視されます。
* すべての出口は、アカウントが時間を費やす前に **使用時点のプローブ** を受けます; 死んだ出口は破棄され、プールは使用可能なセットが尽きたときにのみ再読み込みされます。
* あなた自身のインターフェースでは何もリッスンしません: フロー内のすべてのリクエストはプールを経由します。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `src/keys.txt` | 検証済みキーを 1 行ずつ — git 無視、コミットされない |
| `src/accounts.json` | メール / パスワード / キー / アカウントごとの状態 |
| [`models.json`](src/models.json) | 実際の `GET /v1/models` 応答 — 16 個の id |
| `src/proxies.txt` | あなたの出口、1 行ずつ — git 無視 |
| `src/outputs/`、`src/out/` | スクリーンショット、DOM ダンプ、実行状態 — git 無視 |

## 🔌 9Router に接続

[9Router](https://9router.com) はセルフホスト型の OpenAI 互換ルーターです。Upstage は OpenAI 互換なので、1 つの `openai-compatible` ノードがすべてのキーを担います:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

デフォルト: base `http://localhost:20128`、password `123456`、node `Upstage`、prefix `upstage`、upstream `https://api.upstage.ai/v1`、default model `solar-mini4`。別の発行済みキーを `--name "<label 2>"` で登録します — すべてのキーが、9Router が負荷分散できる別の接続になります。モデルはその後 `upstage/<model id>` として提供されます。

## 🔑 1 つのキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダー | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 プロバイダーが提供するもの | アカウントあたり $10 の無料クレジット — 16 個の Solar モデル、すべてのキーがチャット検証済み |
| 🔑 1 つのキーで得られるもの | 自身のアカウントにスコープされた 1 つの API キー: 下記エンドポイントの 16 個のモデル id を、あなたのプランの制限で利用可能。クォータは **アカウント** に紐づくため、このツールがキーごとに 1 アカウントを作成するのです |
| 🌐 API の形 | OpenAI 互換: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 あなたのデータ | 接続されるのは upstage.ai と、あなたが設定した受信箱バックエンドのみ。キーはあなたのマシン上に留まります |

## 🐞 問題報告

失敗したステップ、使用した出口、ツールの stdout を添えて issue を開いてください — `outputs/` 内のダンプ (各ステップのスクリーンショット + DOM) により、キーを漏らさずに失敗を再現できます。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE) を参照。

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>