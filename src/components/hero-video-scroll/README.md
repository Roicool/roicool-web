# hero-video-scroll

Yapışkan bir hero sahnesi: ortada dikey bir video, iki yanında dev iki
kelime. Sayfa kaydıkça video `-5°` eğik ve yarım boydan düz ve tam boya
büyür, köşesi oturur; kelimeler farklı hızlarda yukarı kayar (biri videonun
arkasında, biri önünde: parallax) ve sahne görünüre girince harf harf
alttan çıkar. Kaynak: riseatseven.com/culture "Est. 2019"; değerler aynı.
Home'da `hero-video-scroll` section'ı, `section__hero-main`'in altında.

**Kaynaktan farkları:**

- Kaynak Alpine + Tailwind; burada `data-rc` parçaları ve GSAP.
  Yumuşak kaydırma runtime'ın Lenis'i, ayrıca kurulmaz.
- Kaynakta gizli bir h1 "Est. 2019" ve görünür iki h2 var, ekran okuyucu
  aynı şeyi üç kez duyar. Burada okunan tek başlık gizli (`rc-sr-only`)
  h2; görünen kelimeler `aria-hidden` Text Block. Home'un h1'i
  `section__hero-main`'de; bu bölüm sayfanın tepesine alınırsa gizli
  başlık h1 yapılır.
- Kaynakta video player arayüzü var ama tıklanamıyor (`pointer-events:
none`); alınmadı, video dekoratif.

**SEO/GEO:** kelimeler ve başlık HTML'de; kod yalnız harflere böler,
hiçbir şey üretmez. Başlangıç gizlemesi `.rc-js` arkasında ve 3 sn'lik
yedekle açılır.

## Designer'daki yapı

```
Section   [data-rc="hero-video-scroll" data-rc-eager]     hero-video-scroll         ← track; yükseklik kodda (2 × sahne; dokunmatikte 1)
  Div     [data-rc-part="stage"]                          hero-video-scroll__stage  ← yapışan sahne, 100svh; kod sticky verir — position, height, overflow verme
    H2    .rc-sr-only  "Est. 2019"                                                  ← okunan başlık, görünmez
    Div   [data-rc-part="heading-back"] aria-hidden       hero-video-scroll__layer  ← katman: stage'i kaplar, ortalar; kod verir (z 1)
      Div                                                 hero-video-scroll__word-back   ← konum: translate (aşağıda)
        Text Block [data-rc-part="text"]  "Est."          hero-video-scroll__word   ← tipografi
    Div   [data-rc-part="media"] aria-hidden              hero-video-scroll__media  ← katman (z 2), overflow clip kodda
      Div [data-rc-part="frame"]                          hero-video-scroll__frame  ← boyut + köşe (aşağıda); kod eğer, büyütür
        Embed <video …>                                                             ← aşağıda
    Div   [data-rc-part="heading-front"] aria-hidden      hero-video-scroll__layer  ← katman (z 3)
      Div                                                 hero-video-scroll__word-front
        Text Block [data-rc-part="text"]  "2019"          hero-video-scroll__word
```

Class'lar boş açıldı, değerler sahibinin. Kaynaktaki değerler:

- **`hero-video-scroll__frame`** → `width: 60vw; height: 110vw`; tablet
  (≥768) `40vw × 70vw`; masaüstü (≥1024) `45vh × 80vh`. `border-radius:
1.5rem` (kod başlangıçta 2.5rem'den buraya indirir; verilmezse
  `--rc-hero-video-scroll-radius`). `position`, `overflow`, `transform`
  verme.
- **`hero-video-scroll__word`** → `font-size: 75px` (4.6875rem); ≥1024
  `100px`; ≥1280 `220px`; `line-height: 0.9`, `font-weight: 500`,
  `letter-spacing: -0.035em`, renk `#111212`. `line-height` 1'in
  altındaysa alt tarafa biraz `padding-bottom` (kaynakta 0.5rem) ve sağa
  `padding-right: 0.25rem`: harfler yükselirken kelime kutusu kırpar
  (`overflow: clip`, yalnız kod çalışınca), alçak satırda p ve g'nin
  kuyruğu da kırpılır. `overflow`, `opacity`, `transform` verme.
- **`hero-video-scroll__word-back`** ("Est.", videonun arkasında) →
  `translate: -100% -320%`; ≥768 `-100% -420%`; ≥1024 `-100% -83%`;
  ≥1280 `-66% -83%`; ≥2200 `-66% -130%`.
- **`hero-video-scroll__word-front`** ("2019", önünde) → `translate: 50%
320%`; ≥768 `50% 420%`; ≥1024 `75% 83%`; ≥1280 `66% 83%`; ≥2200 `66%
130%`. Yüzdeler kelimenin kendi kutusuna göre; kelime değişince oran
  gözle ayarlanır.
- **Section** → arka plan (kaynakta `#efeeec`), alt çizgi (`border-bottom:
1px solid #bebebe`). `min-height` verirsen sahne o kadar sürer (track −
  sahne). `overflow: hidden` verme — sticky kapanır; yatay taşmayı kod
  `overflow-x: clip` ile keser.
- **Katmanlar** (`__layer`, `__media`) → kod `absolute; inset: 0; flex;
center` ve sırayı sıfır specificity'de verir; class'a bir şey yazmak
  gerekmez, yazılırsa class kazanır.

