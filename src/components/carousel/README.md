# carousel

Webflow Collection List'i sonsuz döngülü, tutulup sürüklenen kart şeridine
çeviren component. Bir kart ortada, komşuları iki yandan görünür (peek);
belirli aralıkla bir sonrakine geçer. Ok yok: fare/parmakla sürüklenir,
trackpad'de yatay kaydırılır, klavyede odakla gezilir. Ödül kartları, vaka
kartları, referanslar — kartları farklı oranlarda olabilen her yatay liste.

## Designer'daki yapı

Collection List'in kendi üç katmanı, araya hiçbir şey eklenmeden:

```
Collection List Wrapper   [data-rc="carousel"]       ← tam genişlik (section'ın doğrudan çocuğu)
  Collection List         [data-rc-part="track"]     ← flex yatay, gap, align-items: flex-start
    Collection Item                                  ← attribute gerekmez; içinde görsel + metin
```

`track` attribute'u bu component'te **zorunlu** (CSS ona bağlı).

Designer'da ayarlanacaklar:

- **Item** → sabit genişlik (`clamp(280px, 82vw, 535px)` gibi; masaüstünde
  3 kart + iki yanda peek, telefonda 1 kart + ince peek verir). Yükseklik
  verme: görsel doğal oranında (`width: 100%; height: auto`) gelsin, 1:1 kart
  ile 4:3 kart kendiliğinden farklı yükseklikte olur.
- **List** → Display: Flex, yatay, `gap`, `align-items: flex-start` (kartlar
  üstten hizalı, ekran görüntüsündeki gibi). Wrap yok.
- **Wrapper** → section'ın tam genişliğinde dursun; container'ın içine koymak
  zorundaysan `data-rc-bleed` attribute'u onu viewport kenarlarına çeker.
  Genişlik, `overflow`, `cursor` verme; kod yönetiyor.

Kod ne yapar: kartları ölçer, şerit ekranı rahatça kaplayana kadar item'ları
klonlar (`aria-hidden`, odaklanamaz; içlerindeki component'ler klonda da
çalışır), ilk kartı ortalar, her kartı transform ile taşır ve bir kenardan
çıkanı öbür kenara sarar. `data-rc-state="running"`
basar; ortadaki karta (ve klonlarına) `data-rc-active` yazar — özel CSS'te
`[data-rc-active]` ile aktif kartı öne çıkarabilirsin.

## Ayarlar (Wrapper'da)

| Attribute          | Değer         | Ne yapar                                        |
| ------------------ | ------------- | ----------------------------------------------- |
| `data-rc-interval` | saniye, `4`   | İki otomatik geçiş arası                        |
| `data-rc-duration` | saniye, `0.8` | Bir geçişin süresi                              |
| `data-rc-autoplay` | `false`       | Otomatik geçişi kapatır; yoksa açık             |
| `data-rc-bleed`    | —             | Container içindeyken viewport kenarlarına taşır |
| `data-rc-eager`    | —             | Görünüre girmeyi beklemeden yükle               |

## Hareket

- **Otomatik:** her `interval`'da bir sonraki kart ortaya gelir (`duration`,
  cubic ease-out). Fare üstündeyken, içeride klavye odağı varken, basılıyken
  ve sekme gizliyken durur; sebep kalkınca sürer.
- **Sürükleme:** basınca durur, işaretçi kadar kayar, bırakınca hızın
  250 ms'lik payı kadar süzülüp en yakın karta oturur. 4px altı basış
  tıklamadır; sürükleme sonrası ilk tıklama yutulur. Dokunmatikte yatay
  hareket şeride, dikey sayfaya (`touch-action: pan-y`).
- **Trackpad / yatay tekerlek:** şerit parmakla gider, jest bitince 120 ms
  içinde en yakın karta oturur. Dikey tekerlek sayfada kalır (Lenis).
- **Klavye:** bir kartın içindeki link odak alınca o kart ortaya gelir.

Mekanik: tek bir "offset" sayısı (px) şeridin ne kadar sola kaydığını tutar;
her kare her kart `positions[i] − offset` konumuna, bir döngü uzunluğuna
katlanarak yazılır. Hiçbir kütüphane yok; GSAP indirilmez.

## JS yoksa, hareket azaltılmışsa

- **JS gelmezse:** Wrapper yatay kaydırılabilir düz bir satır olur
  (`overflow-x: auto`, `scroll-snap` ile her kart ortaya oturur, scrollbar
  gizli). İçerik tam görünür.
- **`prefers-reduced-motion: reduce`:** kod hiçbir şey yapmaz; yukarıdaki
  satır aynen kalır. Klon yok, otomatik geçiş yok.

JS ilk kartı ortalarken şerit bir kez sola/sağa kayar (JS'siz satır soldan
başlar). Component genelde ekranın altındadır; görünürde yakalanırsa küçük bir
düzen kayması sayılır. `data-rc-eager` bunu erkene çeker.

## Erişilebilirlik

- Klonlar `aria-hidden="true"`, içlerindeki linkler `tabindex="-1"`; ekran
  okuyucu ve klavye yalnız orijinal kartları görür.
- Wrapper'a Designer'da `role="region"` ve açıklayıcı `aria-label`
  ("Ödüller" gibi); istenirse `aria-roledescription="carousel"`.
- Kart görsellerinde anlamlı `alt`; kart linkleri tam metin taşısın.
- Sürükleme yalnız işaretçi içindir; klavye için gerekmez, odak ortalar.

**Açık konu — WCAG 2.2.2:** 5 saniyeden uzun otomatik hareketin görünür bir
durdurma kontrolü olmalı. Hover ve odak duraklatması bunun bir kısmı; marquee
ile birlikte ele alınacak ortak `data-rc-part="toggle"` düğmesi sonraki sürümde.
