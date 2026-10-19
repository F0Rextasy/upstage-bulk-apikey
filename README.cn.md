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

**批量创建 Upstage（upstage.ai）账户，并自动生成 API key——兼容 OpenAI 的推理 + 9Router 连接器。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Quick start](#-quick-start) · [🎁 Free tier](#-free-tier--how-much-you-get) · [🤖 Models](#-models--all-16-of-them) · [🧪 Use the API](#-how-to-use-the-api) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 为什么会有这个项目

Upstage 为每个账户提供 **$10 免费额度** 和该账户自己的 API key，二者都存在于**账户**上——所以有用的单位是*每个 key 对应一个账户*，绝不是一个账户生成许多 key。注册是在真实浏览器中打开的托管页面；此工具会通过你的代理列表无人值守地走完整个流程，并且只有在真实完成一次补全后才会记录 key。

## 🎁 免费层级——你能获得多少

**每个新的 Upstage 账户都会获得 $10 免费额度——无需银行卡——而且额度存在于账户上，而不是 key 上。**

| 项目 | 值 |
| --- | --- |
| 欢迎额度 | 每个账户 **$10.00**——控制台的入门页面写着 *“注册即可获得 $10 免费额度”* |
| 需要银行卡 | **否** |
| 速率限制 | 取决于账户的套餐/控制台；验证器在 `403`/`429`/`5xx` 时会轮换出口，而不是归咎于 key |
| 注册 | 真实浏览器中的托管页面：每个账户从全新收件箱读取电子邮件验证码 |
| 可扩展的单位 | **一个账户 = 一个 key** → `--count N` 实际上就是“N × $10” |

生成的 key 在 `GET /v1/models` 和一次真实的 `solar-pro2` 补全上都会返回 **200**，因此无需银行卡即可使用额度。**如何获得更多：** 额度存在于账户上——`--count N` 会生成 N 个账户，每个账户都有自己的 key 和 $10。

> 💡 免费层级由 Upstage 设定，并且可能变化。在 [upstage.ai](https://upstage.ai) 查看实时数字——并让工具自己的门禁来决定：

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 模型——全部 16 个

`models.json` 是已生成 key 的实时 `GET /v1/models` 响应——**16 个 id**，包括：

|模型|✓|
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

2026-10-19 实时复查：16 个目录 id 中有 12 个在聊天请求中返回 `200`（其他测试过的 id——`solar-decide`、`solar-decide-flash`、`solar-jev`——则没有）。

对一个 key 的实时探测：

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 如何使用 API

基础 URL 是 **`https://api.upstage.ai/v1`**——兼容 OpenAI，因此任何兼容 OpenAI 的工具都能使用。

**任意 SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**任何支持自定义基础 URL 的 agent / 工具**（Cursor、OpenCode、Kilo Code 等）：基础 URL `https://api.upstage.ai/v1`，粘贴 key，从 `models.json` 中选择任意模型 id。

## 🛠 快速开始

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

这些工具写入的所有内容都会落在**代码旁边**的 `src/` 中：`src/keys.txt`、`src/accounts.json`、`src/outputs/` 和 `src/out/`；代理池从 `src/proxies.txt` 读取。`node src/cli.js help` 会列出所有任务和参数。

### 🖱️ 启动器

启动器会询问数量、并发数和邮箱/代理设置，将它们记住在 `launcher.config.json` 中，并分派 CLI 任务（mint / finish / verify / screen / connect）。

## ✅ 已验证可用——每个 key 都经过测试

只有在实时 API 使用某个 key 成功响应后，该 key 才会被写入 `keys.txt`：

| 检查 | 调用 | 预期 |
|---|---|---|
| 认证 + 模型列表 | `GET https://api.upstage.ai/v1/models` | `200` + 该账户的模型 id |
| 真实生成 | `POST https://api.upstage.ai/v1/chat/completions`（`solar-pro2`） | `200` + 非空的 `choices[0].message.content` |
| 已交付批次 | **31 个不同账户 → 31 个 key，每一个都经过验证** | `models` 200 + `solar-pro2` 聊天 200 |

验证器会在 403/429/5xx/传输错误时**轮换出口**，并且只在 `401` 时判定 key 失败，因此绝不会因为某个出口被拒绝就宣告 key 不可用。`node src/cli.js verify --chat` 会对你自己的文件复现完全相同的检查。

## 🧭 工作原理

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

每个账户使用一个隔离的 Chrome 上下文（自己的代理 + 存储）：

1. 一个全新邮箱——验证码通常几秒内到达；
2. 从 `proxies.txt` 中获取一个全新出口，只有当它**当时**能通过控制台页面检查时才会被分配；
3. 托管注册 → 电子邮件验证码 → 控制台；
4. 注册协议 → `/api-keys` → **Create key**；
5. key 从创建 key 的**网络响应**中捕获，并进行实时验证：`GET /v1/models` **以及**一次真实的 `solar-pro2` 补全；
6. 状态会按账户进行检查点保存，因此一个失效出口只会浪费一次尝试，而不会影响整批。

**完成模式。** 已经存在的账户可以在无需任何邮件的情况下完成：`finish.js` 使用记录的凭据**登录**并生成 key——这是扩充你已有文件的最便宜方式。

## ⚙️ CLI 选项

| 任务 | 参数 |
|---|---|
| `mint` | `--count N`（30） · `--conc N`（3） · `--preset turbo\|balanced\|safe`（并发 + 节奏间隔） · `--gap S` · `--idbase N`（0） · `--attempts N`（4） · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N`——仅保留能访问提供商 API 的出口 |
| `harvest` | 将原始 feed 列表筛选为可用代理池 |

推荐 Turbo（5）；更高值会在性能较弱的电脑上带来负载/封禁风险。

| 环境变量 | 默认值 | 含义 |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | 代理池文件，每行一个代理 |

设置会持久保存在 `launcher.config.json` 中；key 会写入 `keys.txt`，每行一个，并在 `%USERPROFILE%\upstage-keys.txt` 保留一份镜像。`node src/cli.js help` 是权威列表。

## 🛰️ 在代理环境下

* `src/proxies.txt`——每行一个出口（启动器和每个任务都会从 `src/` 读取它）；`scheme://user:pass@host:port`、`scheme://host:port` 或裸 `host:port`（默认使用 `http://`）。`#` 之后的注释和空行会被忽略。
* 每个出口在账户使用它之前都会进行一次**使用点探测**；失效出口会被丢弃，只有当可用集合耗尽时才会重新读取代理池。
* 不会在你自己的网络接口上监听任何内容：流程中的每个请求都会经过代理池。

## 📄 文件

| 路径 | 内容 |
| --- | --- |
| `src/keys.txt` | 每行一个已验证的 key——被 git 忽略，绝不提交 |
| `src/accounts.json` | 电子邮件 / 密码 / key / 每个账户的状态 |
| [`models.json`](src/models.json) | 实时 `GET /v1/models` 响应——16 个 id |
| `src/proxies.txt` | 你的出口，每行一个——被 git 忽略 |
| `src/outputs/`, `src/out/` | 截图、DOM 转储和运行状态——被 git 忽略 |

## 🔌 连接到 9Router

[9Router](https://9router.com) 是一个自托管、兼容 OpenAI 的路由器。Upstage 兼容 OpenAI，因此一个 `openai-compatible` 节点即可承载所有 key：

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

默认值：base 为 `http://localhost:20128`，密码为 `123456`，节点为 `Upstage`，前缀为 `upstage`，上游为 `https://api.upstage.ai/v1`，默认模型为 `solar-mini4`。使用 `--name "<label 2>"` 注册另一个已生成的 key——每个 key 都会成为 9Router 可以负载均衡的另一个连接。随后模型会以 `upstage/<model id>` 的形式提供。

## 🔑 一个 key 能带来什么

| | |
| --- | --- |
| 🏢 提供商 | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 提供商提供什么 | 每个账户 $10 免费额度——16 个 Solar 模型，每个 key 都经过聊天验证 |
| 🔑 一个 key 能带来什么 | 一个 API key，作用域为其自己的账户：下方端点上的 16 个模型 id，受你的套餐限制。配额存在于**账户**上，这正是此工具为每个 key 创建一个账户的原因 |
| 🌐 API 形态 | 兼容 OpenAI：`POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 你的数据 | 只会联系 upstage.ai 和你配置的收件箱后端；key 保留在你的机器上 |

## 🐞 问题

提交 issue 时请附上失败步骤、使用的出口以及工具的标准输出——`outputs/` 中的转储（每个步骤的截图 + DOM）可以让失败可复现，同时不会泄露 key。

## 📄 许可证

MIT © 2026——见 [LICENSE](LICENSE)。

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey 贡献者

</div>