**Sticky kuralı:** section'ın ve üstlerinin hiçbirinde `overflow: hidden`
olmasın (`overflow: clip` serbest). **Pin kuralı:** `stage`'in üstlerinde
`transform`, `filter`, `perspective` olmasın.

### Video (Embed, R2'dan)

Hero ile aynı istisna: Webflow'un video elementleri çoklu kaynak vermez.
Dikey video; kaynakta 9:16'ya yakın. `.MOV`/HEVC değil, MP4 (H.264) ve
WebM:

```html
<video
  playsinline
  muted
  loop
  preload="metadata"
  poster="https://R2/…/poster.jpg"
>
  <source src="https://R2/…/portrait.webm" type="video/webm" />
  <source src="https://R2/…/portrait.mp4" type="video/mp4" />
</video>
```

Kod `muted` ve `playsinline`'ı garantiye alır; video sahne ekrandayken
oynar, dışında ve sekme gizliyken durur, reduced motion'da hiç oynamaz.

## Ayarlar

Kökte attribute:

| Attribute          | Değer     | Ne yapar                                                           |
| ------------------ | --------- | ------------------------------------------------------------------ |
| `data-rc-eager`    | —         | Ekranın üstündeyse ekle; görünüre girmeyi beklemesin               |
| `data-rc-delay`    | saniye, 1 | İlk harf hareket etmeden önceki bekleme                            |
| `data-rc-priority` | 9         | ScrollTrigger refreshPriority; üstteki hero 10, üstte kalan yüksek |

CSS değişkenleri (kökte; Designer style paneli özel değişken yazamaz,
gerekirse sayfa custom code'una bir `<style>` ile). Kritik CSS başlangıcı
da bunlardan okur, kod da; tek kaynak:

```css
--rc-hero-video-scroll-stage: 100svh; /* sahne yüksekliği */
--rc-hero-video-scroll-tilt: -5deg; /* başlangıç eğimi */
--rc-hero-video-scroll-scale: 0.5; /* başlangıç boyutu */
--rc-hero-video-scroll-radius-start: 2.5rem; /* başlangıç köşesi */
--rc-hero-video-scroll-radius: 1.5rem; /* varış köşesi; frame class'ındaki border-radius kazanır */
```

## Hareket

Yalnız **ince işaretçi** (`pointer: fine`: fare, trackpad) ve hareket
azaltılmamışsa. Kök 2 sahne boyu; sahne bir sahne boyu kaydırma boyunca
yapışık kalır, timeline tam o mesafeye bağlı (`scrub`, gecikmesiz):

| Ne              | Başlangıç → son                                               |
| --------------- | ------------------------------------------------------------- |
| `frame`         | `rotate -5° → 0`, `scale 0.5 → 1`, köşe `2.5rem → class'ınki` |
| `heading-back`  | `y: 0 → −0.5 × viewport yüksekliği`                           |
| `heading-front` | `y: 0 → −1 × viewport yüksekliği`                             |

**Harf girişi:** `text` parçaları harflere bölünür (GSAP SplitText); her
harf `y: 125% → 0`, 0.5 sn, `power4.out`, harf başına 0.015 sn ara,
`data-rc-delay` sonra; kelimenin üstü viewport'un %85'ine gelince, bir
kez. Kelime kutusu bu sırada kırpar.

Durumlar: kök `armed` (sahne kurulu) ya da `static`. İşaretçi ya da
hareket tercihi oturum içinde değişirse sahne kurulur ya da sökülür
(bölme geri alınır, inline stil kalmaz).

## JS yoksa, dokunmatikte, hareket azaltılmışsa, GSAP gelmezse

- **JS yok:** başlangıç durumları `.rc-js`'e bağlı → her şey görünür,
  video düz ve tam boy, kelimeler yerinde. Track dokunmatikte zaten bir
  sahne; ince işaretçide iki sahne boyudur ve sahne yapışık kalır (saf
  CSS), yalnız animasyon olmaz.
- **`rc.js` gelmezse:** `.rc-js` var ama durum basılmaz; kritik CSS'teki
  yedek animasyon 3 sn sonra çerçeveyi düzeltir ve kelimeleri açar.
  `rc.js` çalışıyorsa (`html.rc-runtime`) yedek bekler; chunk
  yüklenemezse registry sınıfı kaldırır, yedek oynar.
- **Dokunmatik (`pointer: coarse`):** kaynaktaki gibi sahne yok; kök bir
  sahne boyu, video düz, kelimeler yerinde, `static`.
- **Reduced motion:** aynı; video da oynamaz, poster durur.
- **GSAP gelmezse:** `static`, uyarı konsola düşer.

## Erişilebilirlik

- Okunan başlık gizli h2 (`rc-sr-only`), tam ifade. Görünen kelimeler
  `aria-hidden` Text Block; bölünürken `aria: none`. Bir kelime Heading
  olarak kurulursa SplitText tam metni `aria-label`'a yazar.
- Video `muted` + `playsinline`; `media` katmanına `aria-hidden="true"`.
  5 sn'den uzun otomatik video için WCAG 2.2.2 durdurma kontrolü hero ile
  birlikte ele alınacak.
- Kelime katmanları `pointer-events: none`; sahnede tıklanacak bir şey
  yok.

## Bağımlılık

GSAP 3.13 + ScrollTrigger + SplitText, `runtime/motion.js` üzerinden
jsDelivr'dan dinamik import. Home'da hero zaten indirdi; tek kopya.
