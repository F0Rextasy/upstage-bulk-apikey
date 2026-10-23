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

**자동 생성된 API 키로 Upstage(upstage.ai) 계정을 대량 생성 — OpenAI 호환 추론 + 9Router 커넥터.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 빠른 시작](#-quick-start) · [🎁 무료 티어](#-free-tier--how-much-you-get) · [🤖 모델](#-models--all-16-of-them) · [🧪 API 사용하기](#-how-to-use-the-api) · [✅ 검증됨](#-verified-working--every-key-is-tested) · [🧭 작동 방식](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ 옵션](#️-cli-options) · [🛰️ 프록시](#️-behind-a-proxy) · [🐞 이슈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 왜 필요한가

Upstage는 모든 계정에 **$10 무료 크레딧**과 자체 API 키를 제공하며, 둘 다 **계정**에 귀속됩니다 — 따라서 유용한 단위는 *키당 하나의 계정*이며, 하나의 계정에서 여러 키를 뽑는 것이 결코 아닙니다. 가입은 실제 브라우저에서 열리는 호스팅 페이지입니다. 이 도구는 프록시 목록을 통해 전체 과정을 무인으로 진행하며, 실제 완료 응답을 받은 후에만 키를 기록합니다.

## 🎁 무료 티어 — 얼마나 받을 수 있나

**모든 신규 Upstage 계정은 카드 없이 $10 무료 크레딧을 받으며, 크레딧은 키가 아니라 계정에 귀속됩니다.**

| 항목 | 값 |
| --- | --- |
| 웰컴 크레딧 | 계정당 **$10.00** — 콘솔의 시작하기 페이지에 *“Sign up to receive $10 in free credit”* 라고 표시됨 |
| 카드 필요 여부 | **아니오** |
| 속도 제한 | 계정의 플랜/콘솔에 따름; 검증기는 키를 탓하는 대신 `403`/`429`/`5xx`에서 출구를 교체함 |
| 가입 | 실제 브라우저의 호스팅 페이지: 계정마다 새 받은편지함에서 이메일 코드를 읽음 |
| 확장되는 단위 | **하나의 계정 = 하나의 키** → `--count N`은 사실상 "N × $10" |

발급된 키는 `GET /v1/models`와 실제 `solar-pro2` 완료 요청 모두에서 **200**을 반환하므로, 카드 없이도 크레딧을 사용할 수 있습니다. **더 얻는 방법:** 크레딧은 계정에 귀속됩니다 — `--count N`은 각자 자체 키와 $10을 가진 N개의 계정을 발급합니다.

> 💡 무료 티어는 Upstage가 정하며 변경될 수 있습니다. 실시간 수치는 [upstage.ai](https://upstage.ai)에서 확인하세요 — 그리고 도구 자체의 게이트가 판단하게 하세요:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 모델 — 16개 전부

`models.json`은 발급된 키의 실시간 `GET /v1/models` 응답입니다 — 다음을 포함한 **16개 id**:

| 모델 ID | 비고 |
| --- | --- |
| `solar-pro4`, `solar-pro3`, `solar-pro2` | pro 라인 (최신순) |
| `solar-mini4`, `solar-mini` | 소형 / 고속 |
| `solar-decide`, `solar-decide-flash` | 작업 특화 엔드포인트 |
| `solar-jev`, `syn-pro` | 특수 / 동기 엔드포인트 |
| `solar-pro4-260806`, `solar-pro3-260323`, `solar-pro2-251215`, `solar-mini4-260922`, `solar-mini-250422`, `syn-pro-251021`, `solar-pro4-solar-pro2-…` | 위 모델들의 날짜별 스냅샷 |

하나의 키에 대한 실시간 프로브:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 API 사용하기

베이스 URL은 **`https://api.upstage.ai/v1`** 입니다 — OpenAI 호환이므로 OpenAI를 지원하는 모든 것이 작동합니다.

**모든 SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**커스텀 베이스 URL을 지원하는 모든 에이전트 / 도구** (Cursor, OpenCode, Kilo Code, …): 베이스 URL `https://api.upstage.ai/v1`, 키를 붙여넣고, `models.json`에서 아무 모델 id나 선택하세요.

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

도구가 기록하는 모든 것은 **코드 옆**인 `src/`에 저장됩니다: `src/keys.txt`, `src/accounts.json`, `src/outputs/`, `src/out/`; 풀은 `src/proxies.txt`에서 읽습니다. `node src/cli.js help`는 모든 작업과 플래그를 나열합니다.

### 🖱️ 런처

런처는 개수, 동시성, 사서함/프록시 설정을 묻고, 이를 `launcher.config.json`에 기억하며, CLI 작업(mint / finish / verify / screen / connect)을 디스패치합니다.

## ✅ 검증됨 — 모든 키가 테스트됨

키는 실제 API가 응답한 후에만 `keys.txt`에 기록됩니다:

| 검사 | 호출 | 기대 |
|---|---|---|
| 인증 + 모델 목록 | `GET https://api.upstage.ai/v1/models` | `200` + 계정의 모델 id |
| 실제 생성 | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + 비어 있지 않은 `choices[0].message.content` |
| 배포된 배치 | **각 계정이 자체 키를 발급했고, 전부 검증됨** | `models` 200 + `solar-pro2` chat 200 |

검증기는 **403/429/5xx/전송 오류에서 출구를 교체**하고 `401`에서만 키를 실패 처리하므로, 하나의 출구가 거부되었다고 해서 키가 결코 무효 판정되지 않습니다. `node src/cli.js verify --chat`은 여러분의 파일에 대해 정확히 그 검사를 재현합니다.

> **품질 게이트.** 여기의 모든 키는 `keys.txt`에 기록되기 전에 실제 `chat-200`을 통과했습니다
> (죽은 키는 결코 배포되지 않습니다). 라우터 조합도 모델 수준에서 같은 규칙을 따릅니다: 항목은
> **모델이 `chat-200`을 응답하고 도구를 호출할 수 있을 때만** 추가됩니다 — 도구 지원이 없는 모델,
> 죽은 키 또는 죽은 제공자는 추가되지 않고 제거됩니다. 언제든지 검증 단계를 다시 실행하세요;
> 실패는 보고되며, 결코 숨겨지지 않습니다.

## 🧭 작동 방식

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

계정마다 하나의 격리된 Chrome 컨텍스트(자체 프록시 + 스토리지):

1. 새 사서함 — 코드는 보통 몇 초 안에 도착합니다;
2. `proxies.txt`에서 가져온 새 출구 — **바로 그 시점에** 콘솔 페이지 검사에 응답할 때만 할당됩니다;
3. 호스팅 가입 → 이메일 코드 → 콘솔;
4. 가입 동의 → `/api-keys` → **Create key**;
5. 키는 create-key **와이어 응답**에서 캡처되어 실시간으로 검증됩니다: `GET /v1/models` **그리고** 실제 `solar-pro2` 완료;
6. 상태는 계정별로 체크포인트되므로, 죽은 출구는 배치가 아니라 한 번의 시도만 소모합니다.

**Finish 모드.** 이미 존재하는 계정은 메일 없이 완료할 수 있습니다: `finish.js`는 기록된 자격 증명으로 **로그인**하여 키를 발급합니다 — 이미 보유한 파일을 늘리는 가장 저렴한 방법입니다.

## ⚙️ CLI 옵션

| 작업 | 플래그 |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — 제공자 API에 도달하는 출구만 유지 |
| `harvest` | 원시 피드 목록을 사용 가능한 풀로 선별 |

| 환경 변수 | 기본값 | 의미 |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | 풀 파일, 한 줄에 프록시 하나 |

설정은 `launcher.config.json`에 유지됩니다; 키는 `keys.txt`에 한 줄에 하나씩 저장되며, `%USERPROFILE%\upstage-keys.txt`에 미러가 있습니다. `node src/cli.js help`가 권위 있는 목록입니다.

## 🛰️ 프록시 뒤에서

* `src/proxies.txt` — 한 줄에 출구 하나 (런처와 모든 작업이 `src/`에서 읽음); `scheme://user:pass@host:port`, `scheme://host:port` 또는 맨 `host:port` (`http://`가 기본). `#` 뒤의 주석과 빈 줄은 무시됩니다.
* 모든 출구는 계정이 시간을 소비하기 전에 **사용 시점 프로브**를 거칩니다; 죽은 출구는 제거되고, 풀은 사용 가능한 집합이 고갈될 때만 다시 읽습니다.
* 여러분의 인터페이스에는 아무것도 수신 대기하지 않습니다: 흐름의 모든 요청은 풀을 통해 나갑니다.

## 📄 파일

| 경로 | 내용 |
| --- | --- |
| `src/keys.txt` | 한 줄에 검증된 키 하나 — git-ignored, 결코 커밋되지 않음 |
| `src/accounts.json` | 이메일 / 비밀번호 / 키 / 계정별 상태 |
| [`models.json`](src/models.json) | 실시간 `GET /v1/models` 응답 — 16개 id |
| `src/proxies.txt` | 여러분의 출구, 한 줄에 하나 — git-ignored |
| `src/outputs/`, `src/out/` | 스크린샷, DOM 덤프 및 실행 상태 — git-ignored |

## 🔌 9Router에 연결

[9Router](https://9router.com)는 자체 호스팅, OpenAI 호환 라우터입니다. Upstage는 OpenAI 호환이므로 하나의 `openai-compatible` 노드가 모든 키를 담당합니다:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

기본값: base `http://localhost:20128`, password `123456`, node `Upstage`, prefix `upstage`, upstream `https://api.upstage.ai/v1`, default model `solar-mini4`. `--name "<label 2>"`로 또 다른 발급 키를 등록하세요 — 모든 키가 9Router가 로드 밸런싱할 수 있는 또 하나의 연결이 됩니다. 모델은 이후 `upstage/<model id>`로 제공됩니다.

## 🔌 OmniRoute에 연결

[OmniRoute](https://omniroute.online)는 자체 호스팅, OpenAI 호환 라우터입니다. Upstage는 OpenAI 호환이므로 하나의 `openai-compatible` 노드가 모든 키를 담당합니다:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

기본값: base `http://localhost:20128`, password `123456`, node `Upstage`, prefix `upstage`, upstream `https://api.upstage.ai/v1`, default model `solar-mini4`. `--name "<label 2>"`로 또 다른 발급 키를 등록하세요 — 모든 키가 OmniRoute가 로드 밸런싱할 수 있는 또 하나의 연결이 됩니다. 모델은 이후 `upstage/<model id>`로 제공됩니다.

## 🔑 하나의 키로 얻는 것

| | |
| --- | --- |
| 🏢 제공자 | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 제공자가 주는 것 | 계정당 $10 무료 크레딧 — 16개 Solar 모델, 모든 키 채팅 검증됨 |
| 🔑 하나의 키로 얻는 것 | 자체 계정에 한정된 하나의 API 키: 아래 엔드포인트의 16개 모델 id, 여러분의 플랜 한도 내에서. 할당량은 **계정**에 귀속되며, 이것이 바로 이 도구가 키당 하나의 계정을 생성하는 이유입니다 |
| 🌐 API 형태 | OpenAI 호환: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 여러분의 데이터 | upstage.ai와 여러분이 설정한 받은편지함 백엔드만 접촉됩니다; 키는 여러분의 머신에 남습니다 |

## 🐞 이슈

실패한 단계, 사용한 출구, 도구의 stdout과 함께 이슈를 열어주세요 — `outputs/`의 덤프(각 단계의 스크린샷 + DOM)는 키를 노출하지 않고도 실패를 재현 가능하게 만듭니다.

## 📄 라이선스

MIT © 2026 — [LICENSE](LICENSE) 참조.

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>