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

**Массовое создание аккаунтов Upstage (upstage.ai) с автоматически сгенерированными API-ключами — OpenAI-совместимый инференс + коннектор 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Быстрый старт](#-quick-start) · [🎁 Бесплатный тариф](#-free-tier--how-much-you-get) · [🤖 Модели](#-models--all-16-of-them) · [🧪 Использование API](#-how-to-use-the-api) · [✅ Проверено](#-verified-working--every-key-is-tested) · [🧭 Как это работает](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Опции](#️-cli-options) · [🛰️ Прокси](#️-behind-a-proxy) · [🐞 Проблемы](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Зачем это нужно

Upstage даёт каждому аккаунту **$10 бесплатного кредита** и собственный API-ключ, и то и другое привязано к **аккаунту** — поэтому полезная единица — это *один аккаунт на ключ*, а не множество ключей из одного аккаунта. Регистрация — это размещённая страница в настоящем браузере; этот инструмент проходит весь путь без участия человека, через ваш список прокси, и записывает ключ только после реального завершения запроса.

## 🎁 Бесплатный тариф — сколько вы получаете

**Каждый новый аккаунт Upstage получает $10 бесплатного кредита — без карты — и кредит привязан к аккаунту, а не к ключу.**

| Что | Значение |
| --- | --- |
| Приветственный кредит | **$10.00** на аккаунт — страница начала работы в консоли гласит *«Sign up to receive $10 in free credit»* |
| Требуется карта | **Нет** |
| Ограничение скорости | согласно плану/консоли аккаунта; верификатор меняет выходы при `403`/`429`/`5xx` вместо того, чтобы винить ключ |
| Регистрация | размещённая страница в настоящем браузере: код из письма читается из свежего почтового ящика для каждого аккаунта |
| Единица масштабирования | **один аккаунт = один ключ** → `--count N` на самом деле означает «N × $10» |

Созданный ключ отвечает **200** как на `GET /v1/models`, так и на реальный запрос завершения `solar-pro2`, поэтому кредит можно тратить без карты. **Как получить больше:** кредит привязан к аккаунту — `--count N` создаёт N аккаунтов, каждый со своим ключом и $10.

> 💡 Бесплатный тариф устанавливается Upstage и может измениться. Проверяйте актуальные цифры на [upstage.ai](https://upstage.ai) — и пусть собственный контроль инструмента решает:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Модели — все 16

`models.json` — это живой ответ `GET /v1/models` созданных ключей — **16 идентификаторов**, включая:

| ID модели | Примечание |
| --- | --- |
| `solar-pro4`, `solar-pro3`, `solar-pro2` | линейка pro (сначала новые) |
| `solar-mini4`, `solar-mini` | малые / быстрые |
| `solar-decide`, `solar-decide-flash` | конечные точки для конкретных задач |
| `solar-jev`, `syn-pro` | специализированные / синхронные конечные точки |
| `solar-pro4-260806`, `solar-pro3-260323`, `solar-pro2-251215`, `solar-mini4-260922`, `solar-mini-250422`, `syn-pro-251021`, `solar-pro4-solar-pro2-…` | датированные снимки вышеперечисленных |

Живая проверка одного ключа:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 Как использовать API

Базовый URL — **`https://api.upstage.ai/v1`** — совместим с OpenAI, поэтому работает всё, что говорит на языке OpenAI.

**Любой SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Любой агент / инструмент с настраиваемым базовым URL** (Cursor, OpenCode, Kilo Code, …): базовый URL `https://api.upstage.ai/v1`, вставьте ключ, выберите любой id модели из `models.json`.

## 🛠 Быстрый старт

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

Всё, что записывают инструменты, попадает **рядом с кодом**, в `src/`: `src/keys.txt`, `src/accounts.json`, `src/outputs/` и `src/out/`; пул читается из `src/proxies.txt`. `node src/cli.js help` перечисляет все задачи и флаги.

### 🖱️ Лаунчер

Лаунчер запрашивает количество, параллелизм и настройки почты/прокси, запоминает их в `launcher.config.json` и запускает задачи CLI (mint / finish / verify / screen / connect).

## ✅ Проверено в работе — каждый ключ протестирован

Ключ записывается в `keys.txt` только после того, как живой API ответит с ним:

| Проверка | Запрос | Ожидается |
|---|---|---|
| аутентификация + список моделей | `GET https://api.upstage.ai/v1/models` | `200` + идентификаторы моделей аккаунта |
| реальная генерация | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + непустой `choices[0].message.content` |
| поставленная партия | **каждый аккаунт создал свой ключ, каждый проверен** | `models` 200 + `solar-pro2` chat 200 |

Верификатор **меняет выходы при 403/429/5xx/ошибках транспорта** и признаёт ключ нерабочим только при `401`, поэтому ключ никогда не отвергается из-за того, что один выход был отклонён. `node src/cli.js verify --chat` воспроизводит ровно эту проверку для вашего собственного файла.

> **Контроль качества.** Каждый ключ здесь прошёл живой `chat-200` прежде чем был записан в `keys.txt`
> (мёртвые ключи никогда не поставляются). Комбинации роутера следуют тому же правилу на уровне модели: запись
> добавляется **только если модель отвечает `chat-200` и умеет вызывать инструменты** — модель без поддержки инструментов,
> мёртвый ключ или мёртвый провайдер отбрасывается, а не добавляется. Повторяйте шаг проверки в любое время;
> сбои сообщаются, никогда не скрываются.

## 🧭 Как это работает

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

На каждый аккаунт — один изолированный контекст Chrome (свой прокси + хранилище):

1. свежий почтовый ящик — коды обычно приходят за секунды;
2. свежий выход из `proxies.txt`, выдаваемый только если он отвечает на проверку страницы консоли **прямо сейчас**;
3. размещённая регистрация → код из письма → консоль;
4. соглашение о регистрации → `/api-keys` → **Create key**;
5. ключ перехватывается из **сетевого ответа** создания ключа и проверяется вживую: `GET /v1/models` **и** реальный запрос завершения `solar-pro2`;
6. состояние сохраняется по каждому аккаунту, поэтому мёртвый выход стоит одной попытки, а не всей партии.

**Режим finish.** Уже существующие аккаунты можно завершить без почты: `finish.js` выполняет **вход** с записанными учётными данными и создаёт ключ — самый дешёвый способ расширить файл, которым вы уже владеете.

## ⚙️ Опции CLI

| Задача | Флаги |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — оставить только выходы, достигающие API провайдера |
| `harvest` | отобрать сырые списки фидов в пригодный пул |

| Переменная окружения | По умолчанию | Значение |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | файл пула, один прокси на строку |

Настройки сохраняются в `launcher.config.json`; ключи попадают в `keys.txt`, по одному на строку, с зеркалом в `%USERPROFILE%\upstage-keys.txt`. `node src/cli.js help` — авторитетный список.

## 🛰️ За прокси

* `src/proxies.txt` — один выход на строку (лаунчер и каждая задача читают его из `src/`); `scheme://user:pass@host:port`, `scheme://host:port` или просто `host:port` (по умолчанию `http://`). Комментарии после `#` и пустые строки игнорируются.
* Каждый выход проходит **проверку в точке использования** прежде чем аккаунт потратит на него время; мёртвые выходы отбрасываются, и пул перечитывается только когда пригодный набор исчерпан.
* Ничего не слушает на вашем собственном интерфейсе: каждый запрос в потоке идёт через пул.

## 📄 Файлы

| Путь | Содержимое |
| --- | --- |
| `src/keys.txt` | один проверенный ключ на строку — игнорируется git, никогда не коммитится |
| `src/accounts.json` | e-mail / пароль / ключ / состояние по каждому аккаунту |
| [`models.json`](src/models.json) | живой ответ `GET /v1/models` — 16 идентификаторов |
| `src/proxies.txt` | ваши выходы, по одному на строку — игнорируется git |
| `src/outputs/`, `src/out/` | скриншоты, дампы DOM и состояние запуска — игнорируется git |

## 🔌 Подключение к 9Router

[9Router](https://9router.com) — это самостоятельно размещаемый, OpenAI-совместимый роутер. Upstage совместим с OpenAI, поэтому один узел `openai-compatible` несёт каждый ключ:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

По умолчанию: base `http://localhost:20128`, пароль `123456`, узел `Upstage`, префикс `upstage`, upstream `https://api.upstage.ai/v1`, модель по умолчанию `solar-mini4`. Зарегистрируйте другой созданный ключ с `--name "<label 2>"` — каждый ключ становится ещё одним соединением, по которому 9Router может балансировать нагрузку. Модели затем обслуживаются как `upstage/<model id>`.

## 🔌 Подключение к OmniRoute

[OmniRoute](https://omniroute.online) — это самостоятельно размещаемый, OpenAI-совместимый роутер. Upstage совместим с OpenAI, поэтому один узел `openai-compatible` несёт каждый ключ:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

По умолчанию: base `http://localhost:20128`, пароль `123456`, узел `Upstage`, префикс `upstage`, upstream `https://api.upstage.ai/v1`, модель по умолчанию `solar-mini4`. Зарегистрируйте другой созданный ключ с `--name "<label 2>"` — каждый ключ становится ещё одним соединением, по которому OmniRoute может балансировать нагрузку. Модели затем обслуживаются как `upstage/<model id>`.

## 🔑 Что даёт один ключ

| | |
| --- | --- |
| 🏢 Провайдер | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 Что даёт провайдер | $10 бесплатного кредита на аккаунт — 16 моделей Solar, каждый ключ проверен чатом |
| 🔑 Что даёт один ключ | один API-ключ, привязанный к своему аккаунту: 16 идентификаторов моделей на конечной точке ниже, в пределах лимитов вашего плана. Квота привязана к **аккаунту**, именно поэтому этот инструмент создаёт один аккаунт на ключ |
| 🌐 Форма API | Совместим с OpenAI: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Ваши данные | связь только с upstage.ai и настроенным вами почтовым бэкендом; ключи остаются на вашей машине |

## 🐞 Проблемы

Откройте issue с указанием сбойного шага, использованного выхода и stdout инструмента — дампы в `outputs/` (скриншоты + DOM на каждом шаге) делают сбои воспроизводимыми без утечки ключа.

## 📄 Лицензия

MIT © 2026 — см. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>