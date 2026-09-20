# reveal

Görünüre girince açılan section: başlık ve etiket kelime kelime alttan
çıkar, gövde ve link blok halinde yükselir, arka plandaki video ya da görsel
solarak ve ortadan açılarak gelir, sonra uzun bir nefesle yerine oturur.
Kaynak: squareup.com "Square AI" section'ı. Her section'a takılabilir; tam
ekran video section'ları için düşünüldü.

## Designer'daki yapı

```
Section                      [data-rc="reveal"]         ← kök; min-height 100svh, position verme
  Div                        [data-rc-part="media"]     ← video ya da görsel kabı; absolute, inset 0, z-index 0
    Embed <video …>                                     ← aşağıda; ya da Image
  Container                                             ← position relative, z-index 1
    Div / Text Block         [data-rc-part="text"]      ← etiket (eyebrow): kelime kelime
    H2                       [data-rc-part="text"]      ← başlık: kelime kelime
    Paragraph                [data-rc-part="rise"]      ← gövde: blok
    Link Block               [data-rc-part="rise"]      ← link: blok
```

Her parçadan istediğin kadar olabilir; sıra DOM sırası. Metin parçaları
**bölünmemiş, düz metin** olarak yazılır; bölmeyi kod yapar ve açılış bitince
geri alır.

Designer'da ayarlanacaklar:

- **Kök** → `min-height: 100svh` (ya da istediğin yükseklik), flex column,
  içerik hizası. `position` verme; kod `relative` verir.
- **media** → `position: absolute; inset: 0; z-index: 0`. `overflow` verme,
  kod `clip` verir. Video kabı için `aria-hidden="true"`.
- **Grain ve karartma** → media'nın **içine değil, hemen sonrasına** (kod
  media'nın içindekileri videoyla birlikte ölçekler): boş Div, class
  `rc-grain` (doku, blend, konum koddan; `--rc-grain-opacity`, `--rc-grain-size`
  ile ayar), `aria-hidden="true"`. Karartma için ayrı boş Div, Designer'da
  absolute inset 0 + yarı saydam siyah. İkisi de container'dan önce, z-index
  gerekmez.
- **Container** → `position: relative; z-index: 1`; içerik videonun üstünde.
- **Metin parçaları** → tipografi Designer'da; `text-wrap`, `overflow`
  verme.
- Section ilk viewport'ta olmasın: gizleme `rc.css`'ten gelir, ilk boyamada
  görünüp sonra gizlenirse titrer. Home'da hero 100svh, sorun yok.

### Video (Embed, R2'dan)

Hero ile aynı istisna: Webflow'un video elementleri çoklu kaynak vermez.
Dosyalar R2'da; masaüstü 16:9, mobil 2:3:

```html
<video
  playsinline
  muted
  loop
  preload="metadata"
  poster="https://R2/…/poster.jpg"
>
  <source
    src="https://R2/…/portrait.webm"
    type="video/webm"
    media="(max-width: 767px)"
  />
  <source
    src="https://R2/…/portrait.mp4"
    type="video/mp4"
    media="(max-width: 767px)"
  />
  <source src="https://R2/…/landscape.webm" type="video/webm" />
  <source src="https://R2/…/landscape.mp4" type="video/mp4" />
</video>
```

Tarayıcı yalnız eşleşen kaynağı indirir. Kod `muted` ve `playsinline`'ı
garantiye alır, videoyu section ekrandayken oynatır, dışında durdurur.

## Ayarlar (kökte)

| Attribute           | Değer           | Ne yapar                                                                  |
| ------------------- | --------------- | ------------------------------------------------------------------------- |
| `data-rc-scrub`     | —, ya da saniye | **Scroll modu**: açılış kaydırmaya bağlı; değer gecikme, varsayılan `0.6` |
| `data-rc-snap`      | `false`         | Scroll modunda snap'i kapatır; yoksa açık                                 |
| `data-rc-threshold` | 0–1, `0.25`     | Tek seferlik mod: kökün bu kadarı görününce açılır                        |
| `data-rc-stagger`   | saniye, `0.06`  | Tek seferlik mod: kelimeler arası gecikme                                 |
| `data-rc-duration`  | saniye, `0.9`   | Tek seferlik mod: kelime ya da blok yükselme süresi                       |
| `data-rc-eager`     | —               | Görünüre girmeyi beklemeden yükle (gerekmez)                              |

