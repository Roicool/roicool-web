# card-stack

Alt alta kartlar (her biri bir hizmet alanı: başlık, açıklama, etiketler,
görsel); sayfa kaydıkça sütun yapışır, her kart öncekilerin **başlık
şeridinin** altına kayıp istiflenir: geçilen kartın yalnız başlığı görünür
kalır, en yeni kart tam okunur. Home'da `section__services-stack`. Kaynak:
riseatseven.com/services "Our Services".

**Kaynaktan farkları:**

- **Çok kartta okunabilirlik:** riseatseven bütün başlıkları biriktirir; 8
  kartta 7 başlık viewport'un yarısından fazlasını yer, okunan kart ekranın
  altına iner. Burada yığında en fazla `data-rc-visible` başlık (3) kalır;
  yeni kart gelirken en eski başlık pencerenin üst kenarından çıkar, okunan
  kart hep aynı derinlikte başlar. Pencere viewport'a sığmıyorsa kod sınırı
  kendisi düşürür; hiç sığmıyorsa pinlemez, sütun düz kalır.
- **Okuma payı:** kart yerine oturunca sütun `data-rc-hold` piksel (200)
  durur, sonraki kart ondan sonra gelir; yığın kaydırmayla yarışmaz.
- **Kapanan kartta görsel yok:** görsel kaynaktaki gibi başlıkla aynı
  hizada sağda başlar; geçilen kartın (`stacked`) `visual` parçası 0,3 s'de
  söner, şeritte yalnız başlık kalır.

**SEO/GEO:** her kartın metni ve etiket linkleri HTML'de; kod hiçbir şey
üretmez ya da gizlemez, geçilen kartların gövdesi yalnız görsel olarak
sonraki kartın altında kalır.

**Erişilebilirlik:** kartlar link değil; içlerindeki etiketler linktir.
Görünür klavye odağı alan etiketin kartı okuma konumuna getirilir (yarım
örtülü kart okunmaz). Reduced motion'da ve 992 px altında yapışma yok, düz
liste.

## Designer'daki yapı

Kartlar **statik** (Designer'da elle, 8 tane); her kartın etiketleri bir
Collection List'ten gelir (koleksiyon `Hizmet etiketleri`: Name, Hizmet
referansı, Sıra; liste Hizmet = o kartın hizmeti diye filtrelenir, Sıra
artan). Kart başına bir Collection List: Home'da liste sayısı 20'yi
geçmesin (Webflow sınırı).

Yerleşim kaynaktaki gibi (riseatseven `services.css`): kart 12 kolonlu
grid; solda 8 kolonluk içerik sütunu (flex column, `justify-between`:
başlık üstte, açıklama + etiketler kartın altında yan yana), sağda 4
kolonluk kare görsel; kartın yüksekliğini görsel belirler.

```
Section                    [data-rc="card-stack"]   ← kök, 100vw (container yok, yan padding kartta)
  H2                                                 yan padding (view-px)
  Div                      [data-rc-part="body"]    ← kayma mesafesini taşır; stil verme, kod yükseklik yazar
    Div                    [data-rc-part="stack"]   ← yapışan pencere; stil verme, kod yükseklik + sticky + clip
      Div                                            liste
        Div                [data-rc-part="card"]    ← kart: grid 12 kolon, OPAK arka plan, alt border, yan padding
          Div                                        sol (8 kolon): flex column, items-start, justify-between
            Div            [data-rc-part="heading"] ← başlık şeridi: üst + alt padding, H3
              H3
            Div                                      meta: flex row, items-start, gap, alt padding
              Paragraph                              açıklama (max-width ~36rem)
              Collection List Wrapper                etiketler (filtre: Hizmet = bu kart)
                Collection List                      flex, wrap, gap
                  Collection Item
                    Text Link                        etiket: chip (border, radius, padding) → hizmet sayfası
          Div              [data-rc-part="visual"]  ← sağ (4 kolon): kare, radius, overflow hidden, dikey margin
            Image                                    alt dolu, cover
        × 8
```

Designer'da ayarlanacaklar:

- **card** → arka plan **opak** (`bg-neutral-0` gibi): geçilen kartın
  gövdesini sonraki kart örter, saydam kartta altı görünür.
  `border-bottom` şeritleri ayırır. `position` verme (kod `relative`).
- **heading** → kartın üstünden bu kutunun altına kadar olan yükseklik
  yığında kalan şerittir; üst padding'i karta değil buraya ver.
- **visual** → `opacity` verme; geçilen kartta kod söndürür. Görselin üst
  kenarı başlıkla hizalı olduğu için şeride girer; bu yüzden sönüyor.
- **açıklama** → `max-width` ver (kaynakta 36rem); yoksa satır etiketleri
  sıkıştırır.
- **body**, **stack** → yükseklik, `position`, `overflow` verme; kod
  yazar. Sütunun ve üstlerinin hiçbirinde `overflow: hidden` olmasın
  (Sticky kuralı).
- Dar ekran: kart ve meta `mob-flex-col`; görsel `hide-mobile`
  (kaynakta da mobilde görsel yok).
- Sabit header varsa `data-rc-top` = header yüksekliği (px).
- **Görsel** statik karta CMS'ten bağlanamaz; dosya Assets'te olmalı, Image
  oradan seçilir (alt metni dolu).
- **Etiket linki**: Text Link'in Link ayarı → Collection page → `Hizmet` ›
  hizmet sayfası. Etiket koleksiyonunun kendi şablon sayfası boş kalır;
  Site Settings › Redirects'te `/hizmet-etiketleri/(.*)` → `/hizmetler`
  yönlendirmesi ekle ki boş sayfa indekslenmesin.

## Ayarlar (kökte)

| Attribute           | Değer     | Ne yapar                                                            |
| ------------------- | --------- | ------------------------------------------------------------------- |
| `data-rc-visible`   | sayı, `3` | Okunan kartın üstünde tutulan başlık sayısı; `0` yalnız okunan kart |
| `data-rc-hold`      | px, `200` | Kart oturunca sütunun durduğu kaydırma; `0` durmadan (kaynaktaki)   |
| `data-rc-top`       | px, `0`   | Pencerenin yapıştığı yükseklik (sabit header için)                  |
| `data-rc-min-width` | px, `992` | Bunun altında yapışma yok                                           |
| `data-rc-eager`     | —         | Görünüre girmeyi beklemeden yükle                                   |

## Hareket

- Pencere = yapışan `stack`; yüksekliği "en fazla `visible` şerit + en uzun
  kart" (viewport'a sığacak şekilde), `body` yüksekliği = pencere + son
  kartın yolu + her kartın `hold` payı.
- Kaydırma 1:1: her kart pencerede sayfayla birlikte yukarı gider, kendi
  yuvasına (öncekilerin şeritlerinin altı) gelince durur, sütun `hold`
  kadar bekler; sonraki kart gelirken yığın bir şerit yukarı kayar ve en
  eskisi kırpılır.
- Durumlar: geçilen kart `data-rc-state="stacked"`, okunan `active`,
  gelen `entering`; kök `stacking` ya da `static`.
- Reduced motion, 992 px altı, sığmayan pencere: kök `static`, sütun düz.
  JS yok: düz sütun.

## Bağımlılık

Yok.
