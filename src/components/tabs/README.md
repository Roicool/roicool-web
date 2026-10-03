# tabs

Solda sekmeler, sağda üst üste yığılı paneller: sekmeye basınca o panel
solarak ve hafifçe yükselerek gelir. Home'da iki kullanım:

- **Hizmetler** (`section__service-tabs`) — sekme başına bir küme. Panelde
  solda kare önizleme, sağda o kümenin alt hizmetleri sade bir liste olarak;
  üzerine gelinen satırın görseli önizlemeye vaka kartlarındaki slideshow
  gibi kayarak gelir. Sekmeler ve paneller statik, her panelde bir
  Collection List. Kaynak: rulebase.co "Every conversation. Better
  outcomes." (katlanan sekme açıklaması); panel düzeni Home'daki vaka
  kartından.
- **Sektörler** (`section__industries`) — iki Collection List, Industries
  koleksiyonu. Kaynak: digidop.com "across three industries".

**SEO/GEO:** her sekmenin, her açıklamanın, her panelin ve her kartın metni
HTML'de; kod hiçbir şey üretmez ve hiçbir içeriği `display: none` yapmaz.
Gösterilmeyen paneller yalnız `opacity: 0; visibility: hidden`, katlanmış
açıklamalar yalnız yüksekliği sıfır. JS yoksa bütün paneller ve açıklamalar
alt alta görünür.

**Erişilebilirlik:** sekmeler gerçek `<button>`; kod WAI-ARIA sekme kalıbını
kurar (`tablist`, `tab`, `tabpanel`, `aria-selected`, `aria-controls`,
gezici `tabindex`). Ok tuşları (iki eksen), Home ve End sekmeler arasında
gezer; seçim odağı izler. Açıklaması olan sekme `aria-describedby` ile ona
bağlanır.

## Parçalar

| Parça         | Nerede                              | Ne                                                                                                                                    |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `tablist`     | sekmeleri tutan eleman              | Div ya da Collection List; çocukları sekme öğeleridir. Zorunlu.                                                                       |
| `tab`         | sekme öğesinin içinde               | DOM element `button`. Öğenin kendisi buton olabilir (statik), ya da öğenin içinde durur. Zorunlu.                                     |
| `panels`      | panelleri tutan eleman              | Div ya da Collection List; çocukları paneldir, n. panel n. sekmenin. Zorunlu.                                                         |
| `description` | sekme öğesinde, butonun **yanında** | Div; içinde **tek** Paragraph. Aktif sekmede açık, diğerlerinde katlı. Butonun içine koyma: ekran okuyucu sekme adıyla birlikte okur. |
| `count`       | sekme butonunun içinde              | DOM element `sup`; kaç hizmet olduğu, **elle yazılır**. Kod yazmaz, panelin kartlarıyla karşılaştırıp uyarır.                         |
| `card`        | panelin içinde                      | Kart (Link Block). Kartlar sırayla yükselir.                                                                                          |
| `preview`     | panelin içinde                      | Div; boş kutu. Kod, kartların görsellerini buraya taşır; üzerine gelinen kartın görseli kayarak gelir.                                |
| `image`       | kartın içinde                       | Image, `alt=""`. Önizleme varsa kod onu önizlemeye taşır; JS yoksa satırda kalır.                                                     |
| `arrow`       | link'in içinde (kart, panel linki)  | DOM `span` kutu, içinde tek DOM `span` glif (`→`), `aria-hidden="true"`. Link'in üzerine gelince glif kutudan çıkıp geri girer.       |
| `icon`        | sekme butonunun içinde              | Ok ya da işaret; yalnız aktif sekmede görünür.                                                                                        |

Sayı neden elle: kural 1, JS içerik üretmez. Bir hizmet yayına girdiğinde ya
da çıktığında sayı eskir; kod bunu yakalar ve konsola (`[rc] tabs: "SEO" says
6 but its panel holds 7 cards`) yazar. Uyarı görünce Designer'da sayıyı
düzelt.

## Designer'daki yapı — Hizmetler

