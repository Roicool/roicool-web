# horizontal-scroll

Sayfa aşağı kaydıkça yana kayan kart satırı: section, satırın geçmesi kadar
sabitlenir (pin), sonra bırakır. Vaka kartları, ürün kartları, adımlar — bir
ekrana sığmayan ama tek satırda durması istenen her CMS listesi.

## Designer'daki yapı

```
Section                        [data-rc="horizontal-scroll"]   ← kök; padding verilebilir
  Div (tam genişlik)           [data-rc-part="stage"]          ← pinlenen blok: başlık + liste + (marquee)
    Container                                                  ← başlık satırı
    Collection List Wrapper                                    ← attribute gerekmez; container'ın içinde olabilir
      Collection List          [data-rc-part="track"]          ← flex yatay, gap
        Collection Item                                        ← kart (Link Block, görsel, başlık)
```

`track` yazılmazsa kod Webflow'un `.w-dyn-items` sınıfını kullanır; yine de
yazmak tercih edilir.

Designer'da ayarlanacaklar:

- **stage** → section'ın tam genişliğinde dursun (container'ın dışında);
  Display: Flex, Column, `justify-content: center`, dikey padding. Yükseklik
  verme; pinliyken kod `100svh` verir. Satır container'dan taşar, stage
  onu viewport kenarında kırpar.
- **Collection List** → Display: Flex, Row, gap. Wrap verme; kod `nowrap`
  yapar.
- **Item** → sabit genişlik (ör. `clamp(16rem, 20vw, 28rem)`), yükseklik
  aspect-ratio ile. Hover'daki görsel zoom'u Designer'ın hover state'i ile
  ver (görsel class'ında Hover → scale 1.05, transition).
- **Mobil** → 768 px altında kod hiç pinlemez (`data-rc-min-width` ile
  değişir). Designer'da iki seçenek: Collection List'i Column yap, kartlar
  alt alta durur (öneri); ya da Row bırak, satır parmakla kaydırılan yerel
  bir şerit olur (snap'li, scrollbar gizli). İkisi de scroll'u ele geçirmez.
- Kökün üst elemanlarında `transform`, `filter`, `perspective` olmasın (pin
  kuralı, hero ile aynı).

Kod ne yapar: satırın viewport'tan taşan mesafesini ölçer (başlangıçtaki iç
boşluk sonda da bırakılır), stage'i ScrollTrigger ile o mesafe kadar pinler
(spacer section'ı büyütür), satırı scroll ile `translateX` ile sürer.
`data-rc-state="pinned"` basar; sığıyorsa `static`.

## Ayarlar (kökte)

| Attribute           | Değer               | Ne yapar                                               |
| ------------------- | ------------------- | ------------------------------------------------------ |
| `data-rc-top`       | px, `0`             | Sabit header için üstten boşluk; stage o kadar kısalır |
| `data-rc-inset`     | px, başlangıç kadar | Satırın sonunda bırakılan boşluk; yoksa baştaki kadar  |
| `data-rc-min-width` | px, `768`           | Bu genişliğin altında pin yok, satır düz şerit         |
| `data-rc-eager`     | —                   | Görünüre girmeyi beklemeden yükle                      |

## Hareket

- Scrub: satır sayfa kaydığı kadar kayar, easing yok; yumuşaklık Lenis'ten.
- Pin: hero ile aynı ScrollTrigger; Lenis'e bağlı, `ignoreMobileResize`.
- Yeniden ölçüm: görseller gelince, pencere değişince pin yeniden kurulur
  (150 ms bekleme). Mesafe sıfıra düşerse pin kalkar, çıkarsa geri gelir.

## JS yoksa, hareket azaltılmışsa

- **JS gelmezse:** satır yatay kaydırılabilir düz bir şerit (`overflow-x:
auto`, snap, scrollbar gizli). İçerik tam görünür.
- **`prefers-reduced-motion: reduce`** ya da GSAP gelmezse: aynı şerit;
  pin yok, kod `static` basar.

## Erişilebilirlik

- Kartlar DOM sırasında; Tab ile gezilir. Görünmeyen bir kart odak alınca
  kod sayfayı o kartı gösteren scroll konumuna taşır (Lenis ile yumuşak).
- Kart bir Link Block olsun; görsel `alt` CMS'ten, başlık link metninde.
- Pinli kaydırma: 5 kart için yaklaşık 2 ekran boyu dikey scroll. Kart
  sayısını ve genişliğini buna göre tut.
- Section'ın başlığı stage'in içinde; ekran okuyucu için sıra doğal.
