# Webflow kurulumu

Kod siteye **tek yoldan** girer: Site Settings › Custom Code › Head alanına elle
yapıştırılan `webflow/embeds/head.html`. Webflow API, registered scripts ya da
herhangi bir otomatik yazma yolu kullanılmaz — karar kesin.

## Bir kereye mahsus

1. **Site Settings › Custom Code › Head Code** →
   [`webflow/embeds/head.html`](../webflow/embeds/head.html) içeriğini
   olduğu gibi yapıştır. Elle düzenleme; dosya build tarafından üretiliyor ve
   sürüm numarası içinde.
2. **Site Settings › SEO › robots.txt** → staging alan adında (`*.webflow.io`)
   her şey kapalı, canlıda AI tarayıcıları engellenmez.
3. **Designer** → body'nin ilk elemanı olarak skip link
   (`<a class="rc-skip-link" href="#main">İçeriğe atla</a>`), `<main>`
   bölümüne `id="main"` ve `tabindex="-1"`.
4. **Publish.** Custom code Designer önizlemesinde çalışmaz; yalnız yayınlanmış
   sayfada görürsün. Önce sadece `*.webflow.io`'ya publish edip test etmek
   güvenli yol.

**Karakter sınırı.** Webflow'un site geneli Head Code alanı 20.000 karakter
alır. Projenin tamamı head'e girmez ve girmeyecek: head yalnız açılış kodudur
(IX2 kapatıcı, `rc-js` işareti, satır içi kritik CSS, `rc.css` ve `rc.js`
bağlantıları); `rc.css`, `rc.js` ve component chunk'ları CDN'den gelir, sayısı
ve boyutu head'i etkilemez. Head'i büyüten tek şey kritik CSS'tir: her
component'in `<name>.critical.css` dosyası oraya gömülür. Bu yüzden kritik
dosyaya yalnız ilk boyamada görünmesi şart olan şey girer (ekranın üstündeki
component'in başlangıç durumu, düzen kaymasını önleyen ölçüler); geri kalan her
şey `<name>.css`'te, yani `rc.css`'tedir. Build her seferinde head'in kaç
karakter olduğunu yazar, 17.000'de uyarır, 20.000'de durur.

**Ölçü şu:** bir component'in `<name>.critical.css` dosyası olması için o
component'in herhangi bir sayfanın **ilk ekranında** durması gerekir. Bugün
bu `hero` ve `hero-video-scroll` (ikisi de sayfa tepesi hero'su; ikincisi
Home'da aşağıda dursa da başka sayfalarda ilk ekranda kullanılacak) ve
dock'un, hover-reveal'ın birkaç satırlık gizleme kuralları. Yalnız sayfa
ortasında duran bir bölümün bütün CSS'i `rc.css`'ten gelir; ziyaretçi oraya
kaydırana kadar `rc.css` çoktan inmiştir. Böyle tutulunca head'i yalnız
hero tipi component'ler büyütür, tanesi 2–4 bin karakter; bugünkü 10.300 ile
sınır üç dört hero'ya daha yeter.

**Sayfa bazlı head (B planı):** o sınıra da gelinirse site geneli head
yalnız açılış kodu kalır (script'ler, taban kritik CSS, bağlantılar; ~4.300
karakter) ve her sayfa tipinin ilk ekran CSS'i o sayfanın Page Settings ›
Custom Code › Head alanına gider (sayfa başına 10.000 karakter). Repoda sayfa
→ component eşlemesi tutulur (`webflow/pages.json`), build sayfa başına bir
`webflow/embeds/pages/<sayfa>.html` üretir. Bedeli: her sayfa tipi için ayrı
bir yapıştırma noktası ve eşlemenin elle güncel tutulması. Bugün gerekmiyor;
head 20.000'in yarısını geçince açılır.

`head.html` içindeki IX2 kapatıcı bir karar: Designer'daki native interaction'lar
çalışmaz. Animasyonların tamamı bu repo'dan yönetilecekse doğru; Designer'da
interaction kullanılacaksa `head.template.html`'den o blok kaldırılır.

## Yayın

**Şu an geliştirme modu:** `head.html` `@main`'e bakar. Her commit `main`'e
gider ve site oradan okur; `head.html` yalnız şablon ya da kritik CSS
değişince yeniden yapıştırılır. Dosyalar `raw.githack.com` üzerinden gelir:
CDN cache'i yok, araya yalnız GitHub'ın 5 dakikalık raw cache'i girer. Push'tan
en geç 5 dakika sonra yeni kod yayında; purge yok, Action yok.

**Tarayıcı da 5 dakika tutar.** Test ederken hard reload (Ctrl+Shift+R, Mac'te
Cmd+Shift+R) ya da DevTools › Network › **Disable cache** — bu seçenek yalnız
DevTools paneli açıkken işler. Eski `rc.css`/`rc.js` ile bakıp "çalışmıyor"
sanmak bugüne kadarki en sık yanılgı; şüphede konsolda dosyaya doğrudan bağlı
bir değere bak: `typeof rc.lenis` (`object` → runtime yeni) gibi.

**jsDelivr neden değil:** dal referanslarını 12 saat cache'ler ve purge API'si
dallarda güvenilir değil; "finished" dönen purge'lerden sonra bile eski dosya
servis edildi. Üretim modunda (`tag`) jsDelivr kullanılır, çünkü orada dosyalar
değişmez.

Site canlıya çıkınca sürüm tag'lerine geçilir; o zaman her sürümde
`head.html` yeniden yapıştırılır. İki modun tanımı:
[`architecture.md › Sürümleme`](./architecture.md#sürümleme).

## Yayına çıkarken — kontrol listesi

Proje kapanırken, sırayla. Kod tarafı olanlar repoda yapılır, kalanı
Webflow'da.

1. **Fontlar (Webflow):** Project Settings › Fonts'tan Google Fonts girdisini
   kaldır; `font-primary`, `font-secondary`, `font-mono` değişkenlerinin
   gösterdiği aileleri **özel font** olarak yükle (woff2, yalnız kullanılan
   ağırlıklar: normal, medium, bold), `font-display: swap`. Değişkenler aynı
   aile adını gösterdiği sürece hiçbir class değişmez. `webfont.js` + Google
   CSS zinciri ve font zıplaması biter.
2. **Font preload (repo):** ana fontun Webflow'daki woff2 URL'si
   `head.template.html`'e `<link rel="preload" as="font" type="font/woff2"
crossorigin>` olarak eklenir, build alınır, `head.html` yapıştırılır.
3. **Üretim modu (repo):** `package.json › config.cdnRef` → `"tag"`,
   `npm version minor && git push --follow-tags`, `head.html` yapıştırılır.
   Dosyalar jsDelivr'dan `v<sürüm>` ile gelir; `raw.githack` yalnız geliştirme
   içindir ([`architecture.md › Sürümleme`](./architecture.md#sürümleme)).
4. **Webflow CSS:** Style Manager › Clean up ile kullanılmayan class'lar
   silinir (site CSS'i engelleyici kalır, tek küçültme yolu bu).
5. **Görseller:** her `img`'de `width`/`height`, ekran dışındakilerde
   `loading="lazy"`, hero video `poster` + `preload="metadata"`.
6. **QA raporunun Webflow listesi** (27.09.2026): skip link + `header`/`nav`/
   `footer` etiketleri, `<html lang="tr">`, `title` + meta description, tek
   `h1`, boş `#` linkler, logo `alt`'ları, yer tutucu metinler, footer'a
   `data-rc-dock-stop`.
7. **Ölçüm:** 1–5 öncesi ve sonrası PageSpeed (mobil + masaüstü), Lighthouse
   erişilebilirlik; `?rc-debug` ile konsolda uyarı kalmamalı.
8. **Sentry:** DSN girildi, Allowed Domains ve IP ayarı yapıldı,
   `SENTRY_AUTH_TOKEN` repo secret'ı var ve source map workflow'u yeşil,
   canlıdan bir test olayı `src/` satırıyla düştü
   ([Hata izleme](#hata-izleme-sentry)).
9. **Ölçüm ve lead:** GTM yükleyici, atıf script'i, olay katmanı, form kararı ve
   `LEAD_ALLOWED_ORIGINS`; açık kararlar ve bulgular
   [`measurement.md`](./measurement.md)'de. Sahibinin kararıyla canlıya yakın
   yapılır.

## Performans — Webflow tarafı

PageSpeed'de bizim dosyalarımız boyamayı bekletmez; bekleten şeyler Webflow'un
kendi yükleridir. Elimizdekiler:

- **Font.** Google Fonts seçiliyse Webflow `webfont.js` + Google CSS + woff2
  zincirini render-blocking yükler ve font değişince metin zıplar (CLS). Fonts
  ayarından fontu **özel font** olarak yükle (woff2, yalnız kullanılan
  ağırlıklar), Google Fonts girdisini kaldır. Webflow özel fontu kendi CSS'inden
  `font-display: swap` ile verir; iki origin ve bir script zincirden düşer.
- **jQuery + `webflow.js`** Webflow'un runtime'ıdır (form, dropdown, tabs).
  Kaldırılamaz; küçük ve cache'lenir.
- **Preconnect sayısı.** Webflow kendi CDN'leri için ekliyor; biz dist origin'i
  ve `cdn.jsdelivr.net` (GSAP, Lenis) için ekliyoruz. Google Fonts gidince
  ikisi düşer.
- **Görseller.** Her `img`'de `width`/`height` (Webflow CMS görsellerinde
  otomatik), `loading="lazy"` ekran dışındakilere; hero video `poster`'ı
  `preload="metadata"` ile.

## Sayfaya component eklemek

Sayfa bazında custom code yok. Component eklemek attribute yazmaktan ibaret:

1. Designer'da elemanı seç.
2. Settings paneli (D) → Custom attributes.
3. `data-rc` = component adı.
4. Component'in `README.md`'sindeki yapıyı kur (parçalar, ayarlar).
5. Yayınlanmış sayfada test et.

## Hata izleme (Sentry)

Kod tarafı hazır ([`architecture.md › Hata izleme`](./architecture.md#hata-izleme-sentry));
DSN girilene kadar kapalı. Kurulum bir kez, sahibi yapar:

1. sentry.io'da proje aç: platform **Browser JavaScript** (framework değil),
   ad `roicool-web`. Project Settings › Client Keys (DSN) sayfasından DSN'i
   kopyala.
2. Project Settings › **Allowed Domains**: `roicool.com`, `*.roicool.com`,
   `*.webflow.io`. DSN her ziyaretçinin sayfasında açıkta durur; bu liste
   başkasının projeye olay basmasını keser.
3. Project Settings › Security & Privacy: **Prevent Storing of IP Addresses**
   açık, Data Scrubber açık. SDK kimlik verisi göndermez ve çerez koymaz; bu
   ayar Sentry'nin sunucu tarafında IP yazmasını da durdurur. Gizlilik
   metnine hata kayıtları için Sentry kullanıldığı eklenir (KVKK).
4. DSN'i `package.json › config.sentryDsn`'e yaz, `npm run build`, commit,
   push. Publish gerekmez, `head.html` değişmez.
5. Sınama: siteyi `?rc-debug` ile aç; konsolda `[rc] monitoring: watching`
   görünmeli. Sonra konsola `rc.report(new Error("test"))` yaz: ağ sekmesinde
   `chunks/sentry-*.js` ve `ingest.sentry.io` isteği, Sentry'de "test" olayı
   görünmeli; ortamı `production` ya da `staging`.
6. Alerts: yeni issue'da e-posta yeter. Uyarılar (`warn`) tek başına
   gitmez, bir hataya breadcrumb olarak eşlik eder.
7. **Source map'ler için token:** Sentry › Settings › Auth Tokens ›
   Create New Token (organization token, varsayılan izinler yeter). Değeri
   GitHub › repo › Settings › Secrets and variables › Actions › New repository
   secret'a `SENTRY_AUTH_TOKEN` adıyla koy. Sonraki her `dist/` push'unda
   "Sentry source maps" workflow'u map'leri yükler; Actions sekmesinde yeşil
   olmalı. Sınama: staging'de konsola `setTimeout(() => rc.scan(null))` yaz;
   Sentry'deki stack trace `src/runtime/registry.js` satırını göstermeli.
   Token'ı repoya, `package.json`'a ya da `head.html`'e yazma.

## Türetilen CMS alanları (okuma süresi, içindekiler)

Okuma süresi ve kelime sayısı CMS'te alan olarak durur; repo'daki script
saatte bir hesaplayıp yazar ([`architecture.md › CMS'te türetilen
alanlar`](./architecture.md#cmste-türetilen-alanlar)). Kurulum bir kez,
sahibi yapar:

1. **Token:** Webflow › Site settings › Apps & integrations › API access ›
   Generate API token. Ad `roicool-web cms`, izin yalnız **CMS: Read and
   write**; başka izin verme. Değeri GitHub › repo › Settings › Secrets and
   variables › Actions › New repository secret'a `WEBFLOW_API_TOKEN` adıyla
   koy. Token'ı repoya, `package.json`'a ya da head'e yazma.
2. **Alanlar:** Blog ve Karşılaştırmalar koleksiyonlarında üç alan:
   **Body** (Rich text; gövde), **Reading time** (Number) ve **Word
   count** (Number). Son ikisi "Derived" grubunda, açıklamasına "script
   yazar, elle dokunma". Alan slug'ları `icerik`, `okuma-suresi`,
   `kelime-sayisi` olmalı; farklıysa `webflow/cms-derived-fields.json`'da
   düzeltilir. Başka koleksiyona açmak = aynı dosyaya bir satır.
3. **İlk çalıştırma:** GitHub › Actions › "CMS türetilen alanlar" › Run
   workflow, "dry run" işaretli. Günlükte her kaydın kelime ve dakikası
   listelenir, CMS'e yazılmaz. Doğruysa bir daha, işaretsiz. Sonra saatte
   bir kendisi çalışır; aceleyse elle.
4. **Designer:** kartta ve yazı sayfasında Text Block'u Reading time
   alanına bağla ("{{Reading time}} dk okuma"); alan boşken gizlemek için
   Conditional Visibility › Reading time is set.
5. **İçindekiler (yalnız Blog):** "Derived" grubunda **Table of contents** (Rich
   text, slug `icindekiler`) alanı; script gövdenin H2'lerinden `#çapa`
   linkli bir liste yazar (`tableOfContents` ayarı). Yazı sayfasında bu
   alan `toc` bileşeninin `list` parçasına bağlanır; çapaları bileşen verir
   (`src/components/toc/README.md`). Başka koleksiyona açmak = aynı ayar.

Yazı yayınlandıktan sonra gövde değişirse sayı ve içindekiler en geç bir
saat içinde düzelir; yayınlanmamış taslakta da hesaplanır, yayına girince hazırdır.

## Doğrulama

Yayınlanmış sayfada konsola:

```js
document.body.getAttribute("data-wf-ix-vacation"); // "1" — IX2 kapalı
document.documentElement.classList.contains("rc-js"); // true — işaret basıldı
typeof rc.scan; // "function" — runtime yüklendi
```

URL'nin sonuna `?rc-debug` eklersen runtime ne yaptığını konsola yazar.

## Sorun giderme

| Belirti                                  | Sebep                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Hiçbir şey olmuyor, konsol boş           | `head.html` yapıştırılmamış ya da sayfa yayınlanmamış                                                                   |
| `rc.js` 404                              | Tag push'lanmamış (`git push --follow-tags`) ya da head'deki sürüm repoda yok                                           |
| `"x" could not be loaded`                | Component adı yanlış yazılmış, ya da o sürümde yok                                                                      |
| İçerik önce açık görünüp sonra kapanıyor | `rc-js` işareti eksik, ya da başlangıç durumu CSS'i kritik yerine `rc.css`'te                                           |
| Görünüm repo'daki CSS'i dinlemiyor       | Doğru davranış — LOOK kuralları sıfır specificity'de, Designer kazanıyor. Bkz. [`css-ownership.md`](./css-ownership.md) |

## Değişkenler

Tasarım token'larının kaynağı Designer'daki Webflow Variables koleksiyonudur.
`webflow/tokens/variables.reference.css` yalnızca okunabilir bir aynadır ve
**sitede yüklenmez** — yüklenirse Designer'daki gerçek değerleri ezer.
