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

**Otomatik oluşturulan API anahtarlarıyla toplu Upstage (upstage.ai) hesabı oluşturun — OpenAI uyumlu çıkarım + 9Router bağlayıcısı.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Hızlı başlangıç](#-quick-start) · [🎁 Ücretsiz katman](#-free-tier--how-much-you-get) · [🤖 Modeller](#-models--all-16-of-them) · [🧪 API'yi kullanma](#-how-to-use-the-api) · [✅ Doğrulandı](#-verified-working--every-key-is-tested) · [🧭 Nasıl çalışır](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Seçenekler](#️-cli-options) · [🛰️ Proxy'ler](#️-behind-a-proxy) · [🐞 Sorunlar](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>





---

## ✨ Neden var

Upstage her hesaba **$10 ücretsiz kredi** ve kendi API anahtarını verir; ikisi de **hesapta** yaşar — yani faydalı birim *anahtar başına bir hesaptır*, asla tek hesaptan birçok anahtar değildir. Kayıt, gerçek bir tarayıcıda barındırılan bir sayfadır; bu araç tüm yolu proxy listeniz üzerinden gözetimsiz kat eder ve bir anahtarı ancak gerçek bir tamamlama sonrasında kaydeder.

## 🎁 Ücretsiz katman — ne kadar alırsınız

**Her yeni Upstage hesabı $10 ücretsiz kredi alır — kart gerekmez — ve kredi anahtarda değil, hesapta yaşar.**

| Ne | Değer |
| --- | --- |
| Hoş geldin kredisi | Hesap başına **$10.00** — konsolun başlangıç sayfası *“$10 ücretsiz kredi almak için kaydolun”* der |
| Kart gerekli mi | **Hayır** |
| Hız sınırı | hesabın planına/konsoluna göre; doğrulayıcı `403`/`429`/`5xx` durumlarında anahtarı suçlamak yerine çıkışları değiştirir |
| Kayıt | gerçek bir tarayıcıda barındırılan sayfa: hesap başına taze bir gelen kutusundan okunan e-posta kodu |
| Ölçeklenen birim | **bir hesap = bir anahtar** → `--count N` aslında "N × $10" demektir |

Oluşturulan bir anahtar hem `GET /v1/models` hem de gerçek bir `solar-pro2` tamamlamasında **200** yanıtı verir; böylece kredi kart olmadan harcanabilir. **Daha fazlası nasıl alınır:** kredi hesapta yaşar — `--count N`, her biri kendi anahtarına ve $10'a sahip N hesap oluşturur.

> 💡 Ücretsiz katman Upstage tarafından belirlenir ve değişebilir. Güncel sayıları [upstage.ai](https://upstage.ai) adresinden kontrol edin — ve kararı aracın kendi kontrolüne bırakın:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modeller — 16'sının tamamı

`models.json`, oluşturulan anahtarların canlı `GET /v1/models` yanıtıdır — şunlar dahil **16 kimlik**:

|Model|✓|
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

2026-10-19 canlı yeniden kontrolü: 16 katalog kimliğinden 12'si bir sohbet isteğine `200` yanıtı verdi (test edilen diğer kimlikler — `solar-decide`, `solar-decide-flash`, `solar-jev` — vermedi).

Bir anahtarın canlı denemesi:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"hi"}]}'
```

## 🧪 API nasıl kullanılır

Temel URL **`https://api.upstage.ai/v1`** — OpenAI uyumludur, yani OpenAI protokolünü konuşan her şey çalışır.

**Herhangi bir SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Özel temel URL kullanan herhangi bir ajan / araç** (Cursor, OpenCode, Kilo Code, …): temel URL `https://api.upstage.ai/v1`, bir anahtar yapıştırın, `models.json` içinden herhangi bir model kimliği seçin.

## 🛠 Hızlı başlangıç

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

Araçların yazdığı her şey **kodun yanına**, `src/` içine düşer: `src/keys.txt`, `src/accounts.json`, `src/outputs/` ve `src/out/`; havuz `src/proxies.txt` dosyasından okunur. `node src/cli.js help` her görevi ve bayrağı listeler.

### 🖱️ Başlatıcı

Başlatıcı sayıyı, eşzamanlılığı ve posta kutusu/proxy ayarlarını sorar, bunları `launcher.config.json` içinde hatırlar ve CLI görevlerini (mint / finish / verify / screen / connect) yönlendirir.

## ✅ Çalıştığı doğrulandı — her anahtar test edilir

Bir anahtar `keys.txt` dosyasına ancak canlı API onunla yanıt verdikten sonra yazılır:

| Kontrol | Çağrı | Beklenen |
|---|---|---|
| kimlik doğrulama + model listesi | `GET https://api.upstage.ai/v1/models` | `200` + hesabın model kimlikleri |
| gerçek üretim | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + boş olmayan `choices[0].message.content` |
| gönderilen toplu iş | **31 farklı hesap → 31 anahtar, her biri doğrulandı** | `models` 200 + `solar-pro2` sohbet 200 |

Doğrulayıcı **403/429/5xx/taşıma hatalarında çıkışları değiştirir** ve bir anahtarı yalnızca `401` durumunda başarısız sayar; böylece bir çıkış reddedildi diye bir anahtar asla mahkûm edilmez. `node src/cli.js verify --chat` kendi dosyanız için tam olarak bu kontrolü yeniden üretir.

