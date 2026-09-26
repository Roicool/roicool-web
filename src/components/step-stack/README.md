# step-stack

Alt alta adımlar (numara, başlık, birkaç satır) ve adımlar kayarken yerinde
duran tek bir görsel çerçevesi. Her adımın kendi görseli var; adım tetikleme
çizgisine yaklaşırken görseli çerçeveye alttan kayarak girer, önceki altında
kararıp küçülür. Geri kaydırınca aynı yoldan çıkar. Kaynak: webnomads.com
"Driving growth by design".

**Hareket scroll'a bağlı, zamana değil.** Her karede her görselin yeri
adımının konumundan hesaplanır: çerçeve hızlı kaydırmanın gerisinde
kalamaz, geçişler kuyruklanmaz, yön değişince aynı yol geriye oynar. Fare
tekerleğinin basamaklarını kısa bir scrub (üstel gecikme) yuvarlar; Lenis
varken kaydırma zaten yumuşaktır.

**Pin nasıl:** GSAP yok, pin-spacer yok. Çerçeve tarayıcının kendi
`position: sticky`'siyle sabitlenir; kod yalnız görsellerin yerini yazar ve
hangi adımın güncel olduğuna karar verir. Metin her zaman normal akışta ve
görünür. Yalnız geniş ekranda (992 px ve üstü): tablet ve altında çerçeve
adımların üstünde bir kez, sabit durur ve ilk görseli gösterir; ne yapışır ne
görsel değiştirir.

## Designer'daki yapı

Statik; adımlar Designer'da elle. Adım içinde CMS'e bağlı metin olabilir.

```
Section                     [data-rc="step-stack"]        ← kök; ayarlar burada
  Container
    (başlık alanı, serbest)
    Div                     [data-rc-part="body"]         ← adımlar + sahne; kod relative
      Div                   [data-rc-part="stage"]        ← İLK çocuk; geniş ekranda ray, darda üstte sabit blok
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
  (tıklar içinden geçer); dar ekranda kod dokunmaz, normal akışta üstte
  durur. Dar ekranda alt boşluk (adımlarla arası) Designer'dan.
- **frame** → genişlik (ör. `28rem`), `aspect-ratio` (ör. `16 / 10`),
  radius. Geniş ekranda kod rayın içinde yatay ortalar (`margin-inline:
