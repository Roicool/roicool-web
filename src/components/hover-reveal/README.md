# hover-reveal

Fare üstüne gelince arkasındaki görseli açan kart. Görsel, işaretçinin
**girdiği kenardan** açılır (wipe), **çıktığı kenardan** kapanır; açılırken
hafif bir zoom'dan yerine oturur. Logo kartları, vaka kartları, ekip kartları —
üstünde bir şey duran, arkasında bir görsel saklayan her kart. Tek başına, bir
grid'de ya da bir `marquee` / `carousel`'in içinde çalışır.

## Designer'daki yapı

Kök, kartın kendisi (genelde Collection Item içindeki Link Block); tek parça
görsel:

```
Collection Item                                  ← attribute gerekmez
  Link Block            [data-rc="hover-reveal"] ← kart: boyut, radius, arka plan Designer'da
    Image (CMS)         [data-rc-part="media"]   ← açılan görsel; kökün doğrudan çocuğu
    Image (CMS)                                  ← logo; attribute gerekmez
    Text                                         ← "Hikâyeyi oku →"; attribute gerekmez
```

Designer'da ayarlanacaklar:

- **Link Block** → genişlik ve yükseklik (ör. `370px × 470px`), `border-radius`,
  arka plan rengi, içerik yerleşimi (flex column, `justify: space-between`).
  `position`, `overflow`, `z-index` verme; kod yönetiyor.
- **media** → hiçbir stil verme. Kod onu kartı dolduracak şekilde konumlar
  (`absolute`, `inset: 0`, `object-fit: cover`) ve kartın **altına** koyar
  (`z-index: -1`); logo ve metin kendiliğinden üstte kalır. `alt=""`
  (dekoratif; adı logo taşır), `loading="lazy"`.
- **media** bir `img` olabilir ya da içinde `img`/`video` olan bir div. Kökün
  doğrudan çocuğu olsun; araya `position: relative` verilmiş bir sarmalayıcı
  girerse görsel o sarmalayıcıya göre konumlanır.
- Görselin üstünde karartma istersen (logo okunsun diye) media'nın içine değil,
  ayrı bir div olarak kartın içine koy; kod ona dokunmaz.

Kod ne yapar: işaretçi karta girince giriş kenarını hesaplar, görseli o kenarın
arkasına katlar (`clip-path: inset()`), `data-rc-state="active"` basar; CSS
geçişi görseli açar. İşaretçi çıkınca çıkış kenarını hesaplar, `idle` basar;
görsel o kenardan kapanır. Kartın üstünde durum için özel CSS yazmak istersen
`[data-rc-state="active"]` seçicisi var (ör. metin rengi, ok kayması).

## Ayarlar (Link Block'ta)

| Attribute          | Değer         | Ne yapar                                   |
| ------------------ | ------------- | ------------------------------------------ |
| `data-rc-duration` | saniye, `0.6` | Açılma / kapanma süresi                    |
| `data-rc-zoom`     | `1.12`        | Görselin başladığı ölçek; `1` zoom'u kapar |
| `data-rc-effect`   | `fade`        | Yönlü wipe yerine düz cross-fade           |
| `data-rc-eager`    | —             | Görünüre girmeyi beklemeden yükle          |

Easing `--rc-hover-reveal-easing` değişkeni (varsayılan
`cubic-bezier(0.22, 1, 0.36, 1)`, expo-out benzeri); Designer'dan
değiştirilemez, gerekirse repo'da.

## Marquee içinde

Şerit hover'da yavaşlayıp durur (`data-rc-pause-on-hover`), altındaki kart
açılır. Marquee şeridi klonlar; klonun içindeki kartlar da aynı davranışı alır
(marquee kopyayı runtime'a yeniden taratır). Sürükleme başlayınca işaretçi
şeride geçer, kart kapanır; bırakınca altındaki kart yeniden açılır.

## JS yoksa, hareket azaltılmışsa

- **JS gelmezse:** `.rc-js` yok, görsel gizlenmez — kartın altında sabit durur.
  Logo ve metin üstte, içerik tam görünür.
- **`prefers-reduced-motion: reduce`:** kod aynı çalışır; `motion.css`
  geçişleri anlık yapar. Görsel hover'da anında açılır, anında kapanır.

## Erişilebilirlik

- Kart bir Link Block; link metni logo `alt`'ı + "Hikâyeyi oku" metninden
  oluşur. Logo `alt`'ı marka adı olsun, media `alt=""`.
- Klavyeyle odak (`:focus-visible`) görseli alttan açar; odak çıkınca kapanır.
  Fareyle basınca oluşan odak sayılmaz; işaretçi zaten kartın üstünde.
- Görsel `pointer-events: none`; tıklama her zaman linke gider.
- Marquee klonlarındaki kartlar `aria-hidden` ve `tabindex="-1"` (marquee
  ayarlar); ekran okuyucu ve klavye yalnız orijinalleri görür.
