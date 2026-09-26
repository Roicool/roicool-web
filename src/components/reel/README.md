# reel

Sürekli yukarı akan satırlar (büyük bir rakam, kısa açıklama, logo) ve
fareyle bir satıra gelince imleci izleyen fotoğraf. Her satır kendi vakasına
giden bir link. Kaynak: riseatseven.com/about "Awards" listesi.

Hareket CSS animasyonu: marquee'nin şeridi dikeye çevrilmiş hali. Kod
listeyi şeridi dolduracak kadar klonlar, bir listenin yüksekliğini ölçüp
keyframe'e yazar, oynatma durumunu `runtime/loop.js` ile sürer. Satıra gelince
akış yavaşlayarak durur (satır link; hareket eden hedef kovalanmaz), o satır
güncel olur, diğerleri söner, vakanın fotoğrafı imlecin altında belirir ve
kısa bir gecikmeyle izler. Klavye odağı da durdurur ve satırı vurgular, foto
göstermez.

## Designer'daki yapı

**Aynı koleksiyona bağlı iki Collection List, aynı sıralama, filtre ve
limit:** n. satır n. fotoğrafa aittir; sayılar farklıysa kod uyarır,
fazlalığı yok sayar.

```
Section                       [data-rc="reel"]              ← kök; ayarlar burada
  Container
    (başlık, serbest)
    Collection List Wrapper   [data-rc-part="strip"]        ← akan şerit; yükseklik Designer'dan
      Collection List         [data-rc-part="track"]        ← satırlar; kod klonlar
        Collection Item
          Link Block          [data-rc-part="row"]          ← vaka sayfasına
            Div  (rakam Text + açıklama Text)  ·  Image  (logo, alt = müşteri adı)
    Collection List Wrapper   [data-rc-part="photos"]  aria-hidden="true"  ← foto katmanı
      Collection List         [data-rc-part="cursor"]       ← kod imlece taşır
        Collection Item                                     ← fotoğraf kutusu; boyut Designer'dan
          Image  (Kare slider image, alt "")
```

Home'da: satır = vaka; rakam `Stats 1`, açıklama `Stats 1 açıklaması`, logo
`Project › Orjinal logo`, fotoğraf `Kare slider image`, link öğenin kendi
sayfası. Filtre `Ana sayfada göster`, sıralama `Sıra`, limit 4 — case-switcher
ile aynı.

**Fotoğraflar neden ayrı listede:** akan liste `transform` ile kayar ve
şerit taşanı kırpar; satırın içine konan `fixed` bir foto satıra bağlanır ve
şeridin kenarında kesilir. Ayrı liste, ayrı katman.

Designer'da ayarlanacaklar:

- **strip** → `height` (ör. `28rem`; akışın içinden geçtiği pencere).
  Yükseklik verilmezse şerit klonla büyür, kod tek klonla durur ve uyarır.
  Satırlar arası boşluk için `row-gap` (kod döngü mesafesine katar).
  `overflow` verme; kod akarken kırpar.
- **row** → satır düzeni (flex, `justify-content: space-between`,
  `align-items: center`), üst/alt `border`, dikey padding, `cursor`.
  `opacity` verme; sönme kodda (`--rc-reel-rest`, varsayılan `0.2`).
- **rakam ve açıklama** → tipografi. Rakam büyük (`display-3` gibi),
  açıklama küçük.
- **logo** → sabit `width` (ör. `6rem`), `object-fit: contain`.
- **fotoğraf kutusu (Collection Item)** → `width` (ör. `18rem`),
  `aspect-ratio` (`1 / 1`; Kare slider image kare), `border-radius`,
  `overflow: hidden`. `position` verme; kod katmanı ve yeri yazar. Görsel
  `alt=""`; kod cover doldurtur.
- **photos wrapper** → stil verme; `aria-hidden="true"` attribute'u yaz.
  Kod `fixed; inset: 0; pointer-events: none` verir.
