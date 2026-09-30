# Roicool form sistemi — tam rehber

roicool.com'daki formların nasıl çalıştığı, verinin nereye gittiği, ölçümün nasıl
kurulduğu ve neyin zorunlu olduğu. Tek kaynak bu dosya.

İlgili dosyalar: kurulum ayrıntıları için `webflow-cloud-forms.md`, QA turu için
`qa-brief.md`.

---

## 1. Bir bakışta

```
Ziyaretçi  ──►  Webflow sayfası (www.roicool.com)
                   │  React code component  <LeadForm/>
                   │
                   ▼  POST (aynı origin)
               www.roicool.com/app/api/lead        ← Webflow Cloud, Next.js, Cloudflare Workers
                   │
                   ├──►  POST https://crm.roicool.com/s/webhook/lead     (x-roicool-token)
                   │
                   └──►  POST https://bzr.openai.com/v1/events           (ChatGPT Ads CAPI)

               tarayıcı ayrıca:
                   └──►  window.dataLayer.push({ event: 'lead_submitted', … })  → GTM → pixel'ler
```

Üç şeyi ayrı tutun, karıştırmak en sık yapılan hata:

| Parça                | Nerede                                | Nasıl güncellenir                                               |
| -------------------- | ------------------------------------- | --------------------------------------------------------------- |
| Form bileşeni        | Webflow sayfalarında (code component) | GitHub Actions kütüphaneyi yükler, **sonra Webflow'da Publish** |
| Route (`/app/api/*`) | Webflow Cloud                         | `main`'e push, otomatik, Publish gerekmez                       |
| Pixel ve etiketler   | GTM konteyneri (`GTM-K5D24HJS`)       | GTM'de yayınlanır                                               |

**Tarayıcı CRM'i hiç görmez.** Token sadece sunucuda durur.

---

## 2. Gönderimde adım adım ne oluyor

1. Ziyaretçi formu doldurur, **Gönder**'e basar.
2. Bileşen alanları tarayıcıda doğrular: zorunlu alanlar, e-posta biçimi ve kurumsal
   olup olmadığı, cep telefonu geçerliliği. Hata varsa istek hiç atılmaz, uyarı ilgili
   alanın altında çıkar.
3. Turnstile jetonu beklenir. Buton "Doğrulanıyor…" olur. 2 saniye geçerse doğrulama
   kutusu çerçevelenip ekranda ortalanır. 20 saniyede jeton gelmezse gönderim yapılmaz.
4. CV varsa önce `/app/api/upload`'a yüklenir, dönen adres `answers.cvFile` olur.
5. **Gönderimden önce** `crypto.randomUUID()` ile bir `eventId` üretilir.
6. `POST /app/api/lead`.
7. Route origin'i kontrol eder, zorunlu alanları ve telefon/e-posta kurallarını
   sunucuda tekrar doğrular.
8. Route CRM'e iletir (3 deneme, üstel bekleme).
9. Route ChatGPT Ads'e dönüşüm olayını gönderir.
10. Route 200 döner. Bileşen teşekkür mesajını formun yerinde gösterir ve
    `dataLayer`'a `lead_submitted` push eder.

**Teşekkür sayfası yok.** Sayfa yenilenmez, yeni sekme açılmaz, URL değişmez.

Ziyaretçiye her durumda "aldık" denir. CRM'e ulaşılamazsa hata loglanır, ziyaretçi
görmez, lead kaybolmasın diye dönüşüm yine bildirilir.

---

## 3. Form türleri

Designer'da "Form" ayarıyla seçilir. Her biri farklı alan seti ve farklı CRM davranışı.

| Form         | Alanlar                                                                 | `formType`        | CRM                  |
| ------------ | ----------------------------------------------------------------------- | ----------------- | -------------------- |
| Kısa form    | firstName, lastName, email, phone                                       | `CONTACT`         | kişi + fırsat        |
| İletişim     | fullName, company, email, phone, sector, message                        | `CONTACT`         | kişi + fırsat        |
| Teklif       | + website, service, budget                                              | `QUOTE`           | kişi + fırsat        |
| E-book       | fullName, company, email, phone, jobTitle                               | `EBOOK`           | yalnızca kişi        |
| Bülten       | email                                                                   | `NEWSLETTER`      | kişi, abone işaretli |
| Geri arama   | fullName, phone, email, time                                            | `CALLBACK`        | kişi + fırsat        |
| İş başvurusu | fullName, email, phone, city, position, experience, cvFile, cv, message | `JOB_APPLICATION` | yalnızca kişi        |

