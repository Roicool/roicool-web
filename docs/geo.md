# GEO — botların tarayabildiği HTML

GEO (Generative Engine Optimization): sitenin bir yanıt motoru tarafından
**okunup anlaşılabilir** olması. Bu belge yalnızca kodun ve HTML yapısının
payını anlatır; metin yazımı, `llms.txt`, yapılandırılmış veri gibi içerik
işleri bu repo'nun kapsamında değil, Webflow tarafında yürür.

## Demir kural: JS içerik üretmez

Metin, başlık, liste, tablo — hepsi ilk HTML yanıtında bulunur. JS yalnızca
davranış ekler.

Gerekçe pratik: Googlebot JavaScript çalıştırır ama render kuyruğu gecikmelidir;
GPTBot, ClaudeBot, PerplexityBot ve benzerleri **çoğunlukla çalıştırmaz**. JS ile
enjekte edilen bir cümle bu motorlar için yoktur.

Kodda karşılığı: bir şeyi gizleyen her CSS kuralı `.rc-js` önekiyle yazılır.
JS çalışmazsa içerik açık kalır.

```css
/* Doğru — JS yoksa panel açık */
.rc-js [data-rc~="accordion"] [data-rc-part="panel"] {
  grid-template-rows: 0fr;
}

/* Yanlış — JS gelmezse içerik sonsuza dek kapalı */
[data-rc~="accordion"] [data-rc-part="panel"] {
  grid-template-rows: 0fr;
}
```

Aynı sebeple Webflow IX2 kapatılıyor: IX2'nin "başlangıçta opacity 0" deseni,
JS çalışmayan her ziyaretçi ve bot için içeriği görünmez yapar. Reveal
animasyonları repo'dan, `.rc-js` kapısının arkasından gelecek.

## Gizlemenin doğru yolu

| İhtiyaç                                  | Kullan                          | Kullanma                          |
| ---------------------------------------- | ------------------------------- | --------------------------------- |
| Kapalı panel — metin belgede kalsın      | `inert` + `.rc-js` altında CSS  | `display:none` (JS'siz de gizler) |
| Yalnız ekran okuyucuya metin             | `.rc-sr-only`                   | `opacity:0`, `font-size:0`        |
| Dekoratif eleman, botu ilgilendirmiyor   | `aria-hidden="true"`            | —                                 |
| Görsel bir efektin başlangıç durumu      | `.rc-js` altında CSS            | Inline `style="opacity:0"`        |

## Sayfa yapısı — Designer'da dikkat edilecekler

Kod bunları üretmez ama bunlara güvenir; component README'leri bu yapıyı ister.

- Sayfa başına **tek `<h1>`**, sonra atlamasız `h2` → `h3`.
- Landmark'lar gerçek etiketlerle: `<header>`, `<nav>`, `<main id="main">`,
  `<aside>`, `<footer>`. Designer'da bir div'in etiketini değiştirmek bir tık.
- Tıklanan her şey `<button>` ya da `<a>`. Tıklama olayı bağlanmış bir div,
  bot için de klavye için de düğme değildir.
- Görseller: anlam taşıyorsa açıklayıcı `alt`, dekoratifse `alt=""`.
- Bağlantı metni tek başına anlamlı: "Fiyatlandırmayı incele", "buraya tıkla"
  değil.

## Yayın öncesi kontrol

- [ ] JS kapalıyken tüm metin okunabiliyor (DevTools › Settings › Disable JavaScript)
- [ ] Tek `h1`, hiyerarşik başlıklar
- [ ] `<main id="main">` var ve skip link ona gidiyor
- [ ] Görünmeyen içerik `.rc-js` kapısının arkasında, inline `opacity:0` yok
- [ ] Staging (`*.webflow.io`) robots.txt'te kapalı, canlı açık
