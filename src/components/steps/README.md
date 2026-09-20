# steps

Sayfa kaydıkça adım adım ilerleyen pinli sahne: her adım tam kare bir görsel
ya da video, üstünde başlık ve birkaç satır; sağda 01–04 göstergesi. Kaynak:
superpower.com "How it works". Geçişler vaka slider'ının (slideshow)
kaydırmasıyla aynı, dikey.

## Designer'daki yapı

Statik; adımlar Designer'da elle. Her adımın içinde CMS'ten beslenen bir
şey (bağlı metin, Collection List) olabilir; adım sarmalayıcısı statik
kaldıkça sorun yok.

```
Section                        [data-rc="steps"]              ← kök; yükseklik verme, spacer kod ekler
  Div                          [data-rc-part="stage"]         ← pinlenir; 100svh (kod)
    Div                        [data-rc-part="step"] ×n       ← adım; kod üst üste koyar
      Div                      [data-rc-part="media"]         ← görsel/video kabı; kod doldurtur
        Image ya da Embed <video>                             ← cover; mobil için ikinci Image ya da <source media>
      Div                      [data-rc-part="content"]       ← başlık + gövde; yeri Designer (absolute)
        H3 + Paragraph
    List (ul)                  [data-rc-part="navigation"]    ← gösterge; yeri Designer (absolute, sağ orta)
      List Item › DOM button   [data-rc-part="marker"] ×n     ← "01" + etiket; kod aria-current basar
```

Designer'da ayarlanacaklar:

- **Section** → yükseklik ve `min-height` verme; pin mesafesini kod ekler
  (adım × `data-rc-length` svh). `position`, `overflow` verme.
- **stage** → hiçbir şey; pinliyken kod `100svh` verir. Pinlenen bloğun üst
  elemanlarında `transform`, `filter`, `perspective` olmasın. Sayfada başka
  pinli section varsa araya normal bir section girsin.
- **step** → statik düzende (JS yok, mobil B) alt alta kart gibi görünmesi
  için: media'ya `aspect-ratio`, content'e padding. Pinliyken kod hepsini
  `absolute; inset: 0` yapar, aktif olmayanları gizler.
- **media** → statik düzen için `aspect-ratio: 16 / 9` (mobilde 3 / 4).
  Pinliyken kod `absolute; inset: 0; overflow: clip` verir. `aria-hidden="true"`
  (dekoratif). Görsel `alt=""`, `loading="lazy"`; video Embed ile, R2'dan,
  `muted playsinline loop preload="metadata"` (kod aktif adımı oynatır).
- **content** → pinli düzende `position: absolute` + yer (ör. sol, dikey
  ortalı, `max-width: 28rem`), metin rengi. Açık görselli bir adımda koyu
  metin istiyorsan o adımın content'ine combo class.
- **navigation** → `position: absolute`, sağ orta (`right: 3rem; top: 50%;
translateY(-50%)`), flex column, gap. `list-style: none` + `role="list"`.
- **marker** → DOM element, tag `button`; içinde etiket Text Block ve numara
  Text Block. Taban rengi ve tipografi Designer'da; aktif renk koddan
  `--rc-steps-marker-active` (varsayılan marka rengi), pasifler %55 opak.
- Section ilk viewport'ta olmasın: chunk gelince düzen sütundan sahneye
  döner; ekran dışındayken olsun.

## Ayarlar (kökte)

| Attribute           | Değer         | Ne yapar                                                  |
| ------------------- | ------------- | --------------------------------------------------------- |
| `data-rc-length`    | svh, `150`    | Adım başına kaydırma mesafesi                             |
| `data-rc-duration`  | saniye, `0.9` | Geçiş süresi                                              |
| `data-rc-parallax`  | yüzde, `30`   | İçerideki görselin gecikme payı                           |
| `data-rc-dim`       | 0–1, `0.5`    | Çıkan media'nın karardığı parlaklık; `1` kararmaz         |
| `data-rc-top`       | px, `0`       | Sabit header için üstten boşluk; stage o kadar kısalır    |
| `data-rc-min-width` | px, `0`       | Bu genişliğin altında pin yok, adımlar alt alta (mobil B) |
| `data-rc-eager`     | —             | Görünüre girmeyi beklemeden yükle                         |

