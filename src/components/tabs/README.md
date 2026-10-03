# tabs

Solda sekmeler, sağda üst üste yığılı paneller: sekmeye basınca o panel
solarak ve hafifçe yükselerek gelir. Home'da iki kullanım:

- **Hizmetler** (`section__service-tabs`) — sekme başına bir küme, panelde o
  kümenin alt hizmetleri kart olarak. Sekmeler ve paneller statik, her panelde
  bir Collection List. Kaynak: rulebase.co "Every conversation. Better
  outcomes." (katlanan sekme açıklaması, kart ızgarası).
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
      Div  (sol sütun, sticky)                                  service-tabs__nav col-span-3 sticky
        Div  [data-rc-part="tablist"]                           service-tabs__tabs flex flex-col
          Div  (sekme öğesi)                                    service-tabs__tab-item
            DOM `button`  [data-rc-part="tab"]  id="seo"        service-tabs__tab + buton sıfırlama (aşağıda)
              DOM `span`  "SEO"                                 service-tabs__tab-label
              DOM `sup`   [data-rc-part="count"]  "6"           service-tabs__tab-count
              DOM `span`  " hizmet"                             rc-sr-only
            Div  [data-rc-part="description"]                   service-tabs__tab-description
              Paragraph  kümenin bir cümlelik açıklaması        service-tabs__tab-text
          … küme başına bir sekme öğesi
      Div  [data-rc-part="panels"]                              service-tabs__panels col-span-9
        Div  (panel)                                            service-tabs__panel
          Div  (panel başı)                                     service-tabs__panel-header
            H3  "SEO"                                           service-tabs__panel-title
            Link Block → /hizmetler/seo-ajansi                  service-tabs__panel-link
              DOM `span`  "Tüm SEO hizmetleri"
              DOM `span`  "→"  aria-hidden="true"
          Collection List Wrapper                               service-tabs__list-wrapper
            Collection List                                     service-tabs__list grid-3col gap-gutter
              Collection Item                                   service-tabs__item
                Link Block [data-rc-part="card"] → hizmet sayfası   service-tabs__card block
                  Div  (görsel kutusu)                          service-tabs__card-visual aspect-4/5 rounded-lg overflow-hidden
                    Image  Kart görseli, alt=""                 service-tabs__card-image w-full h-full fit-cover
                  Div                                           service-tabs__card-body
                    H4  Name                                    service-tabs__card-title
                    Paragraph  Kısa açıklama                    service-tabs__card-text text-sm text-muted-opacity
        … küme başına bir panel
```

Sağdaki ilk class elemanın ana class'ı: `service-tabs__*` boş açıldı, değerler
sahibinin. Yanındaki yardımcı class'lar (`grid-12col`, `col-span-3`,
`aspect-4/5` …) sitede tanımlı; ana class'ın üstüne **boş combo** olarak
verildi, değer yardımcı class'tan gelir. MCP ile combo vermek için zincir önce
boş stil olarak açılır (`create_style`, `parent_style_names` = önceki
class'lar, değer yok), sonra elemana bütün liste verilir. Buton sıfırlama da
yardımcı class'larla, sektör sekmelerindeki gibi: `service-tabs__tab
bg-transparent border-0 font-inherit px-0 py-0 text-left font-color-inherit
w-full cursor-pointer`. Kart Link Block'u `block` alır (Webflow Link Block'u
`inline-block` gelir). Kart görselinin `alt`'ı boş: kart bir link ve adı
başlıktan gelir, görselin alt metni adı uzatırdı.

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
  üst border'ı yok. Dar ekranda: `service-tabs__tabs` `flex-direction: row;
overflow-x: auto; gap`, öğeler `flex: 0 0 auto; white-space: nowrap`,
  alt border. Kod sekmeler yan yana dizildiğini görür, açıklamaları kapalı
  tutar, seçilen sekmeyi görünür alana kaydırır; scrollbar'ı da gizler.
- **Sol sütun**: masaüstünde `position: sticky; top` (ör. `6rem`) — kartlar
  uzadığında sekmeler ekranda kalır. Section'ın ve üstlerinin hiçbirinde
  `overflow: hidden` olmasın (Sticky kuralı). Dar ekranda sekme şeridi
  `position: sticky; top: 0` + opak arka planla yapışabilir.
- **panels** (Div): `display`/`grid` verme; kod yığar. Paneller en uzun
  panelin yüksekliğini alır, sekme değişince sayfa zıplamaz.
- **Panel başı**: H3 küme adı ve hub linki. JS yokken paneller alt alta
  durduğunda hangi kümenin hangisi olduğunu bu başlık söyler; sekme modunda
  panelin başlığıdır. Gizleme.
- **Kart** (Link Block): `opacity`, `translate` verme (giriş kodda). Hover'da görsel büyütme Designer'da (görsel class'ı Hover
  → `scale`), kartın kendisine `transform` verme.
- **Kart görseli**: Hizmetler › Kart görseli (4:5); kutunun oranı
  `aspect-4/5` yardımcı class'ından.

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

| Değişken                    | Varsayılan                       | Ne                            |
| --------------------------- | -------------------------------- | ----------------------------- |
| `--rc-tabs-duration`        | `0.7s`                           | Panel ve kart girişi          |
| `--rc-tabs-ease`            | `cubic-bezier(0.22, 1, 0.36, 1)` | Giriş eğrisi                  |
| `--rc-tabs-stagger`         | `0.05s`                          | Kartlar arası gecikme         |
| `--rc-tabs-rest`            | `0.5`                            | Dinlenen sekmenin opaklığı    |
| `--rc-tabs-description-gap` | `6px`                            | Açık açıklama ile sekme arası |

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
- **Sekme ikonu** yalnız seçili sekmede; diğer sekmeler `%50` opak.

## JS yoksa, hareket azaltılmışsa

- **JS yok:** sekmeler işlevsiz düz butonlar; paneller, kartlar ve
  açıklamalar alt alta ve tam görünür; ikonlar görünür. `rc.js`
  yüklenemezse de aynı: head'deki script etiketinin `onerror`'u
  `html.rc-js`'i kaldırır.
- Panellerin Collection List'i `role="presentation"` alır: Webflow'un
  `role="list"`'i içinde `tabpanel` geçersizdir (axe
  `aria-required-children`).
- **Reduced motion:** geçiş süreleri `motion.css` ile sıfıra iner, kart
  gecikmeleri de kalkar; seçim anında olur.

## Bağımlılık

Yok.
