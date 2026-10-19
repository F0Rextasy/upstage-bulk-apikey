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

**Upstage-Konten (upstage.ai) massenweise mit automatisch generierten API-Schlüsseln erstellen — OpenAI-kompatible Inferenz + 9Router-Connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Kostenlose Stufe](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-16-of-them) · [🧪 API verwenden](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Probleme](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>




---

## ✨ Warum es dieses Tool gibt

Upstage gibt jedem Konto ein **kostenloses Guthaben von 10 $** und einen eigenen API-Schlüssel, und beides hängt am **Konto** — die sinnvolle Einheit ist also *ein Konto pro Schlüssel*, niemals viele Schlüssel aus einem Konto. Die Registrierung ist eine gehostete Seite in einem echten Browser; dieses Tool durchläuft den gesamten Pfad unbeaufsichtigt über deine Proxy-Liste und zeichnet einen Schlüssel erst nach einer echten Completion auf.

## 🎁 Kostenlose Stufe — wie viel du bekommst

**Jedes neue Upstage-Konto erhält ein kostenloses Guthaben von 10 $ — ohne Karte — und das Guthaben hängt am Konto, nicht am Schlüssel.**

| Was | Wert |
| --- | --- |
| Willkommensguthaben | **$10.00** pro Konto — die Erste-Schritte-Seite der Konsole sagt: *„Registriere dich, um 10 $ kostenloses Guthaben zu erhalten“* |
| Karte erforderlich | **Nein** |
| Ratenlimit | gemäß Plan/Konsole des Kontos; der Verifizierer wechselt bei `403`/`429`/`5xx` die Ausgänge, statt den Schlüssel verantwortlich zu machen |
| Registrierung | gehostete Seite in einem echten Browser: E-Mail-Code wird pro Konto aus einem frischen Postfach gelesen |
| Die skalierende Einheit | **ein Konto = ein Schlüssel** → `--count N` bedeutet wirklich „N × 10 $“ |

Ein erzeugter Schlüssel antwortet mit **200** sowohl auf `GET /v1/models` als auch auf eine echte `solar-pro2`-Completion, sodass das Guthaben ohne Karte ausgegeben werden kann. **So bekommst du mehr:** Das Guthaben hängt am Konto — `--count N` erzeugt N Konten, jedes mit eigenem Schlüssel und 10 $.

> 💡 Die kostenlose Stufe wird von Upstage festgelegt und kann sich ändern. Prüfe die aktuellen Werte auf [upstage.ai](https://upstage.ai) — und lass das Gate des Tools entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 16

`models.json` ist die aktuelle `GET /v1/models`-Antwort erzeugter Schlüssel — **16 IDs**, darunter:

|Modell|✓|
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

Live-Nachprüfung vom 2026-10-19: 12 der 16 Katalog-IDs antworteten auf einen Chat mit `200` (die anderen getesteten IDs — `solar-decide`, `solar-decide-flash`, `solar-jev` — taten es nicht).

Live-Test eines Schlüssels:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 So verwendest du die API

Die Basis-URL ist **`https://api.upstage.ai/v1`** — OpenAI-kompatibel, daher funktioniert alles, was OpenAI spricht.

**Beliebiges SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Jeder Agent / jedes Tool mit benutzerdefinierter Basis-URL** (Cursor, OpenCode, Kilo Code, …): Basis-URL `https://api.upstage.ai/v1`, Schlüssel einfügen, eine beliebige Modell-ID aus `models.json` wählen.

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

Alles, was die Tools schreiben, landet **neben dem Code**, in `src/`: `src/keys.txt`, `src/accounts.json`, `src/outputs/` und `src/out/`; der Pool wird aus `src/proxies.txt` gelesen. `node src/cli.js help` listet alle Aufgaben und Flags auf.

### 🖱️ Der Launcher

Der Launcher fragt nach Anzahl, Parallelität und Postfach-/Proxy-Einstellungen, merkt sie sich in `launcher.config.json` und startet die CLI-Aufgaben (mint / finish / verify / screen / connect).

## ✅ Verifiziert funktionsfähig — jeder Schlüssel wird getestet

Ein Schlüssel wird erst in `keys.txt` geschrieben, nachdem die Live-API damit geantwortet hat:

| Prüfung | Aufruf | Erwartet |
|---|---|---|
| Authentifizierung + Modellliste | `GET https://api.upstage.ai/v1/models` | `200` + die Modell-IDs des Kontos |
| echte Generierung | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + nicht leeres `choices[0].message.content` |
| der ausgelieferte Batch | **31 verschiedene Konten → 31 Schlüssel, jeder einzelne verifiziert** | `models` 200 + `solar-pro2` Chat 200 |

Der Verifizierer **wechselt bei 403/429/5xx/Transportfehlern die Ausgänge** und markiert einen Schlüssel nur bei `401` als fehlgeschlagen, sodass ein Schlüssel niemals verworfen wird, nur weil ein Ausgang abgelehnt wurde. `node src/cli.js verify --chat` reproduziert genau diese Prüfung für deine eigene Datei.

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

1. ein frisches Postfach — Codes kommen normalerweise in Sekunden an;
2. ein frischer Ausgang aus `proxies.txt`, der nur ausgegeben wird, wenn er die Konsolen-Seitenprüfung **genau dann** besteht;
3. gehostete Registrierung → E-Mail-Code → Konsole;
4. die Registrierungsvereinbarung → `/api-keys` → **Schlüssel erstellen**;
5. der Schlüssel wird aus der **Wire-Antwort** des Erstellungsaufrufs abgefangen und live verifiziert: `GET /v1/models` **und** eine echte `solar-pro2`-Completion;
6. der Zustand wird pro Konto als Checkpoint gespeichert, sodass ein toter Ausgang einen Versuch kostet, nicht den ganzen Batch.

**Finish-Modus.** Bereits vorhandene Konten können ohne jegliche E-Mail abgeschlossen werden: `finish.js` meldet sich mit den gespeicherten Zugangsdaten **an** und erzeugt den Schlüssel — der günstigste Weg, eine Datei zu vergrößern, die du bereits besitzt.

## ⚙️ CLI-Optionen

| Aufgabe | Flags |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (Parallelität + Pacing-Abstand) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — nur Ausgänge behalten, die die Provider-API erreichen |
| `harvest` | Roh-Feed-Listen zu einem nutzbaren Pool zusammenführen |

Turbo wird empfohlen (5); mehr bedeutet auf schwachen Rechnern Last-/Sperrrisiko.

| Umgebungsvariable | Standard | Bedeutung |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | Pool-Datei, ein Proxy pro Zeile |

Einstellungen bleiben in `launcher.config.json` erhalten; Schlüssel landen in `keys.txt`, einer pro Zeile, mit einer Spiegelkopie unter `%USERPROFILE%\upstage-keys.txt`. `node src/cli.js help` ist die maßgebliche Liste.

## 🛰️ Hinter einem Proxy

* `src/proxies.txt` — ein Ausgang pro Zeile (der Launcher und jede Aufgabe lesen sie aus `src/`); `scheme://user:pass@host:port`, `scheme://host:port` oder reines `host:port` (Standard ist `http://`). Kommentare nach `#` und Leerzeilen werden ignoriert.
* Jeder Ausgang erhält eine **Prüfung zum Nutzungszeitpunkt**, bevor ein Konto Zeit damit verbringt; tote Ausgänge werden verworfen, und der Pool wird erst neu gelesen, wenn die nutzbare Menge erschöpft ist.
* Auf deiner eigenen Schnittstelle lauscht nichts: jede Anfrage im Ablauf geht durch den Pool.

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `src/keys.txt` | ein verifizierter Schlüssel pro Zeile — von Git ignoriert, niemals committet |
| `src/accounts.json` | E-Mail / Passwort / Schlüssel / Zustand pro Konto |
| [`models.json`](src/models.json) | die aktuelle `GET /v1/models`-Antwort — 16 IDs |
| `src/proxies.txt` | deine Ausgänge, einer pro Zeile — von Git ignoriert |
| `src/outputs/`, `src/out/` | Screenshots, DOM-Dumps und Laufzustand — von Git ignoriert |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router. Upstage ist OpenAI-kompatibel, daher trägt ein `openai-compatible`-Knoten jeden Schlüssel:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Standardwerte: Basis `http://localhost:20128`, Passwort `123456`, Knoten `Upstage`, Präfix `upstage`, Upstream `https://api.upstage.ai/v1`, Standardmodell `solar-mini4`. Registriere einen weiteren erzeugten Schlüssel mit `--name "<label 2>"` — jeder Schlüssel wird eine weitere Verbindung, über die 9Router Lastverteilung betreiben kann. Modelle werden dann als `upstage/<model id>` bereitgestellt.

## 🔑 Was dir ein Schlüssel bietet

| | |
| --- | --- |
| 🏢 Anbieter | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 Was der Anbieter gibt | 10 $ kostenloses Guthaben pro Konto — 16 Solar-Modelle, jeder Schlüssel per Chat verifiziert |
| 🔑 Was dir ein Schlüssel bietet | einen API-Schlüssel, der auf sein eigenes Konto beschränkt ist: die 16 Modell-IDs am unten genannten Endpunkt, im Rahmen der Limits deines Plans. Das Kontingent hängt am **Konto**, genau deshalb erstellt dieses Tool ein Konto pro Schlüssel |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Deine Daten | Es werden nur upstage.ai und das von dir konfigurierte Postfach-Backend kontaktiert; Schlüssel bleiben auf deinem Rechner |

## 🐞 Probleme

Eröffne ein Issue mit dem fehlschlagenden Schritt, dem verwendeten Ausgang und der Standardausgabe des Tools — die Dumps in `outputs/` (Screenshots + DOM bei jedem Schritt) machen Fehler reproduzierbar, ohne einen Schlüssel preiszugeben.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey-Mitwirkende

</div>