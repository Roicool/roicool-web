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
