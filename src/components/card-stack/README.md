# card-stack

Alt alta kartlar (her biri bir hizmet: başlık, bir iki satır, görsel);
sayfa kaydıkça sütun yapışır, her kart öncekilerin **başlık şeridinin**
altına kayıp istiflenir: geçilen kartın yalnız başlığı görünür kalır, en
yeni kart tam okunur. Home'da `section__services-stack` (Hizmetler
koleksiyonu). Kaynak: riseatseven.com/services "Our Services".

**Kaynaktan farkı — çok kartta okunabilirlik:** riseatseven bütün
başlıkları biriktirir; 8 kartta 7 başlık viewport'un yarısından fazlasını
yer, okunan kart ekranın altına iner. Burada yığında en fazla
`data-rc-visible` başlık (3) kalır; yeni kart gelirken en eski başlık
pencerenin üst kenarından çıkar, okunan kart hep aynı derinlikte başlar.
Pencere viewport'a sığmıyorsa kod sınırı kendisi düşürür; hiç sığmıyorsa
pinlemez, sütun düz kalır.

**SEO/GEO:** her kartın metni HTML'de, kod hiçbir şey üretmez ya da
gizlemez; geçilen kartların gövdesi yalnız görsel olarak sonraki kartın
altında kalır.

**Erişilebilirlik:** kartlar Link Block; görünür klavye odağı alan kart
okuma konumuna getirilir (yarım örtülü kart okunmaz). Reduced motion'da ve
992 px altında yapışma yok, düz liste.

## Designer'daki yapı

```
Section                         [data-rc="card-stack"]   ← kök (+ ayarlar)
  Container
    H2                          (başlık, serbest)
    Div                         [data-rc-part="body"]    ← kayma mesafesini taşır; stil verme, kod yükseklik yazar
      Collection List Wrapper   [data-rc-part="stack"]   ← yapışan pencere; stil verme, kod yükseklik + sticky + clip
        Collection List                                  (düz sütun; gap serbest)
          Collection Item                                (attribute yok)
            Link Block          [data-rc-part="card"]    ← kart: hizmet sayfasına; grid 2 kolon, OPAK arka plan, alt border
              Div                                        sol: flex column, justify-between
                Div             [data-rc-part="heading"] ← başlık şeridi: görünür kalan kısım (üst padding + H3 + alt padding)
                  H3            Name
                Div                                      Paragraph Özet + Text Kısa açıklama
              Div                                        sağ: görsel kutusu (aspect-ratio, radius, overflow hidden)
                Image           Görsel (alt CMS'ten), cover
```

Designer'da ayarlanacaklar:

- **card** → arka plan **opak** olsun (`bg-neutral-50` gibi): geçilen
  kartın gövdesini sonraki kart örter, saydam kartta altı görünür.
  `border-bottom` şeritleri ayırır. `position` verme (kod `relative`).
- **heading** → kartın üstünden bu kutunun altına kadar olan yükseklik
  yığında kalan şerittir; üst padding'i karta değil buraya ver ki şerit
  başlığı tam kapsasın.
- **body**, **stack** → yükseklik, `position`, `overflow` verme; kod
  yazar. Sütunun ve üstlerinin hiçbirinde `overflow: hidden` olmasın
  (Sticky kuralı).
- Dar ekran: kart `mob-flex-col`; görsel istenmiyorsa o breakpoint'te
  Display: None.
- Sabit header varsa `data-rc-top` = header yüksekliği (px).

## Ayarlar (kökte)

| Attribute           | Değer     | Ne yapar                                                            |
| ------------------- | --------- | ------------------------------------------------------------------- |
| `data-rc-visible`   | sayı, `3` | Okunan kartın üstünde tutulan başlık sayısı; `0` yalnız okunan kart |
| `data-rc-top`       | px, `0`   | Pencerenin yapıştığı yükseklik (sabit header için)                  |
| `data-rc-min-width` | px, `992` | Bunun altında yapışma yok                                           |
| `data-rc-eager`     | —         | Görünüre girmeyi beklemeden yükle                                   |

## Hareket

- Pencere = yapışan Wrapper; yüksekliği "en fazla `visible` şerit + en
  uzun kart" (viewport'a sığacak şekilde), `body` yüksekliği = pencere +
  son kartın kat ettiği yol.
- Kaydırma 1:1: her kart pencerede sayfayla birlikte yukarı gider, kendi
  yuvasına (öncekilerin şeritlerinin altı) gelince durur; sonraki kart
  gelirken yığın bir şerit yukarı kayar ve en eskisi kırpılır.
- Durumlar: geçilen kart `data-rc-state="stacked"`, okunan `active`,
  gelen `entering`; kök `stacking` ya da `static`.
- Reduced motion, 992 px altı, sığmayan pencere: kök `static`, sütun düz.
  JS yok: düz sütun.

## Bağımlılık

Yok.