Kısa formda ad ve soyad CRM'de tek bir `fullName` alanında birleşir.

> **Dikkat:** CRM'deki `formType` enum'ında `JOB_APPLICATION` değerinin tanımlı olması
> gerekir. Tanımlı değilse iş başvurusu gönderimleri reddedilebilir.

### Designer ayarları

Görünüm (tema, kart), her alan için ayrı Göster/Gizle anahtarı, metinler (form adı,
buton, teşekkür mesajı, içerik adı), izin kutusu, kişisel e-postaya izin, CRM alanları
(tahmini tutar, para birimi, kampanya kodu), indirilecek dosya, gelişmiş (lead adresi,
Turnstile site key).

Zorunlu alanlar (ad soyad, e-posta) Designer'dan kapatılamaz.

---

## 4. Sticky attributes (attribution)

Reklam tıklama kimlikleri ve kampanya parametreleri ziyaretçinin ilk gelişinde yakalanır
ve form gönderimine kadar saklanır.

**Nerede:** `localStorage`, anahtar **`roicool_attr`**, ömür **90 gün**. Çerez
kullanılmaz.

**Nasıl kurulur:** Webflow → Site settings → Custom code → Head code:

```html
<script src="https://www.roicool.com/app/scripts/attribution.js"></script>
```

Bu script olmadan aşağıdaki alanların hepsi boş gelir.

**Yakalanan parametreler:**

| Anahtar                                                               | Kaynak              |
| --------------------------------------------------------------------- | ------------------- |
| `gclid`                                                               | Google Ads          |
| `fbclid`                                                              | Meta                |
| `ttclid`                                                              | TikTok              |
| `msclkid`                                                             | Microsoft Ads       |
| `li_fat_id`                                                           | LinkedIn            |
| `oppref`                                                              | **ChatGPT Ads**     |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | hepsi               |
| `landingPageUrl`                                                      | ilk gelinen sayfa   |
| `referrer`                                                            | `document.referrer` |

**Davranış modeli — önemli:** "Son reklam tıklaması kazanır, organik ziyaret üzerine
yazmaz."

- Reklam parametresi olmayan sayfa görüntülemeleri hiçbir şeyi ezmez.
- Yeni bir reklam tıklaması geldiğinde o anahtar güncellenir, `landingPageUrl`,
  `referrer` ve 90 günlük sayaç yenilenir.

Saf ilk-dokunuş isteniyorsa script'in değişmesi gerekir. lp.roicool.com'daki
`captureAttr()` aynı modeli kullanıyor, iki taraf tutarlı.

**Doğrulama:** Siteye `?gclid=TEST1&utm_source=google` ile girin, başka bir sayfaya
geçin, konsola:

```js
JSON.parse(localStorage.roicool_attr);
```

---

## 5. CRM'e giden gövde

`POST https://crm.roicool.com/s/webhook/lead`, başlık `x-roicool-token`.

```json
{
  "fullName": "Ayşe Yılmaz",
  "email": "ayse@ornek.com",
  "phone": "+905321234567",
  "companyName": "Örnek A.Ş.",
  "industry": "SAAS",
  "city": "",
  "jobTitle": "",
  "website": "https://ornek.com",
  "message": "…",
  "answers": { "service": "seo", "budget": "50k_150k" },

  "formType": "QUOTE",
  "formName": "Teklif formu",
  "asset": "",
  "language": "TR",
  "marketingConsent": false,
  "estimatedValue": 50000,
  "currencyCode": "TRY",
  "campaignExternalId": "",

  "eventId": "2f1d3852-f856-47ba-8be3-873f4c8c61b4",

  "gclid": "…",
  "fbclid": "…",
  "ttclid": "…",
  "msclkid": "…",
  "li_fat_id": "…",
  "oppref": "gAAAAAb…",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "…",
  "utm_content": "…",
  "utm_term": "…",
  "landingPageUrl": "https://www.roicool.com/?gclid=…",
  "referrer": "",
  "site": "www.roicool.com",
  "pageUrl": "https://www.roicool.com/teklif",

  "fbp": "fb.1.1700000000000.1234567890",
  "userAgent": "Mozilla/5.0 …",

  "formRenderedAt": 1758000000000,
  "fax": "",
  "turnstileToken": "…",

  "source": "GOOGLE_ADS",
  "receivedAt": "2026-09-29T10:00:00.000Z"
}
```

