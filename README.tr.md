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

**Otomatik olarak API anahtarları üreten Upstage (upstage.ai) hesaplarını toplu olarak oluşturun — OpenAI ile uyumlu çıkarım + 9Router bağlayıcısı.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-16%20served-412991?style=for-the-badge)](https://developers.upstage.ai)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Hızlı başlangıç](#-hızlı-başlangıç) · [🎁 Ücretsiz katman](#-ücretsiz-katman--ne-kadar-alırsınız) · [🤖 Modeller](#-modeller--tüm-16-sı) · [🧪 API'yi kullanma](#-apiyi-nasıl-kullanılır) · [✅ Doğrulanmış](#-çalıştığı-doğrulanmış--her-anahtar-test edilmiştir) · [🧭 Nasıl çalışır](#-nasıl-çalışır) · [🔌 9Router](#-9router-a-bağlanma) · [⚙️ Seçenekler](#️-cli-seçenekleri) · [🛰️ Vekil sunucular](#️-bir-vekil-sunucu-arkasında) · [🐞 Sorunlar](#-sorunlar)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Neden bu var

Upstage, her hesaba **10$ ücretsiz kredi** ve kendi API anahtarını verir ve ikisi de **hesaba** bağlıdır — bu yüzden faydalı birim, bir hesaptan birçok anahtar değil, *bir anahtar başına bir hesaptır*. Kayıt işlemi gerçek bir tarayıcıdaki barındırılan bir sayfada yapılır; bu araç, vekil listeniz üzerinden tüm süreci otomatik olarak yürütür ve yalnızca gerçek bir tamamlamadan sonra bir anahtarı kaydeder.

## 🎁 Ücretsiz katman — ne kadar alırsınız

**Her yeni Upstage hesabına kart gerekmeden 10$ ücretsiz kredi verilir ve kredi hesaba bağlıdır, anahtara değil.**

| Ne | Değer |
| --- | --- |
| Hoş geldin kredisi | **10,00 $** her hesap başına — konsolun başlangıç sayfası *“Ücretsiz 10$ kredi almak için kaydolun”* der |
| Kart gerekli mi | **Hayır** |
| Hız sınırı | hesabın planına/konsoluna göre; doğrulayıcı, anahtarı suçlamak yerine `403`/`429`/`5xx` durumlarında çıkışları döndürür |
| Kayıt | gerçek bir tarayıcıdaki barındırılan sayfa: her hesap için yeni bir gelen kutusundan e-posta kodu okunur |
| Ölçeklenebilen birim | **bir hesap = bir anahtar** → `--count N` aslında "N × 10$" anlamına gelir |

Oluşturulan bir anahtar, hem `GET /v1/models` hem de gerçek bir `solar-pro2` tamamlamasında **200** döndürür, bu yüzden kredi kart olmadan harcanabilir. **Daha fazla nasıl alınır:** kredi hesaba bağlıdır — `--count N`, her biri kendi anahtarı ve 10$ kredisi olan N hesap oluşturur.

> 💡 Ücretsiz katman, Upstage tarafından belirlenir ve değişebilir. Canlı sayıları [upstage.ai](https://upstage.ai) adresinden kontrol edin — ve aracı kendi geçidinin karar vermesine izin verin:

```bash
node src/cli.js --verify-only     # keys.txt içindeki her anahtar gerçek bir sohbet çağrısıyla yeniden test edilir
```

## 🤖 Modeller — tüm 16'sı

`models.json`, oluşturulan anahtarların canlı `GET /v1/models` yanıtını içerir — **16 kimlik**, bunlara dahildir:

|Model|✓|
|---|---|
|`solar-pro2`|✓|

Bir anahtarın canlı sorgusu:

```bash
curl https://api.upstage.ai/v1/chat/completions \
  -H "Authorization: Bearer up_…" -H "Content-Type: application/json" \
  -d '{"model":"solar-pro2","messages":[{"role":"user","content":"merhaba"}]}'
```

## 🧪 API'yi nasıl kullanılır

Temel URL **`https://api.upstage.ai/v1`** şeklindedir — OpenAI ile uyumlu olduğu için OpenAI konuşan her şey çalışır.

**Herhangi bir SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.upstage.ai/v1", api_key="up_…")
print(client.chat.completions.create(model="solar-pro2",
      messages=[{"role": "user", "content": "merhaba"}]).choices[0].message.content)
```

**Özel temel URL destekleyen herhangi bir ajan / araç** (Cursor, OpenCode, Kilo Code, …): temel URL `https://api.upstage.ai/v1`, bir anahtarı yapıştırın, `models.json` içindeki herhangi bir model kimliğini seçin.

## 🛠 Hızlı başlangıç

```bash
git clone https://github.com/F0Rextasy/upstage-bulk-apikey.git
cd upstage-bulk-apikey

# 1) vekil listeniz, her satırda bir çıkış (http://, socks5://, socks4:// veya sadece host:port)
printf 'socks5://127.0.0.1:1080\n' > src/proxies.txt

# 2) posta kutuları — aracı kendi posta kutunuza yönlendirin (bir gelen kutusu API anahtarı veya IMAP):
#    kayıt kodu, her hesap için yeni bir gelen kutusundan okunur

# 3) başlayın
node src/launcher.js                 # etkileşimli menü: oluştur / tamamla / doğrula / ekrana al
# veya doğrudan çalıştırın:
node src/cli.js mint   --count 30 --conc 2
node src/cli.js finish --conc 2      # anahtar adımı tamamlanmamış hesapları tamamla
node src/cli.js verify --chat        # keys.txt dosyasını yeniden doğrula (modeller + bir sohbet tamamlaması)
```

Araçların yazdığı her şey, `src/` içinde koda bitişik olarak yer alır: `src/keys.txt`, `src/accounts.json`, `src/outputs/` ve `src/out/`; havuz `src/proxies.txt` dosyasından okunur. `node src/cli.js help` tüm görevleri ve bayrakları listeler.

### 🖱️ Başlatıcı

Başlatıcı, sayı, eşzamanlılık ve posta kutusu/vekil ayarlarını sorar, bunları `launcher.config.json` içinde kaydeder ve CLI görevlerini (oluştur / tamamla / doğrula / ekrana al / bağlan) başlatır.

## ✅ Çalıştığı doğrulanmış — her anahtar test edilmiştir

Bir anahtar yalnızca canlı API'den yanıt alındıktan sonra `keys.txt` dosyasına yazılır:

| Kontrol | Çağrı | Beklenen |
|---|---|---|
| kimlik doğrulama + model listesi | `GET https://api.upstage.ai/v1/models` | `200` + hesabın model kimlikleri |
| gerçek üretim | `POST https://api.upstage.ai/v1/chat/completions` (`solar-pro2`) | `200` + boş olmayan `choices[0].message.content` |
| gönderilen paket | **31 farklı hesap → 31 anahtar, her biri doğrulanmıştır** | `modeller` 200 + `solar-pro2` sohbet 200 |

Doğrulayıcı **403/429/5xx/iletim hatalarında çıkışları döndürür** ve yalnızca `401` durumunda bir anahtarı başarısız sayar, bu yüzden bir anahtar asla bir çıkışın reddedilmesi nedeniyle iptal edilmez. `node src/cli.js verify --chat`, kendi dosyanız için tam olarak bu kontrolü yeniden üretir.

## 🧭 Nasıl çalışır

```
posta kutusu (her hesap için bir adres)                                  her hesap için yeni bir adres
   │
   ├─▶ kayıt: Upstage sayfası → e-posta adresi → gelen kutusundan gelen kod / bağlantı
   ├─▶ oturum: hesabın çerezleri veya erişim belirteci elde edilir
   ├─▶ anahtar oluşturma: hesabın anahtar uç noktası → bir kez dönen düz metin anahtarı (hemen diske yazılır)
   └─▶ canlı kanıt: POST https://api.upstage.ai/v1/chat/completions → gerçek içerik = anahtar canlıdır
```

Hesap başına, bir izole Chrome bağlamı (kendi vekil + depolaması):

1. yeni bir posta kutusu — kodlar genellikle saniyeler içinde gelir;
2. `proxies.txt` dosyasından yeni bir çıkış, yalnızca konsol sayfası kontrolünü **o anda** geçerse verilir;
3. barındırılan kayıt → e-posta kodu → konsol;
4. kayıt sözleşmesi → `/api-keys` → **Anahtar oluştur**;
5. anahtar, anahtar oluştur **iletişim yanıtı**ndan yakalanır ve canlı olarak doğrulanır: `GET /v1/models` **ve** gerçek bir `solar-pro2` tamamlaması;
6. durum hesap başına kontrol edilir, bu yüzden bozuk bir çıkış bir denemeye mal olur, tüm pakete değil.

**Tamamlama modu.** Zaten var olan hesaplar, herhangi bir posta olmadan tamamlanabilir: `finish.js`, kayıtlı kimlik bilgileriyle **oturum açar** ve anahtarı oluşturur — zaten sahip olduğunuz bir dosyayı büyütmenin en ucuz yolu.

## ⚙️ CLI seçenekleri

| Görev | Bayraklar |
|---|---|
| `mint` | `--count N` (30) · `--conc N` (3) · `--preset turbo\|balanced\|safe` (eşzamanlılık + tempo aralığı) · `--gap S` · `--idbase N` (0) · `--attempts N` (4) · `--chat-min N` · `--limit N` · `--headed` |
| `finish` | `--conc N` · `--only 25,108` · `--attempts N` · `--limit N` · `--headed` |
| `verify` | `--file keys.txt` · `--limit N` · `--chat` · `--proxy <bir çıkış>` |
| `screen` | `--limit N` · `--conc N` — sağlayıcı API'sine ulaşan çıkışları saklayın |
| `harvest` | ham akış listelerini kullanılır bir havuza dönüştürün |

Turbo önerilir (5); bundan fazlası zayıf bilgisayarda yük/ban riski oluşturabilir.

| Ortam değişkeni | Varsayılan | Anlamı |
| --- | --- | --- |
| `UPSTAGE_PROXIES` | `src/proxies.txt` | havuz dosyası, her satırda bir vekil |

Ayarlar `launcher.config.json` içinde kalıcıdır; anahtarlar `keys.txt` dosyasına, her satıra bir tane olacak şekilde kaydedilir ve `%USERPROFILE%\upstage-keys.txt` konumunda bir kopyası tutulur. `node src/cli.js help` yetkili liste olur.

## 🛰️ Bir vekil sunucu arkasında

* `src/proxies.txt` — her satırda bir çıkış (başlatıcı ve her görev `src/` klasöründen okur); `scheme://user:pass@host:port`, `scheme://host:port` veya sadece `host:port` (varsayılan `http://`). `#` işaretinden sonra gelen yorumlar ve boş satırlar yok sayılır.
* Her çıkış, bir hesabın üzerinde zaman harcamadan önce **kullanım anında bir sorguya** tabi tutulur; ölü çıkışlar atılır ve kullanılabilir küme kuruyana kadar havuz yeniden okunmaz.
* Arayüzünüzde hiçbir şey dinlemez: akıştaki her istek havuz üzerinden geçer.

## 📄 Dosyalar

| Yol | İçerik |
| --- | --- |
| `src/keys.txt` | her satırda bir doğrulanmış anahtar — git tarafından yok sayılır, asla taahhüt edilmez |
| `src/accounts.json` | e-posta / şifre / anahtar / hesap başına durum |
| [`models.json`](src/models.json) | canlı `GET /v1/models` yanıtı — 16 kimlik |
| `src/proxies.txt` | çıkışlarınız, her satırda bir tane — git tarafından yok sayılır |
| `src/outputs/`, `src/out/` | ekran görüntüleri, DOM dökümleri ve çalışma durumu — git tarafından yok sayılır |

## 🔌 9Router'a bağlanma

[9Router](https://9router.com), kendi sunucunuzda barındırılan, OpenAI ile uyumlu bir yönlendiricidir. Upstage OpenAI ile uyumludur, bu yüzden bir `openai-compatible` düğüm her anahtarı taşır:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key <anahtar>            # veya env NINEROUTER_API_KEY
```

Varsayılanlar: temel `http://localhost:20128`, şifre `123456`, düğüm `Upstage`, önek `upstage`, yukarı akış `https://api.upstage.ai/v1`, varsayılan model `solar-mini4`. Başka bir oluşturulan anahtarı `--name "<etiket 2>"` ile kaydedin — her anahtar, 9Router'ın yük dengesi yapabileceği başka bir bağlantı olur. Modeller daha sonra `upstage/<model kimliği>` olarak sunulur.

## 🔑 Bir anahtarın size kazandırdığı

| | |
| --- | --- |
| 🏢 Sağlayıcı | **Upstage** — [upstage.ai](https://upstage.ai) |
| 🎁 Sağlayıcının verdiği | Hesap başına 10$ ücretsiz kredi — 16 Solar modeli, her anahtar sohbetle doğrulanmıştır |
| 🔑 Bir anahtarın size kazandırdığı | Kendi hesabına özgü bir API anahtarı: aşağıdaki uç noktadaki 16 model kimliği, planınızın sınırları dahilinde. Kota **hesaba** bağlıdır, bu yüzden bu araç her anahtar için bir hesap oluşturur |
| 🌐 API yapısı | OpenAI ile uyumlu: `POST https://api.upstage.ai/v1/chat/completions` |
| 🔒 Verileriniz | yalnızca upstage.ai ve yapılandırdığınız gelen kutusu arka ucuyla iletişim kurulur; anahtarlar makinenizde kalır |

## 🐞 Sorunlar

Başarısız olan adımı, kullanılan çıkış ve aracın standart çıktısını içeren bir sorun açın — `outputs/` içindeki dökümler (ekran görüntüleri + her adımda DOM), bir anahtarı sızdırmadan hataları yeniden üretilebilir hale getirir.

## 📄 Lisans

MIT © 2026 — [LİSANS](LICENSE) sayfasına bakın.

<div align="center">

**[MIT](LICENSE)** © 2026 upstage-bulk-apikey katkıda bulunanlar

</div>