Sekmeler ve paneller **statik**: küme başına bir sekme öğesi, küme başına bir
panel, aynı sırada. Her panelde bir Collection List (kaynak Hizmetler, filtre
`Üst hizmet` = o kümenin hub'ı, `Sıra` artan, limit 20). 8 küme = 8
Collection List; Yazılım ve yapay zeka kümesi yayına girince 9. sekme ve
panel eklenir.

```
Section  [data-rc="tabs"] [data-rc-hash] [data-rc-eager]        section__service-tabs view-px sc-py-2
  Div                                                           service-tabs__inner container-xl mx-auto
    H2  "Hizmetler"                                             service-tabs__heading h2-style mb-12
    Div  (12 kolon; dar ekranda alt alta)                       service-tabs__layout grid-12col gap-gutter items-start tab-flex-col
      Div  (sol sütun, sticky)                                  service-tabs__nav col-span-3 sticky tab-w-full
        Div  [data-rc-part="tablist"]                           service-tabs__tabs flex flex-col tab-flex-row tab-overflow-auto
          Div  (sekme öğesi)                                    service-tabs__tab-item flex-none
            DOM `button`  [data-rc-part="tab"]  id="seo"        service-tabs__tab + buton sıfırlama (aşağıda) + tab-text-nowrap
              DOM `span`  "SEO"                                 service-tabs__tab-label
              DOM `sup`   [data-rc-part="count"]  "6"           service-tabs__tab-count
              DOM `span`  " hizmet"                             rc-sr-only
            Div  [data-rc-part="description"]                   service-tabs__tab-description
              Paragraph  kümenin bir cümlelik açıklaması        service-tabs__tab-text
          … küme başına bir sekme öğesi
      Div  [data-rc-part="panels"]                              service-tabs__panels col-span-9 tab-w-full
        Div  (panel; 12 kolon, mobilde alt alta)                service-tabs__panel grid-12col gap-gutter mob-flex-col
          Div  [data-rc-part="preview"]  (boş, kare)            service-tabs__preview col-span-4 aspect-square rounded-lg overflow-hidden hide-mobile
          Div  (içerik kartı)                                   service-tabs__content col-span-8 flex flex-col justify-between gap-gutter
                                                                  px-8 py-8 border-1 border-muted rounded-lg tab-w-full border-muted-light
            H3  "SEO"                                           service-tabs__panel-title
            Collection List Wrapper                             service-tabs__list-wrapper
              Collection List                                   service-tabs__list flex flex-col
                Collection Item                                 service-tabs__item border-bt border-muted
                  Link Block  [data-rc-part="card"] → hizmet    service-tabs__card flex flex-row items-center py-4
                    Image  [data-rc-part="image"]  Kart görseli, alt=""
                                                                service-tabs__card-image 1x1-md fit-cover rounded-lg
                    Div                                         service-tabs__card-body w-full flex flex-col
                      H4  Name                                  service-tabs__card-title text-lg
                      Paragraph  Kısa açıklama                  service-tabs__card-text text-sm text-muted-opacity
                    DOM `span`  [data-rc-part="arrow"]  aria-hidden="true"
                                                                service-tabs__card-arrow
                      DOM `span`  "→"
            Link Block → /hizmetler/seo-ajansi                  service-tabs__panel-link flex items-center justify-between
              DOM `span`  "Tüm SEO hizmetleri"
              DOM `span`  [data-rc-part="arrow"]  aria-hidden="true"
                                                                button-round
                DOM `span`  "→"
        … küme başına bir panel
```

Sağdaki ilk class elemanın ana class'ı: `service-tabs__*` boş açıldı, değerler
sahibinin. Yanındaki yardımcı class'lar (`grid-12col`, `col-span-4`,
`aspect-square` …) sitede tanımlı; ana class'ın üstüne **boş combo** olarak
verildi, değer yardımcı class'tan gelir. MCP ile combo vermek için zincir önce
boş stil olarak açılır (`create_style`, `parent_style_names` = önceki
class'lar, değer yok), sonra elemana bütün liste verilir. Buton sıfırlama da
yardımcı class'larla, sektör sekmelerindeki gibi: `service-tabs__tab
bg-transparent border-0 font-inherit px-0 py-0 text-left font-color-inherit
w-full cursor-pointer`. Kart görselinin `alt`'ı boş: önizlemede süs, kartın
adı başlıktan gelir.

**Önizleme.** Kod her kartın görselini satırından alıp panelin önizlemesine
taşır, her birini kendi çerçevesine koyar; açılışta ilk kartınki görünür.
Bir satırın üzerine gelince ya da klavyeyle odaklanınca o satır seçilir ve
görseli vaka kartlarındaki slideshow'un geçişiyle gelir: çerçeve kutunun
tam boyu, içindeki görsel yalnız %30 kayar (`runtime/slide.js`, aynı eğri,
0,9 s). Liste dikey olduğu için geçiş de dikey: aşağıdaki satır görselini
alttan, yukarıdaki üstten getirir. Seçili satır `data-rc-state="active"`
alır ve tam görünür, diğer satırlar `--rc-tabs-card-rest` (0,4) opaklığa
söner; seçili satırın oku biraz ileri çıkar. Satırlar hızlı geçilince satır
seçimi imleci hemen izler, görsel ise süren geçiş bitince son istenene gider.
İmleç listeden çıkınca son seçilen kalır.

**Oklar.** Kart satırındaki ok ve panel linkinin yuvarlak oku aynı yapıda:
kutu (`arrow`) ve içinde tek glif span'i. Link'in üzerine gelince ya da
klavyeyle odaklanınca glif kutudan sağa çıkar, soldan geri girer; kutu
(yuvarlak rozet) yerinde kalır. CSS'tir, JS'siz de çalışır.

**Tablet ve mobil.** Tablette (991 px ve altı) yerleşim alt alta iner; sol
sütun ve paneller `tab-w-full` ile tam genişlik alır (`items-start` sütunda
genişliği daraltırdı). Sekmeler yan yana kayan bir şerit olur: kod bunu
yerleşimden okur, açıklamaları katlı tutar, seçilen sekmeyi görünür alana
kaydırır, scrollbar'ı gizler. Katlı açıklama sekmenin genişliğini belirlemez
(kod `contain: inline-size` verir). Mobilde (478 px ve altı) panel alt alta
iner (`mob-flex-col`) ve önizleme `hide-mobile` ile gizlenir; görseller de
onunla gizli kalır, liste görselsiz ve kompakt. Kod önizlemenin yerleşimde
olmadığını görür (`ready` kalkar) ve satırları söndürmez: hangi satırın
seçili olduğunu söyleyen görsel yok.

Bu yerleşim için açılan duyarlı yardımcı class'lar boş açıldı; değerleri
sahibi girer, yalnız adı geçen kırılımda:

| Class               | Kırılım | Değer                                                   |
| ------------------- | ------- | ------------------------------------------------------- |
| `tab-flex-row`      | Tablet  | `display: flex; flex-direction: row; flex-wrap: nowrap` |
| `tab-overflow-auto` | Tablet  | `overflow: auto`                                        |
| `tab-text-nowrap`   | Tablet  | `white-space: nowrap`                                   |

Eski mobil kart kaydırması için açılan `mob-flex-row`, `mob-overflow-auto`
ve `mob-w-3/4` artık hiçbir elemanda yok; silinebilir.

Designer'da ayarlanacaklar (yardımcı class'ı olmayanlar):

- **Sekme butonu** (DOM `button`): `opacity` verme; dinlenme opaklığı kodda
  (`--rc-tabs-rest`). **ID**'ler verildi: kümenin anahtarı
  (`performans-pazarlama`, `seo`, `geo`, `veri-ve-olcumleme`, `crm`,
  `lead-generation`, `web-tasarim`, `webflow`). Adres `/#seo` olunca o sekme
  açılır.
- **Sayı** (`sup`): küçük punto, `vertical-align: super` ya da flex'te
  `align-self: flex-start`. Hemen ardından `rc-sr-only` class'lı `span`
  " hizmet": ekran okuyucu "SEO 6 hizmet" okur. Sayıyı bir hizmet yayına
  girince ya da çıkınca güncelle; kod tutmazsa konsola yazar.
- **Açıklama** (Div): stil verme, kod `display: grid` ile katlar. İçindeki
  Paragraph'a `margin` verme (kod sıfırlar); sekmeyle arasındaki boşluk
  `--rc-tabs-description-gap` (6px).
- **Sekme öğesi**: üst border, dikey padding (kaynakta `16px 0`); ilk öğenin
  üst border'ı yok. Tablette şerit için öğeler arası boşluk (`service-tabs__tabs`
  tablet `gap`) ve border'ın alta geçmesi.
