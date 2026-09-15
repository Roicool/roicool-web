# Çalışma kuralları

Bu dosya hem geliştirici hem ajan içindir. Kod yazmadan önce oku.

## Kapsam

Bu repo yalnızca **kod** içerir: sitenin JS'i, davranışsal CSS'i ve Designer'a
yapıştırılan snippet'ler. İçerik, metin, yapılandırılmış veri, `llms.txt`,
redirect haritası gibi şeyler burada değil — onların yeri Webflow.

**Webflow API kullanılmaz — asla.** Kod siteye tek yoldan girer: Site Settings ›
Custom Code › Head alanına elle yapıştırılan `webflow/embeds/head.html`. Data
API, registered scripts, MCP üzerinden siteye yazma — hiçbiri. Önerme bile.

## Değiştirilemez kurallar

1. **JS asla içerik üretmez.** Metin, başlık, liste, tablo — hepsi HTML'de
   bulunur. JS yalnızca davranış ekler. Gerekçe: [`docs/geo.md`](./docs/geo.md).
2. **Hiçbir şey ilk boyamayı geciktirmez.** Senkron yüklenen tek dosya
   `dist/rc.critical.css`. Tüm JS `type="module"` (tanımı gereği deferred).
3. **JS gelmezse içerik görünür kalır.** Bir şeyi gizleyen CSS `.rc-js`
   önekiyle yazılır; bu sınıfı Webflow head'indeki satır içi snippet basar.
4. **Kod, Webflow'un class'larına dokunmaz.** Seçim ve durum yalnızca
   `data-rc-*` attribute'ları üzerinden. Tek istisna: `rc-` önekli yardımcı
   sınıflar (`.rc-sr-only`, `.rc-skip-link`).
5. **Hareket isteğe bağlıdır.** `prefers-reduced-motion: reduce` altında her
   component tam işlevsel kalır. Animasyon kütüphanesi yüklenmezse component
   çalışmaya devam eder.
6. **Tek global:** `window.rc`. Başka global yok, `window` kirletilmez.

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
  site oradan okur. jsDelivr dal referanslarını 12 saate kadar cache'ler;
  değişikliği hemen görmek için `npm run purge`. `head.html` yalnız kritik CSS
  ya da şablon değişince yeniden yapıştırılır.
- **`"tag"` — üretim modu.** URL'ler `v<sürüm>`'e sabitlenir:
  `npm version minor && git push --follow-tags`, sonra `head.html`
  yapıştırılır. `patch` = düzeltme, `minor` = yeni component/özellik,
  `major` = attribute sözleşmesinde kırıcı değişiklik.

Mod değiştirmek = `cdnRef`'i değiştirip build almak; `head.html` yeniden
yapıştırılır.
