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

**Créer en masse des comptes Upstage (upstage.ai) avec des clés API générées automatiquement — inférence compatible OpenAI + connecteur 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Démarrage rapide](#-quick-start) · [🎁 Niveau gratuit](#-free-tier--how-much-you-get) · [🤖 Modèles](#-models--all-16-of-them) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [✅ Vérifié](#-verified-working--every-key-is-tested) · [🧭 Comment ça fonctionne](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options CLI](#️-cli-options) · [🛰️ Derrière un proxy](#️-behind-a-proxy) · [🐞 Problèmes](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---  

## ✨ Pourquoi cela existe

Upstage donne à chaque compte un **crédit gratuit de 10 $** et sa propre clé API, et les deux résident sur le **compte** — ainsi l’unité utile est *un compte par clé*, jamais plusieurs clés provenant d’un même compte. L’inscription se fait via une page hébergée dans un vrai navigateur ; cet outil parcourt tout le processus de façon autonome, en utilisant votre liste de proxys, et n’enregistre une clé qu’après une vraie complétion.

## 🎁 Niveau gratuit — ce que vous obtenez

**Chaque nouveau compte Upstage reçoit un crédit gratuit de 10 $ — aucune carte requise — et le crédit vit sur le compte, pas sur la clé.**

| Quoi | Valeur |
| --- | --- |
| Crédit de bienvenue | **10,00 $** par compte — la page de démarrage du console indique *« Inscrivez‑vous pour recevoir 10 $ de crédit gratuit »* |
| Carte requise | **Non** |
| Limite de taux | selon le plan/console du compte ; le vérificateur change d’exit sur `403`/`429`/`5xx` au lieu de blâmer la clé |
| Inscription | page hébergée dans un vrai navigateur : code e‑mail lu depuis une boîte aux lettres fraîche par compte |
| L'unité qui s'échelle | **un compte = une clé** → `--count N` correspond réellement à « N × 10 $ » |

> 💡 Le niveau gratuit est fixé par Upstage et peut changer. Consultez les chiffres en temps réel sur [upstage.ai](https://upstage.ai) — et laissez la propre porte de l’outil décider :

```bash
node src/cli.js --verify-only     # chaque clé dans keys.txt est retestée avec un vrai appel de chat
```

## 🤖 Modèles — les 16

`models.json` est la réponse en direct du `GET /v1/models` des clés créées — **16 ids**, dont :

| Modèle | ✓ |
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

2026‑10‑19 re‑vérification en direct : 12 des 16 ids du catalogue ont répondu à un chat `200` (les autres ids testés — `solar-decide`, `solar-decide-flash`, `solar-jev` — n’ont pas répondu).

Probe en direct d’une clé :

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 Comment utiliser l'API

L’URL de base est **`https://api.upstage.ai/v1`** — compatible OpenAI, donc tout ce qui parle OpenAI fonctionne.

**Tout SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Tout agent / outil avec une URL de base personnalisée** (Cursor, OpenCode, Kilo Code, …) : URL de base `https://api.upstage.ai/v1`, collez une clé, choisissez n’importe quel id de modèle dans `models.json`.

## 🛠 Démarrage rapide

```bash
git clone https://github.com/F0Rextasy/upstage-bulk-apikey.git
cd upstage-bulk-apikey

# 1) votre liste de proxys, une ligne par exit (http://, socks5://, socks4:// ou host:port nu)
printf 'socks5://127.0.0.1:1080\n' > src/proxies.txt

# 2) boîtes aux lettres — pointez l’outil vers votre propre boîte (un token API inbox ou IMAP) :
#    le code d’inscription est lu depuis une boîte fraîche par compte

# 3) lancez
node src/launcher.js                 # menu interactif : mint / finish / verify / screen
# ou pilotez directement :
node src/cli.js mint   --count 30 --conc 2
node src/cli.js finish --conc 2      # terminer les comptes dont l’étape clé n’a jamais été complétée
node src/cli.js verify --chat        # revérifier keys.txt (modèles + une complétion de chat)
```

Tout ce que les outils écrivent se trouve **à côté du code**, dans `src/` : `src/keys.txt`, `src/accounts.json`, `src/outputs/` et `src/out/` ; le pool est lu depuis `src/proxies.txt`. `node src/cli.js help` liste chaque tâche et chaque drapeau.

### 🖱️ Le lanceur

Le lanceur demande le nombre, la concurrence et les paramètres boîte aux lettres/proxy, les mémorise dans `launcher.config.json`, et déclenche les tâches CLI (mint / finish / verify / screen / connect).

## ✅ Vérifié en fonctionnement — chaque clé est testée

Une clé n’est écrite dans `keys.txt` qu’après que l’API en direct y ait répondu :

| Vérification | Appel | Attendu |
|---|---|---|
| auth + liste des modèles | `GET https://api.upstage.ai/v1/models` | `200` + les ids de modèles du compte |
| génération réelle | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + `choices[0].message.content` non vide |
| le lot livré | **31 comptes distincts → 31 clés, chacune vérifiée** | `models` 200 + chat `solar-pro2` 200 |

Le vérificateur **change d’exit** sur 403/429/5xx/erreurs de transport et ne fait échouer une clé que sur `401`, ainsi une clé n’est jamais condamnée parce qu’un exit a été rejeté. `node src/cli.js verify --chat` reproduit exactement ce contrôle pour votre propre fichier.

## 🧭 Comment ça fonctionne

```
inbox (une adresse par compte)                                  une adresse fraîche par compte
   │
   ├─▶ inscription : page Upstage → adresse e‑mail → code / lien depuis la boîte
   ├─▶ session : les cookies ou le token d’accès du compte en main
   ├─▶ création de clé : endpoint de clé du compte → clé en texte clair renvoyée une fois (écrite immédiatement)
   └─▶ preuve en direct : POST https://api.upstage.ai/v1/chat/completions → contenu réel = la clé est active
```

Par compte, un contexte Chrome isolé (son propre proxy + stockage) :

1. une boîte aux lettres fraîche — les codes arrivent généralement en quelques secondes ;
2. un exit frais depuis `proxies.txt`, distribué uniquement s’il passe le contrôle de la page console **à ce moment‑là** ;
3. inscription hébergée → code e‑mail → console ;
4. accord d’inscription → `/api-keys` → **Créer la clé** ;
5. la clé est capturée depuis la **réponse wire** de création et vérifiée en direct : `GET /v1/models` **et** une vraie complétion `solar-pro2` ;
6. l’état est checkpointé par compte, ainsi un exit mort ne coûte qu’une tentative, pas tout le lot.

**Mode finition.** Les comptes déjà existants peuvent être finalisés sans aucun e‑mail : `finish.js` se **connecte** avec les identifiants enregistrés et crée la clé — la façon la plus économique d’enrichir un fichier que vous possédez déjà.

## ⚙️ Options CLI

| Tâche | Options |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (conc + pacing gap) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — ne garder que les exits qui atteignent l’API du fournisseur |
| `harvest` | filtrer les listes brutes d’alimentation en un pool exploitable |

Turbo recommandé (5) ; plus sur un ordinateur faible risque de surcharge/ban.

| Variable d'environnement | Valeur par défaut | Signification |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | fichier du pool, un proxy par ligne |

Les paramètres persistent dans `launcher.config.json` ; les clés atterrissent dans `keys.txt`, une par ligne, avec un miroir à `%USERPROFILE%\upstage-keys.txt`. `node src/cli.js help` est la liste autoritaire.

## 🛰️ Derrière un proxy

* `src/proxies.txt` — un exit par ligne (le lanceur et chaque tâche le lisent depuis `src/`) ; `scheme://user:pass@host:port`, `scheme://host:port` ou simplement `host:port` (par défaut `http://`). Les commentaires après `#` et les lignes vides sont ignorés.
* Chaque exit subit un **probe d’utilisation** avant qu’un compte ne passe du temps dessus ; les exits morts sont éliminés, et le pool n’est relu que lorsque l’ensemble utilisable est épuisé.
* Rien n’écoute sur votre propre interface : chaque requête du flux passe par le pool.

## 📄 Fichiers

| Chemin | Contenu |
| --- | --- |
| `src/keys.txt` | une clé vérifiée par ligne — ignoré par git, jamais committé |
| `src/accounts.json` | e‑mail / mot de passe / clé / état par compte |
| [`models.json`](src/models.json) | la réponse en direct du `GET /v1/models` — 16 ids |
| `src/proxies.txt` | vos exits, un par ligne — ignoré par git |
| `src/outputs/`, `src/out/` | captures d’écran, dumps DOM et état d’exécution — ignorés par git |

## 🔌 Se connecter à 9Router

[9Router](https://9router.com) est un routeur auto‑hébergé, compatible OpenAI. Upstage est compatible OpenAI, donc un nœud `openai-compatible` porte chaque clé :

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # ou env NINEROUTER_API_KEY
```

Valeurs par défaut : base `http://localhost:20128`, mot de passe `123456`, nœud `Upstage`, préfixe `upstage`, upstream `https://api.upstage.ai/v1`, modèle par défaut `solar-mini4`. Enregistrez une autre clé créée avec `--name "<label 2>"` — chaque clé devient une autre connexion que 9Router peut équilibrer. Les modèles sont alors servis sous `upstage/<model id>`.

## 🔑 Ce que vous offre une clé

|  |  |
| --- | --- |
| 🏢 Fournisseur | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 Ce que le fournisseur donne | crédit gratuit de 10 $ par compte — 16 modèles Solar, chaque clé vérifiée par chat |
| 🔑 Ce que vous offre une clé | une clé API liée à son propre compte : les 16 ids de modèle sur l’endpoint ci‑dessous, aux limites de votre plan. Le quota vit sur le **compte**, raison pour laquelle cet outil crée un compte par clé |
| 🌐 Forme de l’API | Compatible OpenAI : `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Vos données | seules upstage.ai et le backend de boîte aux lettres que vous configurez sont contactés ; les clés restent sur votre machine |

## 🐞 Problèmes

Ouvrez un problème en indiquant l’étape qui a échoué, l’exit utilisé et la sortie standard de l’outil — les dumps dans `outputs/` (captures d’écran + DOM à chaque étape) rendent les échecs reproductibles sans divulguer de clé.

## 📄 Licence

MIT © 2026 — voir [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey contributors

</div>