## 🧭 Nasıl çalışır

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Upstage page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.upstage.ai/v1/chat/completions → real content = the key is live
```

Hesap başına, yalıtılmış bir Chrome bağlamı (kendi proxy'si + depolaması):

1. taze bir posta kutusu — kodlar genellikle saniyeler içinde gelir;
2. `proxies.txt` dosyasından taze bir çıkış; yalnızca konsol sayfası kontrolüne **tam o anda** yanıt verirse dağıtılır;
3. barındırılan kayıt → e-posta kodu → konsol;
4. kayıt sözleşmesi → `/api-keys` → **Anahtar oluştur**;
5. anahtar, anahtar oluşturma **ağ yanıtından** yakalanır ve canlı doğrulanır: `GET /v1/models` **ve** gerçek bir `solar-pro2` tamamlaması;
6. durum hesap başına kayıt altına alınır; böylece ölü bir çıkış bir denemeye mal olur, tüm toplu işe değil.

**Bitirme modu.** Zaten var olan hesaplar hiç posta olmadan bitirilebilir: `finish.js` kayıtlı kimlik bilgileriyle **oturum açar** ve anahtarı oluşturur — zaten sahip olduğunuz bir dosyayı büyütmenin en ucuz yolu.

## ⚙️ CLI seçenekleri

| Görev | Bayraklar |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (eşzamanlılık + tempo aralığı) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <one exit>` |
| `screen` | `--limit N` · `--conc N` — yalnızca sağlayıcı API'sine ulaşan çıkışları tut |
| `harvest` | ham besleme listelerini kullanılabilir bir havuza dönüştür |

Turbo önerilir (5); daha fazlası zayıf bilgisayarda yük/ban riski.

| Ortam değişkeni | Varsayılan | Anlamı |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | havuz dosyası, satır başına bir proxy |

Ayarlar `launcher.config.json` içinde kalıcıdır; anahtarlar `keys.txt` dosyasına satır başına bir tane olacak şekilde düşer ve `%USERPROFILE%\upstage-keys.txt` konumunda bir kopyası bulunur. `node src/cli.js help` asıl listeyi verir.

## 🛰️ Proxy arkasında

* `src/proxies.txt` — satır başına bir çıkış (başlatıcı ve her görev onu `src/` içinden okur); `scheme://user:pass@host:port`, `scheme://host:port` veya çıplak `host:port` (varsayılan `http://`). `#` sonrası yorumlar ve boş satırlar yok sayılır.
* Her çıkış, bir hesap üzerinde zaman harcamadan önce **kullanım anında yoklama** alır; ölü çıkışlar düşürülür ve havuz yalnızca kullanılabilir küme tükendiğinde yeniden okunur.
* Kendi ağ arayüzünüzde hiçbir hizmet dinlemez: akıştaki her istek havuz üzerinden gider.

## 📄 Dosyalar

| Yol | İçerik |
| --- | --- |
| `src/keys.txt` | satır başına bir doğrulanmış anahtar — git tarafından yok sayılır, asla commit edilmez |
| `src/accounts.json` | e-posta / parola / anahtar / hesap başına durum |
| [`models.json`](src/models.json) | canlı `GET /v1/models` yanıtı — 16 kimlik |
| `src/proxies.txt` | çıkışlarınız, satır başına bir tane — git tarafından yok sayılır |
| `src/outputs/`, `src/out/` | ekran görüntüleri, DOM dökümleri ve çalışma durumu — git tarafından yok sayılır |

## 🔌 9Router'a bağlan

[9Router](https://9router.com) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir. Upstage OpenAI uyumludur, bu yüzden tek bir `openai-compatible` düğümü her anahtarı taşır:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <key>            # or env NINEROUTER_API_KEY
```

Varsayılanlar: temel `http://localhost:20128`, parola `123456`, düğüm `Upstage`, önek `upstage`, üst kaynak `https://api.upstage.ai/v1`, varsayılan model `solar-mini4`. Başka bir oluşturulmuş anahtarı `--name "<label 2>"` ile kaydedin — her anahtar, 9Router'ın yük dengeleyebileceği başka bir bağlantı olur. Modeller ardından `upstage/<model id>` olarak sunulur.

## 🔑 Bir anahtar size ne kazandırır

| | |
| --- | --- |
| 🏢 Sağlayıcı | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 Sağlayıcının verdikleri | hesap başına $10 ücretsiz kredi — 16 Solar modeli, her anahtar sohbetle doğrulanmış |
| 🔑 Bir anahtar size ne kazandırır | kendi hesabına kapsamlı bir API anahtarı: aşağıdaki uç noktada 16 model kimliği, planınızın sınırlarında. Kota **hesapta** yaşar; bu araç tam da bu yüzden anahtar başına bir hesap oluşturur |
| 🌐 API biçimi | OpenAI uyumlu: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Verileriniz | yalnızca upstage.ai ve yapılandırdığınız gelen kutusu arka ucuna bağlantı kurulur; anahtarlar makinenizde kalır |

## 🐞 Sorunlar

Başarısız adımı, kullanılan çıkışı ve aracın stdout çıktısını içeren bir sorun kaydı açın — `outputs/` içindeki dökümler (her adımda ekran görüntüleri + DOM) anahtar sızdırmadan hataları yeniden üretilebilir kılar.

## 📄 Lisans

MIT © 2026 — bkz. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 up