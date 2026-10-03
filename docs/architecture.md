# Mimari

> Durum: uygulanıyor. Runtime, build ve component'ler yazıldı (liste
> [`README.md`](../README.md)'de); `a11y/` katmanı henüz yok. Bu belge
> sistemin nasıl çalıştığını anlatır.

## İki taraf, keskin sınır

**Webflow Designer** — sayfa yapısı, görünüm, içerik, CMS, yayın.

**Bu repo** — davranış (JS), davranışsal stil (CSS), Designer'a yapıştırılan
snippet'ler. Görünümün ve içeriğin sahibi değil.

Buluşma noktası tek bir sözleşme: `data-rc-*` attribute'ları. Designer'da bir
elemana `data-rc="accordion"` yazılır, kod onu bulur. Başka bağ yok — kod
Webflow'un class isimlerini bilmez, Webflow kodun dosya adlarını bilmez.

## Yükleme zinciri

```
<head>  — inline katman: ağ isteği yok
  0. <script>            Webflow IX2 kapatıcı                (ŞU AN SİTEDE OLAN TEK KOD)
  1. <script>            html.rc-js sınıfını basar          (boyamadan önce)
  2. <style>             kritik CSS, 1-2 KB, build gömer     (ağ isteği yok)

<head>  — CDN katmanı: hiçbiri boyamayı bekletmez
  3. preconnect          CDN kökü (githack ya da jsDelivr)   (DNS + TLS ısınması)
  4. rc.css              async (preload → stylesheet)        (boyamayı bekletmez)
  5. rc.js               type="module" = deferred            (boyamayı bekletmez)

DOM hazır
  6. runtime DOM'u tarar, [data-rc] elemanlarını bulur
  7. her eleman için IntersectionObserver kurar
  8. eleman görünüre yaklaşınca chunk'ı import eder ve init'i çağırır
  9. runtime Lenis'i CDN'den getirir, yumuşak kaydırmayı başlatır (boyamadan sonra)

Bir şey bozulursa
 10. ilk hata (yakalanmamış hata, reddedilen promise, runtime'ın error() kaydı)
     Sentry chunk'ını getirir; o ana kadar birikenler ona aktarılır
```

Boyamayı bekleten hiçbir ağ isteği yok. Kritik CSS `<style>` olarak `head.html`'in
içinde gelir; üçüncü taraf bir origin'e senkron bağımlılık kalmaz — CDN
yavaşlasa da erişilmez olsa da ilk boyama etkilenmez. "Çizime engel olmama"
hedefinin tamamı bu.

Kritik CSS'e ne girer: başlangıç durumunu belirleyen kurallar (kapalı panelin
yüksekliği, reveal öncesi durum) ve erişilebilirlik temelleri (odak halkası,
`.rc-sr-only`, skip link). Geçişler, hover, animasyon `rc.css`'e. Başlangıç
durumu async dosyada kalırsa içerik önce açık görünüp sonra kapanır — flash.

## Neden tek script etiketi

Sestek'teki model — her component için head'e ayrı `<script>` + elle yazılmış
init bloğu — üç yerde bozuluyor:

1. Sayfaya component eklerken Designer'da kod düzenlemek gerekiyor; unutuluyor.
2. Bir script yüklenemezse (kurumsal ağ, antivirüs, CDN edge) init zinciri o
   noktada kopuyor ve **sonraki** component'ler de çalışmıyor. Bu gerçekten
   yaşandı.
3. Head'deki liste ile sayfadaki gerçek component'ler zamanla ayrışıyor.

Keşif tabanlı modelde üçü de yok. Sayfanın kullanmadığı component indirilmez;
bir chunk gelmezse yalnız o component devre dışı kalır, sayfanın kalanı
etkilenmez.

## Component sözleşmesi

```js
// src/components/<name>/<name>.js
export default function name(root) {
  // root = data-rc attribute'unu taşıyan eleman
}
```

Runtime `init`'i her kök için bir kez çağırır. Kayıt defteri, manifest, import
listesi yok — klasörü oluşturup build almak yeter.

## Katmanlar ve bağımlılık yönü

```
components/  →  a11y/  →  runtime/
             →  runtime/
```