auto`; sola/sağa almak için margin ver), `sticky; top` ve `overflow: clip`
  verir. Dar ekranda `width: 100%`, oran `16 / 9` gibi.
- **media** → stil verme; kod `absolute; inset: 0` yapar, görseli cover
  doldurtur, yerini `translate`/`scale` ile yazar. Görsel `alt=""`,
  `loading="lazy"` (geniş ekranda yığın bir viewport yaklaşınca kod hepsini
  eager'a çevirip decode ettirir: geçiş anında görsel çözülmez, takılmaz);
  video Embed ile, R2'dan, `muted playsinline loop preload="metadata"`
  (çerçevedeki adımınki oynar). **Her media'nın görseli farklı olsun**; aynı
  asset iki adımda kullanılırsa o adımda "değişmedi" görünür.
- **step** → satır düzeni: geniş ekranda 3 kolonlu grid (`1fr <çerçeve
genişliği> 1fr`; orta kolon boş, çerçeve oraya oturur) ya da 2 kolon
  (metin solda, çerçeve sağda — frame'e `margin-left: auto`). Alt
  `border`, `min-height` (adım başına kaydırma mesafesi; ör. `18rem`),
  dikey padding. Dar ekranda tek kolon.
- Adım sırası ile media sırası aynı olsun; sayılar farklıysa kod uyarır,
  fazlalığı yok sayar.

## Ayarlar (kökte)

| Attribute          | Değer          | Ne yapar                                                                                                    |
| ------------------ | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `data-rc-top`      | px, `120`      | Geniş ekranda çerçevenin yapıştığı yükseklik (viewport üstünden)                                            |
| `data-rc-line`     | %, `50`        | Tetikleme çizgisi: çerçevenin üstünden, çerçeve yüksekliğinin yüzdesi; üstü bu çizgiyi geçen adım günceldir |
| `data-rc-zone`     | %, `25`        | Görselin kayarak girdiği kaydırma mesafesi, viewport yüksekliğinin yüzdesi; çizgiye varınca tam             |
| `data-rc-scrub`    | saniye, `0.12` | Görsellerin kaydırmayı izleme gecikmesi; `0` birebir                                                        |
| `data-rc-parallax` | yüzde, `30`    | Çerçeveye girerken içerideki görselin gecikme payı                                                          |
| `data-rc-dim`      | 0–1, `0.6`     | Altta kalan görselin parlaklığı; `1` kararmaz                                                               |
| `data-rc-eager`    | —              | Görünüre girmeyi beklemeden yükle (önerilir)                                                                |

Kırılma noktası sabit: Webflow'un tablet eşiği (991 px). Üstünde yan ray ve
görsel geçişleri, altında üstte sabit çerçeve.

## Hareket

- **Geniş ekran:** stage, body'nin tamamını kaplayan görünmez bir ray;
  frame rayın içinde `top`'ta yapışır. Adımlar yanından akar.
- **Dar ekran:** stage body'nin ilk çocuğu olarak üstte, normal akışta;
  çerçevede ilk görsel durur, kaydırınca yukarı gider. Görsel geçişi yok;
  yalnız adım vurgusu (aşağıdaki "Metin") çalışır. Pencere genişleyip
  daralınca kod çerçeveyi o anki adıma anında getirir.
- **Çizgi çerçevenin üstünde:** tetikleme çizgisi viewport'a değil
  çerçeveye çizilir (`line`: çerçeve yüksekliğinin yüzdesi, üstten). Çerçeve
  yapışana kadar adımlarla birlikte kayar, adımlar ona göre yer
  değiştirmez; **section'a girerken hiçbir görsel değişmez.** Çerçeve
  yapışınca adımlar altından geçmeye başlar ve her adım çizgiye gelince
  kendi görselini getirir.
- **Görselin yeri:** k. adımın üstünün çizgiye kalan mesafesi `zone`'un
  altına inince görseli girmeye başlar; adımın üstü çizgiye değince tam
  yerindedir (`translate 100% → 0`, içindeki görsel `parallax` kadar
  geriden gelir, smoothstep ile yumuşatılır). Aynı oranda alttaki görsel
  kararır (`::after` katmanı, `1 − dim`) ve `%96`'ya küçülür. Zone, bir
  önceki adıma olan mesafenin %90'ını ve adımın çerçeve yapıştıktan sonra
  çizgiye kadar aldığı yolu geçemez; kısa adımlarda geçiş ona sığar, hiçbir
  geçiş yapışmadan önce başlamaz.
- **Güncel adım:** üstü çizgiyi geçmiş son adım. Metin vurgusu ve video o
  an değişir; görsel ise tam o anda yerine oturmuş olur.
- **Scrub:** görseller kaydırmayı `scrub` saniyelik üstel gecikmeyle izler;
  kaydırma durunca birkaç karede yerine oturur. Yığın ekran dışındayken
  hiçbir şey ölçülmez; görünüre girince (sayfa içi atlama, yarıdan yüklenme)
  gecikmesiz yerleşir.
- **Kararma:** `filter` değil, görselin üstünde opaklığı değişen siyah bir
  `::after` katmanı. Filter büyük görseli her karede yeniden rasterize eder;
  opacity ve translate compositor'da kalır (`will-change`).
- **Metin:** güncel adım `data-rc-state="active"`; diğerleri `%50` opak
  (`--rc-step-stack-rest`; Designer class'ında opacity verirse o kazanır).
- **Media durumları:** girmemiş görsel durumsuz (gizli), girerken
  `entering`, en üstteki `active`, örtülmüş olanlar `under`.
- **Video:** çerçevedeki görselin videosu oynar, diğerleri durur ve başa
  sarar; çerçeve ekran dışındayken ve sekme gizliyken hepsi durur.

## JS yoksa, hareket azaltılmışsa

- **JS yok:** sticky yok; frame içindeki görseller küçük bir galeri (grid)
  olarak adımların üstünde durur, adımlar alt alta.
- **Reduced motion:** geniş ekranda pin kalır (animasyon değil, konum);
  görsel adımın üstü çizgiye değince anında değişir, scrub yok; videolar
  oynamaz, poster durur (tercih oturum içinde değişirse kod uyar).
- İçerik her koşulda HTML'de ve görünür.

## Erişilebilirlik

- Görseller dekoratif (`alt=""`); anlam metinde. Adımlar gerçek başlık ve
  paragraf; numara ayrı metin ("1/6").
- Ray `pointer-events: none`: metin seçilir, linkler tıklanır.
- Gizli görseller `visibility: hidden` (odak/okuyucu görmez; zaten
  dekoratif).

## Bağımlılık

Yok. Yerler her karede inline `translate`/`scale` ve bir CSS değişkeni
olarak yazılır; `runtime/slide.js`'in picture seçicisi kullanılır.
