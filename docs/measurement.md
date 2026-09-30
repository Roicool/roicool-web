# Ölçüm ve lead altyapısı

Durum (30.09.2026): altyapı başka repolarda kurulu ve canlı; bu repoda henüz kod yok,
kararlar bekliyor. Geliştirmeye başlamadan önce bu dosya ve üç referans okunur.

**Zamanlama:** sahibinin kararı, bu işler site canlıya çıkmaya yakın ele alınacak.
Aşağıdaki kararlar, bulgular ve parçalar o zamana kadar bekler; yayın kontrol listesinde
madde olarak duruyor ([`webflow-setup.md › Yayına çıkarken`](./webflow-setup.md#yayına-çıkarken--kontrol-listesi)).

## Ne var

| Parça             | Nerede                                                                                                          | Referans                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Server-side GTM   | `t.roicool.com`, Google imajı, `Roicool/lp-roicool` reposu                                                      | [`server-side-tag-manager.md`](./server-side-tag-manager.md)            |
| Web GTM container | `GTM-K5D24HJS`, `t.roicool.com/gtm.js` üzerinden first-party                                                    | aynı belge §4, §7.2; form belgesi §7                                    |
| GA4 / Google Ads  | `G-3SE1MB5EMG` / `AW-17287475589`                                                                               | sGTM belgesi §4                                                         |
| Lead endpoint     | `POST https://crm.roicool.com/s/webhook/lead`, token header'ı                                                   | [`lead-endpoint-contract.md`](./lead-endpoint-contract.md)              |
| Form sistemi      | `Roicool/roicool-main`: React code component `<LeadForm/>` + Webflow Cloud route `/app/api/lead`                | [`lead-form-system.md`](./lead-form-system.md)                          |
| Atıf script'i     | `www.roicool.com/app/scripts/attribution.js`, `localStorage.roicool_attr`, 90 gün, son reklam tıklaması kazanır | form belgesi §4                                                         |
| Mikro dönüşümler  | `www.roicool.com/app/scripts/measure.js`, yalnız OpenAI pixel'e                                                 | form belgesi §9                                                         |
| dataLayer olayı   | `lead_submitted`: `event_id`, `lead_id`, kişisel veri düz metin, `form_type`, `lead_tier`                       | form belgesi §6                                                         |
| Meta CAPI         | sGTM'de, `lead_id`'yi `event_id` olarak alır                                                                    | form belgesi §7; sGTM belgesi §6.4 listesinde yok                       |
| ChatGPT Ads CAPI  | Webflow Cloud route'undan `bzr.openai.com/v1/events`, `event_id` ile tekilleştirme                              | form belgesi §8                                                         |
| Consent Mode      | Kapalı, bilinçli karar; kapı `window.ROICOOL_MARKETING_CONSENT` hazır                                           | sGTM belgesi §11; form belgesi §6                                       |
| Hata izleme       | Sentry, bu repoda hazır                                                                                         | [`architecture.md › Hata izleme`](./architecture.md#hata-izleme-sentry) |

`lp.roicool.com` kapatılacak. sGTM konteynerleri, izleme paneli ve deploy akışı
`lp-roicool` reposunda yaşıyor; kapatırken `t.roicool.com`'u ayakta tutan parça ayrılmalı.

## Bu repoya düşen parçalar

Kararlar gelince yapılacaklar. Hiçbiri ilk boyamayı geciktirmez, hepsi `data-rc-*` üzerinden.

| Parça         | Yer                                 | İş                                                                                                                                                                                                                                                                                     |
| ------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GTM yükleyici | `webflow/embeds/head.template.html` | Snippet `t.roicool.com/gtm.js?id=GTM-K5D24HJS` ile, `t.roicool.com` için preconnect. Global istisnaları CLAUDE.md'ye yazılır: `dataLayer`, `google_tag_manager`, `oaiq` (OpenAI pixel), `ROICOOL_MARKETING_CONSENT`.                                                                   |
| Consent Mode  | `head.template.html`, GTM'den önce  | CMP kararı gelmeden dokunulmaz. CMP olmadan "denied" varsayılanı yalnız veri kaybettirir. CMP gelirse `window.ROICOOL_MARKETING_CONSENT` set edilir, form kodu değişmez.                                                                                                               |
| Olay katmanı  | `src/runtime/analytics.js`          | `data-rc-track="<olay>"` tıklamaları dataLayer'a basar. Form başarısını `lead_submitted` zaten basıyor, yeniden üretilmez. `measure.js`'in dört mikro olayı (scroll/süre, form_start, phone_click, whatsapp_click) yalnız OpenAI pixel'e gidiyor; ikisi birleşecek mi karar (aşağıda). |
| Lead formu    | `src/components/lead-form/`         | Karar bekliyor. React bileşeni RC-Main'e mount edilirse iş yok. Native Webflow form + bu bileşen route'a JSON POST atarsa: Turnstile, `eventId`, `formRenderedAt`, honeypot `fax`, durum mesajları, `lead_submitted` push burada; route ve CRM değişmez.                               |
| Atıf          | `head.template.html` ya da runtime  | Script var (`attribution.js`), tek sorun yükleme biçimi: belge head'e **senkron** `<script src>` diyor, bu repoda ağdan senkron dosya yasak. `defer` ile girer ya da aynı mantık runtime'a taşınır; `roicool_attr` anahtarı ve "son reklam tıklaması kazanır" modeli korunur.          |
| CRM           | —                                   | Endpoint ve sözleşme hazır, iş yok.                                                                                                                                                                                                                                                    |

Endpoint'in beklediği alan adları sözleşme §2.3 ve §2.6, route'un gönderdiği tam gövde form
belgesi §5. Yeni kod bu ikisine göre yazılır, ad uydurulmaz.

## İncelemede görülenler

1. **Ad soyad bölme iki yerde farklı.** Form tarafı ilk boşluktan bölüyor (form belgesi
   §6: "Ayşe" / "Nur Yılmaz"), CRM son kelimeyi soyadı alıyor (sözleşme §2.1: "Ayşe Nur" /
   "Yılmaz"). Tarayıcı ve sGTM aynı dataLayer değerini kullandığı için Enhanced Conversions
   ile Meta kendi aralarında tutarlı; CRM kaydı farklı. CRM'den ileride offline dönüşüm
   yüklenirse hash'ler eşleşmez. Kısa form ad ve soyadı `fullName`'de birleştirdiği için
   CRM her gönderimde bölme yapıyor.
2. **sGTM belgesi eksik.** §6.4 tag listesinde Meta CAPI yok; form belgesi §7 onu sGTM'de
   sayıyor, ikisinden biri düzeltilmeli. ChatGPT Ads CAPI sGTM'de değil, Webflow Cloud
   route'unda. Kapsam, §7.1, §8.1 ve §14 lp'ye bağlı; lp kapanınca konteynerlerin yeni yeri
   yazılmalı. §1'deki "tarayıcı üçüncü tarafla konuşmaz" cümlesi yalnız Google için doğru,
   Meta ve OpenAI pixel'leri kendi alan adlarından yükleniyor.
3. **Kişisel veri dataLayer'da düz metin, bilinçli.** Enhanced Conversions tarayıcıda,
   Meta sGTM'de kendi hash'ini alıyor; önceden hash'lemek ikisini bozar (form belgesi §6).
   Kalan risk tek: web container'daki GA4 tag'i `email`/`phone` anahtarlarını okumamalı.
   GTM'de kontrol edilir, kod işi değil.
4. **`?token=` ile kimlik** access log'lara düşer. Route header kullanıyor; sözleşmedeki
   query yolu kapatılabilir.
5. **`LEAD_ALLOWED_ORIGINS`** yeni siteyle `roicoolmain.webflow.io` ve canlı alan adını
   ister. Boşsa route origin kontrolü yapmıyor (form belgesi §10).
6. **Çerez rızası.** KVKK çerez rehberi reklam ve analitik çerezleri için açık rıza ister;
   Conversion Linker rıza olmadan sunucudan çerez yazıyor. Kod işi değil, karar.
7. **Atıf script'i senkron.** Form belgesi §4'teki `<script src>` satırında `defer` yok;
   head'de render'ı bloklar. Bu repoya girerken `defer` olur.
8. **`rc-` öneki iki repoda.** Form bileşeni `.rc-lead-form` sınıfını kullanıyor
   (form belgesi §13). Bu repo `data-rc="lead-form"` adında bileşen açarsa çakışır; ad
   seçiminde dikkat.
9. **Mikro dönüşümler tek platforma gidiyor.** `measure.js` olayları yalnız `oaiq`'ya
   basıyor, dataLayer'a değil; GA4 ve Meta bu olayları görmüyor. Olay katmanı dataLayer'a
   basarsa hepsi görür, `measure.js` gereksizleşir.
10. **`debug:true`** OpenAI pixel yükleyicisinde açık (form belgesi §7). Canlıya çıkmadan
    GTM'de kapatılmalı.

## Açık kararlar

1. GTM snippet'i RC-Main'in Custom Code alanında mı duracak, `head.html`'e mi girecek?
   Atıf ve `measure.js` satırları da aynı karara bağlı.
2. Web container'ın `lead_submitted` dışındaki tetikleyicileri (sayfa görüntüleme,
   tıklama olayları) — export ya da liste.
3. Form: React bileşeni mi, native Webflow form + `lead-form` mu? `roicool-main` hangi
   Webflow sitesine mount edilmiş?
4. Mikro dönüşümler: `measure.js` kalsın mı, `data-rc-track` dataLayer'a basıp GTM'den
   dağıtılsın mı?
5. CMP var mı, hangisi?

## Kopyaların durumu

Üç referans sahibinin verdiği metinlerdir ve tamdır; asıl kopyalar kendi repolarında
güncellenir. `lead-form-system.md` ve `lead-endpoint-contract.md` `Roicool/roicool-main`
ve CRM tarafından, `server-side-tag-manager.md` `Roicool/lp-roicool`'dan.