- **Sol sütun**: masaüstünde `position: sticky; top` (ör. `6rem`) — panel
  uzadığında sekmeler ekranda kalır. Section'ın ve üstlerinin hiçbirinde
  `overflow: hidden` olmasın (Sticky kuralı). Dar ekranda sekme şeridi
  `position: sticky; top: 0` + opak arka planla yapışabilir.
- **panels** (Div): `display`/`grid` verme; kod yığar. Paneller en uzun
  panelin yüksekliğini alır, sekme değişince sayfa zıplamaz.
- **Önizleme** (Div): içine eleman koyma, `position` verme (kod `relative` +
  `overflow: clip` verir); oran, radius ve mobilde gizleme yardımcı
  class'lardan. Görsel yüklenene kadar görünen bir arka plan rengi
  verilebilir.
- **Panel başlığı** (H3): JS yokken paneller alt alta durduğunda hangi
  kümenin hangisi olduğunu bu başlık söyler; sekme modunda panelin
  başlığıdır. Gizleme.
- **Satır** (Collection Item): alt çizgi `border-bt` (`border-bottom: 1px
solid`, renk vermez; renk `border-muted`'dan). Son satırın çizgisi
  istenmezse Collection Item'ın **Last item** durumunda border yok.
- **Kart** (Link Block): `opacity`, `translate` verme (giriş kodda); satırın
  çocuklarına (gövde, ok) `opacity` verme — sönme kodda
  (`--rc-tabs-card-rest`). Hover'da renk ya da arka plan Designer'da (Link
  Block'un Hover durumu); `transform` verme.
- **Ok** (`arrow` kutusu): boyut, renk; panel linkinde daire `button-round`.
  `overflow`, `transform`, `translate`, `animation` verme — kod kutuyu
  kırpar, glifi oynatır, seçili satırın okunu `--rc-tabs-arrow-shift` kadar
  ileri iter. İçteki glif span'ine stil verme; yeni ok eklerken yapı aynı:
  kutu span'i, içinde tek span "→".
- **Kart görseli**: Hizmetler › Kart görseli; önizlemede kareye kırpılır
  (kod `object-fit: cover` ile doldurur). JS yokken satırda `1x1-md` boyunda
  küçük kare olarak kalır.

## Designer'daki yapı — Sektörler

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
                Image               Ana görsel (alt CMS'ten), cover
                Div                 rozet (absolute, alt-sol; `rc-glass`): Text Rakam + Text Rakam açıklaması
              Div                   içerik (flex column)
                H3                  Name
                Paragraph           Açıklama
                Link Block          `button-text` — Bağlantı metni + ok
                Div                 vaka kutuları (grid 2 kolon)
                  Link Block        → Vaka 1'in sayfası (relative); içinde Image Vaka 1 logosu
                    Div             ok rozeti, sağ üst köşe (absolute), `aria-hidden="true"`, içinde Text `→`
                  Link Block        → Vaka 2'nin sayfası; aynı yapı
```

Vaka kutuları neden multi-reference değil: Home'da nested Collection List
zaten var (case studies slideshow'u) ve Webflow sayfada yalnız bir tane
nested list'e izin verir. İki referans + iki logo alanı bu yüzden. Boş
referansta kutu Conditional Visibility ile gizlenir.

Designer'da ayarlanacaklar:

- **tablist** (Collection List) → `display: flex; flex-direction: column`,
  gap. Wrapper'a stil verme.
- **tab** (DOM `button`) → tarayıcı buton görünümünü sıfırla (yukarıdaki
  gibi), `width: 100%`. `opacity` verme.
- **icon** → boyut, daire arka plan; `opacity` verme (kod aktif dışında
  `0`).
- **panels** (Collection List) → `display`, `grid` verme; kod yığar. Gap ve
  hizalama serbest. Wrapper'a stil verme.
- Panelin içi tamamen CMS bağlı, attribute yok. Görsel kutusuna `position:
relative; overflow: hidden`, rozet `absolute; bottom; left`; cam efekti
  `rc-glass` yardımcı class'ından gelir (`base/critical.css`), rozete
  ayrıca `backdrop-filter` ya da arka plan verme.
- Vaka kutusu (Link Block) `position: relative`; ok rozeti `absolute`, `top`
  ve `right` ile köşeye; boyut, daire, arka plan, yazı rengi Designer'ın.
  Kutunun hover'ı Designer'da (Link Block'un Hover durumu: arka plan). Ok
  `aria-hidden`; linkin erişilebilir adı logonun `alt`'ıdır.
- Dar ekran: sol kutu üstte, paneller altında. Layout Designer'ın
  (`tab-flex-col`).

## Ayarlar (kökte)

| Attribute       | Değer | Ne yapar                                                                                        |
| --------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `data-rc-hash`  | —     | Seçili sekme adreste: `#<butonun ID'si>` açılışta ve linkten o sekmeyi açar, seçim adresi yazar |
| `data-rc-eager` | —     | Görünüre girmeyi beklemeden yükle                                                               |

`data-rc-hash` adres çubuğunu `replaceState` ile günceller: geçmişe kayıt
düşmez, sayfa kaymaz. ID'si olmayan sekme adrese yazılmaz; kod bir kez uyarır.
Ölçüm kurulunca GA4'ün yalnız `#` değişen adresi yeni sayfa görüntüleme
saymadığı doğrulanacak (`docs/measurement.md`).

CSS değişkenleri:

| Değişken                    | Varsayılan                       | Ne                                                    |
| --------------------------- | -------------------------------- | ----------------------------------------------------- |
| `--rc-tabs-duration`        | `0.7s`                           | Panel ve kart girişi                                  |
| `--rc-tabs-ease`            | `cubic-bezier(0.22, 1, 0.36, 1)` | Giriş eğrisi                                          |
| `--rc-tabs-stagger`         | `0.05s`                          | Kartlar arası gecikme                                 |
| `--rc-tabs-rest`            | `0.5`                            | Dinlenen sekmenin opaklığı                            |
| `--rc-tabs-description-gap` | `6px`                            | Açık açıklama ile sekme arası                         |
| `--rc-tabs-card-rest`       | `0.4`                            | Seçili olmayan satırın opaklığı (önizleme görünürken) |
| `--rc-tabs-arrow-shift`     | `0.25rem`                        | Seçili satırın okunun ileri çıkışı                    |
| `--rc-tabs-arrow-duration`  | `0.6s`                           | Okun glif hareketi                                    |
| `--rc-tabs-arrow-travel`    | `2em`                            | Glifin kutudan çıkış mesafesi (büyük rozette artır)   |

## Hareket

- **Seçim:** tıklama, klavye ya da adres (`data-rc-hash`). Seçili sekme ve
  paneli `data-rc-state="active"`; sekmede `aria-selected="true"`,
  `tabindex="0"`, diğerlerinde `-1`. Açılışta adresteki sekme, yoksa ilki.
- **Panel geçişi:** giden panel 0,3 s'de solar ve tıklanamaz olur; gelen
  panel `--rc-tabs-duration` sürede `1rem` aşağıdan yükselir. Kartı olan
  panel yalnız solar, kartları `--rc-tabs-stagger` arayla tek tek yükselir.
  Kod gelmeden ilk panel görünür (`:has()`).
- **Açıklama:** aktif sekmede 0,3 s'de açılır, diğerlerinde katlanır.
  Sekmeler yan yana dizildiğinde (`tablist` `data-rc-state="strip"`) hepsi
  katlı kalır.
- **Şerit:** sekmeler yan yana ve taşıyorsa seçilen sekme yatayda görünür
  alana kayar; sayfa dikeyde kaymaz.
- **Önizleme:** satıra gelmek ya da odaklanmak onu seçer; görseli dikey
  kayarak gelir (yukarıda). Geçiş sürerken gelen istek sıraya girer, son
  istenen oynar; ara görseller atlanır.
- **Ok:** link'in hover'ında ya da klavye odağında glif sağa çıkıp soldan
  girer; seçili satırın oku `--rc-tabs-arrow-shift` kadar ileride durur.
- **Sekme ikonu** yalnız seçili sekmede; diğer sekmeler `%50` opak.

## JS yoksa, hareket azaltılmışsa

- **JS yok:** sekmeler işlevsiz düz butonlar; paneller, kartlar ve
  açıklamalar alt alta ve tam görünür; ikonlar görünür. Önizleme gösterilmez
  (boş kutu olurdu), görseller satırlarında küçük kare olarak kalır; okların
  hover hareketi CSS olduğu için çalışır. `rc.js`
  yüklenemezse de aynı: head'deki script etiketinin `onerror`'u
  `html.rc-js`'i kaldırır.
- Panellerin Collection List'i `role="presentation"` alır: Webflow'un
  `role="list"`'i içinde `tabpanel` geçersizdir (axe
  `aria-required-children`).
- **Reduced motion:** geçiş süreleri `motion.css` ile sıfıra iner, kart
  gecikmeleri de kalkar; seçim anında olur. Önizleme görseli kaymadan,
  anında değişir; okun glif hareketi durur.

## Bağımlılık

Yok. Önizleme geçişi `runtime/slide.js`'ten (slideshow ve step-stack ile
ortak).
