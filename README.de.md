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

**Upstage-Konten (upstage.ai) in großen Mengen erstellen — mit automatisch generierten API-Schlüsseln: OpenAI-kompatible Inferenz + 9Router-Connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Free-Tier](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-16-of-them) · [🧪 Die API nutzen](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

Upstage gibt jedem Konto ein **Guthaben von 10 $** und einen eigenen API-Schlüssel, und beides hängt am **Konto** — die nützliche Einheit ist also *ein Konto pro Schlüssel*, niemals viele Schlüssel aus einem Konto. Die Anmeldung ist eine gehostete Seite in einem echten Browser; dieses Tool durchläuft den gesamten Weg unbeaufsichtigt über deine Proxy-Liste und zeichnet einen Schlüssel erst auf, nachdem eine echte Completion erfolgt ist.

## 🎁 Free-Tier — wie viel du bekommst

**Jedes neue Upstage-Konto erhält ein Guthaben von 10 $ — ohne Karte — und das Guthaben hängt am Konto, nicht am Schlüssel.**

| Was | Wert |
| --- | --- |
| Willkommensguthaben | **10,00 $** pro Konto — die Getting-Started-Seite der Konsole sagt *„Sign up to receive $10 in free credit“* |
| Karte erforderlich | **Nein** |
| Rate-Limit | gemäß Plan/Konsole des Kontos; der Verifier rotiert die Ausgänge bei `403`/`429`/`5xx`, statt den Schlüssel verantwortlich zu machen |
| Anmeldung | gehostete Seite in einem echten Browser: E-Mail-Code aus einem frischen Postfach pro Konto |
| Die skalierende Einheit | **ein Konto = ein Schlüssel** → `--count N` bedeutet wirklich „N × 10 $“ |

Ein erzeugter Schlüssel antwortet mit **200** sowohl auf `GET /v1/models` als auch auf eine echte `solar-pro2`-Completion, das Guthaben ist also ohne Karte nutzbar. **So bekommst du mehr:** Das Guthaben hängt am Konto — `--count N` erzeugt N Konten, jedes mit eigenem Schlüssel und 10 $.

> 💡 Der Free-Tier wird von Upstage festgelegt und kann sich ändern. Prüfe die aktuellen Zahlen auf [upstage.ai](https://upstage.ai) — und lass das Gate des Tools selbst entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 16

`models.json` ist die Live-Antwort von `GET /v1/models` erzeugter Schlüssel — **16 IDs**, darunter:

| Modell-ID | Hinweis |
| --- | --- |
| `solar-pro4`, `solar-pro3`, `solar-pro2` | Pro-Linie (neueste zuerst) |
| `solar-mini4`, `solar-mini` | klein / schnell |
| `solar-decide`, `solar-decide-flash` | aufgabenspezifische Endpunkte |
| `solar-jev`, `syn-pro` | spezialisierte / synchrone Endpunkte |
| `solar-pro4-260806`, `solar-pro3-260323`, `solar-pro2-251215`, `solar-mini4-260922`, `solar-mini-250422`, `syn-pro-251021`, `solar-pro4-solar-pro2-…` | datierte Snapshots der oben genannten |

Live-Test eines Schlüssels:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 Die API nutzen

Die Basis-URL ist **`https://api.upstage.ai/v1`** — OpenAI-kompatibel, also funktioniert alles, was OpenAI spricht.

**Beliebiges SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Beliebiger Agent / beliebiges Tool mit eigener Basis-URL** (Cursor, OpenCode, Kilo Code, …): Basis-URL `https://api.upstage.ai/v1`, einen Schlüssel einfügen, eine beliebige Modell-ID aus `models.json` wählen.

## 🛠 Schnellstart

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

Alles, was die Tools schreiben, landet **neben dem Code**, in `src/`: `src/keys.txt`, `src/accounts.json`, `src/outputs/` und `src/out/`; der Pool wird aus `src/proxies.txt` gelesen. `node src/cli.js help` listet jede Aufgabe und jeden Flag auf.

### 🖱️ Der Launcher

Der Launcher fragt nach Anzahl, Parallelität und Postfach-/Proxy-Einstellungen, merkt sie sich in `launcher.config.json` und verteilt die CLI-Aufgaben (mint / finish / verify / screen / connect).

## ✅ Verifiziert funktionierend — jeder Schlüssel wird getestet

Ein Schlüssel wird erst dann in `keys.txt` geschrieben, wenn die Live-API damit antwortet:

| Prüfung | Aufruf | Erwartet |
|---|---|---|
| Auth + Modellliste | `GET https://api.upstage.ai/v1/models` | `200` + die Modell-IDs des Kontos |
| Echte Generierung | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + nicht-leerer `choices[0].message.content` |
| Der ausgelieferte Batch | **jedes Konto hat seinen eigenen Schlüssel erzeugt, jeder einzelne verifiziert** | `models` 200 + `solar-pro2` chat 200 |

Der Verifier **rotiert die Ausgänge bei 403/429/5xx/Transportfehlern** und lässt einen Schlüssel nur bei `401` durchfallen, sodass ein Schlüssel niemals verworfen wird, weil ein Ausgang abgelehnt wurde. `node src/cli.js verify --chat` reproduziert genau diese Prüfung für deine eigene Datei.

> **Qualitäts-Gates.** Jeder Schlüssel hier hat ein Live-`chat-200` bestanden, bevor er in `keys.txt`
> geschrieben wurde (tote Schlüssel werden nie ausgeliefert). Router-Kombinationen folgen derselben Regel
> auf Modellebene: Ein Eintrag wird **nur hinzugefügt, wenn das Modell `chat-200` antwortet und Tools
> aufrufen kann** — ein Modell ohne Tool-Unterstützung, ein toter Schlüssel oder ein toter Anbieter wird
> verworfen statt hinzugefügt. Führe den Verify-Schritt jederzeit erneut aus; Fehler werden gemeldet,
> niemals versteckt.

## 🧭 So funktioniert es

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

Pro Konto ein isolierter Chrome-Kontext (eigener Proxy + eigener Speicher):

1. ein frisches Postfach — Codes kommen meist in Sekunden an;
2. ein frischer Ausgang aus `proxies.txt`, der nur dann ausgegeben wird, wenn er **genau dann** die Prüfung der Konsolenseite besteht;
3. gehostete Anmeldung → E-Mail-Code → Konsole;
4. die Anmeldevereinbarung → `/api-keys` → **Create key**;
5. der Schlüssel wird aus der **Wire-Antwort** der Schlüsselerstellung abgefangen und live verifiziert: `GET /v1/models` **und** eine echte `solar-pro2`-Completion;
6. der Zustand wird pro Konto per Checkpoint gesichert, sodass ein toter Ausgang einen Versuch kostet, nicht den ganzen Batch.

**Finish-Modus.** Bereits existierende Konten können ohne jegliche Mail fertiggestellt werden: `finish.js` meldet sich mit den aufgezeichneten Zugangsdaten **an** und erzeugt den Schlüssel — der günstigste Weg, eine Datei zu vergrößern, die du bereits besitzt.

## ⚙️ CLI-Optionen

| Aufgabe | Flags |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — nur Ausgänge behalten, die die Provider-API erreichen |
| `harvest` | rohe Feed-Listen zu einem nutzbaren Pool verarbeiten |

| Umgebungsvariable | Standard | Bedeutung |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | Pool-Datei, ein Proxy pro Zeile |

Einstellungen werden in `launcher.config.json` gespeichert; Schlüssel landen in `keys.txt`, einer pro Zeile, mit einer Spiegelung unter `%USERPROFILE%\upstage-keys.txt`. `node src/cli.js help` ist die maßgebliche Liste.

## 🛰️ Hinter einem Proxy

* `src/proxies.txt` — ein Ausgang pro Zeile (der Launcher und jede Aufgabe lesen sie aus `src/`); `scheme://user:pass@host:port`, `scheme://host:port` oder bloßes `host:port` (Standard: `http://`). Kommentare nach `#` und Leerzeilen werden ignoriert.
* Jeder Ausgang erhält eine **Prüfung zum Nutzungszeitpunkt**, bevor ein Konto Zeit darauf verwendet; tote Ausgänge werden verworfen, und der Pool wird erst dann neu gelesen, wenn die nutzbare Menge erschöpft ist.
* Nichts lauscht auf deiner eigenen Schnittstelle: Jede Anfrage im Ablauf geht durch den Pool.

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `src/keys.txt` | ein verifizierter Schlüssel pro Zeile — von Git ignoriert, niemals committet |
| `src/accounts.json` | E-Mail / Passwort / Schlüssel / Zustand pro Konto |
| [`models.json`](src/models.json) | die Live-Antwort von `GET /v1/models` — 16 IDs |
| `src/proxies.txt` | deine Ausgänge, einer pro Zeile — von Git ignoriert |
| `src/outputs/`, `src/out/` | Screenshots, DOM-Dumps und Ausführungszustand — von Git ignoriert |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router. Upstage ist OpenAI-kompatibel, also trägt ein einziger `openai-compatible`-Knoten jeden Schlüssel:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Standardwerte: Basis `http://localhost:20128`, Passwort `123456`, Knoten `Upstage`, Präfix `upstage`, Upstream `https://api.upstage.ai/v1`, Standardmodell `solar-mini4`. Registriere einen weiteren erzeugten Schlüssel mit `--name "<label 2>"` — jeder Schlüssel wird zu einer weiteren Verbindung, über die 9Router lastverteilen kann. Modelle werden dann als `upstage/<model id>` bereitgestellt.

## 🔌 Mit OmniRoute verbinden

[OmniRoute](https://omniroute.online) ist ein selbst gehosteter, OpenAI-kompatibler Router. Upstage ist OpenAI-kompatibel, also trägt ein einziger `openai-compatible`-Knoten jeden Schlüssel:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Standardwerte: Basis `http://localhost:20128`, Passwort `123456`, Knoten `Upstage`, Präfix `upstage`, Upstream `https://api.upstage.ai/v1`, Standardmodell `solar-mini4`. Registriere einen weiteren erzeugten Schlüssel mit `--name "<label 2>"` — jeder Schlüssel wird zu einer weiteren Verbindung, über die OmniRoute lastverteilen kann. Modelle werden dann als `upstage/<model id>` bereitgestellt.

## 🔑 Was ein Schlüssel dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 Was der Anbieter gibt | 10 $ Gratisguthaben pro Konto — 16 Solar-Modelle, jeder Schlüssel chat-verifiziert |
| 🔑 Was ein Schlüssel dir bringt | einen API-Schlüssel, der auf sein eigenes Konto beschränkt ist: die 16 Modell-IDs am unten stehenden Endpunkt, zu den Limits deines Plans. Das Kontingent hängt am **Konto**, genau deshalb erstellt dieses Tool ein Konto pro Schlüssel |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Deine Daten | nur upstage.ai und das von dir konfigurierte Postfach-Backend werden kontaktiert; Schlüssel bleiben auf deinem Rechner |

## 🐞 Issues

Eröffne ein Issue mit dem fehlgeschlagenen Schritt, dem verwendeten Ausgang und der stdout des Tools — die Dumps in `outputs/` (Screenshots + DOM bei jedem Schritt) machen Fehler reproduzierbar, ohne einen Schlüssel preiszugeben.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>