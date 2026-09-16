# hero

Pinli, scroll'la koreografili ana sayfa hero'su. Kaynak: squareup.com
HomePageV3Hero — aynı başlangıç durumları, aynı zamanlama, pin ile.

## Designer'daki yapı

```
Section   [data-rc="hero" data-rc-eager]                      ← track, 200svh (kod verir; Designer min-height ile ezer)
  Div     [data-rc-part="stage"]                              ← pin edilir, 100svh; position: relative
    Div   [data-rc-part="media"]                              ← video katmanı, stage'i doldurur (absolute inset 0)
      Embed  <video …>                                        ← aşağıda
      Div [data-rc-part="shade"]                              ← boş div, karartma
      Div [data-rc-part="grain"]                              ← boş div, grain
    Div   [data-rc-part="primary"]                            ← h1 + CTA, stage'i doldurur, ortalanmış
      H1  [data-rc-part="title"]
      Div [data-rc-part="actions"]                            ← içine butonlar
    Div   [data-rc-part="footer"]                             ← alta yapışır; içine marquee; scroll'da küçülüp kaybolur
    Div   [data-rc-part="secondary"]                          ← stage'i doldurur, grid; aşağıda
      H2
      Div [data-rc-part="tile"] ×17                              ← her birinde Image
      Div [data-rc-part="tile-center"] ×1                        ← BOŞ; video buraya kırpılır
```

