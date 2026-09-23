# marquee

Webflow Collection List'i sonsuz yatay şeride çeviren component. Logo şeridi,
müşteri listesi, etiket akışı — CMS'ten gelen her yatay liste.

## Designer'daki yapı

Collection List'in kendi üç katmanı, araya hiçbir şey eklenmeden:

```
Collection List Wrapper   [data-rc="marquee"]
  Collection List         [data-rc-part="track"]
    Collection Item       ← attribute gerekmez
```

`track` attribute'u yazılmazsa kod Webflow'un `.w-dyn-items` sınıfını bulur ve
attribute'u ona kendisi basar; yani wrapper'a tek attribute yeterli. Yine de
`track`'i yazmak tercih edilir — Webflow sınıf adı değişirse kod etkilenmez.

Designer'da ayarlanacaklar:

- **Collection List** → Display: Flex, yatay, `gap` istediğin aralık. Item
  genişlikleri serbest, yükseklik eşit olsun (logolar için `height` sabit,
  `width: auto`).
- **Wrapper** → `column-gap`, List'teki gap ile **aynı** olmalı. Kod, döngü
  mesafesine bu gap'i katar; farklıysa şeridin birleşme noktasında boşluk
  görünür.
- Wrapper'a genişlik verme; sayfa genişliğinde durur ve taşanı kırpar.

**Düzen kayması (CLS) olmasın diye**, JS'ten önceki görünüm JS'ten sonrakiyle
aynı olmalı:

- Wrapper Designer'da da `display: flex`, `overflow: hidden` olsun; kod aynı
  değerleri basar, hiçbir şey kımıldamaz.
- List `flex-wrap: nowrap`, item'lar `flex-shrink: 0` (utility: `flex-0`).
- Her logo `img`'inde `width` ve `height` attribute'ları bulunsun (CMS
  görsellerinde Webflow ekler; elle konan görselde kontrol et). Yoksa görsel
  gelene kadar item 0px, gelince genişler — kayma.

Kod ne yapar: List'i bir kez klonlar (`aria-hidden`, odaklanamaz), Wrapper'ın
içine ekler, genişliği ölçer, hızdan süreyi hesaplar, `data-rc-state="running"`
basar. Görseller yüklendikçe yeniden ölçer. Item'ların içindeki component'ler
(ör. [`hover-reveal`](../hover-reveal/README.md) kartı) klonda da çalışır:
kod kopyayı runtime'a yeniden taratır.

## Ayarlar (Wrapper'da)

| Attribute                | Değer              | Ne yapar                                               |
| ------------------------ | ------------------ | ------------------------------------------------------ |
| `data-rc-speed`          | px/saniye, `70`    | Kayma hızı. Site genelinde aynı tut                    |
| `data-rc-direction`      | `left` / `right`   | Yön. Varsayılan sola                                   |
| `data-rc-pause-on-hover` | —                  | Fare üstündeyken yavaşlayıp durur (yalnız fare)        |
| `data-rc-drag`           | `false`            | Sürüklemeyi kapatır; yoksa açık                        |
| `data-rc-fade`           | `10%`, `4rem`, `0` | Kenar solması genişliği; `0` kapatır. Varsayılan `10%` |
| `data-rc-eager`          | —                  | Görünüre girmeyi beklemeden yükle                      |

Süre otomatik: `mesafe ÷ hız`. 1500px'lik bir şerit 70 px/s'de ~21 saniyede
döner — Square'in ölçtüğü değer.

## Sürükleme

Basınca şerit durur, parmak/fare ne kadar giderse şerit o kadar kayar,
bırakınca sürtünmeyle süzülür ve durunca kendiliğinden yeniden akar. Mekanik:
CSS animasyonu yerinde kalır, kod yalnız animasyonun `currentTime`'ını kaydırır
(hız px/s olduğundan `Δt = dx ÷ hız`, şerit uzunluğundan bağımsız). Inline
transform yok, animasyona geri devir yok.

- 4px'ten az hareket eden basış tıklamadır: içerideki linkler çalışır. Sürükleme
  sonrası ilk tıklama yutulur (yanlışlıkla link açılmasın).
- Dokunmatikte yatay kaydırma şeride, dikey kaydırma sayfaya gider
  (`touch-action: pan-y`).
- Durdurma sebepleri (hover, odak, basış) tek kümede tutulur; küme boşalınca
  akar. Hover'da basıp bırakınca fare üstündeyken durmaya devam eder.
- Hover ve odak şeridi 450 ms'de yavaşlatarak durdurur, kalkınca aynı sürede
  hıza çıkarır. Hız `updatePlaybackRate()` ile değişir, `playbackRate`
  setter'ı ile değil: setter compositor'daki animasyonu o an yeniden
  senkronlar ve şerit zıplar. Durmadan önce hız `0.02`'ye iner, sonra
  `pause()`; kalkınca aynı hızdan başlar. Yalnız basış anında durdurur:
  işaretçi şeridi tutuyor.
- Şerit yeniden ölçülünce (görsel gelince, pencere değişince) süre ve mesafe
  değişir; kod animasyonun kat ettiği oranı korur, konum sıçramaz.

## Kenar solması

Wrapper'a `mask-image` ile iki uçta saydamlık: `--rc-marquee-fade` genişliğinde
(varsayılan `10%`). `data-rc-fade` değeri sayı ise yüzde, birimli ise olduğu
gibi. `:where()` ile yazıldığından Designer'daki bir mask onu ezer.

## JS yoksa, hareket azaltılmışsa

- **JS gelmezse:** hiçbir kural devreye girmez, liste Designer'daki haliyle
  durur. İçerik tam görünür.
- **`prefers-reduced-motion: reduce`:** kod hiçbir şey yapmaz — klon yok,
  animasyon yok. Liste düz bir satır olarak kalır.

## Erişilebilirlik

- Klon `aria-hidden="true"`; içinde odak alabilen her şey (link, düğme, form
  alanı, `contenteditable`, `tabindex`li eleman) `tabindex="-1"`. Ekran
  okuyucu ve klavye yalnız orijinal listeyi görür; klondaki linkler fareyle
  yine tıklanır (`inert` değil — şeridin yarısı klondur).
- Şeridin içindeki bir link **klavyeyle** odak alınca (`:focus-visible`) şerit
  durur, odak çıkınca sürer — klavye kullanıcısı hareket eden hedefi kovalamaz.
  Fareyle basınca oluşan odak durdurmaz; yoksa sürükleme sonrası şerit başka
  bir yere tıklanana kadar dururdu.
- Sürükleme yalnız işaretçi içindir; klavye için gerekmez, içerik zaten döner.
- Logolar için Collection Item içindeki `img`'e anlamlı `alt` (marka adı).
  Dekoratif sayılıyorsa `alt=""`.

**Açık konu — WCAG 2.2.2:** 5 saniyeden uzun otomatik hareketin herkes için
durdurma kontrolü olmalı. Hover ve focus-within bunun bir kısmı; görünür bir
"durdur" düğmesi henüz yok. Wrapper'ın dışına konacak bir düğme
(`data-rc-part="toggle"`) sonraki sürümde.

## Görünüm

Bu dosyanın CSS'i yalnız mekaniği kurar: flex, kırpma, kayma. Boşluk, hız
dışındaki her şey Designer'ın. Detay:
[`docs/css-ownership.md`](../../../docs/css-ownership.md).
