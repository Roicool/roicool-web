# Ölçüm ve lead altyapısı

Durum (30.09.2026): altyapı başka repolarda kurulu ve canlı; bu repoda henüz kod yok,
kararlar bekliyor. Geliştirmeye başlamadan önce bu dosya ve üç referans okunur.

## Ne var

| Parça                  | Nerede                                                        | Referans                                                                |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Server-side GTM        | `t.roicool.com`, Google imajı, `Roicool/lp-roicool` reposu    | [`server-side-tag-manager.md`](./server-side-tag-manager.md)            |
| Web GTM container      | `GTM-K5D24HJS`, `t.roicool.com/gtm.js` üzerinden first-party  | aynı belge §4, §7.2                                                     |
| GA4 / Google Ads       | `G-3SE1MB5EMG` / `AW-17287475589`                             | aynı belge §4                                                           |
| Lead endpoint          | `POST https://crm.roicool.com/s/webhook/lead`, token header'ı | [`lead-endpoint-contract.md`](./lead-endpoint-contract.md)              |
| Form köprüsü           | `Roicool/roicool-main`: Webflow Cloud route + devlink form    | [`lead-form-bridge.md`](./lead-form-bridge.md)                          |
| Consent Mode           | Kapalı, bilinçli karar                                        | sGTM belgesi §11                                                        |
| Meta CAPI, OpenAI CAPI | Sahibinin beyanıyla sGTM üstünde kurulu                       | sGTM belgesi §6.4'te listelenmiyor, bkz. aşağıda                        |
| Hata izleme            | Sentry, bu repoda hazır                                       | [`architecture.md › Hata izleme`](./architecture.md#hata-izleme-sentry) |

`lp.roicool.com` kapatılacak. sGTM konteynerleri, izleme paneli ve deploy akışı
`lp-roicool` reposunda yaşıyor; kapatırken `t.roicool.com`'u ayakta tutan parça ayrılmalı.

## Bu repoya düşen parçalar

Kararlar gelince yapılacaklar. Hiçbiri ilk boyamayı geciktirmez, hepsi `data-rc-*` üzerinden.

| Parça         | Yer                                 | İş                                                                                                                                                                                                                                                                                                                                          |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GTM yükleyici | `webflow/embeds/head.template.html` | Snippet `t.roicool.com/gtm.js?id=GTM-K5D24HJS` ile, `t.roicool.com` için preconnect. `dataLayer` ve `google_tag_manager` global'leri CLAUDE.md'ye istisna olarak yazılır.                                                                                                                                                                   |
| Consent Mode  | `head.template.html`, GTM'den önce  | CMP kararı gelmeden dokunulmaz. CMP olmadan "denied" varsayılanı yalnız veri kaybettirir.                                                                                                                                                                                                                                                   |
| Olay katmanı  | `src/runtime/analytics.js`          | `data-rc-track="<olay>"` tıklamaları dataLayer'a basar; form başarısı `generate_lead` + `event_id`. Olay adları web container'ın tetikleyicileriyle hizalanır.                                                                                                                                                                              |
| Lead formu    | `src/components/lead-form/`         | Karar bekliyor: devlink form RC-Main'e mount edilirse iş yok; native Webflow form + bu bileşen köprüye JSON POST atarsa Turnstile, durumlar ve `event_id` burada.                                                                                                                                                                           |
| Atıf          | `src/runtime/attribution.js`        | UTM ve tıklama kimlikleri ilk/son dokunuş olarak saklanır, formun gizli alanlarına yazılır. Köprünün okuduğu anahtar korunur. Endpoint'in beklediği adlar sözleşme §2.3: `gclid`, `fbclid`, `fbp`, `userAgent`, `utm_*`, `landingPageUrl`, `pageUrl`, `referrer`, `site`. Spam alanları §2.6: `formRenderedAt`, honeypot, `turnstileToken`. |
| CRM           | —                                   | Endpoint ve sözleşme hazır, iş yok.                                                                                                                                                                                                                                                                                                         |

## İncelemede görülenler

1. **Ad soyad bölme çelişkili.** Köprü belgesi ilk boşluktan böldüğünü ve bunun CRM'le
   tutarlı olduğunu söylüyor; endpoint sözleşmesi son kelimeyi soyadı alıyor. Köprü
   `firstName`/`lastName` gönderiyorsa sorun yok, `fullName` gönderiyorsa üç kelimeli adlar
   iki yerde farklı bölünür ve hash'ler ayrışır.
2. **sGTM tag listesinde Meta CAPI ve OpenAI CAPI yok.** §6.4 yalnız GA4, Ads Conversion,
   Remarketing ve Conversion Linker sayıyor. Belge eski ya da bu ikisi web container'da.
3. **Kişisel veri dataLayer'a düz metin giriyor** (köprü belgesi §17). Web container'daki
   GA4 tag'i bunu alırsa GA4 şartlarına takılır. Tarayıcıda SHA-256 ile hash'leyip basmak
   ya da GA4'ün okumadığı ayrı bir değişkende tutmak yeter.
4. **`?token=` ile kimlik** access log'lara düşer. Köprü header kullanıyorsa query yolu
   kapatılabilir.
5. **`LEAD_ALLOWED_ORIGINS`** yeni siteyle `roicoolmain.webflow.io` ve canlı alan adını
   ister.
6. **Çerez rızası.** KVKK çerez rehberi reklam ve analitik çerezleri için açık rıza ister;
   Conversion Linker rıza olmadan sunucudan çerez yazıyor. Kod işi değil, karar.

## Açık kararlar

1. GTM snippet'i RC-Main'in Custom Code alanında mı duracak, `head.html`'e mi girecek?
2. Web container export'u ya da tetikleyici adları (olay katmanı bunlara göre yazılır).
3. Form: devlink bileşeni mi, native Webflow form + `lead-form` mu? `roicool-main` hangi
   Webflow sitesine mount edilmiş?
4. Atıf script'inin kaynağı.
5. CMP var mı, hangisi?

## Kopyaların durumu

Üç referans sahibinin verdiği metinlerdir; asıl kopyalar kendi repolarında güncellenir.
`server-side-tag-manager.md` ve `lead-endpoint-contract.md` tam. `lead-form-bridge.md`
§16'nın ortasından (yapılandırma tablosu) başlıyor; §1–15 gelince tamamlanır.
