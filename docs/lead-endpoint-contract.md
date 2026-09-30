# Lead endpoint sözleşmesi — kabul edilen ve dönen her değer

`POST https://crm.roicool.com/s/webhook/lead` için eksiksiz referans. Yalnızca form gönderimini
kapsar: istek nasıl okunur, hangi değerler kabul edilir, CRM ne türetir, hangi kayıtları yazar,
ne döner. Entegrasyon adımları (script'ler, Turnstile kurulumu, backend örneği) için
[`lead-endpoint-integration.md`](lead-endpoint-integration.md).

Bu belge koddan çıkarıldı (`inbound-lead.ts`, `lead-intake.ts`, `spam-guard.ts`,
`normalize.ts`, `lead-scoring.ts`, `channel.ts`, `email-domain.ts`, `industry.ts`,
`rejected-submission.ts`). Kod değişirse burası da değişmeli.

---

## 1. İstek

|             |                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Yöntem      | `POST`, gövde JSON (`Content-Type: application/json`)                                                                                                        |
| Kimlik      | `x-roicool-token: <LEAD_WEBHOOK_TOKEN>` header'ı **ya da** `?token=<LEAD_WEBHOOK_TOKEN>` query parametresi. Değer trim'lenir, sabit zamanlı karşılaştırılır. |
| Ek header   | `x-roicool-form-type` (isteğe bağlı; gövdede `formType` yoksa okunur)                                                                                        |
| İletilen IP | `cf-connecting-ip`, yoksa `x-forwarded-for`'un ilk adresi — yalnızca Turnstile doğrulamasına gider                                                           |
| Zaman aşımı | 30 sn                                                                                                                                                        |

İşlem sırası: **token → gövde JSON mu → alan okuma → spam kontrolü → kayıt**. Spam kontrolü
kaydın önündedir; spam sayılan gönderim kişi, fırsat, not ya da bildirim üretmez.

---

## 2. Kabul edilen alanlar

Hepsi isteğe bağlı. Tek zorunluluk spam kontrolünden geçmek için **geçerli bir e-posta ya da
en az 7 haneli bir telefon**. Bilinmeyen alanlar sessizce yok sayılır (honeypot listesindekiler hariç, §5).

### 2.1 Kimlik

| Alan                     | Alternatif adlar | Kabul edilen değer | Nasıl işlenir                                                                                                                                                                                                                                                        |
| ------------------------ | ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email`                  | —                | metin              | Trim + küçük harf. `@` yoksa **yok sayılır** (boş kabul edilir). Kişi eşlemesinin birincil anahtarı.                                                                                                                                                                 |
| `phone`                  | —                | metin, her format  | Rakam dışı her şey atılır. 7 haneden azsa yok sayılır. `0` ile başlayan 11 hane → `90…`; `5` ile başlayan 10 hane → `90…`. Ülke kodu 40 kodluk tablodan ayrıştırılır (en uzun kod önce; `971` `97`'yi ezer). Eşleşen kod yoksa tümü numara olarak, ülke boş yazılır. |
| `firstName` + `lastName` | —                | metin              | Verilirse olduğu gibi (trim).                                                                                                                                                                                                                                        |
| `fullName`               | `name`           | metin              | `firstName`/`lastName` yoksa boşluktan bölünür: **son kelime soyadı**, kalanı ad. Tek kelime → ad.                                                                                                                                                                   |

Ad, e-posta ve telefonun **üçü de** yoksa kayıt `422` ile reddedilir — ama spam kontrolü
zaten e-posta/telefon istediği için bu pratikte görülmez.

### 2.2 Form bilgisi

| Alan                | Alternatif adlar                               | Kabul edilen değer                                                                  | Nasıl işlenir                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `formType`          | `type`, `intent`, header `x-roicool-form-type` | enum ya da serbest metin                                                            | Aşağıdaki eşleme. Hiçbiri yoksa **`CONTACT`**.                                                                                                                                                               |
| `formName`          | —                                              | metin                                                                               | Formun / landing page'in adı. Kişide `leadForm`, fırsatta `leadForm`, Form Submission'da `formName`. Fırsat ve gönderim adında kullanılır.                                                                   |
| `asset`             | —                                              | metin                                                                               | İndirilen / kaydolunan şey (e-book, webinar, etkinlik). Fırsat adında `campaignName` ve `formName`'in **önüne** geçer.                                                                                       |
| `message`           | —                                              | metin                                                                               | Nota olduğu gibi; Form Submission'a 5.000 karaktere kısaltılarak. Spam kontrolünde link sayılır.                                                                                                             |
| `answers`           | —                                              | `{ "Soru": "Cevap" }`                                                               | Boş değerler atılır. Nota ve Form Submission'a (`answers`, JSON) yazılır. `answers.Industry` / `answers.Sector` / `answers.Sektör` sektör tespitinde okunur; anahtarlarda "budget/bütçe" geçmesi puan verir. |
| `language`          | —                                              | metin (`TR`, `EN`, `DE`…)                                                           | Kişide `leadLanguage`, gönderimde `language`.                                                                                                                                                                |
| `marketingConsent`  | `consent`, `newsletterOptIn`                   | `true` ya da `"true"`, `"1"`, `"yes"`, `"on"`, `"evet"` (büyük/küçük harf duyarsız) | Başka her değer `false`. `formType: NEWSLETTER` ise izin **her zaman** `true` sayılır.                                                                                                                       |
| `createOpportunity` | —                                              | boolean                                                                             | `formType`'ın varsayılanını ezer (bkz. §4). Boolean olmayan değer yok sayılır.                                                                                                                               |
| `personOnly`        | —                                              | boolean                                                                             | Eski alan. Yalnızca `true` ise etkili: fırsat açılmaz. `createOpportunity` verilmişse o kazanır.                                                                                                             |
| `receivedAt`        | —                                              | ISO tarih                                                                           | Gönderimin gerçek zamanı. Boşsa sunucu saati. `leadReceivedAt`, `lastFormAt`, `consentAt`, `submittedAt` bundan alınır.                                                                                      |

**`formType` eşlemesi.** Değer büyük harfe çevrilir, boşluk ve `-` → `_`. Enum'daki 12 değerden
biriyse aynen alınır; değilse metinde geçen parçaya göre, **bu sırayla**:

| Metinde geçen                                                                    | Sonuç             |
| -------------------------------------------------------------------------------- | ----------------- |
| `NEWSLETTER`, `SUBSCRI`, `BULTEN`, `BÜLTEN`                                      | `NEWSLETTER`      |
| `EBOOK`, `E_BOOK`, `GUIDE`, `DOWNLOAD`, `WHITEPAPER`, `REHBER`                   | `EBOOK`           |
| `WEBINAR`                                                                        | `WEBINAR`         |
| `EVENT`, `ETKINLIK`                                                              | `EVENT`           |
| `QUOTE`, `PRIC`, `TEKLIF`, `FIYAT`                                               | `QUOTE`           |
| `DEMO`, `AUDIT`, `ANALIZ`                                                        | `DEMO`            |
| `JOB`, `CAREER`, `KARIYER`, `KARİYER`, `BASVURU`, `BAŞVURU`, `APPLICATION`, `CV` | `JOB_APPLICATION` |
| `CALLBACK`, `WHATSAPP`, `CALL`                                                   | `CALLBACK`        |
| `LEAD_AD`, `LEADGEN`, `LEAD_FORM`                                                | `LEAD_AD`         |
| `CHAT`, `BOT`                                                                    | `CHATBOT`         |
| `CONTACT`, `ILETISIM`, `İLETİŞİM`                                                | `CONTACT`         |
| hiçbiri                                                                          | `OTHER`           |

Sıra önemli: `"demo-call"` → `DEMO` (önce eşleşir), `"contact-us"` → `CONTACT`.

### 2.3 Kaynak ve kanal

| Alan             | Alternatif adlar         | Kabul edilen değer       | Nasıl işlenir                                                                                                                                                                 |
| ---------------- | ------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`         | —                        | enum ya da serbest metin | Eşleme aşağıda. Boşsa **çıkarım** yapılır (aşağıda).                                                                                                                          |
| `gclid`          | —                        | metin                    | Kişi (ilk dokunuş), gönderim. Trafik kanalı: `PAID_SEARCH`. Google Ads dönüşüm bildirimi için.                                                                                |
| `fbclid`         | —                        | metin                    | Kişi (ilk dokunuş), gönderim. Trafik kanalı: `PAID_SOCIAL`. Meta CAPI için.                                                                                                   |
| `fbp`            | `_fbp`                   | metin                    | Tarayıcıdaki `_fbp` çerezi. Kişide (ilk dokunuş).                                                                                                                             |
| `userAgent`      | —                        | metin                    | Kişide (ilk dokunuş). Meta eşleşmesi için `fbp`/`fbclid` ile birlikte anlamlı.                                                                                                |
| `ttclid`         | —                        | metin                    | Trafik kanalı `PAID_SOCIAL`. **Saklanmaz**, yalnızca sınıflandırmada kullanılır.                                                                                              |
| `msclkid`        | —                        | metin                    | Trafik kanalı `PAID_SEARCH`. **Saklanmaz.**                                                                                                                                   |
| `utm_source`     | `utmSource`              | metin                    | Kişi (ilk dokunuş), fırsat, gönderim.                                                                                                                                         |
| `utm_medium`     | `utmMedium`              | metin                    | Aynı.                                                                                                                                                                         |
| `utm_campaign`   | `utmCampaign`            | metin                    | Aynı. Taksonomi raporları bunu ayrıştırır.                                                                                                                                    |
| `utm_content`    | `utmContent`             | metin                    | Aynı.                                                                                                                                                                         |
| `utm_term`       | `utmTerm`                | metin                    | Kişi ve gönderim (fırsata yazılmaz).                                                                                                                                          |
| `landingPageUrl` | `landingPage`, `pageUrl` | URL                      | Kişide `landingPage` (ilk dokunuş).                                                                                                                                           |
| `pageUrl`        | —                        | URL                      | Formun gönderildiği sayfa. Gönderimde `pageUrl`; yoksa `landingPageUrl` yazılır.                                                                                              |
| `referrer`       | —                        | URL                      | Kişi (ilk dokunuş). Kanal tespitinde son çare.                                                                                                                                |
| `site`           | `domain`                 | host ya da URL           | `https://` atılır, ilk `/`'a kadar alınır, küçük harf. Boşsa `pageUrl` host'u, o da yoksa `landingPageUrl` host'u. Kişide `leadSite`, fırsatta `leadSite`, gönderimde `site`. |

**`source` eşlemesi.** Büyük harf, boşluk/`-` → `_`. Enum değeriyse aynen; değilse metinde geçen
parçaya göre sırayla: `GOOGLE` → `GOOGLE_ADS`; `META` / `FACEBOOK` / `INSTAGRAM` → `META_ADS`;
`LINKEDIN` → `LINKEDIN_ADS`; `TIKTOK` → `TIKTOK_ADS`; `OPENAI` / `CHATGPT` → `OPENAI_ADS`;
`SEO` / `ORGANIC` → `ORGANIC`; `REFER` → `REFERRAL`; hiçbiri → `WEBSITE`.

Enum: `META_ADS`, `GOOGLE_ADS`, `LINKEDIN_ADS`, `TIKTOK_ADS`, `OPENAI_ADS`, `ORGANIC`,
`WEBSITE`, `REFERRAL`, `OUTBOUND`, `OTHER`.

**`source` boşsa çıkarım sırası:**

1. `gclid` var → `GOOGLE_ADS`
2. `fbclid` var → `META_ADS`
3. `utm_medium` **ücretli** bir değerse ve `utm_source` doluysa → `utm_source` yukarıdaki eşlemeden geçer.
   Ücretli medium listesi: `cpc`, `ppc`, `paid`, `sem`, `display`, `video`, `pmax`, `demandgen`,
   `paid-social`, `paid_social`, `paid-ai`, `paid_ai`, `retargeting`, `remarketing` (tam eşleşme, küçük harf).
   `utm_source=google&utm_medium=organic` bu yüzden `GOOGLE_ADS` **olmaz**, `WEBSITE` kalır.
4. Hiçbiri → `WEBSITE`

### 2.4 Reklam kimlikleri

Her platform aynı üç ada indirgenir (taksonomi: `campaign_id`, `ad_group_id`, `ad_id`).

| Alan                 | Alternatif adlar                                         | Nereye yazılır                                             |
| -------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| `campaignExternalId` | `campaign_id`, `adCampaignId` (bu sırayla ilk dolu olan) | CRM **Campaign** kaydını bulmak/oluşturmak için (§4.3).    |
| `campaignName`       | —                                                        | Yeni Campaign kaydının adı; nota.                          |
| `adCampaignId`       | `campaign_id`                                            | Form Submission `adCampaignId`                             |
| `adSetId`            | `ad_group_id`, `adgroup_id`                              | Form Submission `adSetId`                                  |
| `adId`               | `ad_id`                                                  | Form Submission `adId`                                     |
| `placement`          | —                                                        | Form Submission `adPlacement`                              |
| `oppref`             | —                                                        | Ayrı alan yok; `answers["OpenAI oppref"]` olarak saklanır. |
| `ad_account_id`      | —                                                        | Ayrı alan yok; `answers["Ad account id"]` olarak saklanır. |

### 2.5 Şirket ve profil

| Alan             | Alternatif adlar | Nasıl işlenir                                                                                                                                                                                                                                                                                                                          |
| ---------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `companyName`    | `company`        | Şirket bulunur (ad ile, büyük/küçük harf duyarsız) ya da oluşturulur (§4.3).                                                                                                                                                                                                                                                           |
| `website`        | —                | Şirketin domain'i (`https://<host>`); Twenty logoyu buradan çeker. Puan +5. Kişiye yazılmaz.                                                                                                                                                                                                                                           |
| `industry`       | `sector`         | Enum (`HEALTH_TOURISM`, `HEALTHCARE`, `ECOMMERCE`, `SAAS`, `REAL_ESTATE`, `EDUCATION`, `FINANCE`, `TOURISM`, `MANUFACTURING`, `OTHER`) ya da serbest metin ("klinik", "e-ticaret", "otel"…) regex'le eşlenir. Eşleşmezse **boş kalır**, `OTHER` uydurulmaz ("other/diğer" yazılmışsa `OTHER`). Kişi, gönderim ve yeni şirkete yazılır. |
| `jobTitle`       | —                | Kişiye. Karar verici kalıbı puan verir.                                                                                                                                                                                                                                                                                                |
| `city`           | —                | Kişide `leadCity`.                                                                                                                                                                                                                                                                                                                     |
| `estimatedValue` | —                | sayı ya da sayısal metin                                                                                                                                                                                                                                                                                                               | Sayıya çevrilir; sonlu değilse yok sayılır. Fırsat `amount` (>0 ise). ≥ 3.000 puan verir. |
| `currencyCode`   | —                | metin                                                                                                                                                                                                                                                                                                                                  | `amount` para birimi. Boşsa **`USD`**.                                                    |

### 2.6 Spam alanları

| Alan             | Alternatif adlar                                                                                            | Beklenen                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `_honeypot`      | `honeypot`, `_hp`, `hp`, `fax`, `fax_number`, `website_url`, `company_website_2`, `address2`, `middle_name` | **Boş.** Herhangi biri doluysa spam.                                         |
| `formRenderedAt` | `form_rendered_at`, `_t`                                                                                    | Formun gösterildiği an, epoch **milisaniye**. Gönderilmezse kontrol atlanır. |
| `turnstileToken` | `cf-turnstile-response`                                                                                     | Yalnızca CRM'de `TURNSTILE_SECRET_KEY` doluysa; o zaman **zorunlu**.         |

---

## 3. CRM'in türettikleri

Gönderen taraf göndermez; her kayıt için hesaplanır.

### 3.1 E-posta türü (`emailType`, `emailDomain`)

`@` sonrası, küçük harf. Domain'de `.` yoksa `UNKNOWN`. ~30 tek kullanımlık sağlayıcı
(mailinator, guerrillamail, 10minutemail, temp-mail, yopmail…) → `DISPOSABLE`. ~90 ücretsiz
sağlayıcı (gmail, hotmail, outlook, yahoo, yandex, icloud, mynet, superonline…) → `FREE`.
Kalanı → `CORPORATE`. E-posta yoksa `UNKNOWN`.

### 3.2 Trafik kanalı (`trafficChannel`)

GA4 kanal gruplaması mantığı. **İlk eşleşen kazanır:**

| #   | Koşul                                                                                                                                                | Kanal                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 0   | Meta webhook'undan organik post işareti                                                                                                              | `ORGANIC_SOCIAL`                                               |
| 1   | `gclid` ya da `msclkid`                                                                                                                              | `PAID_SEARCH`                                                  |
| 1   | `fbclid`, `ttclid` ya da Meta leadgen id                                                                                                             | `PAID_SOCIAL`                                                  |
| 2   | `source = OPENAI_ADS`                                                                                                                                | `PAID_AI`                                                      |
| 2   | `source = META_ADS` / `LINKEDIN_ADS` / `TIKTOK_ADS`                                                                                                  | `PAID_SOCIAL`                                                  |
| 2   | `source = GOOGLE_ADS`                                                                                                                                | `PAID_SEARCH`                                                  |
| 3   | `utm_medium` ∈ email/e-mail/newsletter/mail/mailing/crm/automation/drip, ya da `utm_source` mailchimp/brevo/klaviyo/hubspot/…                        | `EMAIL`                                                        |
| 3   | `utm_medium` ∈ paid-ai/paid_ai/paidai/ai-ads/ai_ads; ya da `utm_source` chatgpt/openai/perplexity/copilot/gemini/claude + ücretli medium             | `PAID_AI`                                                      |
| 3   | ücretli medium (cpc, ppc, paid, sem, display, cpm, cpv, cpa, banner, video, paid_social, retargeting, remarketing, affiliate…) + sosyal `utm_source` | `PAID_SOCIAL`                                                  |
| 3   | ücretli medium + arama motoru `utm_source`                                                                                                           | `PAID_SEARCH`                                                  |
| 3   | ücretli medium, başka kaynak                                                                                                                         | `PAID_OTHER`                                                   |
| 3   | `utm_medium` ∈ social/social_media/organic_social/sm; ya da sosyal `utm_source` + medium boş                                                         | `ORGANIC_SOCIAL`                                               |
| 3   | `utm_medium` ∈ organic/seo; ya da arama motoru `utm_source` + medium boş                                                                             | `ORGANIC_SEARCH`                                               |
| 3   | `utm_medium` ∈ referral/ref/partner/link, ya da `source = REFERRAL`                                                                                  | `REFERRAL`                                                     |
| 3   | `utm_source` AI asistanı                                                                                                                             | `AI_ASSISTANT`                                                 |
| 3   | source ve medium dolu ama hiçbiri eşleşmedi                                                                                                          | `OTHER`                                                        |
| 4   | UTM yok, `referrer` host'u AI asistanı / arama motoru / sosyal ağ / webmail                                                                          | `AI_ASSISTANT` / `ORGANIC_SEARCH` / `ORGANIC_SOCIAL` / `EMAIL` |
| 4   | `referrer` roicool.com dışında başka bir site                                                                                                        | `REFERRAL`                                                     |
| 5   | `source = ORGANIC`                                                                                                                                   | `ORGANIC_SEARCH`                                               |
| 5   | `source = OUTBOUND`                                                                                                                                  | `OTHER`                                                        |
| 5   | hiçbiri                                                                                                                                              | `DIRECT`                                                       |

Enum: `PAID_SEARCH`, `PAID_SOCIAL`, `PAID_OTHER`, `PAID_AI`, `ORGANIC_SEARCH`, `ORGANIC_SOCIAL`,
`EMAIL`, `REFERRAL`, `DIRECT`, `AI_ASSISTANT`, `OTHER`.

### 3.3 Lead puanı (`leadScore` 0–100, `leadTier`, `leadScoreReason`, `aiSummary`)

**Kural puanı** (her zaman). 20'den başlar:

| Sinyal                                                                                                                                                                                                                                          | Puan    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Kurumsal e-posta                                                                                                                                                                                                                                | +20     |
| Ücretsiz e-posta                                                                                                                                                                                                                                | +5      |
| Tek kullanımlık e-posta                                                                                                                                                                                                                         | **−30** |
| Telefon var                                                                                                                                                                                                                                     | +12     |
| Ad var                                                                                                                                                                                                                                          | +3      |
| Şirket adı var                                                                                                                                                                                                                                  | +8      |
| Sektör var                                                                                                                                                                                                                                      | +3      |
| Web sitesi var                                                                                                                                                                                                                                  | +5      |
| Unvan karar verici (ceo, founder, kurucu, owner, sahib, director, direktör, head, manager, müdür, cmo, marketing, pazarlama, partner, doctor, dr., hekim, md)                                                                                   | +8      |
| Satış formu: `QUOTE` / `DEMO` / `CALLBACK`                                                                                                                                                                                                      | +15     |
| Satış formu: `CONTACT` / `LEAD_AD` / `CHATBOT`                                                                                                                                                                                                  | +8      |
| İçerik formu (`NEWSLETTER`, `EBOOK`, `WEBINAR`, `EVENT`, `JOB_APPLICATION`, `OTHER`)                                                                                                                                                            | **−10** |
| Mesaj/cevaplarda bütçe ifadesi (`5.000 €`, `$3000`, `10000 TL`…) ya da cevap anahtarında "budget/bütçe"                                                                                                                                         | +12     |
| Yüksek niyet kelimesi (fiyat, teklif, bütçe, budget, quote, pricing, price, start, başla, acil, urgent, asap, hemen, when can, ne zaman, sözleşme, contract, proposal, toplantı, meeting, call me, arayın)                                      | +8      |
| Düşük niyet / spam kalıbı (job, iş başvurusu, kariyer, career, staj, intern, cv, resume, freelance, guest post, backlink, seo services for you, we offer, partnership opportunity, collaboration proposal, link exchange, casino, crypto, loan) | **−25** |
| Mesaj 120 karakterden uzun                                                                                                                                                                                                                      | +4      |
| `estimatedValue` ≥ 3.000                                                                                                                                                                                                                        | +8      |
| Tıklama kimliği (gclid / fbclid / Meta lead id) var                                                                                                                                                                                             | +4      |
| Trafik kanalı `REFERRAL`                                                                                                                                                                                                                        | +6      |
| Trafik kanalı `ORGANIC_SEARCH`                                                                                                                                                                                                                  | +3      |
| Tekrar gelen ziyaretçi (önceki gönderim sayısı × 4, en çok +10)                                                                                                                                                                                 | +4…+10  |
| Daha önce e-book ya da webinar formu doldurmuş                                                                                                                                                                                                  | +4      |

Sonuç 0–100'e sıkıştırılır.

**AI puanı** (isteğe bağlı): yalnızca `DEEPSEEK_API_KEY` tanımlıysa **ve** form satış niyetliyse.
Model 0–100 skor, ≤4 gerekçe, tek cümle Türkçe özet, önerilen hizmet ve sektör döner.
**Nihai = kural × 0,5 + AI × 0,5.** 12 sn zaman aşımı; model cevap vermezse kural puanı kalır,
`leadScoreReason`'a "AI unavailable" notu düşer. İntake asla beklemez ya da bozulmaz.

**Seviye:** ≥ 70 `HOT`, ≥ 40 `WARM`, altı `COLD`.

`leadScoreReason` biçimi: `Rules 63 (corporate e-mail, phone given, quote form) · AI 72 (…)`, ≤ 1.000 karakter.

---

## 4. Yazılan kayıtlar

### 4.1 Satış niyeti

`salesIntent` şu sırayla belirlenir:

1. `createOpportunity` boolean verilmişse → o.
2. `personOnly: true` → `false`.
3. `formType` ∈ {`CONTACT`, `QUOTE`, `DEMO`, `CALLBACK`, `LEAD_AD`, `CHATBOT`} → `true`; diğerleri → `false`.

| Satış niyeti | Kişi                                          | Fırsat                  | Not                                 | Form Submission               |
| ------------ | --------------------------------------------- | ----------------------- | ----------------------------------- | ----------------------------- |
| `true`       | oluşturulur / güncellenir, durum `NEW`        | **açılır**, aşama `NEW` | yazılır, kişiye ve fırsata bağlanır | yazılır, `openedDeal = true`  |
| `false`      | oluşturulur / güncellenir, durum `SUBSCRIBER` | açılmaz                 | yazılmaz                            | yazılır, `openedDeal = false` |

### 4.2 Kişi eşleme ve yazma

**Eşleme:** e-posta varsa **yalnızca e-posta** ile (tam eşleşme, küçük harf). E-posta yoksa
telefon rakamlarıyla. İkisi de yoksa yeni kişi. Farklı e-posta aynı telefonu taşıyorsa iki
ayrı kişi olur — santral numarası kişileri birleştirmez.

E-postayla eşleşen **silinmiş** bir kişi varsa geri getirilir ve gönderim ona bağlanır
(silinmiş kayıt e-postanın benzersiz indeksini tuttuğu için yenisi zaten yaratılamaz).

**Yeni kişi** — yazılan alanlar: `name` (ad yoksa geçici olarak e-posta ya da telefon, o da yoksa
`Lead`), `emails`, `phones`, `leadCity`, `jobTitle`, `companyId`, `leadStatus`
(`NEW` / `SUBSCRIBER`), `leadSource`, `leadReceivedAt`, `segments = [formType]`,
`formSubmissionsCount = 1`, `industry`, `lastFormType`, `lastFormAt`, izin varsa
`newsletterOptIn = true` + `consentAt`, atıf alanlarının hepsi, `emailDomain`, `emailType`,
`trafficChannel`, `leadScore`, `leadTier`, `leadScoreReason`, `aiSummary`, `leadScoredAt`.

**Mevcut kişi** — kurallar:

- **Kimlik:** ad yalnızca kayıtta ad yoksa (ya da ad geçici e-posta ise) yazılır. E-posta ve
  telefon yalnızca boşsa doldurulur. İnsan eliyle düzeltilmiş hiçbir şey ezilmez.
- **İlk dokunuş kazanır:** `gclid`, `fbclid`, `fbp`, `userAgent`, `metaLeadId`, beş `utm_*`,
  `landingPage`, `referrer`, `leadSite`, `leadForm`, `leadLanguage` — kayıtta doluysa **dokunulmaz**,
  boşsa doldurulur. Sonraki bir e-book indirmesi ilk reklam tıklamasını silemez.
- **Skor / seviye / AI özeti:** yalnızca satış niyetli formda **ya da** kişinin hiç skoru yoksa
  yenilenir. İçerik formu ya da iş başvurusu HOT bir talebi düşüremez.
- **E-posta türü / kanal:** yalnızca boşsa (ya da `UNKNOWN` ise) yazılır.
- **Her zaman yazılır:** `leadSource` (son gönderimin kaynağı), `segments` (birleşim, silinmez),
  `formSubmissionsCount + 1`, `lastFormType`, `lastFormAt`; varsa `leadCity`, `jobTitle`,
  `companyId`, `industry` (yalnızca boşsa), izin varsa `newsletterOptIn` + `consentAt`.
- **Aboneden lead'e:** durum boş ya da `SUBSCRIBER` iken satış niyetli form gelirse durum `NEW`
  olur ve `leadReceivedAt` **bu gönderimin** tarihine çekilir — raporlarda o gün lead sayılır.

### 4.3 Şirket ve kampanya

**Kampanya:** `campaignExternalId` doluysa `externalCampaignId` eşleşen Campaign aranır.
Yoksa ve `campaignName` doluysa yeni Campaign yaratılır: `status = ACTIVE`, `platform`
kaynaktan (`META_ADS`→META, `GOOGLE_ADS`→GOOGLE, `LINKEDIN_ADS`→LINKEDIN, `TIKTOK_ADS`→TIKTOK).
Yalnızca id gelmişse kayıt **yaratılmaz**. Kampanyanın bağlı müşterisi (`clientId`) varsa kişi
ve fırsat o şirkete bağlanır ve `companyName` yok sayılır.

**Şirket:** kampanyadan gelmediyse ve `companyName` doluysa ada göre aranır
(büyük/küçük harf duyarsız). Yoksa yaratılır: `clientStatus = PROSPECT`, `industry`, `domainName`
(`website`'ten; yoksa **kurumsal** e-posta domain'inden — gmail gibi ücretsiz domain asla
logo kaynağı yapılmaz). Mevcut şirketin domain'i boşsa doldurulur, doluysa ezilmez.

### 4.4 Fırsat (yalnızca satış niyeti)

| Alan                                                                          | Değer                                                                                                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                                                                        | `<Ad Soyad> – <etiket>`; etiket = `asset` → `campaignName` → `formName` → `source` sırasıyla ilk dolu olan. Ad yoksa e-posta, o da yoksa telefon. |
| `stage`                                                                       | `NEW`                                                                                                                                             |
| `pointOfContactId`, `companyId`, `campaignId`                                 | bağlanır                                                                                                                                          |
| `leadSource`, `trafficChannel`, `leadScore`, `leadTier`, `leadReceivedAt`     | kişiyle aynı                                                                                                                                      |
| `conversionStatus`                                                            | `PENDING`                                                                                                                                         |
| `serviceType`                                                                 | yalnızca AI bir hizmet önerdiyse `[öneri]`                                                                                                        |
| `leadSite`, `leadForm`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent` | doluysa                                                                                                                                           |
| `amount`                                                                      | `estimatedValue` > 0 ise, para birimi `currencyCode` ?? `USD`                                                                                     |

`ownerId` **yazılmaz**; atama `on-lead-created` fonksiyonunda `LEAD_ASSIGNEE_EMAILS` sırasına
göre yapılır (§7).

### 4.5 Form Submission (her gönderim)

| Alan                                                                                                                           | Değer                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `name`                                                                                                                         | `<Ad Soyad> – <formName ?? etiket>`                                                               |
| `formType`, `leadSource`, `trafficChannel`, `emailType`, `leadScore`, `industry`                                               | türetilenler                                                                                      |
| `submittedAt`                                                                                                                  | `receivedAt` ?? şimdi                                                                             |
| `marketingConsent`                                                                                                             | §2.2'deki izin                                                                                    |
| `openedDeal`                                                                                                                   | fırsat açıldıysa `true`                                                                           |
| `personId`, `opportunityId`, `campaignId`                                                                                      | bağlantılar                                                                                       |
| `formName`, `asset`, `site`, `language`                                                                                        | doluysa                                                                                           |
| `pageUrl`                                                                                                                      | `pageUrl` ?? `landingPageUrl`                                                                     |
| `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`, `gclid`, `fbclid`                                            | doluysa                                                                                           |
| `adCampaignId`, `adCampaignName`, `adSetId`, `adSetName`, `adId`, `adName`, `adFormId`, `adLeadId`, `adPlacement`, `isOrganic` | doluysa (ad/isim alanları Meta webhook'undan; generic endpoint id'leri ve `placement`'ı doldurur) |
| `message`                                                                                                                      | ≤ 5.000 karakter                                                                                  |
| `answers`                                                                                                                      | boş değerler atılmış JSON                                                                         |
| `isRejected`, `rejectedReason`                                                                                                 | yalnızca spam kayıtlarında (§5)                                                                   |
| `isDemo`                                                                                                                       | yazılmaz; alan varsayılanı `false`                                                                |

### 4.6 Not (yalnızca satış niyeti)

Başlık `Inbound lead – <formName ?? source>`. Gövde: skor satırı, AI özeti, sonra dolu olan
her alan (Source, Channel, Industry, Form type, Form, Asset, Campaign, Language, Email, Phone,
City, Company, UTM, Site, Landing page, Submitted on, Referrer, fbclid, gclid, Meta lead id,
Received), mesaj ve tüm `answers`. Kişiye ve fırsata bağlanır.

---

## 5. Spam kontrolü

Kayıttan **önce**, bu sırayla; ilk takılan düşürür:

| #   | Kontrol                                                                               | Sebep metni                                                                                     |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Honeypot alanlarından biri dolu                                                       | `honeypot field "<alan>" was filled`                                                            |
| 2   | `formRenderedAt` gönderilmiş ve gönderim ondan **3 sn'den kısa** süre sonra gelmiş    | `form submitted 1.2s after render`                                                              |
| 3   | Geçerli e-posta (`@` içeren) da ≥ 7 haneli telefon da yok                             | `no valid email or phone`                                                                       |
| 3   | Herhangi bir metin alanı > 5.000 karakter                                             | `field "<alan>" is too long`                                                                    |
| 3   | `message` içinde 2'den fazla `http://` / `https://` / `www.`                          | `message contains N links`                                                                      |
| 3   | Ad alanlarında link                                                                   | `name contains a link`                                                                          |
| 3   | `LEAD_BLOCKED_SCRIPT_REGEX` doluysa ad+mesaj eşleşiyor                                | `text matches blocked script pattern`                                                           |
| 4   | `TURNSTILE_SECRET_KEY` doluysa: token yok / Cloudflare reddetti / doğrulama başarısız | `turnstile token missing` / `turnstile rejected: <kodlar>` / `turnstile verification failed: …` |

Düşürülen gönderim yine de bir **Form Submission** bırakır: `name = "Rejected – <ad> – <form>"`,
`isRejected = true`, `rejectedReason` (≤ 500), `formType`, `leadSource`, `submittedAt`,
`marketingConsent = false`, `openedDeal = false`, `formName`, `asset`, `site`, `pageUrl`;
iletişim alanları (ad, e-posta, telefon, şirket, unvan, şehir, site, sektör, referrer, landing
page) ve `answers` **yalnızca `answers` JSON'unda** — kişi tipli hiçbir kolona yazılmaz, yani
gerçek bir kişiyle eşleşmez ya da onu güncellemez. Kişi, fırsat, not, görev, bildirim yok.

---

## 6. Yanıtlar

| HTTP  | Gövde                                                                                | Ne zaman                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `200` | aşağıdaki **başarı** gövdesi                                                         | Kayıt yazıldı                                                                                                                                                      |
| `200` | `{ "ok": true, "ignored": true, "reason": "<sebep>", "formSubmissionId": "<uuid>" }` | Spam olarak düşürüldü. Bilerek 200: bot hangi kontrole takıldığını öğrenmesin. `reason`'ı **tarayıcıya iletmeyin**. `formSubmissionId` kayıt yazılamadıysa yoktur. |
| `400` | `{ "error": "JSON body required" }`                                                  | Gövde JSON nesnesi değil                                                                                                                                           |
| `401` | `{ "error": "unauthorized" }`                                                        | Token eksik ya da yanlış (worker loguna yalnızca uzunluk yazılır, değer asla)                                                                                      |
| `422` | `{ "ok": false, "error": "<mesaj>" }`                                                | Spam kontrolü geçti, CRM'e yazarken hata (API hatası; ya da ad/e-posta/telefonun üçü de yok). Tekrar denenebilir.                                                  |
| `500` | `{ "error": "LEAD_WEBHOOK_TOKEN is not configured" }`                                | CRM tarafında token tanımsız                                                                                                                                       |

**Başarı gövdesi** — her alan ve ne zaman dolu olduğu:

```json
{
  "ok": true,
  "personId": "uuid", // her zaman
  "created": true, // yeni kişi yaratıldıysa true, mevcut güncellendiyse false
  "formType": "QUOTE", // çözümlenmiş enum
  "openedDeal": true, // fırsat açıldı mı
  "leadScore": 72, // 0–100
  "leadTier": "HOT", // HOT | WARM | COLD
  "trafficChannel": "PAID_SEARCH",
  "emailType": "CORPORATE", // CORPORATE | FREE | DISPOSABLE | UNKNOWN
  "industry": "HEALTH_TOURISM", // yalnızca tespit edildiyse
  "opportunityId": "uuid", // yalnızca fırsat açıldıysa
  "campaignId": "uuid", // yalnızca kampanya eşleşti / yaratıldıysa
  "noteId": "uuid", // yalnızca not yazıldıysa (= satış niyeti)
  "formSubmissionId": "uuid" // gönderim kaydı yazıldıysa
}
```

`leadScore` ve `leadTier` ile teşekkür sayfasında farklı mesaj gösterilebilir ("1 saat içinde
arayacağız" / "e-posta ile döneceğiz").

---

## 7. Yanıttan sonra olanlar

`200` döndükten sonra, eşzamansız (`on-lead-created`, yalnızca fırsat açıldıysa ve
`isDemo = false`): sahip `LEAD_ASSIGNEE_EMAILS`'teki sırayla atanır (boşsa **atanmaz**),
"Call lead: …" takip görevi açılır (HOT'ta vade yarı), Slack / e-posta bildirimi gider.
Bunlar yanıtı etkilemez; başarısız olsa bile kayıtlar duruyor olur. Detay:
[`lead-endpoint-integration.md`](lead-endpoint-integration.md) "Bildirimler".

---

## 8. Sınırlar ve sabitler

|                           |                                                 |
| ------------------------- | ----------------------------------------------- |
| Doldurma süresi eşiği     | 3 sn                                            |
| Mesajda izin verilen link | 2                                               |
| Alan uzunluğu             | 5.000 karakter (spam eşiği ve `message` kırpma) |
| `rejectedReason`          | ≤ 500                                           |
| `leadScoreReason`         | ≤ 1.000                                         |
| AI özeti                  | ≤ 300                                           |
| DeepSeek zaman aşımı      | 12 sn                                           |
| Telefon en az             | 7 hane                                          |
| Varsayılan para birimi    | `USD`                                           |
| Varsayılan `formType`     | `CONTACT`                                       |
| Varsayılan `source`       | `WEBSITE`                                       |
