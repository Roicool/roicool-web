# website-ring

Yaptığımız web sitelerinin ekran görüntüleri, kameranın içinde durduğu bir
silindirin üstünde: 5 kat × 8 kart, three.js (WebGL). Sürükleyince silindir
döner; ilk sürüklemeye kadar kamera imlece hafifçe yaslanır. Karta gelince
kart büyür ve imlecin yanında `domain ↗` hapı belirir; tık siteyi yeni
sekmede açar. Ortadaki başlık imlece göre eğilir; sayfa kaydıkça silindir
hafifçe döner. Kaynak: squarespace.com "Made with Squarespace" — sahnenin
bütün sayıları (yarıçap, kart boyu, kamera, kontroller, sönümler, yaylar)
birebir. Kaydırma dönüşü ve yuvarlak köşeler bizim eklememiz.

**Veri CMS'ten gelir.** Siteler bir Collection List'tir: her item siteye
giden bir link, içinde ekran görüntüsü ve domain metni. Bu liste bölümün
erişilebilir içeriğidir (gerçek linkler; bot, ekran okuyucu ve Tab görür);
canvas onun üstündeki süstür (`aria-hidden`).

**Site sayısı 40'tan azsa** kod siteleri silindirin etrafında tekrarlar;
her ekran görüntüsü bir kez indirilir. Site sayısı bir katı (8) tam bölüyorsa
her kat bir sonraki siteden başlar, aynı site alt alta dizilmez. Liste her
siteyi bir kez gösterir. 40'tan fazla site varsa silindire ilk 40'ı girer.

## Designer'daki yapı

```
Section            .website-ring           [data-rc="website-ring"]   ← görünürlük: Hizmetler › Show site showcase
  Div              .website-ring__scene     [data-rc-part="scene"] aria-hidden="true"   ← canvas'ı kod ekler
    Div            .website-ring__gradient.is-top
    Div            .website-ring__gradient.is-bottom
  Div              .website-ring__list      [data-rc-part="list"] role="region" aria-label="Yaptığımız web siteleri"
    H2             .rc-sr-only              "Yaptığımız web siteleri"
    Paragraph      .rc-sr-only              "… Her link siteyi yeni sekmede açar."
    Collection List Wrapper
      Collection List   .website-ring__items
        Collection Item
          Link Block    .website-ring__link  [data-rc-part="card"]   ← Site URL; target="_blank" rel="noopener noreferrer"
            Image       .website-ring__image                          ← Site screenshot; alt = Name; loading="lazy"
            Text Block  .website-ring__label [data-rc-part="label"]   ← Site name (ör. alaka.ai)
  Div              .website-ring__title-wrap
    Div            .website-ring__title     [data-rc-part="title"]
      Paragraph    .website-ring__heading   "Roicool ile yapılan "
        Span       .website-ring__heading-line "web siteleri"   ← ikinci satır
      Div          .website-ring__actions   ← isteğe bağlı CTA satırı
        button primary (component)          ← sitenin butonu
  Div              .website-ring__pill      [data-rc-part="pill"] aria-hidden="true"
    Text Block     .website-ring__pill-text [data-rc-part="pill-text"]  ← kod domain'i yazar
    Text Block     .website-ring__pill-text "↗"
  (isteğe bağlı) Link Block .website-ring__fallback [data-rc-part="fallback"]  ← WebGL yokken gösterilecek görsel
```

- `scene`'e stil olarak yalnız boyut ve `position: relative` ver; canvas'ı
  kod ekler, gradyanlar onun üstünde kalır.
- `title`'a `transform` verme (eğimi kod yazar, CSS uygular); çocuğuna
  `opacity`/`translate` verme (açılışı CSS yapar).
- Başlık imleci almaz (sürükleme altındaki sahneye geçer); içindeki link ve
  butonlar alır. CTA'yı `title`'ın içine koy, başlıkla birlikte gelir ve
  eğilir.
- Kartların köşesi `.website-ring__image`'in `border-radius`'undan gelir
  (ör. `rounded-lg`). px değeri, kameraya bakan kartta ekranda aynı px
  görünür; % kartın kısa kenarına göredir. Radius yoksa kart köşeli.
- `pill`'e `position`, `transform`, `opacity` verme; kod sürer. Hap
  Designer'da görünür kalır, stil vermek kolay olur; sitede kart üstünde
  değilken gizlidir.
- Liste görünmez değil, ekran dışında bekler: Tab ile girilince bölümün
  üstünde siyah bir panel olarak açılır. Görselleri bu sırada yüklenmez
  (canvas kendi dokusunu indirir).
- Görselin `srcset`'inden 800 px'e en yakın üst boy doku olarak alınır
  (Webflow CMS görselleri `srcset` ile gelir). Oran ≈ 1.6:1 (1500 × 935
  ideal).

## Ayar

| Attribute (kökte)     | Varsayılan | Ne                                                                       |
| --------------------- | ---------- | ------------------------------------------------------------------------ |
| `data-rc-scroll-turn` | `45`       | Bölüm ekranı baştan sona geçerken silindirin döndüğü derece; `0` kapatır |

## Orijinal görünüm için Designer değerleri

