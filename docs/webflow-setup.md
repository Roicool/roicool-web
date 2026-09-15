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

`head.html` içindeki IX2 kapatıcı bir karar: Designer'daki native interaction'lar
çalışmaz. Animasyonların tamamı bu repo'dan yönetilecekse doğru; Designer'da
interaction kullanılacaksa `head.template.html`'den o blok kaldırılır.

## Her sürümde

`head.html` yeniden yapıştırılır — içindeki CDN linkleri sürüm etiketine sabit
(`@v0.1.0`), yeni sürümde etiket değişir. Sürüm çıkarma:
[`architecture.md › Sürümleme`](./architecture.md#sürümleme).

## Sayfaya component eklemek

Sayfa bazında custom code yok. Component eklemek attribute yazmaktan ibaret:

1. Designer'da elemanı seç.
2. Settings paneli (D) → Custom attributes.
3. `data-rc` = component adı.
4. Component'in `README.md`'sindeki yapıyı kur (parçalar, ayarlar).
5. Yayınlanmış sayfada test et.

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
