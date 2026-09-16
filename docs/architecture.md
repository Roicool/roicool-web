# Mimari

> Durum: plan. Kod yazımı henüz başlamadı. Bu belge yazılacak şeyin nasıl
> çalışacağını anlatır.

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
  3. preconnect          cdn.jsdelivr.net                    (DNS + TLS ısınması)
  4. rc.css              async (preload → stylesheet)        (boyamayı bekletmez)
  5. rc.js               type="module" = deferred            (boyamayı bekletmez)

DOM hazır
  6. runtime DOM'u tarar, [data-rc] elemanlarını bulur
  7. her eleman için IntersectionObserver kurar
  8. eleman görünüre yaklaşınca chunk'ı import eder ve init'i çağırır
  9. runtime Lenis'i CDN'den getirir, yumuşak kaydırmayı başlatır (boyamadan sonra)
```

Boyamayı bekleten hiçbir ağ isteği yok. Kritik CSS `<style>` olarak `head.html`'in
içinde gelir; üçüncü taraf bir origin'e senkron bağımlılık kalmaz — jsDelivr
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
`runtime/` ya da `a11y/` içine çıkar.

## Dış kütüphaneler: GSAP ve Lenis

İkisi de paketlenmez, head'e girmez; jsDelivr'dan ES modül olarak, ihtiyaç
anında import edilir. Sürüm tek yerde sabittir: ilgili dosyanın başındaki
`*_BASE` sabiti.

- **GSAP** (+ ScrollTrigger, SplitText) — `runtime/motion.js`. Yalnız isteyen
  component indirir; gelmezse component statik kalır.
- **Lenis** — `runtime/scroll.js`. Runtime her sayfada başlatır (site geneli
  yumuşak kaydırma); gelmezse sayfa doğal kaydırılır. Reduced motion'ı kendisi
  tanır: yumuşatma kapanır, kaydırma girdiyi 1:1 izler. ScrollTrigger
  yüklendiğinde Lenis'in konumunu anında okuması `motion.js`'te bağlanır.
  Designer tarafı: `<body data-rc-scroll="native">` sayfayı dışarıda bırakır;
  kendi içinde kayan elemana (modal gövdesi, kod bloğu, harita)
  `data-lenis-prevent`. Gerekli CSS `src/base/scroll.css`'te, `rc.css`'e girer.

## Build

`src/` → `dist/`, esbuild ile. Her component ayrı bir chunk; paylaşılan kod
(runtime, a11y) tek ortak chunk'a çıkar, component'lere kopyalanmaz.

CSS'te iki çıktı: `src/base/critical.css` minify edilip `head.html`'in içine
`<style>` olarak gömülür (dosya olarak çıkmaz, ağdan istenmez); `rc.css`
(hareket politikası + `site.css` + tüm component CSS'leri) `dist/`'e yazılır.
Component CSS'leri davranışsal olduğu için toplam küçük kalır; component başına
ayrı istek açmaya değmez.

`dist/` commit'lenir. jsDelivr onu doğrudan repo'dan servis edeceği için build
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
da kritik CSS değişmedikçe yeniden yapıştırılmaz. Bedeli: jsDelivr dal
referanslarını 12 saate kadar cache'ler, bu yüzden bir push'u hemen görmek
için `npm run purge` (jsDelivr'ın cache temizleme adresine istek atar).

**Üretim — `"tag"`.** Site canlıya çıkınca. URL'ler `v<sürüm>`'e sabitlenir:
o dosya bir daha değişmez, jsDelivr kalıcı cache'ler, dala atılan commit
siteye gitmez, geri alma = eski `head.html`'i yapıştırmak. Sürüm tek komut:
`npm version minor` → `package.json` yükselir → `version` lifecycle'ı build
alır ve stage'ler → npm commit'ler ve `vX.Y.Z` tag'ini atar →
`git push --follow-tags`. Sonra `head.html` yapıştırılır.

`@main` üretimde kullanılmaz: repo'ya atılan her commit siteyi değiştirir ve
"sitede hangi kod çalışıyor" sorusunun cevabı 12 saatlik cache yüzünden
belirsizleşir.
