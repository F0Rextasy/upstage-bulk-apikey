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

**Crea cuentas de Upstage (upstage.ai) en masa con claves API autogeneradas — inferencia compatible con OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencias](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![Licencia](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Modelos](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Inicio rápido](#-quick-start) · [🎁 Nivel gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-16-of-them) · [🧪 Usa la API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Cómo funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opciones](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Por qué existe esto

Upstage da a cada cuenta un **crédito gratuito de $10** y su propia clave API, y ambos viven en la **cuenta** — por lo que la unidad útil es *una cuenta por clave*, nunca muchas claves de una sola cuenta. El registro es una página alojada en un navegador real; esta herramienta recorre todo el camino sin supervisión, a través de tu lista de proxies, y solo registra una clave tras una finalización real.

## 🎁 Nivel gratuito — cuánto obtienes

**Cada nueva cuenta de Upstage recibe un crédito gratuito de $10 — sin tarjeta — y el crédito vive en la cuenta, no en la clave.**

| Qué | Valor |
| --- | --- |
| Crédito de bienvenida | **$10.00** por cuenta — la página de inicio de la consola dice *“Regístrate para recibir $10 en crédito gratuito”* |
| Tarjeta requerida | **No** |
| Límite de velocidad | según el plan/consola de la cuenta; el verificador rota las salidas en `403`/`429`/`5xx` en lugar de culpar a la clave |
| Registro | página alojada en un navegador real: código de correo leído desde un buzón nuevo por cuenta |
| La unidad que escala | **una cuenta = una clave** → `--count N` es realmente "N × $10" |

Una clave generada responde **200** tanto en `GET /v1/models` como en una finalización real de `solar-pro2`, así que el crédito se puede gastar sin tarjeta. **Cómo obtener más:** el crédito vive en la cuenta — `--count N` genera N cuentas, cada una con su propia clave y $10.

> 💡 El nivel gratuito lo establece Upstage y puede cambiar. Consulta las cifras en vivo en [upstage.ai](https://upstage.ai) — y deja que la propia puerta de la herramienta decida:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — los 16

`models.json` es la respuesta en vivo de `GET /v1/models` de las claves generadas — **16 ids**, incluidos:

|Modelo|✓|
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

Reverificación en vivo del 2026-10-19: 12 de los 16 ids del catálogo respondieron un `200` de chat (los otros ids probados — `solar-decide`, `solar-decide-flash`, `solar-jev` — no lo hicieron).

Prueba en vivo de una clave:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 Cómo usar la API

La URL base es **`https://api.upstage.ai/v1`** — compatible con OpenAI, así que cualquier cosa que hable OpenAI funciona.

**Cualquier SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Cualquier agente / herramienta con una URL base personalizada** (Cursor, OpenCode, Kilo Code, …): URL base `https://api.upstage.ai/v1`, pega una clave, elige cualquier id de modelo de `models.json`.

## 🛠 Inicio rápido

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

Todo lo que escriben las herramientas queda **junto al código**, en `src/`: `src/keys.txt`, `src/accounts.json`, `src/outputs/` y `src/out/`; el pool se lee desde `src/proxies.txt`. `node src/cli.js help` lista cada tarea y opción.

### 🖱️ El lanzador

El lanzador pregunta por la cantidad, la concurrencia y la configuración de buzón/proxy, las recuerda en `launcher.config.json` y despacha las tareas del CLI (mint / finish / verify / screen / connect).

## ✅ Verificado y funcionando — cada clave se prueba

Una clave se escribe en `keys.txt` solo después de que la API en vivo responda con ella:

| Comprobación | Llamada | Esperado |
|---|---|---|
| autenticación + lista de modelos | `GET https://api.upstage.ai/v1/models` | `200` + los ids de modelo de la cuenta |
| generación real | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + `choices[0].message.content` no vacío |
| el lote incluido | **31 cuentas distintas → 31 claves, todas verificadas** | `models` 200 + chat de `solar-pro2` 200 |

El verificador **rota las salidas en 403/429/5xx/errores de transporte** y solo marca una clave como fallida en `401`, por lo que una clave nunca se condena porque una salida fue rechazada. `node src/cli.js verify --chat` reproduce exactamente esa comprobación para tu propio archivo.

## 🧭 Cómo funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

Por cuenta, un contexto de Chrome aislado (su propio proxy + almacenamiento):

1. un buzón nuevo — los códigos suelen llegar en segundos;
2. una salida nueva de `proxies.txt`, asignada solo si responde la comprobación de la página de la consola **en ese momento**;
3. registro alojado → código de correo → consola;
4. el acuerdo de registro → `/api-keys` → **Crear clave**;
5. la clave se captura de la **respuesta de red** de creación de clave y se verifica en vivo: `GET /v1/models` **y** una finalización real de `solar-pro2`;
6. el estado se guarda por cuenta, así que una salida muerta cuesta un intento, no el lote.

**Modo finish.** Las cuentas que ya existen se pueden terminar sin ningún correo: `finish.js` inicia **sesión** con las credenciales registradas y genera la clave — la forma más barata de ampliar un archivo que ya tienes.

## ⚙️ Opciones del CLI

| Tarea | Opciones |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (conc + intervalo de ritmo) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — conserva solo las salidas que llegan a la API del proveedor |
| `harvest` | filtra listas de feeds sin procesar para convertirlas en un pool utilizable |

Se recomienda turbo (5); más puede implicar riesgo de carga/ban en un equipo débil.

| Variable de entorno | Predeterminado | Significado |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | archivo del pool, un proxy por línea |

La configuración persiste en `launcher.config.json`; las claves quedan en `keys.txt`, una por línea, con una copia en `%USERPROFILE%\upstage-keys.txt`. `node src/cli.js help` es la lista autoritativa.

## 🛰️ Detrás de un proxy

* `src/proxies.txt` — una salida por línea (el lanzador y cada tarea la leen desde `src/`); `scheme://user:pass@host:port`, `scheme://host:port` o `host:port` sin esquema (por defecto `http://`). Los comentarios después de `#` y las líneas en blanco se ignoran.
* Cada salida recibe una **prueba en el punto de uso** antes de que una cuenta le dedique tiempo; las salidas muertas se descartan, y el pool solo se vuelve a leer cuando el conjunto utilizable se agota.
* Nada escucha en tu propia interfaz: cada solicitud del flujo pasa por el pool.

## 📄 Archivos

| Ruta | Contenido |
| --- | --- |
| `src/keys.txt` | una clave verificada por línea — ignorada por git, nunca se sube al repositorio |
| `src/accounts.json` | correo electrónico / contraseña / clave / estado por cuenta |
| [`models.json`](src/models.json) | la respuesta en vivo de `GET /v1/models` — 16 ids |
| `src/proxies.txt` | tus salidas, una por línea — ignorado por git |
| `src/outputs/`, `src/out/` | capturas de pantalla, volcados del DOM y estado de ejecución — ignorados por git |

## 🔌 Conectar con 9Router

[9Router](https://9router.com) es un router autoalojado y compatible con OpenAI. Upstage es compatible con OpenAI, así que un nodo `openai-compatible` transporta todas las claves:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Valores predeterminados: base `http://localhost:20128`, contraseña `123456`, nodo `Upstage`, prefijo `upstage`, upstream `https://api.upstage.ai/v1`, modelo predeterminado `solar-mini4`. Registra otra clave generada con `--name "<label 2>"` — cada clave se convierte en otra conexión sobre la que 9Router puede equilibrar la carga. Los modelos se sirven entonces como `upstage/<model id>`.

## 🔌 Conectar con OmniRoute

[OmniRoute](https://omniroute.online) es un router autoalojado y compatible con OpenAI. Upstage es compatible con OpenAI, así que un nodo `openai-compatible` transporta todas las claves:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Valores predeterminados: base `http://localhost:20128`, contraseña `123456`, nodo `Upstage`, prefijo `upstage`, upstream `https://api.upstage.ai/v1`, modelo predeterminado `solar-mini4`. Registra otra clave generada con `--name "<label 2>"` — cada clave se convierte en otra conexión sobre la que OmniRoute puede equilibrar la carga. Los modelos se sirven entonces como `upstage/<model id>`.
## 🔑 Qué te da una clave

| | |
| --- | --- |
| 🏢 Proveedor | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 Qué ofrece el proveedor | crédito gratuito de $10 por cuenta — 16 modelos Solar, cada clave verificada con chat |
| 🔑 Qué te da una clave | una clave API limitada a su propia cuenta: los 16 ids de modelo en el endpoint de abajo, con los límites de tu plan. La cuota vive en la **cuenta**, que es exactamente por lo que esta herramienta crea una cuenta por clave |
| 🌐 Forma de la API | compatible con OpenAI: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Tus datos | solo se contacta a upstage.ai y al backend de buzón que configures; las claves permanecen en tu máquina |

## 🐞 Problemas

Abre un issue con el paso fallido, la salida de proxy usada y la salida estándar de la herramienta — los volcados en `outputs/` (capturas de pantalla + DOM en cada paso) hacen que los fallos sean reproducibles sin filtrar una clave.

## 📄 Licencia

MIT © 2026 — consulta [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 colaboradores de upstage-bulk-apikey

</div>