## Hareket

- **Pin:** stage, adım × 150svh boyunca sabit (ScrollTrigger, `pinSpacing`
  spacer'ı section'ı büyütür). İlerleme adım sayısına bölünür; her dilim bir
  adım.
- **Kuyruk:** gösterilen adım, scroll'un istediği adıma **birer birer**
  yürür; bir geçiş bitmeden sonraki başlamaz. Hızlı kaydırmada hiçbir adım
  atlanmaz, her geçiş tam oynar. Geri kaydırınca ters yönden.
- **Geçiş (slideshow'un kaydırması, dikey):** giren adımın media'sı alttan
  (geri giderken üstten) `100% → 0`, çıkan diğer taraftan çıkar, içlerindeki
  görsel %30 gecikmeyle (parallax); 0.9 s, `cubic-bezier(.65, 0, .35, 1)`.
  Çıkan media aynı sürede `data-rc-dim`'e kararır.
- **Metin:** çıkan 200 ms'de solup 1.5rem yön tersine kayar; giren 220 ms
  gecikmeyle 900 ms'de belirip yerine iner (`cubic-bezier(.22, .61, .36, 1)`).
- **Gösterge:** aktif marker `aria-current="step"`; tıklanınca sayfa o
  dilimin ortasına kayar (Lenis), yürüyüş normal işler.
- **Video:** aktif adımın videosu oynar; diğerleri durur ve başa sarar;
  section ekran dışındayken hepsi durur.
- Snap yok; dilimler uzun.
- Yeniden ölçüm: pencere değişince pin yeniden kurulur (150 ms bekleme);
  `data-rc-min-width` eşiği geçilince pin kalkar ya da gelir.

## Mobil

Varsayılan **A**: sahne mobilde de pinli. Designer'da mobil breakpoint:

1. content üstte (`top: 6rem`, `max-width: 75%`), metin boyu küçük.
2. navigation üstte yatay satır (`top: 4rem; left: 1.5rem; right: auto`,
   flex row); etiket Text Block'ları gizli, yalnız numaralar.
3. media dikey kadraj: video Embed'de `<source media="(max-width: 767px)">`;
   görselde ikinci Image (dikey), breakpoint'te biri display none — lazy
   olan inmez.

**B** istenirse `data-rc-min-width="768"`: tablet altında pin yok, adımlar
alt alta kart (media aspect-ratio + metin), gösterge yok.

## JS yoksa, hareket azaltılmışsa, GSAP gelmezse

- **JS yok:** adımlar normal akışta alt alta, hepsi görünür; gösterge
  gizli. Video poster'ıyla durur.
- **Reduced motion, GSAP yok, dar ekran:** kod `static` basar; aynı sütun.
- İçerik her koşulda HTML'de ve görünür; bot için gizli bir şey yok.

## Erişilebilirlik

- Aktif olmayan adımlar pinliyken `aria-hidden` + görünmez: ekran okuyucu ve
  Tab yalnız gösterilen adımı görür; adımlar arasında gösterge ile gezilir.
- Marker'lar gerçek `<button>`; aktif olanda `aria-current="step"`. Etiket
  görünür metin; numara ayrı Text Block.
- Media dekoratif (`aria-hidden`), başlık ve gövde metin.
- Otomatik oynayan video için WCAG 2.2.2 durdurma kontrolü hero ile birlikte
  ele alınacak.

## Bağımlılık

GSAP 3.13 + ScrollTrigger (`runtime/motion.js`); geçişler Web Animations
API (`runtime/slide.js`, slideshow ile ortak).
