# Webflow kurulumu

## Bir kereye mahsus

1. **Site Settings › Custom Code › Head** →
   [`webflow/embeds/head.html`](../webflow/embeds/head.html) içeriğini yapıştır.
   Sürüm etiketini (`@v0.1.0`) yayınlanmış son tag ile değiştir.
2. **Site Settings › SEO › robots.txt** → staging alan adında her şeyi kapat,
   canlıda AI tarayıcılarını engelleme. Ayrıntı: [`geo.md`](./geo.md).
3. **Designer** → body'nin ilk elemanı olarak skip link ekle, `<main>`
   bölümüne `id="main"` ve `tabindex="-1"` ver.

Sayfa bazında ek kurulum yok. Component eklemek attribute yazmaktan ibaret.

## Sayfaya component eklemek

1. Designer'da elemanı seç.
2. Settings paneli (D) → Custom attributes.
3. `data-rc` = component adı.
4. Component'in `README.md`'sindeki yapıyı kur (parçalar, ayarlar).
5. Preview'da değil, **yayınlanmış sayfada** test et — custom code Designer
   önizlemesinde çalışmaz.

## Sorun giderme

URL'nin sonuna `?rc-debug` ekle. Runtime hangi component'i ne zaman bağladığını
konsola yazar.

| Belirti                                  | Sebep                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Hiçbir şey olmuyor, konsol boş           | `head.html` yapıştırılmamış ya da sayfa yayınlanmamış                                                                                  |
| `"x" could not be loaded`                | Component adı yanlış yazılmış, ya da o sürümde yok                                                                                     |
| `has no [data-rc-part="item"] children`  | Parça attribute'ları eksik                                                                                                             |
| İçerik önce açık görünüp sonra kapanıyor | `head.html`'deki satır içi `rc-js` snippet'i eksik                                                                                     |
| Görünüm repo'daki CSS'i dinlemiyor       | Doğru davranış — LOOK kuralları `:where()` ile sıfır specificity'de, Designer kazanıyor. Bkz. [`css-ownership.md`](./css-ownership.md) |

## Yeni sürüm yayınlamak

```bash
npm run build
git add -A && git commit -m "…"
git tag v0.2.0 && git push --tags
```

Sonra Webflow head'indeki üç URL'de `@v0.1.0` → `@v0.2.0` ve siteyi publish et.

`@main` kullanma. Repo'ya atılan her commit siteyi anında değiştirir; test
edilmemiş kod ziyaretçiye gider.

## Değişkenler

Tasarım token'larının kaynağı Designer'daki Webflow Variables koleksiyonudur.
`webflow/tokens/variables.reference.css` yalnızca okunabilir bir aynadır ve
**sitede yüklenmez** — yüklenirse Designer'daki gerçek değerleri ezer.
