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

**Crie contas Upstage (upstage.ai) em massa com chaves de API geradas automaticamente — inferência compatível com OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Início rápido](#-quick-start) · [🎁 Camada gratuita](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-16-of-them) · [🧪 Use a API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Como funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opções](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>


---

## ✨ Por que isso existe

A Upstage dá a cada conta **$10 de crédito gratuito** e sua própria chave de API, e ambos ficam na **conta** — portanto a unidade útil é *uma conta por chave*, nunca muitas chaves de uma única conta. O cadastro é uma página hospedada em um navegador real; esta ferramenta percorre todo o caminho sem supervisão, sobre a sua lista de proxies, e só registra uma chave após uma conclusão real.

## 🎁 Camada gratuita — quanto você recebe

**Toda nova conta Upstage recebe $10 de crédito gratuito — sem cartão — e o crédito fica na conta, não na chave.**

| O quê | Valor |
| --- | --- |
| Crédito de boas-vindas | **$10.00** por conta — a página de primeiros passos do console diz *“Cadastre-se para receber $10 em crédito gratuito”* |
| Cartão exigido | **Não** |
| Limite de taxa | conforme o plano/console da conta; o verificador alterna saídas em `403`/`429`/`5xx` em vez de culpar a chave |
| Cadastro | página hospedada em um navegador real: código de e-mail lido de uma caixa de entrada nova por conta |
| A unidade que escala | **uma conta = uma chave** → `--count N` é na verdade "N × $10" |

Uma chave gerada responde **200** tanto em `GET /v1/models` quanto em uma conclusão real de `solar-pro2`, então o crédito é utilizável sem cartão. **Como obter mais:** o crédito fica na conta — `--count N` gera N contas, cada uma com sua própria chave e $10.

> 💡 A camada gratuita é definida pela Upstage e pode mudar. Confira os números atuais em [upstage.ai](https://upstage.ai) — e deixe o próprio portão da ferramenta decidir:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — todos os 16

`models.json` é a resposta ao vivo de `GET /v1/models` das chaves geradas — **16 ids**, incluindo:

|Modelo|✓|
|---|---|
|`solar-pro2`|✓|

Sonda ao vivo de uma chave:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 Como usar a API

A URL base é **`https://api.upstage.ai/v1`** — compatível com OpenAI, então qualquer coisa que fale OpenAI funciona.

**Qualquer SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Qualquer agente / ferramenta com URL base personalizada** (Cursor, OpenCode, Kilo Code, …): URL base `https://api.upstage.ai/v1`, cole uma chave, escolha qualquer id de modelo de `models.json`.

## 🛠 Início rápido

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

Tudo o que as ferramentas gravam fica **ao lado do código**, em `src/`: `src/keys.txt`, `src/accounts.json`, `src/outputs/` e `src/out/`; o pool é lido de `src/proxies.txt`. `node src/cli.js help` lista todas as tarefas e flags.

### 🖱️ O launcher

O launcher pede a quantidade, a concorrência e as configurações de caixa de entrada/proxy, memoriza-as em `launcher.config.json` e despacha as tarefas da CLI (mint / finish / verify / screen / connect).

## ✅ Verificado funcionando — toda chave é testada

Uma chave só é gravada em `keys.txt` depois que a API ao vivo responde com ela:

| Verificação | Chamada | Esperado |
|---|---|---|
| auth + lista de modelos | `GET https://api.upstage.ai/v1/models` | `200` + os ids de modelo da conta |
| geração real | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + `choices[0].message.content` não vazio |
| o lote enviado | **31 contas distintas → 31 chaves, todas verificadas** | `models` 200 + chat `solar-pro2` 200 |

O verificador **alterna saídas em 403/429/5xx/erros de transporte** e só reprova uma chave em `401`, então uma chave nunca é condenada porque uma saída foi rejeitada. `node src/cli.js verify --chat` reproduz exatamente essa verificação para o seu próprio arquivo.

## 🧭 Como funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

Por conta, um contexto Chrome isolado (seu próprio proxy + armazenamento):

1. uma caixa de entrada nova — os códigos geralmente chegam em segundos;
2. uma saída nova de `proxies.txt`, entregue apenas se ela passar na verificação da página do console **naquele momento**;
3. cadastro hospedado → código de e-mail → console;
4. o aceite do cadastro → `/api-keys` → **Create key**;
5. a chave é capturada da **resposta de rede** da criação da chave e verificada ao vivo: `GET /v1/models` **e** uma conclusão real de `solar-pro2`;
6. o estado é salvo a cada conta, então uma saída morta custa uma tentativa, não o lote.

**Modo finish.** Contas que já existem podem ser concluídas sem nenhum e-mail: `finish.js` faz **login** com as credenciais registradas e gera a chave — a forma mais barata de ampliar um arquivo que você já tem.

## ⚙️ Opções da CLI

| Tarefa | Flags |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (conc + pacing gap) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — keep only exits that reach the provider API |
| `harvest` | screen raw feed lists into a usable pool |

Turbo é recomendado (5); mais que isso é risco de carga/ban em computador fraco.

| Variável de ambiente | Padrão | Significado |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | arquivo do pool, um proxy por linha |

As configurações persistem em `launcher.config.json`; as chaves ficam em `keys.txt`, uma por linha, com um espelho em `%USERPROFILE%\upstage-keys.txt`. `node src/cli.js help` é a lista autoritativa.

## 🛰️ Atrás de um proxy

* `src/proxies.txt` — uma saída por linha (o launcher e todas as tarefas leem de `src/`); `scheme://user:pass@host:port`, `scheme://host:port` ou apenas `host:port` (padrão `http://`). Comentários após `#` e linhas em branco são ignorados.
* Toda saída passa por uma **sonda no momento do uso** antes que uma conta gaste tempo com ela; saídas mortas são descartadas, e o pool só é relido quando o conjunto utilizável se esgota.
* Nada escuta na sua própria interface: toda requisição do fluxo passa pelo pool.

## 📄 Arquivos

| Caminho | Conteúdo |
| --- | --- |
| `src/keys.txt` | uma chave verificada por linha — ignorado pelo git, nunca commitado |
| `src/accounts.json` | e-mail / senha / chave / estado por conta |
| [`models.json`](src/models.json) | a resposta ao vivo de `GET /v1/models` — 16 ids |
| `src/proxies.txt` | suas saídas, uma por linha — ignorado pelo git |
| `src/outputs/`, `src/out/` | capturas de tela, dumps de DOM e estado de execução — ignorados pelo git |

## 🔌 Conectar ao 9Router

[9Router](https://9router.com) é um roteador auto-hospedado e compatível com OpenAI. A Upstage é compatível com OpenAI, então um único nó `openai-compatible` carrega todas as chaves:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Padrões: base `http://localhost:20128`, senha `123456`, nó `Upstage`, prefixo `upstage`, upstream `https://api.upstage.ai/v1`, modelo padrão `solar-mini4`. Registre outra chave gerada com `--name "<label 2>"` — cada chave se torna mais uma conexão pela qual o 9Router pode balancear a carga. Os modelos são então servidos como `upstage/<model id>`.

## 🔑 O que uma chave te dá

| | |
| --- | --- |
| 🏢 Provedor | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 O que o provedor oferece | $10 de crédito gratuito por conta — 16 modelos Solar, toda chave verificada por chat |
| 🔑 O que uma chave te dá | uma chave de API vinculada à sua própria conta: os 16 ids de modelo no endpoint abaixo, nos limites do seu plano. A cota fica na **conta**, e é exatamente por isso que esta ferramenta cria uma conta por chave |
| 🌐 Formato da API | Compatível com OpenAI: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Seus dados | apenas upstage.ai e o backend de caixa de entrada que você configurar são contatados; as chaves ficam na sua máquina |

## 🐞 Problemas

Abra uma issue com o passo que falhou, a saída utilizada e o stdout da ferramenta — os dumps em `outputs/` (capturas de tela + DOM em cada passo) tornam as falhas reproduzíveis sem vazar uma chave.

## 📄 Licença

MIT © 2026 — veja [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 contribuidores do upstage-bulk-apikey

</div>