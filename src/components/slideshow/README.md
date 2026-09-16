# slideshow

Sabit bir çerçevede tek seferde bir görsel; alttaki thumbnail'lerden, kaydırarak
ya da klavyeyle değiştirilir. Vaka çalışması kartlarının görsel alanı, ürün
galerisi, ekran görüntüsü seti — CMS multi-image alanından beslenen her görsel
kümesi.

## Designer'daki yapı

Kök, görsel çerçevesi; görseller multi-image alanına bağlı nested Collection
List'ten gelir:

```
Görsel alanı (div)                 [data-rc="slideshow"] role="group" aria-label="{{Name}} görselleri"
  Collection List Wrapper          ← multi-image alanına bağlı; attribute yok
    Collection List                [data-rc-part="slides"]
      Collection Item              ← bir slayt; içinde Image (alt CMS'ten)
  Karartma (div)                   [data-rc-part="shade"]      ← gradient + ortadaki logo
  Thumbnail çubuğu (div)           [data-rc-part="thumbnails"] ← cam efektli hap, sol-alt
    DOM element, tag button        [data-rc-part="thumbnail"]  ← ŞABLON: bir tane, stili Designer'da
      Image                        ← yer tutucu; kod slaytın görseliyle değiştirir
      div                          [data-rc-part="thumbnail-shade"] ← karartma katmanı
```

Designer'da ayarlanacaklar:

- **Görsel alanı** → `aspect-ratio` (16/9), `border-radius`, genişlik.
  `position`, `overflow`, `z-index` verme; kod verir.
- **Slides / Item / Image** → hiçbir stil verme. Kod slaytları üst üste
  (`absolute; inset: 0`) koyar, görseli `object-fit: cover` ile doldurur.
- **shade** → gradient arka plan, ortada logo (flex, center). Kod `absolute;
inset: 0; pointer-events: none` verir.
- **thumbnails** → `position: absolute`, sol-alt konum, padding, flex, gap,
  cam arka plan (`backdrop-filter`). Kod `z-index` verir ve JS gelene kadar
  gizler.
- **thumbnail (şablon)** → boyut (`4.5rem × 2.75rem`), radius, `1px` şeffaf
  kenarlık, `overflow: hidden`, `cursor: pointer`, kenarlık için `transition`;
  hover'da açık kenarlık. Aktif hali kod verir: kenarlık `--rc-brand`.
- **thumbnail-shade** → `absolute; inset: 0`, yarı saydam koyu arka plan,
  `opacity` için `transition`. Aktifte kod `opacity: 0` yapar.

Kod ne yapar: slaytları listeler, ilkine `data-rc-state="active"` basar,
diğerlerini `aria-hidden` yapar; şablon düğmeyi slayt sayısı kadar klonlar,
her klona o slaytın görselini (`src`, `srcset`, `sizes` — aynı dosya, ek
indirme yok) ve `aria-label="Görsel 2 / 3"` yazar, şablonu kaldırır; kök'e
`data-rc-state="ready"` basar.

## Ayarlar (görsel alanında)

| Attribute          | Değer         | Ne yapar                                             |
| ------------------ | ------------- | ---------------------------------------------------- |
| `data-rc-duration` | saniye, `0.9` | Bir geçişin süresi                                   |
| `data-rc-parallax` | yüzde, `30`   | Çerçeve %100 giderken görselin gittiği mesafe        |
| `data-rc-swipe`    | `false`       | Çerçevede kaydırarak geçişi kapatır; yoksa açık      |
| `data-rc-label`    | `Görsel`      | Thumbnail etiketi; yoksa `html[lang]`'e göre TR / EN |
| `data-rc-eager`    | —             | Görünüre girmeyi beklemeden yükle                    |

## Geçiş

Gelen slayt seçildiği yönden (%100 dışarıdan) girer, giden ters yönden çıkar;
içlerindeki görseller aynı sürede yalnız `parallax` kadar kayar, hareket
derinlik kazanır. Web Animations API, `cubic-bezier(0.65, 0, 0.35, 1)`
(GSAP `power3.inOut` karşılığı). Geçiş sürerken yeni istek yok sayılır.

- **Thumbnail:** tıklama o slayta gider; yön sıraya göre.
- **Kaydırma:** çerçevede 40px yatay hareket sonraki/önceki slayta geçer;
  son slayttan ileri gidince başa sarar. Dikey hareket sayfaya kalır
  (`touch-action: pan-y`). Thumbnail üstündeki basış kaydırma sayılmaz.
- **Klavye:** thumbnail'ler Tab ile gezilir; çubuk odaktayken ← → ↑ ↓ Home
  End slayt değiştirir ve odağı aktif düğmeye taşır.

## JS yoksa, hareket azaltılmışsa

- **JS gelmezse:** slaytlar üst üste durur, ilki üstte görünür (CSS
  `:first-child`). Thumbnail çubuğu gizli — işlevi olmayan kontrol
  gösterilmez.
- **`prefers-reduced-motion: reduce`:** geçiş anında olur (süre 0); thumbnail,
  kaydırma ve klavye aynen çalışır.

## Erişilebilirlik

- Kök `role="group"` + `aria-label` (Designer'da, CMS'ten isim).
- Görünmeyen slaytlar `aria-hidden="true"`; ekran okuyucu tek görsel okur.
  Her görselin `alt`'ı CMS multi-image alanından gelir — editör doldurmalı.
- Thumbnail'ler gerçek `<button>`; `aria-label` sıra bilgisi taşır,
  `aria-pressed` aktif olanı söyler. İçlerindeki görsel `alt=""`.
- Kaydırma yalnız işaretçi içindir; klavye için düğmeler ve ok tuşları var.
- Otomatik geçiş yok; WCAG 2.2.2 durdurma kontrolü gerekmez.

## Sınırlar

- Webflow nested Collection List: sayfada **bir tane**, en fazla 5 öğe.
  Sayfada başka nested list gerekirse yedek: koleksiyona sabit image alanları,
  `slides` div'inin içine her alan için bir div › Image, boş alanlar için
  conditional visibility. Kod gizli slaytları atlar.
- Şablon düğme `button` tag'li DOM element olmalı; Webflow'un Button elementi
  `<a>` üretir, klavyede "link" gibi okunur.
