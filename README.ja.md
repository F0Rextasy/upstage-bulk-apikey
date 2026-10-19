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

**APIキーを自動生成してUpstage（upstage.ai）アカウントを一括作成 — OpenAI互換の推論 + 9Routerコネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-16-of-them) · [🧪 APIの使い方](#-how-to-use-the-api) · [✅ 動作確認済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 問題報告](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>




---

## ✨ なぜこれが存在するのか

Upstageはすべてのアカウントに**$10の無料クレジット**と専用のAPIキーを付与し、そのどちらもが**アカウント**に紐づきます。つまり有効な単位は*1アカウントにつき1キー*であり、1つのアカウントから多数のキーを取ることは決してありません。サインアップは実ブラウザで開くホスト型ページです。このツールはプロキシリストを経由してその全行程を無人でたどり、実際の補完が成功した後にのみキーを記録します。

## 🎁 無料枠 — どれだけもらえるか

**新しいUpstageアカウントには、カード登録なしで$10の無料クレジットが付与され、そのクレジットはキーではなくアカウントに紐づきます。**

| 項目 | 値 |
| --- | --- |
| ウェルカムクレジット | **$10.00** / アカウント — コンソールの入門ページには*「サインアップすると$10の無料クレジットがもらえます」*と書かれています |
| カード登録 | **不要** |
| レート制限 | アカウントのプラン／コンソールに準拠。ベリファイアは`403`/`429`/`5xx`のときにキーのせいにせず、出口をローテーションします |
| サインアップ | 実ブラウザでのホスト型ページ：アカウントごとに新しい受信箱からメールコードを読み取ります |
| スケールする単位 | **1アカウント = 1キー** → `--count N` は実質「N × $10」 |

発行されたキーは`GET /v1/models`と実際の`solar-pro2`補完の両方で**200**を返すため、クレジットはカードなしで利用できます。**もっと増やす方法：** クレジットはアカウントに紐づくので、`--count N`でN個のアカウントを作成し、それぞれに専用キーと$10が付きます。

> 💡 無料枠はUpstageが設定するものであり、変更される可能性があります。最新の数値は[upstage.ai](https://upstage.ai)で確認してください。そして最終判断はツール自身のゲートに任せましょう：

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — 全16種類

`models.json`は発行済みキーによる`GET /v1/models`の実際の応答です — **16個のID**を含みます：

|モデル|✓|
|---|---|
|`solar-pro2`|✓|
|`solar-mini`|✓|
|`solar-mini-250422`|✓|
|`solar-mini4`|✓|
|`solar-mini4-260922`|✓|
|`solar-pro2-251215`|✓|
|`solar-pro3`|✓|
|`solar-pro3-260323`|✓|
|`solar-pro4`|✓|
|`solar-pro4-260806`|✓|
|`syn-pro`|✓|
|`syn-pro-251021`|✓|

2026-10-19の実地再チェック：カタログ16 IDのうち12件がチャットで`200`を返しました（テストした他のID — `solar-decide`、`solar-decide-flash`、`solar-jev` — は返しませんでした）。

1つのキーでの実地プローブ：

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 APIの使い方

ベースURLは**`https://api.upstage.ai/v1`**です — OpenAI互換なので、OpenAIに対応するものなら何でも動作します。

**任意のSDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**カスタムベースURLを設定できる任意のエージェント／ツール**（Cursor、OpenCode、Kilo Code など）：ベースURLに`https://api.upstage.ai/v1`、キーを貼り付け、`models.json`から任意のモデルIDを選択します。

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

ツールが書き出すものはすべて**コードの隣**、`src/`の中に置かれます：`src/keys.txt`、`src/accounts.json`、`src/outputs/`、`src/out/`。プールは`src/proxies.txt`から読み込まれます。`node src/cli.js help`で全タスクとフラグの一覧を表示できます。

### 🖱️ ランチャー

ランチャーは件数、並列数、メールボックス／プロキシ設定を尋ね、それらを`launcher.config.json`に記憶し、CLIタスク（mint / finish / verify / screen / connect）を振り分けます。

## ✅ 動作確認済み — すべてのキーをテスト済み

キーが`keys.txt`に書き込まれるのは、実際のAPIがそのキーで応答した後だけです：

| チェック | 呼び出し | 期待値 |
|---|---|---|
| 認証 + モデル一覧 | `GET https://api.upstage.ai/v1/models` | `200` + アカウントのモデルID |
| 実際の生成 | `POST https://api.upstage.ai/v1/chat/completions`（`solar-pro2`） | `200` + 空でない`choices[0].message.content` |
| 同梱バッチ | **31個の異なるアカウント → 31個のキー、すべて検証済み** | `models` 200 + `solar-pro2` チャット 200 |

ベリファイアは**403/429/5xx/トランスポートエラー時に出口をローテーション**し、`401`のときだけキーを失敗と判定します。したがって、1つの出口が拒否されただけでキーが失格になることはありません。`node src/cli.js verify --chat`を実行すれば、自分のファイルに対してまったく同じチェックを再現できます。

## 🧭 仕組み

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

アカウントごとに、独立したChromeコンテキスト（専用のプロキシ + ストレージ）を使用します：

1. 新しいメールボックス — コードは通常数秒で届きます。
2. `proxies.txt`から新しい出口を取得。コンソールページのチェックに**その時点で**応答した場合のみ割り当てられます。
3. ホスト型サインアップ → メールコード → コンソール。
4. サインアップ同意 → `/api-keys` → **Create key**。
5. キーはキー作成時の**通信応答**から取得され、実際に検証されます：`GET /v1/models`**および**実際の`solar-pro2`補完。
6. 状態はアカウントごとにチェックポイントされるため、出口が死んでも失うのは1回の試行だけで、バッチ全体ではありません。

**フィニッシュモード。** すでに存在するアカウントはメールなしで完了できます：`finish.js`が記録済みの認証情報で**サインイン**し、キーを発行します — すでに所有しているファイルを増やす最も安価な方法です。

## ⚙️ CLIオプション

| タスク | フラグ |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (並列数 + ペーシング間隔) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — プロバイダAPIに到達できる出口だけを残します |
| `harvest` | 生のフィードリストを選別して使えるプールにします |

Turboを推奨します（5）。それ以上は非力なPCでは負荷やBANのリスクがあります。

| 環境変数 | デフォルト | 意味 |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | プールファイル、1行につき1プロキシ |

設定は`launcher.config.json`に保存されます。キーは`keys.txt`に1行1件で書き込まれ、`%USERPROFILE%\upstage-keys.txt`にもミラーされます。`node src/cli.js help`が正式な一覧です。

## 🛰️ プロキシ経由の場合

* `src/proxies.txt` — 1行につき1つの出口（ランチャーとすべてのタスクが`src/`から読み込みます）。`scheme://user:pass@host:port`、`scheme://host:port`、または素の`host:port`（デフォルトは`http://`）。`#`以降のコメントと空行は無視されます。
* 各出口はアカウントが時間を使う前に**使用時点でのプローブ**を受けます。死んだ出口は除外され、プールは使用可能な集合が尽きたときにのみ再読み込みされます。
* 自分のインターフェース上では何も待ち受けません。フロー内のすべてのリクエストはプールを経由します。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `src/keys.txt` | 検証済みキーを1行1件 — git管理外、コミットされません |
| `src/accounts.json` | メール / パスワード / キー / アカウントごとの状態 |
| [`models.json`](src/models.json) | `GET /v1/models`の実際の応答 — 16個のID |
| `src/proxies.txt` | あなたの出口、1行1件 — git管理外 |
| `src/outputs/`、`src/out/` | スクリーンショット、DOMダンプ、実行状態 — git管理外 |

## 🔌 9Routerへの接続

[9Router](https://9router.com)はセルフホスト型のOpenAI互換ルーターです。UpstageはOpenAI互換なので、1つの`openai-compatible`ノードがすべてのキーを担えます：

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

デフォルト：ベース`http://localhost:20128`、パスワード`123456`、ノード`Upstage`、プレフィックス`upstage`、上流`https://api.upstage.ai/v1`、デフォルトモデル`solar-mini4`。発行済みの別のキーを`--name "<label 2>"`で登録できます — キーごとに9Routerが負荷分散できる別の接続になります。モデルは`upstage/<model id>`として提供されます。

## 🔑 1つのキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダ | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 プロバイダが提供するもの | アカウントあたり$10の無料クレジット — 16のSolarモデル、すべてのキーをチャットで検証済み |
| 🔑 1つのキーで得られるもの | 自身のアカウントにスコープされた1つのAPIキー：下記エンドポイントで16個のモデルIDを、プランの制限内で利用できます。クォータは**アカウント**に紐づくため、このツールがキーごとに1アカウントを作成するのはまさにそのためです |
| 🌐 APIの形式 | OpenAI互換：`POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 あなたのデータ | 接続されるのはupstage.aiと、あなたが設定した受信箱バックエンドのみです。キーはあなたのマシン上に留まります |

## 🐞 問題報告

失敗したステップ、使用した出口、ツールのstdoutを添えてissueを開いてください — `outputs/`内のダンプ（各ステップのスクリーンショット + DOM）があれば、キーを漏らさずに失敗を再現できます。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE)を参照してください。

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>