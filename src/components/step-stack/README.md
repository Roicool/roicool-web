# step-stack

Alt alta adımlar (numara, başlık, birkaç satır) ve adımlar kayarken yerinde
duran tek bir görsel çerçevesi. Her adımın kendi görseli var; adım tetikleme
çizgisine gelince görseli çerçeveye alttan kayarak girer, önceki altında
kararıp küçülür. Geri kaydırınca aynı yoldan çıkar. Kaynak: webnomads.com
"Driving growth by design"; oradaki scroll'a kilitli yığın yerine geçişler
slideshow'daki gibi yumuşatılmış.

**Pin nasıl:** GSAP yok, pin-spacer yok. Çerçeve tarayıcının kendi
`position: sticky`'siyle sabitlenir; kod yalnız hangi adımın güncel olduğuna
karar verir ve geçişleri oynatır. Metin her zaman normal akışta ve görünür.

## Designer'daki yapı

Statik; adımlar Designer'da elle. Adım içinde CMS'e bağlı metin olabilir.

```
Section                     [data-rc="step-stack"]        ← kök; ayarlar burada
  Container
    (başlık alanı, serbest)
    Div                     [data-rc-part="body"]         ← adımlar + sahne; kod relative
      Div                   [data-rc-part="stage"]        ← İLK çocuk; geniş ekranda ray, darda üstte yapışır
        Div                 [data-rc-part="frame"]        ← görsel çerçevesi; genişlik, oran, radius Designer
          Div               [data-rc-part="media"] ×n     ← her adımın görseli; sıra adımlarla aynı
            Image (alt "") ya da Embed <video>
      Div                   [data-rc-part="step"] ×n      ← adım satırı; metin
        Div (numara "1/6" + H3)   ·   Div (paragraf)
```

Designer'da ayarlanacaklar:

- **body** → hiçbir şey. `overflow` verme; kökün ve üstlerinin hiçbirinde
  `overflow: hidden` olmasın (sticky'yi öldürür; yatay taşma için body'ye
  verilmişse bile).
- **stage** → hiçbir şey. Geniş ekranda kod `absolute; inset: 0` ray yapar
  (tıklar içinden geçer), dar ekranda `sticky; top` verir. Dar ekranda
  metin altından geçerken kenarlardan görünmesin diye arka plan rengi
  verilebilir.
- **frame** → genişlik (ör. `28rem`), `aspect-ratio` (ör. `16 / 10`),
  radius. Geniş ekranda kod rayın içinde yatay ortalar (`margin-inline:
auto`; sola/sağa almak için margin ver), `sticky; top` ve `overflow: clip`
  verir. Dar ekranda `width: 100%`, oran `16 / 9` gibi.
- **media** → stil verme; kod pinliyken `absolute; inset: 0` yapar, görseli
  cover doldurtur. Görsel `alt=""`, `loading="lazy"`; video Embed ile,
  R2'dan, `muted playsinline loop preload="metadata"` (aktif adımınki
  oynar).
- **step** → satır düzeni: geniş ekranda 3 kolonlu grid (`1fr <çerçeve
genişliği> 1fr`; orta kolon boş, çerçeve oraya oturur) ya da 2 kolon
  (metin solda, çerçeve sağda — frame'e `margin-left: auto`). Alt
  `border`, `min-height` (adım başına kaydırma mesafesi; ör. `18rem`),
  dikey padding. Dar ekranda tek kolon.
- Adım sırası ile media sırası aynı olsun; sayılar farklıysa kod uyarır,
  fazlalığı yok sayar.

## Ayarlar (kökte)

| Attribute          | Değer         | Ne yapar                                                         |
| ------------------ | ------------- | ---------------------------------------------------------------- |
| `data-rc-top`      | px, `120`     | Geniş ekranda çerçevenin yapıştığı yükseklik (viewport üstünden) |
| `data-rc-header`   | px, `0`       | Dar ekranda sahnenin üstünde sabit header için boşluk            |
| `data-rc-line`     | %, `50`       | Tetikleme çizgisi: üstü bu çizgiyi geçen son adım günceldir      |
| `data-rc-duration` | saniye, `0.9` | Geçiş süresi                                                     |
| `data-rc-parallax` | yüzde, `30`   | Çerçeveye girerken içerideki görselin gecikme payı               |
| `data-rc-dim`      | 0–1, `0.6`    | Altta kalan görselin parlaklığı; `1` kararmaz                    |
| `data-rc-eager`    | —             | Görünüre girmeyi beklemeden yükle (önerilir)                     |

Kırılma noktası sabit: Webflow'un tablet eşiği (991 px). Üstünde yan ray,
altında üstte sahne.

## Hareket

- **Geniş ekran:** stage, body'nin tamamını kaplayan görünmez bir ray;
  frame rayın içinde `top`'ta yapışır. Adımlar yanından akar.
- **Dar ekran:** stage body'nin ilk çocuğu olarak üstte yapışır; adımlar
  altından geçer.
- **Güncel adım:** üstü viewport'un `line`%'ini geçmiş son adım. Adım
  değişince: ileri → geçilen görseller `under` (kararır, %96'ya küçülür),
  yeni görsel alttan `100% → 0` kayarak girer, içindeki görsel %30
  gecikmeli; geri → arkada kalan görseller aşağı kayarak çıkar, alttaki
  yeniden tam parlaklığa gelir. Kayma sürerken yön değişirse aynı animasyon
  tersine oynar, sıçrama olmaz.
- **Metin:** güncel adım `data-rc-state="active"`; diğerleri `%50` opak
  (`--rc-step-stack-rest`; Designer class'ında opacity verirse o kazanır).
- **Video:** güncel adımın videosu oynar, diğerleri durur ve başa sarar.
- Hızlı kaydırmada ara adımlar atlanır: yalnız varılan görsel kayar,
  aradakiler doğrudan `under` olur.

## JS yoksa, hareket azaltılmışsa

- **JS yok:** sticky yok; frame içindeki görseller küçük bir galeri (grid)
  olarak adımların üstünde durur, adımlar alt alta.
- **Reduced motion:** pin kalır (animasyon değil, konum); geçişler anlık.
- İçerik her koşulda HTML'de ve görünür.

## Erişilebilirlik

- Görseller dekoratif (`alt=""`); anlam metinde. Adımlar gerçek başlık ve
  paragraf; numara ayrı metin ("1/6").
- Ray `pointer-events: none`: metin seçilir, linkler tıklanır.
- Gizli görseller `visibility: hidden` (odak/okuyucu görmez; zaten
  dekoratif).

## Bağımlılık

Yok. Geçişler Web Animations API (`runtime/slide.js`'in easing'i ve
picture seçicisi).