Ok tek yönlü. `runtime/` hiçbir component'i bilmez, `a11y/` hiçbir component'i
bilmez. Component component'i import etmez — ortak bir şey gerekiyorsa
`runtime/` ya da `a11y/` içine çıkar. `a11y/` henüz açılmadı: ilk focus trap
ya da live region ihtiyacında açılır (planı
[`accessibility.md`](./accessibility.md)'de).

## Dış kütüphaneler: GSAP, Lenis ve three.js

İkisi de paketlenmez, head'e girmez; jsDelivr'dan ES modül olarak, ihtiyaç
anında import edilir. Sürüm tek yerde sabittir: ilgili dosyanın başındaki
`*_BASE` sabiti.

- **GSAP** (+ ScrollTrigger, SplitText) — `runtime/motion.js`. Yalnız isteyen
  component indirir; gelmezse component statik kalır.
- **three.js** (+ OrbitControls) — `runtime/three.js`. Yalnız WebGL sahnesi
  kuran component (`website-ring`) indirir, o da kökü görünüre yaklaşınca;
  ~170 KB gzip. jsDelivr'ın `+esm` derlemesinden gelir: OrbitControls'ün
  `import 'three'`'i aynı sabit sürüme yazılır, import map gerekmez. Gelmezse
  component statik görünümüne geçer.
- **Lenis** — `runtime/scroll.js`. Runtime her sayfada başlatır (site geneli
  yumuşak kaydırma); gelmezse sayfa doğal kaydırılır. Reduced motion'ı kendisi
  tanır: yumuşatma kapanır, kaydırma girdiyi 1:1 izler. ScrollTrigger
  yüklendiğinde Lenis'in konumunu anında okuması `motion.js`'te bağlanır.
  Designer tarafı: `<body data-rc-scroll="native">` sayfayı dışarıda bırakır;
  kendi içinde kayan elemana (modal gövdesi, kod bloğu, harita)
  `data-lenis-prevent`. Gerekli CSS `src/base/scroll.css`'te, `rc.css`'e girer.
- **Kaydırma çubuğu** — `runtime/scrollbar.js`, kütüphane değil. Fare ve
  trackpad cihazlarda yerel çubuk kritik CSS'te ilk boyamadan gizlenir
  (`html.rc-js`, kayma olmasın diye), içeriğin üstünde kanalsız ince bir thumb
  yüzer: sayfa hareket ederken ve kenara yaklaşınca görünür, boşta solar,
  sürüklenir, kanala tıklanınca oraya kayar (Lenis üzerinden). Dokunmatikte
  devreye girmez; tarayıcının kendi çubuğu kalır. `aria-hidden`, klavye ve
  tekerlek etkilenmez.

## Hata izleme: Sentry

Sitedeki JS hatalarını Sentry toplar; SDK bir sayfa görüntülemesinde
indirilmez. `runtime/monitoring.js` iki dinleyici kurar (`error`,
`unhandledrejection`) ve `log.js`'in `warn()`/`error()` çağrılarını dinler.
İlk rapor edilecek şey (yakalanmamış hata, reddedilen promise, runtime'ın
`error()` kaydı, bir component'in `rc.report(hata, bağlam)` çağrısı)
`dist/chunks/sentry-*.js`'i getirir; SDK kendi yakalayıcılarını kurar,
biriken olaylar ona aktarılır. Uyarılar SDK'yı getirmez; bir hata gelirse
breadcrumb olarak önden giderler. Sentry'nin kendi "loader script"i de böyle
çalışır; burada rc.js'in içinde, ek script etiketi ve yüklemede üçüncü taraf
origin olmadan.

- SDK npm paketinden (`@sentry/browser`, sürüm `package.json`'da) kendi
  chunk'ına paketlenir ve dist ile aynı CDN'den gelir: ~31 KB gzip, yalnız
  hata olan sayfada. Chunk'ın kendi source map'ini build atar (2 MB, kimseye
  yaramaz).
- **Source map'ler Sentry'ye push'ta yüklenir**
  (`.github/workflows/sentry-sourcemaps.yml`): `main`'e ya da bir `v*`
  tag'ine `dist/` değişikliği gidince workflow, `scripts/sentry-release.mjs`
  ile release adını (`roicool-web@<sürüm>`, runtime'ın olaya yazdığıyla aynı)
  ve URL önekini (CDN kökü `~` ile: `~/Roicool/roicool-web/main/dist`) çıkarır
  ve `sentry-cli sourcemaps upload` ile `dist/`'i o release'e yükler. Dosyalara
  hiçbir şey enjekte edilmez; Sentry stack trace'teki dosya yolunu release +
  önekle eşler. Sentry'nin map'i CDN'den kendisi çekmesi (Enable JavaScript
  source fetching) yedek olarak açık kalır ama güvenilmez; ilk denemede
  çözmedi. Workflow tek gizli değer ister: repo secret `SENTRY_AUTH_TOKEN`
  (Sentry › Settings › Auth Tokens, organization token).
- DSN build'de gömülür: `package.json › config.sentryDsn` (deneme için
  `RC_SENTRY_DSN` ortam değişkeni onu ezer). Boşsa izleme kapalıdır,
  dinleyici bile kurulmaz. Release `roicool-web@<sürüm>`; ortam hostname'den:
  `roicool.com` → production, `*.webflow.io` → staging, gerisi development.
- Yalnız hata: tracing, replay, profiling, release-health session yok;
  `sendDefaultPii: false`. Tarayıcı eklentilerinden gelen hatalar ve
  ResizeObserver gürültüsü elenir (`runtime/sentry.js`).
- SDK yüklenince `globalThis.__SENTRY__` taşıyıcısını koyar: `rc` dışındaki
  tek global, o da yalnız hata olmuş sayfada.
- `?rc-debug` ile konsolda: `monitoring: watching`, `off (no DSN built in)`
  ya da `Sentry ready`.

Sahibinin yapacağı kurulum (proje, DSN, alan adı ve gizlilik ayarları)
[`webflow-setup.md › Hata izleme`](./webflow-setup.md#hata-izleme-sentry)'de.

## CMS'te türetilen alanlar

Kural 1'in CMS tarafı: ziyaretçinin ya da botun okuduğu her değer bir CMS
alanıdır, tarayıcı hiçbir değeri hesaplamaz. Okuma süresi bunun ilk örneği.
Tarayıcıda hesaplansa üç yerde bozulurdu: Home'daki kartta gövde yok,
hesaplanacak şey yok; bot ve LLM tarayıcıları JS çalıştırmaz, değeri görmez;
JS gelene kadar alan boş durur.

Mekanizma: `scripts/cms-derived-fields.mjs`, `webflow/cms-derived-fields.json`
içindeki koleksiyonları Webflow Data API'den okur, gövdenin HTML'ini soyup
kelime sayar, dakikayı yukarı yuvarlar (200 kelime/dk, en az 1), yalnız
değeri değişen kayıtların **Kelime sayısı** ve **Okuma süresi** alanlarını
yazar: taslak kayda her zaman, yayındaki kayda canlı uç noktasından da, site
publish'i gerekmeden. Boşaltılmış gövde eski sayıları siler.
`.github/workflows/cms-derived-fields.yml` bunu saatte bir ve Actions
sekmesinden elle (dry run seçeneğiyle) çalıştırır; token `WEBFLOW_API_TOKEN`
repo secret'ı. Alanı henüz açılmamış koleksiyon uyarıyla atlanır, workflow
kırmızıya düşmez.

Aynı kalıp ileride başka türetilen değerlere açılır (ses süresi, sayfa
sayısı); yeni bir hesap yeni bir alan ve bu script'te bir satırdır,
tarayıcıda bir satır değil.

## Build

`src/` → `dist/`, esbuild ile. Her component ayrı bir chunk; paylaşılan kod
(runtime, a11y) tek ortak chunk'a çıkar, component'lere kopyalanmaz.

CSS'te iki çıktı: `src/base/critical.css` minify edilip `head.html`'in içine
`<style>` olarak gömülür (dosya olarak çıkmaz, ağdan istenmez); `rc.css`
(hareket politikası + `site.css` + tüm component CSS'leri) `dist/`'e yazılır.
Component CSS'leri davranışsal olduğu için toplam küçük kalır; component başına
ayrı istek açmaya değmez.

`dist/` commit'lenir. CDN onu doğrudan repo'dan servis edeceği için build
çıktısı repo'da bulunmak zorunda.

Build ayrıca `webflow/embeds/head.html`'i üretir: şablona (`head.template.html`)
kritik CSS'i `<style>` olarak gömer ve `package.json`'daki sürümü CDN
URL'lerine yazar. `head.html` el yazması değildir; sürüm numarasını elle
düzeltme hatası bu yüzden yoktur.

## Sürümleme

`head.html`'deki CDN URL'leri bir referansa bakar; hangisi olduğunu
`package.json › config.cdnRef` belirler ve build URL'lere yazar. İki mod:

**Geliştirme — `"main"` (şu an).** Site canlı değilken. Her commit `main`'e
gider, site oradan okur; tag yok, sürüm numarası yok, `head.html` şablon ya
da kritik CSS değişmedikçe yeniden yapıştırılmaz. Servis eden
`raw.githack.com`: GitHub raw'ı doğru MIME tipi ve CORS ile geçirir, kendi
cache'i yoktur; araya yalnız GitHub'ın 5 dakikalık raw cache'i girer. jsDelivr
bu modda bilinçli olarak yok: dal referanslarını 12 saat cache'ler ve purge
API'si dallar için güvenilir değil (kendi belgesi "purge yalnız semver
sürümlerde çalışır" der; "finished" dönen purge'lerden sonra bile eski dosya
servis edildi).

**Üretim — `"tag"`.** Site canlıya çıkınca. URL'ler jsDelivr'da `v<sürüm>`'e
sabitlenir: o dosya bir daha değişmez, jsDelivr kalıcı cache'ler, dala atılan
commit siteye gitmez, geri alma = eski `head.html`'i yapıştırmak. Sürüm tek komut:
`npm version minor` → `package.json` yükselir → `version` lifecycle'ı build
alır ve stage'ler → npm commit'ler ve `vX.Y.Z` tag'ini atar →
`git push --follow-tags`. Sonra `head.html` yapıştırılır.

`@main` üretimde kullanılmaz: repo'ya atılan her commit siteyi değiştirir,
githack'in üretim düzeyinde bir hizmet garantisi yoktur ve "sitede hangi kod
çalışıyor" sorusunun cevabı belirsizleşir.
