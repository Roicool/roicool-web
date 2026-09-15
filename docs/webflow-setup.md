# Webflow kurulumu

## Şu an

**Site Settings › Custom Code › Head** →
[`webflow/embeds/head.html`](../webflow/embeds/head.html) içeriğini yapıştır.
İçinde yalnızca Webflow IX2 kapatıcı var.

Kod siteye **yalnızca bu yoldan** girer. Webflow API, registered scripts ya da
herhangi bir otomatik yazma yolu kullanılmaz — karar kesin.

Bu bir karar: IX2 kapalıyken Designer'daki native interaction'lar çalışmaz.
Animasyonların tamamı bu repo'dan yönetilecekse doğru; Designer'da interaction
kullanılacaksa bloğu kaldır.

## Kütüphane yayınlandığında

1. `head.html`'e yükleme zinciri eklenir (kritik CSS, async CSS, `rc.js`) —
   plan [`architecture.md`](./architecture.md)'de. Sürüm etiketiyle sabitlenir,
   `@main` kullanılmaz.
2. **Site Settings › SEO › robots.txt** → staging alan adında her şey kapalı,
   canlıda AI tarayıcıları engellenmez.
3. **Designer** → body'nin ilk elemanı olarak skip link, `<main>` bölümüne
   `id="main"` ve `tabindex="-1"`.

Sayfa bazında ek kurulum olmayacak. Component eklemek attribute yazmaktan
ibaret:

1. Designer'da elemanı seç.
2. Settings paneli (D) → Custom attributes.
3. `data-rc` = component adı.
4. Component'in `README.md`'sindeki yapıyı kur (parçalar, ayarlar).
5. Preview'da değil, **yayınlanmış sayfada** test et — custom code Designer
   önizlemesinde çalışmaz.

## Sorun giderme (kütüphane geldiğinde)

URL'nin sonuna `?rc-debug` ekle; runtime hangi component'i ne zaman bağladığını
konsola yazar.

| Belirti                                  | Sebep                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Hiçbir şey olmuyor, konsol boş           | `head.html` yapıştırılmamış ya da sayfa yayınlanmamış                                                                   |
| `"x" could not be loaded`                | Component adı yanlış yazılmış, ya da o sürümde yok                                                                      |
| İçerik önce açık görünüp sonra kapanıyor | `head.html`'deki satır içi `rc-js` snippet'i eksik                                                                      |
| Görünüm repo'daki CSS'i dinlemiyor       | Doğru davranış — LOOK kuralları sıfır specificity'de, Designer kazanıyor. Bkz. [`css-ownership.md`](./css-ownership.md) |

## Değişkenler

Tasarım token'larının kaynağı Designer'daki Webflow Variables koleksiyonudur.
`webflow/tokens/variables.reference.css` yalnızca okunabilir bir aynadır ve
**sitede yüklenmez** — yüklenirse Designer'daki gerçek değerleri ezer.