**Katman sırası** (z-index, Designer'da): media 1 · secondary 2 · primary 3 ·
footer 4. Secondary media'nın üstünde ama primary'nin altında; scroll'da media
küçülüp kırpılırken ve primary solarken secondary altından çıkar.

**Pin kuralı:** `stage`'in hiçbir üst elemanında `transform`, `filter`,
`perspective`, `will-change: transform` olmasın (page wrapper'lar dahil).
Yoksa pin kayar. Sayfada başka pinli component olursa `data-rc-priority`
sırası: üstteki yüksek; hero varsayılan `10`.

### Video (Embed)

Webflow'un video elementi çoklu kaynak vermez; Embed ile:

```html
<video playsinline muted loop preload="metadata" poster="YATAY-POSTER.jpg">
  <source
    src="hero-portrait.webm"
    type="video/webm"
    media="(max-width: 767px)"
  />
  <source src="hero-portrait.mp4" type="video/mp4" media="(max-width: 767px)" />
  <source src="hero.webm" type="video/webm" />
  <source src="hero.mp4" type="video/mp4" />
</video>
```

Tarayıcı yalnız eşleşen kaynağı indirir. Dikey poster için köke
`data-rc-poster-portrait="DİKEY-POSTER.jpg"`; kod 767px altında poster'ı
değiştirir. Bu, "Embed kullanmıyoruz" kuralının bilinçli tek istisnası.

### Tile grid (Designer'da)

`secondary` → Grid, **9 kolon × 5 satır**, `place-items: center`, satır 3'te
başlık (`grid-column: 1 / -1`). 18 tile tuğla dizilimiyle, satır 1-2-4-5;
merkez = satır 4 kolon 5 → o tile `tile-center`: **boş bırak**, içine görsel
koyma. Kod, media katmanını scroll'da tam bu kutuya kırpar (`clip-path`);
video mozaiğin merkez tile'ı olur. Köşe yuvarlaklığını tile'ın kendi
`border-radius`'undan okur. Kare: `aspect-ratio: 1/1`, `overflow: clip`,
image `object-fit: cover`.

Webflow Grid Child › Manual alanları çizgi değil **kapsayıcı hücre** numarası:
kolon 8 için `8 / 8`, satır 1 için `1 / 1`. Başlık: kolon `1 / 9`, satır
`3 / 3`.

```
        c1 c2 c3 c4 c5 c6 c7 c8 c9
row1:    .  ■  .  ■  .  ■  .  ■  .      tile 1-4    (kolon 2,4,6,8)
row2:    ■  .  ■  .  ■  .  ■  .  ■      tile 5-9    (kolon 1,3,5,7,9)
row3:    ──────────── h2 ────────────
row4:    ■  .  ■  .  ■  .  ■  .  ■      tile 10-14  (kolon 1,3,5,7,9) — 12 = merkez
row5:    .  ■  .  ■  .  ■  .  ■  .      tile 15-18  (kolon 2,4,6,8)
```

Tile numaraları DOM sırası (Navigator'daki sıra). 12. tile `is-center` +
`tile-center`, boş.

Mobilde kadraj: `secondary` genişliği breakpoint'e göre **250% → 225% →
200% → 150% → 100%** (≤374 / ≤740 / ≤1024 / ≤1280 / üstü), yatayda
ortalanmış (`left: 50%; transform: translateX(-50%)` ya da negatif margin).
Kök `overflow-x: clip` taşanı keser; telefonda ortadaki ~4 kolon görünür,
animasyon aynen çalışır.

## Ayarlar (kökte)

| Attribute                 | Değer | Ne yapar                                         |
| ------------------------- | ----- | ------------------------------------------------ |
| `data-rc-eager`           | —     | **Her zaman ekle** — ekranın üstünde, beklemesin |
| `data-rc-poster-portrait` | URL   | ≤767px'te video poster'ı                         |
| `data-rc-priority`        | `10`  | ScrollTrigger refreshPriority; başka pin varsa   |

**Kaydırma mesafesi** = track − stage. Varsayılan track 200svh, stage 100svh:
koreografi 100svh kaydırmada tamamlanır. Uzatmak ya da kısaltmak için section'a
Designer'da `min-height` ver (ör. `250svh`); kodun değeri `:where()` ile
yazıldığından class kazanır. Stage 100svh sabittir (pin boyu).

İkinci başlığın yükselme mesafesi sabit formül: `min(10rem, 20svh)` — masaüstünde
10rem, kısa ekranda viewport'un %20'si. CSS ve JS aynı formülü kullanır; ayar
yok, breakpoint derdi yok.

CSS değişkenleri (Designer style paneli özel değişken yazamaz; gerekirse sayfa
custom code'una bir `<style>` ile):

```css
--rc-hero-brightness: 0.75; /* karartma: siyah (1 − değer) */
--rc-hero-grain-opacity: 0.5;
--rc-hero-grain-size: 80px;
--rc-hero-tile-radius: 1rem; /* tile ve video köşesi; tile class'ındaki border-radius kazanır */
--rc-hero-track: 200svh; /* ya da section'a min-height */
--rc-hero-stage: 100svh;
```

## Koreografi

**Açılış (zamana bağlı, GSAP gelir gelmez):** h1 kelimeleri + CTA'lar opacity
.2→1, 2rem yükselir; 1 sn, öğe başına 0.05 sn gecikme, `power3.out`. Scroll'a
bağlı değil; sayfa kaydırılmış açılırsa aşağıdaki çıkış devralır.

**Scroll (0 → 1 = track − stage, varsayılan 100svh; scrub 0.5 sn gecikmeli):**

| Aralık   | Ne                                                                    |
| -------- | --------------------------------------------------------------------- |
| .3 → .7  | media merkez tile'ın kutusuna kırpılır (`power2.inOut`); h1/CTA solar |
| .3 → .54 | footer alt-ortadan %70'e küçülür ve solar (`power2.in`)               |
| .4 → .9  | h2 kelimeleri: opacity .2→1, `min(10rem, 20svh)` yükselir             |
| .4 → .86 | tile'lar: scale .25→1 + görünür; iç img 1.5→1                         |

Video ilk açılışı saf CSS (`@starting-style`): opacity 3s + radial mask 20s.

**Yeniden kurulan kısım:** kaynak sitede media'nın çıkışı CSS'te çözülmüş
değerlerle duruyordu, hareketi yakalanamadı. Burada her ScrollTrigger
refresh'inde (`invalidateOnRefresh`) merkez tile'ın kutusu ölçülür ve media
oraya kırpılır; breakpoint değişimi ve font yüklenmesi hizayı bozmaz.

## JS yoksa, hareket azaltılmışsa, GSAP gelmezse

- **JS yok:** başlangıç durumları `.rc-js`'e bağlı → her şey görünür, düz
  section. Video poster'ıyla durur.
- **Reduced motion:** başlangıç durumları `no-preference` içinde → hiçbir şey
  gizli başlamaz; kod timeline kurmaz, yalnız videoyu yönetir.
- **GSAP CDN'den gelmezse:** kök `data-rc-state="static"` alır, başlangıç
  durumları çözülür, uyarı konsola düşer. Sayfa okunur.

## Erişilebilirlik

- SplitText `aria: "auto"`: h1/h2 tam metni `aria-label` olarak taşır,
  kelime span'ları `aria-hidden`. Ekran okuyucu bölünmemiş metni okur; bot
  HTML'de bölünmemiş metni görür (bölme yalnız istemcide).
- Video `muted` + `playsinline`; hero'nun herhangi bir parçası ekrandayken
  hep oynar (pin'in DOM taşıması ya da sekme değişimi durdurursa bir sonraki
  karede yeniden başlar), ekran dışında durur. `aria-hidden` verme — poster ve
  video dekoratif, `media` div'ine `aria-hidden="true"` Designer'da.
- Tile görsellerinde `alt`: anlam taşıyorsa açıklama, dekoratifse boş.
- 5 sn'den uzun otomatik video için WCAG 2.2.2 durdurma kontrolü — şu an yok;
  marquee'deki açık konuyla birlikte ele alınacak.

## Bağımlılık

GSAP 3.13 + ScrollTrigger + SplitText, `runtime/motion.js` üzerinden
jsDelivr'dan dinamik import. Head'e eklenmez; yalnız hero olan sayfa indirir.
Yumuşak kaydırma (Lenis) runtime'ın işi (`runtime/scroll.js`); ScrollTrigger
ona `motion.js`'te bağlanır, hero'nun bilmesi gerekmez.
