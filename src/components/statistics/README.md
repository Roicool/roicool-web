# statistics

Yan yana rakam kartları (büyük sayı + kısa açıklama): sayılar görünüre
girince kilometre sayacı gibi hane hane yuvarlanarak yerine oturur; fareyle
kartın üstüne gelince o kartın fotoğrafı imleci izler. Dar ekranda kartlar
parmakla kaydırılan, kart kart snap'lenen bir şerit; altında kaydırmayla
dolan ince bir çizgi. Home'da `section__statistics`. Kaynak:
riseatseven.com/about "Global Offices".

**SEO/GEO:** her sayı HTML'de düz metin olarak yazılıdır (`75+`, `8.4`). Kod
hiçbir şey üretmez: metni karakterlerine bölüp her karaktere bir sütun
kurar, orijinal metni okuyuculara görünen bir `rc-sr-only` span'de tutar,
sütunlar `aria-hidden`. JS yoksa sayı olduğu gibi durur.

**Erişilebilirlik:** kartlar link değil; fotoğraf katmanı `aria-hidden`,
tıklama almaz. Reduced motion'da metin yeniden kurulmaz, foto yok.

## Designer'daki yapı

Statik; kartlar Designer'da elle. Fotoğraflar kartların **içine değil**,
kökün sonundaki ayrı kutuya girer (n. foto n. karta aittir): dar ekranda
şerit `overflow` ile kırpar, içerideki `fixed` foto kesilirdi.

```
Section                       [data-rc="statistics"]         ← kök
  Container
    Div                       [data-rc-part="track"]         ← kart satırı: grid 4 kolon; dar ekranda flex + overflow-x: auto
      Div                     [data-rc-part="card"]          ← kart: flex column, sol border, padding
        Text                  [data-rc-part="figure"]        ← sayı, düz metin ("75+"); display class'ı
        Text                                                 ← açıklama
      × n
    Div                       [data-rc-part="progress"]      ← isteğe bağlı: ilerleme çizgisi (height 2px, arka plan, color = dolgu)
  Div                         [data-rc-part="photos"]  aria-hidden="true"   ← foto katmanı; stil verme
    Div                       [data-rc-part="cursor"]        ← foto kutusu: width, aspect-ratio, radius, overflow hidden
      Image  alt=""           × n (kart sırasıyla)           ← kod cover doldurtur
```

Designer'da ayarlanacaklar:

- **track** → geniş ekranda `grid-4col` + gap. Dar ekranda (tablet/mobil
  breakpoint'te) `display: flex; flex-wrap: nowrap; overflow-x: auto;
column-gap`; snap ve gizli scrollbar koddan gelir. `scroll-snap`
  verme.
- **card** → `flex: 0 0 <genişlik>` dar ekranda (ör. `72%`; 1,5 kart
  görünsün), sol `border-left`, üst ve sol padding.
- **figure** → display class'ı (`display-1`), `font-weight`; `line-height`
  verilebilir, sütunlar kendi içinde `1em`. Sayıyı düz yaz: sayacın
  tanıdığı karakterler `- . , 0–9 # £ $ € ₺ % + K B M X x`; başka karakter
  yuvarlanmaz, olduğu gibi durur.
- **progress** → `height: 2px`, arka plan (boş kısım), `color` (dolgu);
  geniş ekranda çizgi dolu durur, istenmiyorsa o breakpoint'te Display:
  None. Kaydırmayla dolma scroll-driven animation'dır (Chrome, Edge, Safari
  26+); desteklemeyen tarayıcıda çizgi hiç görünmez.
- **Rakam fotonun üstünde kalsın** (kaynaktaki görünüm: foto rakamın
  arkasından geçer, rakam fotoda negatif/sepya tona döner) → figure'a
  `position: relative; z-index: 60` (foto katmanının `50`'sinin üstü),
  `color` beyaz, Effects › Blending `Difference`. Açık zeminde beyaz +
  difference siyah okunur, fotonun üstünde ters çevrilmiş renk verir.
  Hepsi Designer'da; koda bir şey gerekmez. Section'ın ve kartın hiçbir
  üst elemanında `transform`, `opacity`, `isolation`, `overflow` dışı bir
  stacking context olmasın, yoksa figure foto katmanının altında kalır.
- **photos** → stil verme (kod `fixed; inset: 0; pointer-events: none`,
  z-index `--rc-statistics-layer`, 50).
- **cursor** → `width` (ör. `clamp(12rem, 9rem + 6vw, 18rem)`),
  `aspect-ratio: 3 / 4`, radius, `overflow: hidden`; `position` verme.
- Kökün ve üstlerinin hiçbirinde `transform`, `filter`, `perspective`
  olmasın (Pin kuralı): `fixed` katman viewport'a değil ona yapışır.

## Ayarlar (kökte)

| Attribute           | Değer      | Ne yapar                                              |
| ------------------- | ---------- | ----------------------------------------------------- |
| `data-rc-threshold` | 0–1, `0.4` | Sayının ne kadarı görününce yuvarlanacağı             |
| `data-rc-stagger`   | sn, `0.08` | Bir hanenin bir sonrakinden ne kadar önce başlayacağı |
| `data-rc-min-width` | px, `992`  | Bunun altında foto yok                                |
| `data-rc-eager`     | —          | Görünüre girmeyi beklemeden yükle                     |

CSS değişkenleri: `--rc-statistics-duration` (hanenin yuvarlanma süresi,
`1.1s`), `--rc-statistics-ease` (`cubic-bezier(0.16, 1, 0.3, 1)`),
`--rc-statistics-progress-start` (ilerleme çizgisinin başlangıç dolgusu,
`0.25`), `--rc-statistics-layer` (foto katmanı z-index, `50`).

## Hareket

- **Sayaç:** kod gelince her sayı hane hane sütunlara bölünür; sütun
  aşağıda, bulanık ve görünmez bekler. Sayının `threshold` kadarı ekrana
  girince `data-rc-state="counted"` basılır, sütun kendi karakterine
  yükselir; haneler soldan sağa `stagger` arayla. Bir kez oynar.
- **Foto:** fare karta gelince kart `data-rc-state="active"`, o kartın
  fotosu imlecin altında belirir ve kalan mesafenin %25'ini her karede
  alarak izler; kart değişince çapraz solar; kartlar arasındaki boşlukta,
  şeritten çıkınca ve şerit ekrandan çıkınca kaybolur. Foto ancak imlecin
  yeri bilinince belirir: kartı seçen `pointerover` olayının noktası
  kullanılır, çünkü sayfa duran imlecin altında kaydığında hiç `pointermove`
  gelmez (önceden foto ekranın sol üstünde beliriyordu). Yalnız hover'lı
  ince işaretçi ve `min-width` üstünde.
- **Şerit (dar ekran):** yerel kaydırma, kart başına snap; ilerleme
  çizgisi kaydırma konumuyla dolar. Şerit taştığı sürece `track` Tab
  durağıdır (`tabindex="0"`, `role="group"`, adı section'daki ilk başlıktan
  `aria-labelledby` ile); ok tuşları kaydırır (WCAG 2.1.1). Geniş ekranda,
  taşmıyorken, Tab sırasında değildir.

## JS yoksa, hareket azaltılmışsa

- **JS yok:** sayılar düz metin, fotoğraflar kökün sonunda küçük bir sıra
  (Designer'da `photos`'a `display: none` verilebilir; kod `.rc-js` altında
  zaten kendi konumunu verir).
- **Reduced motion:** kök `static`; metin bölünmez, foto yok, şerit ve
  ilerleme çizgisi çalışır.

## Bağımlılık

Yok.
