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

`track` attribute'u yazılmazsa kod Webflow'un `.w-dyn-items` sınıfını kullanır;
yani wrapper'a tek attribute yeterli. Yine de `track`'i yazmak tercih edilir —
Webflow sınıf adı değişirse kod etkilenmez.

Designer'da ayarlanacaklar:

- **Collection List** → Display: Flex, yatay, `gap` istediğin aralık. Item
  genişlikleri serbest, yükseklik eşit olsun (logolar için `height` sabit,
  `width: auto`).
- **Wrapper** → `column-gap`, List'teki gap ile **aynı** olmalı. Kod, döngü
  mesafesine bu gap'i katar; farklıysa şeridin birleşme noktasında boşluk
  görünür.
- Wrapper'a genişlik verme; sayfa genişliğinde durur ve taşanı kırpar.

Kod ne yapar: List'i bir kez klonlar (`aria-hidden`, odaklanamaz), Wrapper'ın
içine ekler, genişliği ölçer, hızdan süreyi hesaplar, `data-rc-state="running"`
basar. Görseller yüklendikçe yeniden ölçer.

## Ayarlar (Wrapper'da)

| Attribute                | Değer            | Ne yapar                                        |
| ------------------------ | ---------------- | ----------------------------------------------- |
| `data-rc-speed`          | px/saniye, `70`  | Kayma hızı. Site genelinde aynı tut             |
| `data-rc-direction`      | `left` / `right` | Yön. Varsayılan sola                            |
| `data-rc-pause-on-hover` | —                | Fare üstündeyken durur (yalnız pointer:fine'da) |
| `data-rc-eager`          | —                | Görünüre girmeyi beklemeden yükle               |

Süre otomatik: `mesafe ÷ hız`. 1500px'lik bir şerit 70 px/s'de ~21 saniyede
döner — Square'in ölçtüğü değer.

## JS yoksa, hareket azaltılmışsa

- **JS gelmezse:** hiçbir kural devreye girmez, liste Designer'daki haliyle
  durur. İçerik tam görünür.
- **`prefers-reduced-motion: reduce`:** kod hiçbir şey yapmaz — klon yok,
  animasyon yok. Liste düz bir satır olarak kalır.

## Erişilebilirlik

- Klon `aria-hidden="true"`; içindeki linkler `tabindex="-1"`. Ekran okuyucu
  ve klavye yalnız orijinal listeyi görür.
- Şeridin içindeki bir link odak alınca şerit **durur** (`:focus-within`) —
  klavye kullanıcısı hareket eden hedefi kovalamaz.
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
