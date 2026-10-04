# card-slider

Collection List'i yana kayan bir kart satırına çeviren component: başlık,
önceki/sonraki düğmeleri ve satır. Kurumsal "Diğer kaynaklar", "İlgili
yazılar" bölümleri için. Satır tarayıcının kendi yatay kaydırmasıdır
(scroll snap): parmakla kayar, trackpad ile kayar, Tab odağı kartı görünüre
getirir — kod gelmeden de. Kod üstüne şunları ekler:

- **Düğmeler** bir sayfa (sığan tam kart sayısı kadar) ilerler/geri gider;
  uçta `aria-disabled="true"` olur, soluklaşır ve tıklanmaz.
- **Fare ile tutup sürükleme:** bırakınca hızıyla savrulur, en yakın karta
  oturur. Sürüklemeden sonraki tıklama yutulur; sürüklemeyen basış tıklamadır.
- **Okunan yazının kartı** (linki bu sayfaya giden kart) satırdan çıkar: yazının altındaki "diğer kaynaklar" o yazıyı tekrar göstermez.
- **Kenar solması** (marquee'deki gibi): yalnız arkasında kart olan kenar
  solar. Başta sağ, ortada iki kenar, sonda sol. Solan kenar her zaman "bu
  yönde daha var" demektir; geçişi 0,35 sn.

Klon yok, transform yok: kartlar ve linkleri tarayıcının koyduğu yerde.

## Designer'daki yapı

```
Section            [data-rc="card-slider"]                 ← kök (role/aria-label gerekmez; H2 bölümü adlandırır)
  Div container
    Div başlık satırı (flex, space-between, align-items: end)
      H2 "Diğer kaynaklar"
      Div düğmeler (flex, gap)
        DOM button [data-rc-part="previous"] aria-label="Önceki"   ← içinde Text "←" aria-hidden="true"
        DOM button [data-rc-part="next"]     aria-label="Sonraki"  ← içinde Text "→" aria-hidden="true"
    Collection List Wrapper
      Collection List   [data-rc-part="track"]             ← kayan satır
        Collection Item                                    ← kart genişliği buradan (aşağı bak)
          Link Block (kart)
```

- `track` yazılmazsa kod kökün içindeki `.w-dyn-items`'ı bulup attribute'u
  kendisi basar; yine de yaz.
- **List'e** `display`, `overflow`, `flex-wrap` verme (kod: tek satır, yatay
  kaydırma, snap, gizli scrollbar). `gap` verebilirsin; vermezsen aşağıdaki
  varsayılan.
- **Item'a** genişlik vermezsen varsayılan: telefonda 1.15 kart (sonraki
  kartın ucu görünür), 768 px'ten 2.2, 992 px'ten 3.25. Designer'da Item
  class'ına genişlik verirsen o kazanır. Kart sayısını değiştirmenin kolay
  yolu: kökte `--rc-card-slider-per-view` (site custom code'unda `<style>`).
- Düğmeler gerçek `<button>` (DOM element, tag `button`); site `button-round`
  class'ı uygun. `aria-disabled` kodundur, elle yazma.
- Kartın içi serbest: görsel, kategori, başlık, özet. Görsele hover büyütme
  Designer'da (görsel class'ının Hover durumu).

## Ayarlar (kökte)

| Attribute       | Değer                   | Ne                                                                   |
| --------------- | ----------------------- | -------------------------------------------------------------------- |
| `data-rc-fade`  | uzunluk ya da `%`, `10` | Kenar solmasının genişliği; varsayılan `min(10%, 7rem)`; `0` kapatır |
| `data-rc-eager` | —                       | Görünüre girmeyi beklemeden yükle                                    |

CSS değişkenleri (kökte, sıfır specificity'de varsayılanlar):
`--rc-card-slider-per-view`, `--rc-card-slider-gap`, `--rc-card-slider-fade`.

## Durumlar

- Kök: `start` (başta), `middle`, `end` (sonda), `static` (bütün kartlar
  sığıyor; solma yok, düğmeler görünmez ama yerini tutar), `empty` (okunan
  yazının kartı çıkınca hiç kart kalmadı; kök — bütün section — gizlenir).
- `track`: fareyle sürüklenirken `dragging` (snap bekler, imleç kapanır).

## JS yoksa, hareket azaltılmışsa

- **JS yoksa:** satır yine yatay kayar ve snap eder; solma yok; düğmeler
  görünmez (yer tutar, düzen kaymaz). İçerik ve linkler tam.
- **Reduced motion:** düğme ve sürükleme anında konumlanır, kaydırma animasyonu
  yok; solma geçişi kalır (hareket değil, saydamlık).

## Erişilebilirlik

- Düğmelerde `aria-label`; ok karakteri `aria-hidden="true"`.
- Uçtaki düğme `aria-disabled="true"`; odakta kalır, tıklama bir şey yapmaz.
- Kartlar gerçek link; Tab sırası satır sırası, odaklanan kart görünüre kayar.
- Yatay tekerlek ve trackpad satıra gider (`data-lenis-prevent-horizontal`
  kodda), dikey olan sayfaya.
