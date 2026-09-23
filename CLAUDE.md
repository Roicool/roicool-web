# Çalışma kuralları

Bu dosya hem geliştirici hem ajan içindir. Kod yazmadan önce oku.

## Kapsam

Bu repo yalnızca **kod** içerir: sitenin JS'i, davranışsal CSS'i ve Designer'a
yapıştırılan snippet'ler. İçerik, metin, yapılandırılmış veri, `llms.txt`,
redirect haritası gibi şeyler burada değil — onların yeri Webflow.

**Kod siteye API ile girmez — asla.** Tek yol: Site Settings › Custom Code ›
Head alanına elle yapıştırılan `webflow/embeds/head.html`. Registered scripts,
custom code API'si, sayfa head'ine script yazmak — hiçbiri. Önerme bile.

Webflow MCP ile **eleman kurmak** (DOM yapısı, class, attribute) bundan ayrı:
sahibi isterse serbest. Sitenin kendi agent kuralı da var:
`rules/roicool-web.md` (Webflow › agent instructions) — bu dosyayla tutarlı
tutulur.

## Değiştirilemez kurallar

1. **JS asla içerik üretmez.** Metin, başlık, liste, tablo — hepsi HTML'de
   bulunur. JS yalnızca davranış ekler. Gerekçe: [`docs/geo.md`](./docs/geo.md).
2. **Hiçbir şey ilk boyamayı geciktirmez.** Senkron gelen tek stil, build'in
   `head.html`'e `<style>` olarak gömdüğü kritik CSS'tir
   (`src/base/critical.css`); ağdan senkron hiçbir dosya istenmez. Tüm JS
   `type="module"` (tanımı gereği deferred).
3. **JS gelmezse içerik görünür kalır.** Bir şeyi gizleyen CSS `.rc-js`
   önekiyle yazılır; bu sınıfı Webflow head'indeki satır içi snippet basar.
4. **Kod, Webflow'un class'larına dokunmaz.** Seçim ve durum yalnızca
   `data-rc-*` attribute'ları üzerinden. Tek istisna: `rc-` önekli yardımcı
   sınıflar (`.rc-sr-only`, `.rc-skip-link`).
5. **Hareket isteğe bağlıdır.** `prefers-reduced-motion: reduce` altında her
   component tam işlevsel kalır. Animasyon kütüphanesi yüklenmezse component
   çalışmaya devam eder.
6. **Tek global:** `window.rc`. Başka global yok, `window` kirletilmez.

## Webflow kısıtları

**Collection List üç katmandır ve araya hiçbir şey konamaz:**

```
Collection List Wrapper   .w-dyn-list
  Collection List         .w-dyn-items
    Collection Item       .w-dyn-item
```

Designer bu üçünün arasına eleman eklemeye izin vermez; sarmalayıcı div,
track div, ara katman — hiçbiri. CMS'ten beslenen her component bu yapıyı
olduğu gibi kabul etmek zorunda: kök attribute wrapper'a, parça attribute'ları
list ve item'a gider; kod ek bir sarmalayıcı gerekiyorsa onu **kendisi**
oluşturur (klonlama, sibling ekleme), Designer'dan istemez. Wrapper'ın altında
`.w-dyn-empty` (boş durum) div'i de bulunabilir — list'i seçerken ona takılma.

## İsimlendirme

Ayrıntı [`docs/naming.md`](./docs/naming.md)'de. Özet:

- Klasör ve dosya adları: `kebab-case`, İngilizce.
- Component adı dört yerde aynı: klasör, dosya, `data-rc` değeri, CSS seçicisi.
- Kod (tanımlayıcılar ve yorumlar) İngilizce; dokümanlar Türkçe.
- Kısaltma yok: `navigation`, `nav` değil. `button`, `btn` değil.
- `misc`, `utils`, `helpers`, `common`, `temp`, `old`, `_archive` adında klasör
  açılmaz. Bir şeyin gideceği yer yoksa, eksik olan klasör adıdır.

## Yeni component eklemek

```
src/components/<name>/
  <name>.js       default export: init(root)
  <name>.css      yalnızca davranışsal stil
  README.md       Designer'daki yapı, attribute'lar, erişilebilirlik notları
```

`<name>.js` sözleşmesi:

```js
export default function name(root) {
  /* ... */
}
```

Runtime, `[data-rc~="name"]` elemanını görünce chunk'ı getirir ve `init`'i bir
kez çağırır. Kayıt defteri, manifest ya da init listesi güncellemen gerekmez.

Bitirmeden önce `npm run build` çalıştır. İki üretilen çıktı var ve ikisi de
commit'e girer: `dist/` (CDN oradan servis ediyor) ve
`webflow/embeds/head.html` (Webflow'a yapıştırılan şey). `head.html` elle
düzenlenmez; kaynağı `head.template.html`.

## Commit

- Konu satırı: `<alan>: <ne yapıldı>` — ör. `accordion: tek açılır mod ekle`.
- `dist/` ve `head.html` değişikliği aynı commit'te, ayrı commit'te değil.

## Yayın

`package.json › config.cdnRef`, `head.html`'deki CDN URL'lerinin neye baktığını
belirler:

- **`"main"` — geliştirme modu (şu an).** Her commit `main`'e push edilir,
  site oradan okur; dosyalar `raw.githack.com` üzerinden gelir (CDN cache'i
  yok, araya yalnız GitHub'ın 5 dakikalık raw cache'i girer). Değişikliği
  görmek için hard reload. `head.html` yalnız kritik CSS ya da şablon
  değişince yeniden yapıştırılır. jsDelivr bu modda kullanılmaz: dal
  referanslarını 12 saat cache'ler, purge'ü dallarda güvenilir değil.
- **`"tag"` — üretim modu.** URL'ler jsDelivr'da `v<sürüm>`'e sabitlenir:
  `npm version minor && git push --follow-tags`, sonra `head.html`
  yapıştırılır. `patch` = düzeltme, `minor` = yeni component/özellik,
  `major` = attribute sözleşmesinde kırıcı değişiklik.

Mod değiştirmek = `cdnRef`'i değiştirip build almak; `head.html` yeniden
yapıştırılır.
