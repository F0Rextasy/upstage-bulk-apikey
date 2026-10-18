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

**Créez en masse des comptes Upstage (upstage.ai) avec des clés API générées automatiquement — inférence compatible OpenAI + connecteur 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Démarrage rapide](#-quick-start) · [🎁 Offre gratuite](#-free-tier--how-much-you-get) · [🤖 Modèles](#-models--all-16-of-them) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [✅ Vérifié](#-verified-working--every-key-is-tested) · [🧭 Comment ça marche](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problèmes](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ Pourquoi cet outil existe

Upstage offre à chaque compte un **crédit gratuit de 10 $** et sa propre clé API, et les deux sont liés au **compte** — l'unité utile est donc *un compte par clé*, jamais plusieurs clés issues d'un même compte. L'inscription se fait sur une page hébergée dans un vrai navigateur ; cet outil parcourt tout le chemin sans intervention, via votre liste de proxies, et n'enregistre une clé qu'après une vraie complétion.

## 🎁 Offre gratuite — ce que vous obtenez

**Chaque nouveau compte Upstage reçoit un crédit gratuit de 10 $ — sans carte — et le crédit est lié au compte, pas à la clé.**

| Élément | Valeur |
| --- | --- |
| Crédit de bienvenue | **10,00 $** par compte — la page de démarrage de la console indique *« Sign up to receive $10 in free credit »* |
| Carte requise | **Non** |
| Limite de débit | selon le plan/la console du compte ; le vérificateur fait tourner les sorties sur `403`/`429`/`5xx` au lieu de blâmer la clé |
| Inscription | page hébergée dans un vrai navigateur : code e-mail lu depuis une boîte de réception neuve par compte |
| L'unité qui évolue | **un compte = une clé** → `--count N` signifie en réalité « N × 10 $ » |

Une clé générée répond **200** à la fois sur `GET /v1/models` et sur une vraie complétion `solar-pro2`, donc le crédit est utilisable sans carte. **Comment en obtenir plus :** le crédit est lié au compte — `--count N` génère N comptes, chacun avec sa propre clé et 10 $.

> 💡 L'offre gratuite est définie par Upstage et peut changer. Vérifiez les chiffres en direct sur [upstage.ai](https://upstage.ai) — et laissez la propre barrière de l'outil décider :

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modèles — les 16

`models.json` est la réponse en direct de `GET /v1/models` des clés générées — **16 identifiants**, dont :

|Modèle|✓|
|---|---|
|`solar-pro2`|✓|

Test en direct d'une clé :

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 Comment utiliser l'API

L'URL de base est **`https://api.upstage.ai/v1`** — compatible OpenAI, donc tout ce qui parle OpenAI fonctionne.

**N'importe quel SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**N'importe quel agent / outil avec une URL de base personnalisée** (Cursor, OpenCode, Kilo Code, …) : URL de base `https://api.upstage.ai/v1`, collez une clé, choisissez n'importe quel identifiant de modèle dans `models.json`.

## 🛠 Démarrage rapide

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

Tout ce que les outils écrivent se retrouve **à côté du code**, dans `src/` : `src/keys.txt`, `src/accounts.json`, `src/outputs/` et `src/out/` ; le pool est lu depuis `src/proxies.txt`. `node src/cli.js help` liste chaque tâche et chaque option.

### 🖱️ Le lanceur

Le lanceur demande le nombre, la concurrence et les paramètres de boîte mail/proxy, les mémorise dans `launcher.config.json`, et distribue les tâches CLI (mint / finish / verify / screen / connect).

## ✅ Vérifié et fonctionnel — chaque clé est testée

Une clé n'est écrite dans `keys.txt` qu'après que l'API en direct a répondu avec elle :

| Vérification | Appel | Attendu |
|---|---|---|
| auth + liste des modèles | `GET https://api.upstage.ai/v1/models` | `200` + les identifiants de modèles du compte |
| génération réelle | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + `choices[0].message.content` non vide |
| le lot livré | **31 comptes distincts → 31 clés, toutes vérifiées** | `models` 200 + chat `solar-pro2` 200 |

Le vérificateur **fait tourner les sorties sur 403/429/5xx/erreurs de transport** et ne fait échouer une clé que sur `401`, donc une clé n'est jamais condamnée parce qu'une sortie a été rejetée. `node src/cli.js verify --chat` reproduit exactement cette vérification pour votre propre fichier.

## 🧭 Comment ça marche

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

Par compte, un contexte Chrome isolé (son propre proxy + stockage) :

1. une boîte mail neuve — les codes arrivent généralement en quelques secondes ;
2. une sortie neuve depuis `proxies.txt`, attribuée uniquement si elle répond à la vérification de la page console **à cet instant précis** ;
3. inscription hébergée → code e-mail → console ;
4. l'accord d'inscription → `/api-keys` → **Create key** ;
5. la clé est capturée depuis la **réponse réseau** de création de clé et vérifiée en direct : `GET /v1/models` **et** une vraie complétion `solar-pro2` ;
6. l'état est sauvegardé par compte, donc une sortie morte coûte une tentative, pas le lot entier.

**Mode finish.** Les comptes qui existent déjà peuvent être finalisés sans aucun mail : `finish.js` se **connecte** avec les identifiants enregistrés et génère la clé — la façon la moins coûteuse de faire grandir un fichier que vous possédez déjà.

## ⚙️ Options CLI

| Tâche | Options |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (conc + intervalle de rythme) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — ne conserve que les sorties qui atteignent l'API du fournisseur |
| `harvest` | filtre les listes de flux brutes en un pool utilisable |

Turbo önerilir (5); daha fazlası zayıf bilgisayarda yük/ban riski.

| Variable d'environnement | Défaut | Signification |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | fichier du pool, un proxy par ligne |

Les paramètres persistent dans `launcher.config.json` ; les clés arrivent dans `keys.txt`, une par ligne, avec un miroir dans `%USERPROFILE%\upstage-keys.txt`. `node src/cli.js help` est la liste de référence.

## 🛰️ Derrière un proxy

* `src/proxies.txt` — une sortie par ligne (le lanceur et chaque tâche le lisent depuis `src/`) ; `scheme://user:pass@host:port`, `scheme://host:port` ou `host:port` nu (par défaut `http://`). Les commentaires après `#` et les lignes vides sont ignorés.
* Chaque sortie reçoit une **sonde au point d'utilisation** avant qu'un compte n'y consacre du temps ; les sorties mortes sont écartées, et le pool n'est relu que lorsque l'ensemble utilisable est épuisé.
* Rien n'écoute sur votre propre interface : chaque requête du flux passe par le pool.

## 📄 Fichiers

| Chemin | Contenu |
| --- | --- |
| `src/keys.txt` | une clé vérifiée par ligne — ignoré par git, jamais commité |
| `src/accounts.json` | e-mail / mot de passe / clé / état par compte |
| [`models.json`](src/models.json) | la réponse en direct de `GET /v1/models` — 16 identifiants |
| `src/proxies.txt` | vos sorties, une par ligne — ignoré par git |
| `src/outputs/`, `src/out/` | captures d'écran, dumps DOM et état d'exécution — ignorés par git |

## 🔌 Connexion à 9Router

[9Router](https://9router.com) est un routeur auto-hébergé compatible OpenAI. Upstage est compatible OpenAI, donc un seul nœud `openai-compatible` porte toutes les clés :

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Défauts : base `http://localhost:20128`, mot de passe `123456`, nœud `Upstage`, préfixe `upstage`, amont `https://api.upstage.ai/v1`, modèle par défaut `solar-mini4`. Enregistrez une autre clé générée avec `--name "<label 2>"` — chaque clé devient une connexion supplémentaire sur laquelle 9Router peut répartir la charge. Les modèles sont alors servis sous `upstage/<model id>`.

## 🔑 Ce qu'une clé vous apporte

| | |
| --- | --- |
| 🏢 Fournisseur | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 Ce que le fournisseur offre | 10 $ de crédit gratuit par compte — 16 modèles Solar, chaque clé vérifiée par chat |
| 🔑 Ce qu'une clé vous apporte | une clé API limitée à son propre compte : les 16 identifiants de modèles sur le point de terminaison ci-dessous, aux limites de votre plan. Le quota est lié au **compte**, ce qui explique précisément pourquoi cet outil crée un compte par clé |
| 🌐 Forme de l'API | Compatible OpenAI : `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Vos données | seuls upstage.ai et le backend de boîte mail que vous configurez sont contactés ; les clés restent sur votre machine |

## 🐞 Problèmes

Ouvrez un ticket avec l'étape en échec, la sortie utilisée et la sortie standard de l'outil — les dumps dans `outputs/` (captures d'écran + DOM à chaque étape) rendent les échecs reproductibles sans divulguer de clé.

## 📄 Licence

MIT © 2026 — voir [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>