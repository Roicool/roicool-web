# Çalışma kuralları

Bu dosya hem geliştirici hem ajan içindir. Kod yazmadan önce oku.

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

Bitirmeden önce: `npm run build` çalıştır ve `dist/` değişikliğini commit'e dahil
et — CDN oradan servis ediyor.

## Commit

- Konu satırı: `<alan>: <ne yapıldı>` — ör. `accordion: tek açılır mod ekle`.
- `dist/` değişikliği aynı commit'te, ayrı commit'te değil.
