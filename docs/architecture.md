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

Webflow head'i bir sürüm etiketine sabitlenir (`@v0.1.0`). `@main` kullanılmaz:
repo'ya atılan her commit siteyi anında değiştirir, test edilmemiş kod
ziyaretçiye gider; ayrıca jsDelivr `@main`'i ~12 saat cache'ler, tag'leri
kalıcı.

Sürüm tek komut: `npm version minor` → `package.json` yükselir → `version`
lifecycle'ı build alır ve çıktıları stage'ler → npm commit'ler ve `vX.Y.Z`
tag'ini atar. `git push --follow-tags` ile tag CDN'de anında yayında; sürüm
numarası `head.html`'e build'de yazıldığı için elle düzeltilecek bir yer yok.