| Class                               | Değerler                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.website-ring`                     | `position: relative`; `height: calc(100vh - 5rem)` (nav yüksekliği kadar eksik); `background-color: #000`                                                                    |
| `.website-ring__scene`              | `position: relative`; `width: 100%`; `height: 100%`                                                                                                                          |
| `.website-ring__gradient`           | `position: absolute`; `left: 0`; `z-index: 1`; `width: 100%`; `height: 12vh`; `pointer-events: none`                                                                         |
| `.website-ring__gradient.is-top`    | `top: 0`; arka plan: linear-gradient 0°, şeffaf → `#000`                                                                                                                     |
| `.website-ring__gradient.is-bottom` | `bottom: 0`; arka plan: linear-gradient 180°, şeffaf → `#000`                                                                                                                |
| `.website-ring__title-wrap`         | `position: absolute`; `inset: 0`; `z-index: 100`; flex column, ortala; `pointer-events: none`                                                                                |
| `.website-ring__title`              | `text-align: center`                                                                                                                                                         |
| `.website-ring__heading`            | margin 0; `letter-spacing: -0.04em`; `line-height: 1.08`; renk beyaz; serif, weight 300; boy: 22 → 26 (375) → 32 (1020) → 36 (1280) → 40 (1440) → 50 px (1920)               |
| `.website-ring__heading-line`       | `display: block`; sans, weight 400                                                                                                                                           |
| `.website-ring__items`              | grid, 1 kolon (744 px'ten itibaren 2); `gap: 12px`; liste stili yok                                                                                                          |
| `.website-ring__link`               | `display: inline-block`; renk beyaz                                                                                                                                          |
| `.website-ring__pill`               | `display: flex`; ortala; `gap: 0.3em`; `padding: 12px 16px`; `border-radius: 90px`; arka plan beyaz; gölge `0 18px 11px #0000000d, 0 8px 8px #00000017, 0 2px 5px #0000001a` |
| `.website-ring__pill-text`          | 14 px, weight 500, `line-height: 1.2`, `letter-spacing: -0.01em`; renk siyah; `white-space: nowrap`                                                                          |
| `.website-ring__fallback`           | `display: block`; `width: 100%`; `height: 100%`; içindeki görsel `object-fit: cover`                                                                                         |

Başlık eğimi yalnız 1280 px ve üstünde, imleçle; dokunmatikte ve reduced
motion'da düz durur.

## CMS alanları (Projects)

| Alan            | Tip        | Kullanım                         |
| --------------- | ---------- | -------------------------------- |
| Site screenshot | Image      | Kartın dokusu; ≈ 1500 × 935      |
| Site URL        | Link       | Link Block'un adresi; yeni sekme |
| Site name       | Plain text | `label` ve hap: `alaka.ai`       |

Collection List filtresi: _Site screenshot is set_; limit 40. Sıralama
silindirdeki sırayı belirler (kat kat, soldan sağa). `label` yoksa kod
linkin adresinden domain'i kendisi çıkarır.

## Nerede

Hizmetler template'i (`/hizmetler/…`). Section'ın görünürlüğü Hizmetler
koleksiyonundaki **Show site showcase** (Switch) alanına bağlı: açık
olan hizmet sayfasında görünür, kapalı olanda HTML'e hiç girmez. Açık
olanlar: Webflow ajansı, Web tasarım ajansı.

## Davranış

- Kök görünüre yaklaşınca three.js CDN'den gelir (~170 KB gzip, yalnız bu
  bölümün olduğu sayfada); sahne kurulur, ekran görüntüleri doku olarak
  indirilir. Gelene kadar kart yerinde %10 gri bir yer tutucu durur.
- Sahne yarıya kadar görününce canvas 1 sn'de belirir. Başlık %10'u
  görününce yükselerek gelir.
- Sürükleme: yatayda döner, dikeyde ±0.25 rad eğilir (mobilde eğim yok);
  zoom ve pan yok. Mobilde dikey kaydırma sayfayı kaydırır, yatay
  kaydırma silindiri çevirir.
- Hover: kart 1.2 kat büyür (mobilde büyümez), saydamlığı 0.5 → 1
  (mobilde dinlenme saydamlığı 0.8). Hap yalnız hover'ı olan cihazlarda.
- Kaydırma: bölüm ekranın altından girip üstünden çıkana kadar silindir
  toplam `scroll-turn` derece döner (ortadayken düz), sönümlü. Sürükleme
  kamerayı çevirir, kaydırma silindiri; ikisi birbirini bozmaz.
- Döngü yalnız bölüm ekrandayken çalışır.
- Durumlar: kökte `running` / `static` / `fallback`; `scene`'de
  `visible`; `title`'da `revealed`; `pill`'de `active`.

## WebGL yoksa, reduced motion'da, three.js gelmezse

Canvas kurulmaz. `fallback` parçası varsa o görünür (liste ekran dışında,
erişilebilir kalır); yoksa liste kendini gösterir (`static`): Designer'daki
ızgarasıyla, ekran görüntüleriyle.

## JS yoksa

Liste ve (varsa) fallback normal akışta görünür; linkler çalışır. Hap
gizli kalır.

## Erişilebilirlik

- Canvas ve sahne `aria-hidden`; içerik listede, gerçek linklerle.
- Liste Tab ile açılır; her link siteyi yeni sekmede açar (bunu listenin
  başındaki `rc-sr-only` paragraf söyler).
- Görselin `alt`'ı proje adı; linkin adı `label` metninden gelir.

## Bağımlılık

three.js 0.170.0 + OrbitControls — `src/runtime/three.js`, jsDelivr `+esm`.
Görseller WebGL dokusu olduğu için CORS izniyle (Access-Control-Allow-Origin)
gelmeli; gelmezse kart gri kalır ve konsola bir uyarı düşer.
