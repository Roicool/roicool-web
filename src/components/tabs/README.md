# tabs

Solda sekmeler, sağda üst üste yığılı paneller: sekmeye basınca o panel
solarak ve hafifçe yükselerek gelir. Home'da sektör sekmeleri (Industries
koleksiyonu). Kaynak: digidop.com "across three industries".

**SEO/GEO:** her panelin metni HTML'de, kod hiçbir şey üretmez ve hiçbir şeyi
`display: none` yapmaz. Gösterilmeyen paneller yalnız `opacity: 0;
visibility: hidden`. JS yoksa bütün paneller alt alta görünür.

**Erişilebilirlik:** sekmeler gerçek `<button>`; kod WAI-ARIA sekme kalıbını
kurar (`tablist`, `tab`, `tabpanel`, `aria-selected`, `aria-controls`,
gezici `tabindex`). Ok tuşları (iki eksen), Home ve End sekmeler arasında
gezer; seçim odağı izler.

## Designer'daki yapı

İki Collection List, **aynı koleksiyon** (Industries), **aynı sıralama,
filtre ve limit**: n. sekme n. panele aittir. Kod sayıları farklıysa uyarır,
fazlalığı yok sayar. Koşulla gizlenen öğeler iki tarafta da atlanır.

```
Section                             [data-rc="tabs"]              ← kök; iki listeyi de kapsar
  Container
    H2                              (başlık, serbest)
    Div  (grid, 2 kolon; Designer)
      Div                           (sol kutu; arka plan, radius, padding)
        Collection List Wrapper
          Collection List           [data-rc-part="tablist"]      ← kod role="tablist" basar
            Collection Item                                       ← kod role="presentation" basar
              DOM element `button`  [data-rc-part="tab"]          ← sekme; flex, ikon + metin
                Div                 [data-rc-part="icon"]  aria-hidden="true"   ← ok; yalnız aktifte görünür
                Text                Name
      Div                           (sağ kutu)
        Collection List Wrapper
          Collection List           [data-rc-part="panels"]       ← kod üst üste yığar
            Collection Item                                       ← panel; içi serbest, attribute yok
              Div                   görsel kutusu (relative, overflow hidden, radius)
                Image               Görsel (alt CMS'ten), cover
                Div                 rozet (absolute, alt-sol): Text Rakam + Text Rakam açıklaması
              Div                   içerik (flex column)
                H3                  Name
                Paragraph           Açıklama
                Link Block          `button-text` — Bağlantı metni + ok
                Div                 vaka kutuları (grid 2 kolon)
                  Link Block        → Vaka 1'in sayfası; içinde Image Vaka 1 logosu
                  Link Block        → Vaka 2'nin sayfası; içinde Image Vaka 2 logosu
```

Vaka kutuları neden multi-reference değil: Home'da nested Collection List
zaten var (case studies slideshow'u) ve Webflow sayfada yalnız bir tane
nested list'e izin verir. İki referans + iki logo alanı bu yüzden. Boş
referansta kutu Conditional Visibility ile gizlenir.

Designer'da ayarlanacaklar:

- **tablist** (Collection List) → `display: flex; flex-direction: column`,
  gap. Wrapper'a stil verme.
- **tab** (DOM `button`) → tarayıcı buton görünümünü sıfırla: `background:
transparent; border: none; padding; font: inherit; color: inherit;
text-align: left; cursor: pointer; width: 100%`. `opacity` verme; dinlenme
  opaklığı kodda (`--rc-tabs-rest`, varsayılan `0.5`; hover ve odakta tam).
- **icon** → boyut, daire arka plan; `opacity` verme (kod aktif dışında
  `0`).
- **panels** (Collection List) → `display`, `grid` verme; kod yığar. Gap ve
  hizalama serbest. Wrapper'a stil verme.
- Panelin içi tamamen CMS bağlı, attribute yok. Görsel kutusuna `position:
relative; overflow: hidden`, rozet `absolute; bottom; left`.
- Dar ekran: sol kutu üstte (sekmeler yatay, kaydırılabilir satır ya da alt
  alta), paneller altında. Layout Designer'ın (`tab-flex-col`).

## Ayarlar (kökte)

| Attribute       | Değer | Ne yapar                          |
| --------------- | ----- | --------------------------------- |
| `data-rc-eager` | —     | Görünüre girmeyi beklemeden yükle |

CSS değişkenleri: `--rc-tabs-duration` (panel girişi, `0.7s`),
`--rc-tabs-ease` (`cubic-bezier(0.22, 1, 0.36, 1)`), `--rc-tabs-rest`
(dinlenen sekme opaklığı, `0.5`).

## Hareket

- **Seçim:** tıklama ya da klavye. Seçili sekme ve paneli
  `data-rc-state="active"`; sekmede `aria-selected="true"`, `tabindex="0"`,
  diğerlerinde `-1`. Açılışta ilk sekme.
- **Panel geçişi:** giden panel 0,3 s'de solar ve tıklanamaz olur; gelen
  panel `--rc-tabs-duration` sürede `1rem` aşağıdan yükselerek belirir.
  Kod gelmeden ilk panel görünür (`:has()`).
- **Sekme ikonu** yalnız seçili sekmede; diğerleri `%50` opak.

## JS yoksa, hareket azaltılmışsa

- **JS yok:** sekmeler işlevsiz düz butonlar, paneller alt alta ve tam
  görünür; ikonlar görünür.
- **Reduced motion:** geçiş süreleri `motion.css` ile sıfıra iner; seçim
  anında olur.

## Bağımlılık

Yok.