## Hareket

İki mod var. **Tek seferlik** (varsayılan): kökün %25'i görününce kendi
saatiyle bir kez oynar. **Scroll modu** (`data-rc-scrub`): Square'in canlı
sitesindeki davranış, tam ekran section'lar için. Açılış kaydırmaya kilitli:
section'ın üstü viewport'un altından girerken sıfırdır, viewport'un üstüne
oturunca tamamlanır. Yukarı kaydırınca geri sarar. Kaydırma yarıda durursa
snap en yakın uca götürür: section ya tam yerine oturur ya da geri çekilir
(`data-rc-snap="false"` kapatır). Scroll modunda sıra: media ilk yarıda
açılır, kelimeler onda birden itibaren sırayla, bloklar ortadan sonra. Geri
sarabilmek için bölme geri alınmaz; metin bölünmüş kalır (tam metin
`aria-label`'da). Pin yok; Lenis'e bağlı, hero ile aynı snap ayarı. Tek
seferlik modun ayrıntısı:

- **Kelimeler:** `opacity .2 → 1`, `min(10rem, 20svh)` alttan yükselir,
  `expo.out`, kelime başına 0.06 s; satırlar `clip-path` ile maskeli, kelime
  kendi satırının altından çıkar.
- **Bloklar:** aynı yükselme, kelimelerden 0.12 s sonra, blok başına 0.08 s.
- **Media:** `opacity 0 → 1` 3 s; `clip-path inset(25%) → 0` 1.2 s; içi
  `scale 1.2 → 1` 20 s. Metin yerine oturunca kök `revealed` olur, media
  arkada oturmaya devam eder.
- Bir kez oynar; geri kaydırınca tekrar etmez. Ziyaretçi sayfaya kaydırılmış
  gelirse hemen oynar.
- Bitince bölme geri alınır, inline stiller silinir: metin viewport'la
  yeniden sarar, linklerin Designer'daki hover transform'u çalışır.

## SEO ve GEO

- Metin HTML'de tam ve bölünmemiş; bot JS çalıştırmasa da başlığı ve gövdeyi
  olduğu gibi okur.
- Başlangıç durumu yalnız `opacity: .2` ve kaydırma; `display: none` ya da
  `visibility: hidden` yok. Metin erişilebilirlik ağacında ve görünürde.
- Bölme sırasında tam metin `aria-label`'da, kelime span'ları `aria-hidden`;
  bitince DOM başlangıçtaki haline döner.
- Video kabı dekoratif; `visibility: hidden` ile başlar, 3 sn içinde her
  koşulda görünür.

## JS yoksa, hareket azaltılmışsa, GSAP gelmezse

- **JS yok:** başlangıç durumları `.rc-js`'e bağlı, hiçbir şey gizli
  başlamaz. Video poster'ıyla durur.
- **`rc.js` gelmezse:** `.rc-js` var ama durum basılmaz; 3 sn sonra CSS
  animasyonu her şeyi açar.
- **Reduced motion:** kod `static` basar, timeline kurmaz; yalnız videoyu
  yönetir.
- **GSAP gelmezse:** `static`, uyarı konsola düşer.

## Erişilebilirlik

- Başlık ve etiket bölünürken ekran okuyucu tam metni okur (`aria: "auto"`);
  bitince zaten düz metin.
- Video `muted` + `playsinline`; kaba `aria-hidden="true"`. 5 sn'den uzun
  otomatik video için WCAG 2.2.2 durdurma kontrolü hero ile birlikte ele
  alınacak.
- Link görünür metinli Link Block; kod dokunmaz.

## Bağımlılık

GSAP 3.13 + SplitText (yalnız `text` parçası varsa), `runtime/motion.js`
üzerinden jsDelivr'dan. Home'da hero zaten indirdi; hizmet sayfalarında
yaklaşık 90 KB, tarayıcı cache'inde tek kopya.