- Kökün ve üstlerinin hiçbirinde `transform`, `filter`, `perspective`
  olmasın (Pin kuralı): `fixed` katman viewport'a değil ona yapışır.

## Ayarlar (kökte)

| Attribute           | Değer              | Ne yapar                                                  |
| ------------------- | ------------------ | --------------------------------------------------------- |
| `data-rc-speed`     | px/saniye, `30`    | Akış hızı                                                 |
| `data-rc-direction` | `up` / `down`      | Yön. Varsayılan yukarı                                    |
| `data-rc-fade`      | `10%`, `4rem`, `0` | Şeridin üst ve alt solması; `0` kapatır. Varsayılan `10%` |
| `data-rc-min-width` | px, `992`          | Altında foto yok; akış ve linkler kalır                   |
| `data-rc-eager`     | —                  | Görünüre girmeyi beklemeden yükle                         |

Sönme opaklığı CSS değişkeni: `--rc-reel-rest` (0.2). Foto katmanının
z-index'i `--rc-reel-layer` (50).

## Hareket

- **Akış:** kod listeyi klonlar (`aria-hidden`, odaklanamaz; şeridi
  dolduracak kadar, en fazla 6), şeridin `--rc-reel-distance` ve
  `--rc-reel-duration` değerlerini yazar, kökü `running` yapar. Süre `mesafe
÷ hız`. Logolar yüklenince ve pencere değişince yeniden ölçer; kat edilen
  oran korunur, sıçramaz.
- **Satıra gelince:** fare şeridin üstündeyken akış 450 ms'de yavaşlayıp
  durur (kök `paused`), çıkınca aynı sürede hıza çıkar. Üstündeki satır
  `data-rc-state="active"`; diğerleri `--rc-reel-rest` opaklığa iner (CSS
  `:has()`). Klonlardaki satırlar da aynı şekilde çalışır.
- **Foto:** yalnız hover'lı ince işaretçi (fare, trackpad) ve
  `data-rc-min-width` üstünde. Güncel satırın fotosu (`cursor` listesinin n.
  öğesi) `active` olur ve imlecin olduğu yerde belirir; imleç hareket
  ettikçe kalan mesafenin %25'ini her karede alarak izler. Satır değişince
  fotolar çapraz solar. Fare şeritten çıkınca gizlenir. İşaretçi yalnız
  şerit ekrandayken dinlenir.
- **Klavye:** görünür odak (`:focus-visible`) alan satır güncel olur ve
  akış durur; odak şeritten çıkınca sürer. Foto yok.
- **Dokunmatik:** akış sürer, satırlar linktir; foto ve sönme yok.

## JS yoksa, hareket azaltılmışsa

- **JS yok:** iki liste de Designer'daki haliyle, sabit ve tam görünür;
  fotoğraflar satırların altında küçük bir sıra.
- **Reduced motion:** kod klon ve animasyon kurmaz (kök `static`), foto
  izlemez; satır vurgusu çalışır. Tercih sayfa açıkken değişirse yenilemek
  gerekir (marquee gibi).

## Erişilebilirlik

- Satır bir `<a>`: erişilebilir adı rakam + açıklama + logonun `alt`'ı
  (müşteri adı). Logonun `alt`'ını boş bırakma.
- Klonlar `aria-hidden="true"`, içindeki linkler `tabindex="-1"`: okuyucu ve
  klavye yalnız orijinal listeyi görür.
- Foto katmanı `aria-hidden="true"`, `pointer-events: none`; fotolar
  dekoratif (`alt=""`).
- Hover ve odak akışı durdurur; görünür bir "durdur" düğmesi yok (marquee
  ile aynı açık konu, WCAG 2.2.2).

## Bağımlılık

Yok. `runtime/loop.js` (oynatma durumu) ve `runtime/registry.js` (klonu
tarama) kullanılır.