Notlar:

- `source` ve `receivedAt` route ekler. `allowPersonalEmail` route tarafından çıkarılır.
- `answers` anahtarları **dilden bağımsız** alan adlarıdır (`sector`, `budget`), böylece
  İngilizce formdan gelen kayıt Türkçe formdakiyle aynı anahtara düşer.
- Seçenek değerleri de sabittir: sektör `HEALTH_TOURISM`, `SAAS` gibi enum değerleriyle
  `industry` alanına gider.
- `fbp` yalnızca sayfada Meta Pixel çalışıyorsa dolar. Boşsa alan hiç konmaz.
- `fax` honeypot'tur, dolu gelirse CRM spam sayar. Route düşürmez, iletir.
- `formRenderedAt` milisaniye; CRM 3 saniyeden hızlı doldurulan formları eler.

---

## 6. dataLayer sözleşmesi

Başarılı gönderimde, route **200 döndükten sonra** ve CRM gönderimi yok saymadıysa
(`ignored: false`) push edilir.

```js
window.dataLayer.push({
  event: "lead_submitted",

  event_id: "2f1d3852-…", // ChatGPT Ads tekilleştirme kimliği
  lead_id: "fs_99", // CRM form gönderimi kaydı — Meta CAPI event_id
  leadEventId: "fs_99", // aynı değerin eş adı
  person_id: "p_77", // CRM kişi kaydı

  email: "ayse@ornek.com", // yalnızca pazarlama onayı varsa
  phone: "+905321234567", // yalnızca pazarlama onayı varsa
  first_name: "Ayşe", // yalnızca pazarlama onayı varsa
  last_name: "Yılmaz", // yalnızca pazarlama onayı varsa

  form_name: "Teklif formu",
  form_type: "QUOTE",
  opened_deal: true,
  lead_tier: "HOT",

  estimatedValue: 50000, // yalnızca tutar tanımlıysa
  currencyCode: "TRY", // yalnızca tutar tanımlıysa
});
```

### İki ayrı kimlik var, karıştırmayın

| Anahtar                   | Ne                                        | Kim kullanır             |
| ------------------------- | ----------------------------------------- | ------------------------ |
| `event_id`                | Tarayıcıda gönderimden önce üretilen UUID | ChatGPT Ads pixel + CAPI |
| `lead_id` / `leadEventId` | CRM'deki form gönderimi kaydının kimliği  | Meta CAPI                |

`event_id` neden gönderimden önce üretiliyor: tekilleştirme tarayıcı ile sunucunun aynı
kimliği paylaşmasına dayanıyor. CRM yanıtı tarayıcıya geç ulaşır, CRM hata verirse hiç
ulaşmaz; o durumda sunucu bir kimlik bilirken tarayıcı bilmezdi ve dönüşüm iki kez
sayılırdı.

### Kişisel veri ve onay

`email`, `phone`, `first_name`, `last_name` düz metin gider. **Hash'lemeyin** — Google
tarayıcıda, Meta tarafında sGTM kendi hash'ini alıyor, önceden hash'lenmiş değer ikisini
de bozar. Telefon her zaman `+90…` biçiminde; yerel biçim (`0532…`) eşleşmiyor ve
gönderilmiyor.

