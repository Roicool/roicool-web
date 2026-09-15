# Mimari

## Sistem neyden oluşuyor

İki taraf var ve aralarındaki sınır kasıtlı olarak keskin:

**Webflow Designer** — sayfa yapısı, görünüm, CMS, yayın. İçeriğin ve tasarımın
sahibi.

**Bu repo** — davranış (JS), davranışsal stil (CSS), yapılandırılmış veri
(JSON-LD, `llms.txt`). Görünümün sahibi değil.

Buluşma noktası tek bir sözleşme: `data-rc-*` attribute'ları. Designer'da bir
elemana `data-rc="accordion"` yazarsın, kod onu bulur. Başka bağ yok — kod
Webflow'un class isimlerini bilmez, Webflow kodun dosya adlarını bilmez.

## Yükleme zinciri

```
<head>
  1. inline script       html.rc-js sınıfını basar          (~0ms, boyamadan önce)
  2. preconnect          cdn.jsdelivr.net                    (DNS + TLS ısınması)
  3. rc.critical.css     senkron, küçük                      (boyamayı bekletir — bilerek)
  4. rc.css              async (preload → stylesheet)        (boyamayı bekletmez)
  5. rc.js               type="module" = deferred            (boyamayı bekletmez)

DOM hazır
  6. registry DOM'u tarar, [data-rc] elemanlarını bulur
  7. her eleman için IntersectionObserver kurar
  8. eleman görünüre yaklaşınca chunk'ı import eder ve init'i çağırır
```

Senkron yüklenen tek dosya `rc.critical.css`. Bu, "çizime engel olmama"
hedefinin tamamı: başka hiçbir şey ilk boyamayı beklemez.

## Neden tek script etiketi

Alternatif — her component için Webflow head'ine ayrı bir `<script>` ve sonunda
elle yazılmış bir init bloğu — üç yerde bozulur:

1. Sayfaya component eklerken Designer'da kod düzenlemek gerekir; unutulur.
2. Bir script yüklenemezse (kurumsal ağ, antivirüs, CDN edge sorunu) init
   zinciri o noktada kopar ve **sonraki** component'ler de çalışmaz.
3. Head'deki liste ile sayfadaki gerçek component'ler zamanla birbirinden ayrışır.

Keşif tabanlı yaklaşımda üçü de ortadan kalkar. Sayfanın kullanmadığı component
hiç indirilmez; bir chunk gelmezse yalnızca o component sessizce devre dışı
kalır (konsola tek satır uyarı düşer), sayfanın geri kalanı etkilenmez.

## Component sözleşmesi

```js
// src/components/<name>/<name>.js
export default function name(root) {
  // root = data-rc attribute'unu taşıyan eleman
}
```

Runtime `init`'i her kök için **bir kez** çağırır. Kayıt defteri, manifest ya da
import listesi yoktur — klasörü oluşturup build almak yeterli.

## Katmanlar ve bağımlılık yönü

```
components/  →  a11y/  →  runtime/
             →  runtime/
```

Ok tek yönlü. `runtime/` hiçbir component'i bilmez, `a11y/` hiçbir component'i
bilmez. Bir component başka bir component'i import etmez — ortak bir şey
gerekiyorsa `runtime/` ya da `a11y/` içine çıkar.

## Build

`npm run build` → esbuild, `src/` içindeki her component'i ayrı bir chunk'a,
runtime'ı `rc.js`'e derler. Paylaşılan kod (runtime, a11y) `splitting` ile tek
bir ortak chunk'a çıkar; her component'e kopyalanmaz.

CSS tarafında iki çıktı var: `rc.critical.css` (yalnızca `src/base/critical.css`)
ve `rc.css` (hareket politikası + site geneli istisnalar + tüm component
CSS'leri). Component CSS'leri davranışsal olduğu için toplamları küçük kalır;
component başına ayrı istek açmaya değmez.

`dist/` commit'lenir. jsDelivr onu doğrudan repo'dan servis ettiği için build
çıktısı repo'da bulunmak zorunda.

## Sürümleme

Webflow head'i bir sürüm etiketine sabitlenir (`@v0.1.0`). `@main` kullanılmaz:
repo'ya atılan her commit siteyi anında değiştirir ve test edilmemiş kod
ziyaretçiye gider. Yeni sürüm yayınlamak = tag atmak + head'deki etiketi
güncellemek.
