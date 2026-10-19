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

**자동 생성된 API 키로 Upstage (upstage.ai) 계정을 대량 생성 — OpenAI 호환 추론 + 9Router 커넥터.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 빠른 시작](#-quick-start) · [🎁 무료 티어](#-free-tier--how-much-you-get) · [🤖 모델](#-models--all-16-of-them) · [🧪 API 사용법](#-how-to-use-the-api) · [✅ 검증됨](#-verified-working--every-key-is-tested) · [🧭 작동 방식](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 옵션](#️-cli-options) · [🛰️ 프록시](#️-behind-a-proxy) · [🐞 이슈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ 왜 만들었나

Upstage는 모든 계정에 **$10 무료 크레딧**과 자체 API 키를 제공하며, 둘 다 **계정**에 있습니다 — 따라서 유용한 단위는 *키당 하나의 계정*이며, 하나의 계정에서 여러 키를 만드는 것이 결코 아닙니다. 가입은 실제 브라우저의 호스팅 페이지에서 이루어집니다; 이 도구는 프록시 목록을 통해 전체 경로를 무인으로 진행하고, 실제 완료 응답 이후에만 키를 기록합니다.

## 🎁 무료 티어 — 얼마나 받나

**모든 신규 Upstage 계정은 카드 없이 $10 무료 크레딧을 받으며, 크레딧은 키가 아니라 계정에 있습니다.**

| 항목 | 값 |
| --- | --- |
| 웰컴 크레딧 | 계정당 **$10.00** — 콘솔의 시작 페이지에는 *“가입하고 $10 무료 크레딧을 받으세요”* 라고 표시됩니다 |
| 카드 필요 | **아니요** |
| 속도 제한 | 계정의 플랜/콘솔에 따름; 검증기는 키를 탓하는 대신 `403`/`429`/`5xx`에서 출구를 순환합니다 |
| 가입 | 실제 브라우저의 호스팅 페이지: 계정마다 새 받은편지함에서 이메일 코드를 읽음 |
| 확장 단위 | **계정 하나 = 키 하나** → `--count N`은 사실상 "N × $10" |

발급된 키는 `GET /v1/models`와 실제 `solar-pro2` 완료 호출 모두에서 **200**을 응답하므로, 카드 없이 크레딧을 사용할 수 있습니다. **더 얻는 방법:** 크레딧은 계정에 있습니다 — `--count N`은 각각 자체 키와 $10을 가진 N개의 계정을 발급합니다.

> 💡 무료 티어는 Upstage가 정하며 변경될 수 있습니다. 실시간 수치는 [upstage.ai](https://upstage.ai)에서 확인하세요 — 그리고 도구 자체의 게이트가 결정하게 하세요:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 모델 — 전체 16개

`models.json`은 발급된 키의 실시간 `GET /v1/models` 응답입니다 — **16개 ID** 포함:

|모델|✓|
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

2026-10-19 실시간 재확인: 16개 카탈로그 ID 중 12개가 채팅 `200`을 응답했습니다 (테스트한 다른 ID — `solar-decide`, `solar-decide-flash`, `solar-jev` — 는 응답하지 않았습니다).

키 하나의 실시간 프로브:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 API 사용법

기본 URL은 **`https://api.upstage.ai/v1`**입니다 — OpenAI 호환되므로 OpenAI를 사용하는 모든 것이 작동합니다.

**모든 SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**사용자 지정 기본 URL이 있는 모든 에이전트/도구** (Cursor, OpenCode, Kilo Code, …): 기본 URL `https://api.upstage.ai/v1`, 키를 붙여넣고 `models.json`에서 모델 ID를 선택하세요.

## 🛠 빠른 시작

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

도구가 쓰는 모든 것은 **코드 옆**, `src/`에 저장됩니다: `src/keys.txt`, `src/accounts.json`, `src/outputs/` 및 `src/out/`; 풀은 `src/proxies.txt`에서 읽습니다. `node src/cli.js help`는 모든 작업과 플래그를 나열합니다.

### 🖱️ 런처

런처는 개수, 동시성 및 사서함/프록시 설정을 묻고, 이를 `launcher.config.json`에 기억하며, CLI 작업(mint / finish / verify / screen / connect)을 디스패치합니다.

## ✅ 검증된 작동 — 모든 키가 테스트됨

키는 실제 API가 해당 키로 응답한 후에만 `keys.txt`에 기록됩니다:

| 검사 | 호출 | 예상 |
|---|---|---|
| 인증 + 모델 목록 | `GET https://api.upstage.ai/v1/models` | `200` + 계정의 모델 ID |
| 실제 생성 | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + 비어 있지 않은 `choices[0].message.content` |
| 배포된 배치 | **31개의 서로 다른 계정 → 31개의 키, 모두 검증됨** | `models` 200 + `solar-pro2` 채팅 200 |

검증기는 **403/429/5xx/전송 오류에서 출구를 순환**하며 `401`에서만 키를 실패 처리하므로, 하나의 출구가 거부되었다고 해서 키가 실패로 단정되는 일은 없습니다. `node src/cli.js verify --chat`는 자신의 파일에 대해 바로 그 검사를 재현합니다.

## 🧭 작동 방식

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

계정마다 격리된 Chrome 컨텍스트 하나 (자체 프록시 + 스토리지):

1. 새 사서함 — 코드는 보통 몇 초 안에 도착합니다;
2. `proxies.txt`에서 새 출구를 선택하며, **바로 그때** 콘솔 페이지 검사에 응답하는 경우에만 제공됩니다;
3. 호스팅 가입 → 이메일 코드 → 콘솔;
4. 가입 동의 → `/api-keys` → **키 생성**;
5. 키는 키 생성 **와이어 응답**에서 캡처되고 실시간 검증됩니다: `GET /v1/models` **그리고** 실제 `solar-pro2` 완료 호출;
6. 상태는 계정별로 체크포인트되므로, 죽은 출구는 배치가 아니라 시도 하나만 소모합니다.

**마무리 모드.** 이미 존재하는 계정은 메일 없이 마무리할 수 있습니다: `finish.js`는 기록된 자격 증명으로 **로그인**하고 키를 발급합니다 — 이미 보유한 파일을 늘리는 가장 저렴한 방법입니다.

## ⚙️ CLI 옵션

| 작업 | 플래그 |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (동시성 + 페이싱 간격) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — 공급자 API에 도달하는 출구만 유지 |
| `harvest` | 원시 피드 목록을 사용 가능한 풀로 스크리닝 |

터보를 권장합니다(5); 더 많은 수는 성능이 약한 컴퓨터에서 부하/차단 위험이 있습니다.

| 환경 변수 | 기본값 | 의미 |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | 풀 파일, 한 줄에 프록시 하나 |

설정은 `launcher.config.json`에 유지됩니다; 키는 `keys.txt`에 한 줄에 하나씩 저장되며, `%USERPROFILE%\upstage-keys.txt`에 미러가 있습니다. `node src/cli.js help`가 권위 있는 목록입니다.

## 🛰️ 프록시 뒤에서

* `src/proxies.txt` — 한 줄에 출구 하나 (런처와 모든 작업이 `src/`에서 읽음); `scheme://user:pass@host:port`, `scheme://host:port` 또는 맨 `host:port` (`http://` 기본값). `#` 뒤의 주석과 빈 줄은 무시됩니다.
* 모든 출구는 계정이 시간을 쓰기 전에 **사용 시점 프로브**를 받습니다; 죽은 출구는 제거되고, 풀은 사용 가능한 집합이 고갈될 때만 다시 읽습니다.
* 자신의 인터페이스에서는 아무것도 수신하지 않습니다: 흐름의 모든 요청은 풀을 통해 갑니다.

## 📄 파일

| 경로 | 내용 |
| --- | --- |
| `src/keys.txt` | 한 줄에 검증된 키 하나 — git에서 무시됨, 절대 커밋되지 않음 |
| `src/accounts.json` | 이메일 / 비밀번호 / 키 / 계정별 상태 |
| [`models.json`](src/models.json) | 실시간 `GET /v1/models` 응답 — 16개 ID |
| `src/proxies.txt` | 사용자의 출구, 한 줄에 하나 — git에서 무시됨 |
| `src/outputs/`, `src/out/` | 스크린샷, DOM 덤프 및 실행 상태 — git에서 무시됨 |

## 🔌 9Router에 연결

[9Router](https://9router.com)는 자체 호스팅되는 OpenAI 호환 라우터입니다. Upstage는 OpenAI 호환이므로 하나의 `openai-compatible` 노드가 모든 키를 담습니다:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

기본값: base `http://localhost:20128`, password `123456`, node `Upstage`, prefix `upstage`, upstream `https://api.upstage.ai/v1`, 기본 모델 `solar-mini4`. `--name "<label 2>"`로 다른 발급 키를 등록하세요 — 모든 키는 9Router가 부하 분산할 수 있는 또 다른 연결이 됩니다. 그런 다음 모델은 `upstage/<model id>`로 제공됩니다.

## 🔑 키 하나로 얻는 것

| | |
| --- | --- |
| 🏢 공급자 | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 공급자가 주는 것 | 계정당 $10 무료 크레딧 — 16개 Solar 모델, 모든 키 채팅 검증됨 |
| 🔑 키 하나로 얻는 것 | 자체 계정에 범위가 지정된 API 키 하나: 아래 엔드포인트의 16개 모델 ID, 플랜 한도 내. 할당량은 **계정**에 있으므로, 이 도구가 키당 하나의 계정을 만드는 것입니다 |
| 🌐 API 형태 | OpenAI 호환: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 사용자 데이터 | 구성한 upstage.ai와 받은편지함 백엔드에만 접속합니다; 키는 사용자 컴퓨터에 남습니다 |

## 🐞 이슈

실패한 단계, 사용한 출구, 도구의 stdout을 포함해 이슈를 열어 주세요 — `outputs/`의 덤프(각 단계의 스크린샷 + DOM)는 키를 유출하지 않고 실패를 재현 가능하게 합니다.

## 📄 라이선스

MIT © 2026 — [LICENSE](LICENSE)를 참조하세요.

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey 기여자

</div>