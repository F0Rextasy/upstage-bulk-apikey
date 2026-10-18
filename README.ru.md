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

**Массовое создание аккаунтов Upstage (upstage.ai) с автоматически сгенерированными API-ключами — OpenAI-совместимый инференс + коннектор для 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Быстрый старт](#-quick-start) · [🎁 Бесплатный тариф](#-free-tier--how-much-you-get) · [🤖 Модели](#-models--all-16-of-them) · [🧪 Использование API](#-how-to-use-the-api) · [✅ Проверено](#-verified-working--every-key-is-tested) · [🧭 Как это работает](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Опции](#️-cli-options) · [🛰️ Прокси](#️-behind-a-proxy) · [🐞 Проблемы](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ Зачем это нужно

Upstage даёт каждому аккаунту **$10 бесплатного кредита** и собственный API-ключ, и то и другое привязано к **аккаунту** — поэтому полезная единица — это *один аккаунт на ключ*, а не множество ключей из одного аккаунта. Регистрация — это хостируемая страница в настоящем браузере; этот инструмент проходит весь путь без участия человека, через ваш список прокси, и записывает ключ только после реального выполнения запроса.

## 🎁 Бесплатный тариф — сколько вы получаете

**Каждый новый аккаунт Upstage получает $10 бесплатного кредита — без карты — и кредит привязан к аккаунту, а не к ключу.**

| Что | Значение |
| --- | --- |
| Приветственный кредит | **$10.00** на аккаунт — страница «с чего начать» в консоли сообщает: *“Sign up to receive $10 in free credit”* |
| Нужна карта | **Нет** |
| Ограничение скорости | по плану/консоли аккаунта; верификатор перебирает выходы при `403`/`429`/`5xx`, а не списывает проблему на ключ |
| Регистрация | хостируемая страница в настоящем браузере: код из письма читается из свежей почты для каждого аккаунта |
| Единица масштабирования | **один аккаунт = один ключ** → `--count N` — это фактически «N × $10» |

Созданный ключ отвечает **200** и на `GET /v1/models`, и на реальный запрос completion к `solar-pro2`, так что кредит можно тратить без карты. **Как получить больше:** кредит привязан к аккаунту — `--count N` создаёт N аккаунтов, каждый со своим ключом и $10.

> 💡 Бесплатный тариф устанавливает Upstage, и он может измениться. Актуальные цифры смотрите на [upstage.ai](https://upstage.ai) — и пусть решает собственный контроль инструмента:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Модели — все 16

`models.json` — это живой ответ `GET /v1/models` для созданных ключей — **16 идентификаторов**, включая:

|Модель|✓|
|---|---|
|`solar-pro2`|✓|

Живая проверка одного ключа:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 Как использовать API

Базовый URL — **`https://api.upstage.ai/v1`** — совместим с OpenAI, поэтому подойдёт всё, что умеет говорить на языке OpenAI.

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

Лаунчер спрашивает количество, параллельность и настройки почты/прокси, запоминает их в `launcher.config.json` и запускает задачи CLI (mint / finish / verify / screen / connect).

## ✅ Проверено в работе — каждый ключ протестирован

Ключ записывается в `keys.txt` только после того, как живой API ответил с ним:

| Проверка | Запрос | Ожидаемый результат |
|---|---|---|
| аутентификация + список моделей | `GET https://api.upstage.ai/v1/models` | `200` + идентификаторы моделей аккаунта |
| реальная генерация | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + непустой `choices[0].message.content` |
| поставленная партия | **31 разных аккаунтов → 31 ключ, каждый проверен** | `models` 200 + `solar-pro2` chat 200 |

Верификатор **перебирает выходы при 403/429/5xx/транспортных ошибках** и признаёт ключ нерабочим только при `401`, поэтому ключ никогда не отвергается из-за того, что один выход был отклонён. `node src/cli.js verify --chat` воспроизводит ровно такую проверку для вашего собственного файла.

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
3. хостируемая регистрация → код из письма → консоль;
4. согласие при регистрации → `/api-keys` → **Create key**;
5. ключ перехватывается из **сетевого ответа** на создание ключа и проверяется вживую: `GET /v1/models` **и** реальный запрос completion к `solar-pro2`;
6. состояние сохраняется по каждому аккаунту, поэтому мёртвый выход стоит одной попытки, а не всей партии.

**Режим finish.** Уже существующие аккаунты можно доработать без почты: `finish.js` выполняет **вход** с сохранёнными учётными данными и создаёт ключ — самый дешёвый способ увеличить файл, который у вас уже есть.

## ⚙️ Опции CLI

| Задача | Флаги |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (параллельность + пауза между запросами) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — оставить только выходы, которые достигают API провайдера |
| `harvest` | отфильтровать сырые списки из фидов в пригодный пул |

Рекомендуется turbo (5); больше — риск нагрузки/бана на слабой машине.

| Переменная окружения | По умолчанию | Значение |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | файл пула, один прокси на строку |

Настройки сохраняются в `launcher.config.json`; ключи попадают в `keys.txt`, по одному на строку, с копией в `%USERPROFILE%\upstage-keys.txt`. `node src/cli.js help` — авторитетный список.

## 🛰️ За прокси

* `src/proxies.txt` — один выход на строку (лаунчер и каждая задача читают его из `src/`); `scheme://user:pass@host:port`, `scheme://host:port` или просто `host:port` (по умолчанию `http://`). Комментарии после `#` и пустые строки игнорируются.
* Каждый выход проходит **проверку в момент использования**, прежде чем аккаунт потратит на него время; мёртвые выходы отбрасываются, а пул перечитывается только когда набор пригодных иссякнет.
* На вашем собственном интерфейсе ничего не слушает: каждый запрос в цепочке идёт через пул.

## 📄 Файлы

| Путь | Содержимое |
| --- | --- |
| `src/keys.txt` | один проверенный ключ на строку — игнорируется git, никогда не коммитится |
| `src/accounts.json` | e-mail / пароль / ключ / состояние каждого аккаунта |
| [`models.json`](src/models.json) | живой ответ `GET /v1/models` — 16 идентификаторов |
| `src/proxies.txt` | ваши выходы, по одному на строку — игнорируется git |
| `src/outputs/`, `src/out/` | скриншоты, дампы DOM и состояние запуска — игнорируется git |

## 🔌 Подключение к 9Router

[9Router](https://9router.com) — самохостируемый OpenAI-совместимый роутер. Upstage совместим с OpenAI, поэтому один узел `openai-compatible` несёт все ключи:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

По умолчанию: base `http://localhost:20128`, пароль `123456`, узел `Upstage`, префикс `upstage`, upstream `https://api.upstage.ai/v1`, модель по умолчанию `solar-mini4`. Зарегистрируйте ещё один созданный ключ с помощью `--name "<label 2>"` — каждый ключ становится ещё одним подключением, по которому 9Router может балансировать нагрузку. Модели затем доступны как `upstage/<model id>`.

## 🔑 Что даёт один ключ

| | |
| --- | --- |
| 🏢 Провайдер | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 Что даёт провайдер | $10 бесплатного кредита на аккаунт — 16 моделей Solar, каждый ключ проверен через чат |
| 🔑 Что даёт один ключ | один API-ключ, привязанный к своему аккаунту: 16 идентификаторов моделей на указанном ниже эндпоинте, в пределах лимитов вашего плана. Квота привязана к **аккаунту**, и именно поэтому этот инструмент создаёт один аккаунт на ключ |
| 🌐 Формат API | совместимый с OpenAI: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Ваши данные | запросы идут только к upstage.ai и настроенному вами почтовому бэкенду; ключи остаются на вашей машине |

## 🐞 Проблемы

Откройте issue, указав шаг, на котором произошла ошибка, использованный выход и stdout инструмента — дампы в `outputs/` (скриншоты + DOM на каждом шаге) позволяют воспроизвести сбой без утечки ключа.

## 📄 Лицензия

MIT © 2026 — см. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 участники upstage-bulk-apikey

</div>