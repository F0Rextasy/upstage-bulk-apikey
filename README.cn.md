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

**批量创建 Upstage (upstage.ai) 账户并自动生成 API 密钥 — 兼容 OpenAI 的推理 + 9Router 连接器。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 快速开始](#-quick-start) · [🎁 免费额度](#-free-tier--how-much-you-get) · [🤖 模型](#-models--all-16-of-them) · [🧪 使用 API](#-how-to-use-the-api) · [✅ 已验证](#-verified-working--every-key-is-tested) · [🧭 工作原理](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 选项](#️-cli-options) · [🛰️ 代理](#️-behind-a-proxy) · [🐞 问题反馈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ 为什么需要这个工具

Upstage 为每个账户提供 **$10 免费额度**和独立的 API 密钥，两者都绑定在**账户**上——因此有用的单位是*一个账户对应一个密钥*，而不是从一个账户获取多个密钥。注册是一个在真实浏览器中打开的托管页面；本工具通过你的代理列表全程无人值守地走完整个流程，并且只有在真实完成一次调用后才记录密钥。

## 🎁 免费额度 — 你能获得多少

**每个新的 Upstage 账户都会获得 $10 免费额度——无需信用卡——额度绑定在账户上，而不是密钥上。**

| 项目 | 值 |
| --- | --- |
| 欢迎额度 | 每账户 **$10.00** — 控制台的入门页面写着*“注册即可获得 $10 免费额度”* |
| 需要信用卡 | **否** |
| 速率限制 | 取决于账户的套餐/控制台；验证器在遇到 `403`/`429`/`5xx` 时会轮换出口，而不是归咎于密钥 |
| 注册 | 在真实浏览器中打开的托管页面：每个账户从全新收件箱读取邮件验证码 |
| 可扩展的单位 | **一个账户 = 一个密钥** → `--count N` 实际上就是“N × $10” |

生成的密钥在 `GET /v1/models` 和真实的 `solar-pro2` 补全请求上都能返回 **200**，因此无需信用卡即可使用额度。**如何获得更多：** 额度绑定在账户上——`--count N` 会创建 N 个账户，每个账户都有自己的密钥和 $10。

> 💡 免费额度由 Upstage 设定，可能会变化。请到 [upstage.ai](https://upstage.ai) 查看实时数据——并让工具自身的关卡来判定：

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 模型 — 全部 16 个

`models.json` 是已生成密钥的实时 `GET /v1/models` 响应——**16 个 id**，包括：

|模型|✓|
|---|---|
|`solar-pro2`|✓|

对一个密钥的实时探测：

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 如何使用 API

基础 URL 是 **`https://api.upstage.ai/v1`**——兼容 OpenAI，因此任何支持 OpenAI 的工具都能使用。

**任意 SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**任何支持自定义基础 URL 的智能体/工具**（Cursor、OpenCode、Kilo Code 等）：基础 URL 填 `https://api.upstage.ai/v1`，粘贴密钥，从 `models.json` 中选择任意模型 id。

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

工具写入的所有内容都落在**代码旁边**的 `src/` 目录中：`src/keys.txt`、`src/accounts.json`、`src/outputs/` 和 `src/out/`；代理池从 `src/proxies.txt` 读取。`node src/cli.js help` 会列出所有任务和参数。

### 🖱️ 启动器

启动器会询问数量、并发数和邮箱/代理设置，将它们记住在 `launcher.config.json` 中，并分发 CLI 任务（mint / finish / verify / screen / connect）。

## ✅ 已验证可用 — 每个密钥都经过测试

只有当实时 API 用该密钥成功响应后，密钥才会被写入 `keys.txt`：

| 检查项 | 调用 | 预期 |
|---|---|---|
| 认证 + 模型列表 | `GET https://api.upstage.ai/v1/models` | `200` + 该账户的模型 id |
| 真实生成 | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + 非空的 `choices[0].message.content` |
| 随附批次 | **31 个不同账户 → 31 个密钥，全部验证通过** | `models` 200 + `solar-pro2` 聊天 200 |

验证器**在 403/429/5xx/传输错误时轮换出口**，只有在 `401` 时才判定密钥失败，因此密钥绝不会因为某个出口被拒绝而被判死刑。`node src/cli.js verify --chat` 会对你的文件精确复现这一检查。

## 🧭 工作原理

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

每个账户使用一个隔离的 Chrome 上下文（独立的代理 + 存储）：

1. 一个全新的邮箱——验证码通常几秒内到达；
2. 从 `proxies.txt` 中获取一个全新出口，只有在**当时**能通过控制台页面检查时才会被分配；
3. 托管注册 → 邮件验证码 → 控制台；
4. 注册协议 → `/api-keys` → **Create key**；
5. 从创建密钥的**网络响应**中捕获密钥，并进行实时验证：`GET /v1/models` **以及**一次真实的 `solar-pro2` 补全；
6. 每个账户的状态都会被检查点保存，因此一个失效出口只损失一次尝试，而不是整个批次。

**Finish 模式。** 已存在的账户无需任何邮件即可完成：`finish.js` 使用记录的凭据**登录**并生成密钥——这是扩充已有文件最经济的方式。

## ⚙️ CLI 选项

| 任务 | 参数 |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (并发 + 节奏间隔) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — 只保留能到达提供商 API 的出口 |
| `harvest` | 将原始 feed 列表筛选为可用的代理池 |

推荐使用 Turbo (5)；更高数值在性能较弱的机器上有负载/封禁风险。

| 环境变量 | 默认值 | 含义 |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | 代理池文件，每行一个代理 |

设置会持久化在 `launcher.config.json` 中；密钥写入 `keys.txt`，每行一个，并在 `%USERPROFILE%\upstage-keys.txt` 保留一份镜像。`node src/cli.js help` 是权威列表。

## 🛰️ 在代理后面

* `src/proxies.txt` — 每行一个出口（启动器和每个任务都从 `src/` 读取）；格式为 `scheme://user:pass@host:port`、`scheme://host:port` 或裸 `host:port`（默认 `http://`）。`#` 后的注释和空行会被忽略。
* 每个出口在账户花费时间之前都会经过**使用点探测**；失效出口会被丢弃，只有当可用集合耗尽时才会重新读取代理池。
* 你自己的网络接口上不会监听任何东西：流程中的每个请求都经过代理池。

## 📄 文件

| 路径 | 内容 |
| --- | --- |
| `src/keys.txt` | 每行一个已验证的密钥 — 已被 git 忽略，绝不提交 |
| `src/accounts.json` | 邮箱 / 密码 / 密钥 / 每账户状态 |
| [`models.json`](src/models.json) | 实时的 `GET /v1/models` 响应 — 16 个 id |
| `src/proxies.txt` | 你的出口，每行一个 — 已被 git 忽略 |
| `src/outputs/`、`src/out/` | 截图、DOM 转储和运行状态 — 已被 git 忽略 |

## 🔌 连接到 9Router

[9Router](https://9router.com) 是一个自托管、兼容 OpenAI 的路由器。Upstage 兼容 OpenAI，因此一个 `openai-compatible` 节点就能承载所有密钥：

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

默认值：base `http://localhost:20128`，password `123456`，node `Upstage`，prefix `upstage`，upstream `https://api.upstage.ai/v1`，默认模型 `solar-mini4`。使用 `--name "<label 2>"` 注册另一个已生成的密钥——每个密钥都会成为 9Router 可以负载均衡的另一个连接。模型随后以 `upstage/<model id>` 的形式提供。

## 🔑 一个密钥能给你什么

| | |
| --- | --- |
| 🏢 提供商 | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 提供商提供什么 | 每账户 $10 免费额度 — 16 个 Solar 模型，每个密钥都经过聊天验证 |
| 🔑 一个密钥能给你什么 | 一个作用域为其自身账户的 API 密钥：下方端点上的 16 个模型 id，受你的套餐限制。配额绑定在**账户**上，这正是本工具为每个密钥创建一个账户的原因 |
| 🌐 API 形态 | 兼容 OpenAI：`POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 你的数据 | 只会联系 upstage.ai 和你配置的收件箱后端；密钥保留在你的机器上 |

## 🐞 问题反馈

提交 issue 时请附上失败的步骤、使用的出口和工具的标准输出——`outputs/` 中的转储（每一步的截图 + DOM）能让失败可复现，而不会泄露密钥。

## 📄 许可证

MIT © 2026 — 见 [LICENSE](LICENSE)。

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>