Ad ve soyad ilk boşluktan ayrılır (CRM aynı bölmeyi yapıyor, iki taraf aynı değeri
hash'lesin diye). Yan etkisi: "Ayşe Nur Yılmaz" → `first_name: "Ayşe"`,
`last_name: "Nur Yılmaz"`.

Onay kapısı sırayla üç kaynağa bakar:

1. `window.ROICOOL_MARKETING_CONSENT` (boolean ya da boolean döndüren fonksiyon)
2. Google Consent Mode'un `ad_user_data` durumu
3. Hiçbiri yoksa **gönderilir**

Üçüncü madde mevcut kurulumun kararı: sitede onay mekanizması yok. Sonucu açık olsun —
onay mekanizması olmadığı sürece düz metin e-posta ve telefon `window.dataLayer` içinde
durur ve sayfadaki her script okuyabilir. Kapı duruyor: bir CMP kurulup
`window.ROICOOL_MARKETING_CONSENT = false` dediğinde kod değişikliği gerekmeden devreye
girer.

---

## 7. GTM kurulumu

Konteyner: `GTM-K5D24HJS`.

### Değişkenler (Data Layer Variable)

| Değişken adı           | Data Layer Variable Name |
| ---------------------- | ------------------------ |
| `DLV - event_id`       | `event_id`               |
| `DLV - lead_id`        | `lead_id`                |
| `DLV - email`          | `email`                  |
| `DLV - phone`          | `phone`                  |
| `DLV - first_name`     | `first_name`             |
| `DLV - last_name`      | `last_name`              |
| `DLV - form_type`      | `form_type`              |
| `DLV - estimatedValue` | `estimatedValue`         |
| `DLV - currencyCode`   | `currencyCode`           |

### Tetikleyici

Custom Event, event adı: `lead_submitted`.

### Etiketler

**OpenAI - Pixel** (mevcut, Özel HTML, **All Pages**). Pixel'i yükler, dönüşüm
göndermez. Mikro dönüşüm script'i de bu yükleyiciye ihtiyaç duyar.

```html
<script>
  !(function (w, d, s, u) {
    if (w.oaiq) return;
    var q = function () {
      q.q.push(arguments);
    };
    q.q = [];
    w.oaiq = q;
    var j = d.createElement(s);
    j.async = 1;
    j.src = u;
    var f = d.getElementsByTagName(s)[0];
    f.parentNode.insertBefore(j, f);
  })(window, document, "script", "https://bzrcdn.openai.com/sdk/oaiq.min.js");
  oaiq("init", { pixelId: "TRBDbyoQkSpCQcJ3n8wxhB", debug: true });
</script>
```

`debug:true` canlıya çıkmadan kapatılmalı.

**OpenAI - Lead** (yeni, Özel HTML, tetikleyici `lead_submitted`).

```html
<script>
  oaiq(
    "measure",
    "lead_created",
    { type: "customer_action" },
    { event_id: "{{DLV - event_id}}" },
  );
</script>
```

Tırnaklara dikkat: GTM `{{…}}` yerine ham değeri yazar, tırnağı kendisi eklemez.

> `event_id`'nin dördüncü argümanda olduğu `custom_event_name` örneğinden çıkarıldı,
> OpenAI SDK belgesiyle doğrulanmadı. `debug:true` açıkken konsolda giden olayın
> içeriğini kontrol edin.

**Meta CAPI** etiketi `{{DLV - lead_id}}` değerini `event_id` olarak gönderir.

**Form - UPD** (Google Enhanced Conversions): Automatic collection yerine **Manual
configuration** seçilip `email`, `phone`, `first_name`, `last_name` değişkenlerine
bağlanır.

---

## 8. ChatGPT Ads dönüşüm ölçümü

İki parça, tek dönüşüm. Ortak `event_id` sayesinde OpenAI ikisini tekilleştirir.

### Sunucudan giden olay

```
POST https://bzr.openai.com/v1/events?pid=<OPENAI_ADS_PIXEL_ID>
Authorization: Bearer <OPENAI_ADS_API_KEY>
Content-Type: application/json
```

```json
{
  "validate_only": false,
  "events": [
    {
      "id": "2f1d3852-…",
      "type": "lead_created",
      "timestamp_ms": 1758000000000,
      "data": { "type": "customer_action" },
      "action_source": "web",
      "source_url": "https://www.roicool.com/iletisim",
      "oppref": "gAAAAAb…",
      "user": {
        "email_sha256": "bfaacf5f…",
        "user_agent": "Mozilla/5.0 …"
      }
    }
  ]
}
```

Uyulan kurallar:

- Olay adı OpenAI'ın belgelenmiş listesinden. Form dönüşümü `lead_created`. Liste dışı
  ad uydurulmaz; gerekirse `custom`.
- `timestamp_ms` tam sayı, son 7 gün içinde, 10 dakikadan fazla ileride değil. Dışındaki
  değer şimdiye çekilir.
- `source_url` yalnızca origin + path. Query ve fragment atılır. Adres okunamazsa
  `action_source` `"other"` olur (aksi halde 400).
- `email_sha256`: kırp → küçük harf → SHA-256 → hex. **Ham e-posta sunucudan çıkmaz.**
- Telefon, ülke, şehir gönderilmez. E-postası olmayan gönderimlerde eşleşme `oppref`
  üzerinden.
- Parti başına tek olay: bir olay hatalıysa tüm parti reddediliyor.
- 400/401/403 kalıcı hata. 429, 5xx ve ağ hatası üç kez denenir.
- `validate_only: true` ile olay doğrulanır ama sayılmaz (kurulum testi).

Çağrı CRM'den bağımsızdır; CRM'e ulaşılamasa da dönüşüm bildirilir. **Tek istisna:** CRM
`ignored: true` ile spam saydıysa bildirilmez, çünkü bileşen o durumda pixel'i de
tetiklemiyor. Route'taki `SKIP_ADS_WHEN_IGNORED` ile değiştirilebilir.

Hata form akışını asla etkilemez, ziyaretçiye gösterilmez, log anahtarı yansıtmaz.

---

## 9. Mikro dönüşümler

Yalnızca pixel tarafı, CAPI'ye gitmez, `event_id` gerekmez. Head code'a:

```html
<script src="https://www.roicool.com/app/scripts/measure.js" defer></script>
```

| Olay                        | Tetikleyici                           |
| --------------------------- | ------------------------------------- |
| `contents_viewed`           | %50 kaydırma **veya** 30 saniye kalma |
| `custom` / `form_start`     | Forma ilk odaklanma (honeypot hariç)  |
| `custom` / `phone_click`    | `tel:` bağlantısı                     |
| `custom` / `whatsapp_click` | `wa.me` ya da `api.whatsapp.com`      |

Her tür sayfa başına bir kez. `window.oaiq` yoksa sessizce atlanır.

---

## 10. Ortam değişkenleri

Webflow Cloud → Project → Environment → Environment variables.

### Zorunlu

| Değişken            | Not                                                             |
| ------------------- | --------------------------------------------------------------- |
| `ROICOOL_CRM_TOKEN` | **Secret.** Bu olmadan CRM'e kayıt düşmez.                      |
| `PUBLIC_SITE_URL`   | `https://www.roicool.com`. Olmadan CV indirme adresi 404 verir. |

### ChatGPT Ads için zorunlu

| Değişken              | Not                                                 |
| --------------------- | --------------------------------------------------- |
| `OPENAI_ADS_PIXEL_ID` | **Secret.** GTM'deki `pixelId` ile **aynı** olmalı. |
| `OPENAI_ADS_API_KEY`  | **Secret.** Repoya, bundle'a, log'a girmez.         |

İkisi girilene kadar CAPI çağrısı sessizce atlanır, form normal çalışır.

### İsteğe bağlı

| Değişken               | Varsayılan                               | Not                                                        |
| ---------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `ROICOOL_CRM_URL`      | `https://crm.roicool.com/s/webhook/lead` |                                                            |
| `LEAD_ALLOWED_ORIGINS` | boş                                      | Doluysa **tek yetkili** odur; kendi origin'inizi de yazın. |
| `LEAD_EMAIL_POLICY`    | `corporate`                              | `any` kontrolü kapatır.                                    |
| `TURNSTILE_SECRET_KEY` | —                                        | Doğrulamayı CRM yapar, route yalnızca iletir.              |
| `OPENAI_ADS_URL`       | —                                        | Yalnızca test. Canlıda boş.                                |
| `BASE_URL`             | Webflow Cloud doldurur                   | Elle set etmeyin.                                          |

R2 kovası: binding `ROICOOL_UPLOADS`, CV yükleme için.

---

## 11. Doğrulama ve spam kuralları

### Tarayıcı ve sunucu ikisi de kontrol eder

| Kural            | Davranış                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| Zorunlu alan boş | Uyarı alanın altında, kırmızı çerçeve, imleç oraya gider                |
| E-posta biçimi   | Reddedilir                                                              |
| Kurumsal e-posta | Gmail, Hotmail gibi ~150 sağlayıcı reddedilir. İş başvurusunda serbest. |
| Cep telefonu     | Sabit hat reddedilir. TR'de yalnızca 501–509, 53x, 54x, 55x.            |
| Origin           | `Origin` başlığı yoksa 403                                              |

Sunucu doğrulama hataları **tek biçimde** döner:

```json
{ "error": "missing_field", "field": "email" }
```

Kullanılan değerler: `missing_field`, `invalid_email`, `free_email_domain`,
`invalid_phone`. Bileşen alanı yalnızca bu biçimde işaretleyebiliyor, **biçimi bozmayın.**

Sunucudaki zorunlu alanlar: CONTACT/QUOTE/DEMO/CALLBACK'te `fullName`; CALLBACK'te
`phone`; kalan türlerde `email`.

### Spam

**Route hiçbir gönderimi kendi başına düşürmez.** Karar CRM'e ait.

- Honeypot (`fax`) dolu gönderim de CRM'e iletilir, orada "Rejected (spam)" olarak
  kaydedilir ve sayılabilir olur.
- Turnstile jetonu doğrulanmaz, olduğu gibi CRM'e geçer. Jeton tek kullanımlıktır; iki
  yerde doğrulanırsa ikincisi her zaman başarısız olur.
- CRM `ignored: true` dönerse route loglar: `lead ignored: <reason> (<formSubmissionId>)`.
  **Sebep tarayıcıya iletilmez** — bot hangi kontrole takıldığını öğrenmemeli.
- Yok sayılan gönderimde `dataLayer` olayı push edilmez ve CAPI çağrısı yapılmaz.

---

## 12. Dil

Dil sayfanın `<html lang>` değerinden gelir; Designer'dan elle de seçilebilir. Tanınmayan
ya da boş değerde **Türkçeye** düşer.

Alan etiketleri, seçenek listeleri, uyarılar ve buton metni çevrilir. CRM'e giden veri
dilden bağımsızdır: `answers` anahtarı alan adı, seçenek değeri sabit enum.

---

## 13. Tema

Açık, Koyu, Otomatik. **Otomatik**, ziyaretçinin sistem temasını değil formun altındaki
zemini izler: beyaz bir kartın içindeki form, sistem koyu temada olsa bile açık tema
çıkar. Aksi halde beyaz kart üstünde beyaz yazı oluyordu.

Stil bileşenin kendi çıktısında bir `<style>` etiketi olarak gider, head'e enjekte
edilmez (Designer canvas'ı ve shadow DOM için). `.rc-lead-form` sınıfına Webflow'dan
custom CSS yazarak her şey ezilebilir.

---

## 14. CV yükleme

Yalnızca iş başvurusu formunda. `POST /app/api/upload` → R2 → dönen adres
`answers.cvFile`.

Kurallar: en fazla **5 MB**, yalnızca **pdf, doc, docx**. Son uzantıya bakılır
(`cv.pdf.exe` elenir) ve gerçek içerik imzası uzantıyla eşleşmek zorundadır, yani uzantısı
değiştirilmiş çalıştırılabilir dosya geçemez. Depolama anahtarı rastgeledir, kullanıcının
verdiği ad hiçbir zaman yol olarak kullanılmaz. Dosya servis edilirken içerik tipi
`application/octet-stream`'e sabitlenir, tarayıcıda çalıştırılamaz.

**Virüs taraması yok.** Dosyalar güvenilmez kabul edilmeli.

---

## 15. Kurulum kontrol listesi

### Mecburi

- [ ] `ROICOOL_CRM_TOKEN` girilmiş (Secret)
- [ ] `PUBLIC_SITE_URL` girilmiş
- [ ] Head code'da attribution script'i
- [ ] Webflow'da Publish yapılmış (bileşen değişikliklerinden sonra her seferinde)

### ChatGPT Ads için mecburi

- [ ] `OPENAI_ADS_PIXEL_ID` ve `OPENAI_ADS_API_KEY` girilmiş (Secret)
- [ ] Pixel ID, GTM'deki `pixelId` ile aynı
- [ ] GTM'de `DLV - event_id` değişkeni
- [ ] GTM'de `lead_submitted` custom event tetikleyicisi
- [ ] GTM'de "OpenAI - Lead" etiketi
- [ ] GTM'de `debug:true` kapatılmış

### Önerilen

- [ ] Head code'da mikro dönüşüm script'i
- [ ] `LEAD_ALLOWED_ORIGINS` doldurulmuş
- [ ] Meta Pixel GTM'de yayında (yoksa `fbp` boş gelir)
- [ ] `Form - UPD` Manual configuration'a çevrilmiş

---

## 16. Teşhis

Tarayıcıdan açılabilir, sır içermez:

```
https://www.roicool.com/app/api/lead
```

| Alan             | Ne söyler                                            |
| ---------------- | ---------------------------------------------------- |
| `hasToken`       | CRM token'ı girilmiş mi                              |
| `openaiAds`      | ChatGPT Ads anahtarları girilmiş mi                  |
| `siteUrl`        | `PUBLIC_SITE_URL` değeri                             |
| `uploads`        | R2 kovası bulundu mu                                 |
| `allowedOrigins` | Kaç origin tanınıyor                                 |
| `emailPolicy`    | `corporate` mi `any` mi                              |
| `crmHost`        | Hangi CRM adresine gidiliyor                         |
| `basePath`       | Mount path (Webflow Cloud'da boş görünür, normaldir) |

### Sorun giderme

| Belirti                      | Sebep                                          |
| ---------------------------- | ---------------------------------------------- |
| `403 forbidden`              | Origin listede yok, ya da `Origin` başlığı yok |
| `422 missing_field`          | Zorunlu alan eksik, yanıtta hangisi yazar      |
| `422 invalid_phone`          | Cep numarası değil ya da TR öneki kapsam dışı  |
| Buton "Doğrulanıyor…" takılı | Turnstile jetonu gelmiyor, konsola bakın       |
| Form eski davranıyor         | Publish yapılmamış ya da tarayıcı önbelleği    |
| dataLayer'da `event_id` yok  | Eski bileşen yayında                           |
| Dönüşüm iki kez sayılıyor    | GTM'deki etiket `event_id` göndermiyor         |
| CRM'de utm alanları boş      | Attribution script'i head'de değil             |

Test gönderimi için `qa@roicool.com` gibi kurumsal bir adres kullanın; Gmail reddedilir.

---

## 17. Bilinen sınırlar ve alınmış kararlar

- **Virüs taraması yok.** Dosya kontrolü tür, boyut ve içerik imzasıyla sınırlı.
- **Telefon doğrulaması** numaranın biçimini ve aralığını kontrol eder, hattın gerçekten
  açık olduğunu bilmez.
- **CV indirme bağlantısı** tahmin edilemeyecek kadar uzun rastgele bir kimlik taşır ama
  bağlantıyı bilen herkes dosyayı indirebilir.
- **CRM'e ulaşılamadığında** ziyaretçi yine "teşekkürler" görür. Bilinçli tercih.
- **Onay mekanizması yok**, kişisel veri dataLayer'a düz metin olarak konur (§6).
- **56x cep öneki kapsam dışı.** 561 gerçek bir Turkcell öneki; geri istenirse tek satır.
- **Ad soyad ilk boşluktan bölünür.** CRM'le tutarlı olsun diye. Son boşluktan bölmeye
  geçilecekse CRM tarafıyla birlikte değişmeli, yoksa hash'ler ayrışır.
- **lp.roicool.com bu depodaki köprüyü kullanmıyor**, kendi vanilla script'i ve Payload
  backend'i var. `LEAD_ALLOWED_ORIGINS` içindeki girdisi kaldırılabilir.

---

## 18. Depo ve deploy

Depo: `Roicool/roicool-main`, dal `main`.

```
main'e push
   ├─► Webflow Cloud uygulaması          otomatik, birkaç dakika, Publish gerekmez
   └─► GitHub Actions
         ├─ testler + typecheck + bundle
         └─ devlink import → workspace    2-3 dakika
              └─► Webflow'da Publish      ELLE — bileşen bu olmadan ziyaretçiye ulaşmaz
```

Route değişikliği kendiliğinden canlıya çıkar. Bileşen değişikliği Publish bekler.

Yerel:

```bash
npm run typecheck
npm test
npm run build
npm run components:bundle   # yerel derleme kontrolü
```
