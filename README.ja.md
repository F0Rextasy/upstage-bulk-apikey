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

**自動生成された API キーで Upstage (upstage.ai) アカウントを一括作成 — OpenAI 互換の推論 + 9Router コネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-16-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 検証済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 問題報告](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ これが存在する理由

Upstage はすべてのアカウントに **$10 の無料クレジット** と専用の API キーを付与し、その両方は **アカウント** に紐づきます — つまり有用な単位は *1 アカウントにつき 1 キー* であり、1 つのアカウントから多数のキーを取ることは決してありません。サインアップは実ブラウザ上のホスト型ページで行われるため、このツールはプロキシリストを経由してその全経路を無人でたどり、実際の補完が成功した後にのみキーを記録します。

## 🎁 無料枠 — どれだけ得られるか

**新しい Upstage アカウントには毎回 $10 の無料クレジットが付与されます — カード不要 — そしてクレジットはキーではなくアカウントに紐づきます。**

| 項目 | 値 |
| --- | --- |
| ウェルカムクレジット | アカウントごとに **$10.00** — コンソールの入門ページには *「Sign up to receive $10 in free credit」* と記載されています |
| カード要否 | **不要** |
| レート制限 | アカウントのプラン/コンソールに準拠。検証ツールは `403`/`429`/`5xx` でキーを責めるのではなく出口をローテーションします |
| サインアップ | 実ブラウザ上のホスト型ページ: メールコードはアカウントごとに新しい受信箱から読み取ります |
| スケールする単位 | **1 アカウント = 1 キー** → `--count N` は実質「N × $10」 |

発行されたキーは `GET /v1/models` と実際の `solar-pro2` 補完の両方で **200** を返すため、カードなしでクレジットを消費できます。**もっと得るには:** クレジットはアカウントに紐づくので、`--count N` はそれぞれが独自のキーと $10 を持つ N 個のアカウントを発行します。

> 💡 無料枠は Upstage が設定するもので、変更される可能性があります。最新の数値は [upstage.ai](https://upstage.ai) で確認してください — そしてツール自身のゲートに判断させましょう:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — 全 16 種類

`models.json` は発行されたキーによる `GET /v1/models` の実際の応答です — **16 個の id** を含みます:

| モデル ID | 備考 |
| --- | --- |
| `solar-pro4`, `solar-pro3`, `solar-pro2` | pro ライン (新しい順) |
| `solar-mini4`, `solar-mini` | 小型 / 高速 |
| `solar-decide`, `solar-decide-flash` | タスク特化エンドポイント |
| `solar-jev`, `syn-pro` | 特化 / 同期エンドポイント |
| `solar-pro4-260806`, `solar-pro3-260323`, `solar-pro2-251215`, `solar-mini4-260922`, `solar-mini-250422`, `syn-pro-251021`, `solar-pro4-solar-pro2-…` | 上記の日付付きスナップショット |

1 つのキーのライブプローブ:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 API の使い方

ベース URL は **`https://api.upstage.ai/v1`** です — OpenAI 互換なので、OpenAI を扱えるものなら何でも動作します。

**任意の SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**カスタムベース URL を持つ任意のエージェント / ツール** (Cursor、OpenCode、Kilo Code など): ベース URL `https://api.upstage.ai/v1`、キーを貼り付け、`models.json` から任意のモデル id を選択します。

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

ツールが書き込むものはすべて **コードの隣**、`src/` 内に置かれます: `src/keys.txt`、`src/accounts.json`、`src/outputs/`、`src/out/`。プールは `src/proxies.txt` から読み込まれます。`node src/cli.js help` で全タスクとフラグを一覧表示できます。

### 🖱️ ランチャー

ランチャーは件数、並行数、メールボックス/プロキシ設定を尋ね、それらを `launcher.config.json` に記憶し、CLI タスク (mint / finish / verify / screen / connect) をディスパッチします。

## ✅ 動作検証済み — すべてのキーがテストされています

キーは、実際の API がそれに応答した後にのみ `keys.txt` に書き込まれます:

| チェック | 呼び出し | 期待値 |
|---|---|---|
| 認証 + モデル一覧 | `GET https://api.upstage.ai/v1/models` | `200` + アカウントのモデル id |
| 実際の生成 | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + 空でない `choices[0].message.content` |
| 出荷されたバッチ | **各アカウントが独自のキーを発行し、すべてが検証済み** | `models` 200 + `solar-pro2` chat 200 |

検証ツールは **403/429/5xx/トランスポートエラーで出口をローテーション** し、`401` の場合にのみキーを失敗と判定します。したがって、1 つの出口が拒否されただけでキーが断罪されることはありません。`node src/cli.js verify --chat` は、あなた自身のファイルに対してまさにそのチェックを再現します。

> **品質ゲート。** ここにあるすべてのキーは、`keys.txt` に書き込まれる前に実際の `chat-200` を通過しています
> (死んだキーは決して出荷されません)。ルーターのコンボもモデルレベルで同じルールに従います: エントリは
> **モデルが `chat-200` を返し、ツールを呼び出せる場合にのみ** 追加されます — ツールサポートのないモデル、
> 死んだキー、死んだプロバイダは追加されずに除外されます。検証ステップはいつでも再実行できます。
> 失敗は報告され、決して隠されません。

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
2. `proxies.txt` からの新しい出口。その時点でコンソールページのチェックに応答した場合にのみ割り当てられます;
3. ホスト型サインアップ → メールコード → コンソール;
4. サインアップ同意 → `/api-keys` → **Create key**;
5. キーは create-key の **ワイヤレスポンス** から取得され、ライブで検証されます: `GET /v1/models` **および** 実際の `solar-pro2` 補完;
6. 状態はアカウントごとにチェックポイントされるため、死んだ出口はバッチ全体ではなく 1 回の試行のコストで済みます。

**Finish モード。** すでに存在するアカウントはメールなしで完了できます: `finish.js` は記録された認証情報で **サインイン** し、キーを発行します — すでに所有しているファイルを増やす最も安価な方法です。

## ⚙️ CLI オプション

| タスク | フラグ |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — プロバイダ API に到達する出口のみを保持します |
| `harvest` | 生のフィードリストをスクリーニングして使用可能なプールにします |

| 環境変数 | デフォルト | 意味 |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | プールファイル、1 行につき 1 プロキシ |

設定は `launcher.config.json` に永続化されます。キーは `keys.txt` に 1 行ずつ格納され、`%USERPROFILE%\upstage-keys.txt` にミラーがあります。`node src/cli.js help` が正式なリストです。

## 🛰️ プロキシの背後で

* `src/proxies.txt` — 1 行につき 1 出口 (ランチャーとすべてのタスクは `src/` から読み込みます); `scheme://user:pass@host:port`、`scheme://host:port`、またはベアの `host:port` (`http://` がデフォルト)。`#` 以降のコメントと空行は無視されます。
* すべての出口は、アカウントが時間を費やす前に **使用時点のプローブ** を受けます; 死んだ出口は除外され、プールは使用可能なセットが尽きたときにのみ再読み込みされます。
* あなた自身のインターフェースでは何もリッスンしません: フロー内のすべてのリクエストはプールを経由します。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `src/keys.txt` | 1 行につき 1 つの検証済みキー — git 無視、決してコミットされません |
| `src/accounts.json` | メール / パスワード / キー / アカウントごとの状態 |
| [`models.json`](src/models.json) | 実際の `GET /v1/models` 応答 — 16 個の id |
| `src/proxies.txt` | あなたの出口、1 行につき 1 つ — git 無視 |
| `src/outputs/`, `src/out/` | スクリーンショット、DOM ダンプ、実行状態 — git 無視 |

## 🔌 9Router に接続

[9Router](https://9router.com) はセルフホスト型の OpenAI 互換ルーターです。Upstage は OpenAI 互換なので、1 つの `openai-compatible` ノードがすべてのキーを運びます:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

デフォルト: base `http://localhost:20128`、password `123456`、node `Upstage`、prefix `upstage`、upstream `https://api.upstage.ai/v1`、default model `solar-mini4`。別の mint 済みキーを `--name "<label 2>"` で登録します — すべてのキーが、9Router がロードバランスできる別の接続になります。モデルは `upstage/<model id>` として提供されます。

## 🔌 OmniRoute に接続

[OmniRoute](https://omniroute.online) はセルフホスト型の OpenAI 互換ルーターです。Upstage は OpenAI 互換なので、1 つの `openai-compatible` ノードがすべてのキーを運びます:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

デフォルト: base `http://localhost:20128`、password `123456`、node `Upstage`、prefix `upstage`、upstream `https://api.upstage.ai/v1`、default model `solar-mini4`。別の mint 済みキーを `--name "<label 2>"` で登録します — すべてのキーが、OmniRoute がロードバランスできる別の接続になります。モデルは `upstage/<model id>` として提供されます。

## 🔑 1 つのキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダ | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 プロバイダが提供するもの | アカウントごとに $10 の無料クレジット — 16 の Solar モデル、すべてのキーが chat 検証済み |
| 🔑 1 つのキーで得られるもの | 独自のアカウントにスコープされた 1 つの API キー: 下記エンドポイントの 16 個のモデル id を、あなたのプランの制限で利用できます。クォータは **アカウント** に紐づきます。だからこそこのツールは 1 キーにつき 1 アカウントを作成します |
| 🌐 API 形式 | OpenAI 互換: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 あなたのデータ | 接触するのは upstage.ai とあなたが設定した受信箱バックエンドのみです; キーはあなたのマシンに留まります |

## 🐞 問題報告

失敗したステップ、使用した出口、ツールの stdout を添えて issue を開いてください — `outputs/` 内のダンプ (各ステップのスクリーンショット + DOM) により、キーを漏らすことなく失敗を再現できます。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE) を参照してください。

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>