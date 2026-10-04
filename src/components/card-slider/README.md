# card-slider

Collection List'i yana kayan bir kart satırına çeviren component: başlık,
önceki/sonraki düğmeleri ve satır. Kurumsal "Diğer kaynaklar", "İlgili
yazılar" bölümleri için. Satır tarayıcının kendi yatay kaydırmasıdır
(scroll snap): parmakla kayar, Tab odağı kartı görünüre getirir — kod
gelmeden de. Kod üstüne şunları ekler:

- **Düğmeler** bir sayfa (sığan tam kart sayısı kadar) ilerler/geri gider;
  uçta `aria-disabled="true"` olur, soluklaşır ve tıklanmaz.
- **Trackpad ve tekerlek:** yana kaydırma (iki parmak) ya da Shift + tekerlek
  satırı elle sürer, momentumu dahil; hareket bitince bir karta oturur.
  Dikey başlayan hareket sayfanındır, satıra dokunmaz. Hafif dikey açılan
  ama yana devam eden kaydırma da satıra geçer. Bu olaylar Lenis'e gitmez.
- **Fare ile tutup sürükleme:** bırakınca hızıyla savrulur, bir karta
  oturur. Sürüklemeden sonraki tıklama yutulur; sürüklemeyen basış tıklamadır.
- **Her hareket bir kartta biter**, ve kartın %12'sinden fazla giden hareket
  o yöndeki karta geçer: kısa bir geri kaydırma da geri götürür. Kayarken
  snap bekler, satır yerine varınca döner (yoksa tarayıcı ayrılan karta
  geri çekerdi).
- **Klavye** (odak satırdayken): ← → kart kart, Page Up / Page Down bir
  sayfa, Home / End uçlara; odak kartla gider, satır odağı izler. Odak
  düğmedeyken aynı tuşlar satırı kaydırır. Tab ile yarısı dışarıda bir
  karta gelince kart içeri alınır.
- **Yarısından çoğu görünmeyen karta tık** önce kartı içeri alır, ikinci tık
  linke gider (klavyeyle Enter her zaman linke gider).
- **Okunan yazının kartı** (linki bu sayfaya giden kart) satırdan çıkar:
  yazının altındaki "diğer kaynaklar" o yazıyı tekrar göstermez. Kart
  kalmazsa section gizlenir.
- **Kenar solması** (marquee'deki gibi): yalnız arkasında kart olan kenar
  solar. Başta sağ, ortada iki kenar, sonda sol. Solan kenar her zaman "bu
  yönde daha var" demektir; geçişi 0,35 sn.
- **İlerleme çizgisi** (isteğe bağlı `progress` parçası): satırın görünen
  payı kadar bir dolgu, satır kaydıkça ilerler.

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
    (isteğe bağlı) Div [data-rc-part="progress"] aria-hidden="true"   ← ilerleme çizgisi
```

- `track` yazılmazsa kod kökün içindeki `.w-dyn-items`'ı bulup attribute'u
  kendisi basar; yine de yaz.
- **List'e** `display`, `overflow`, `flex-wrap` verme (kod: tek satır, yatay
  kaydırma, snap, gizli scrollbar). `gap` verebilirsin; vermezsen aşağıdaki
  varsayılan.
- **Item'a** genişlik vermezsen varsayılan: telefonda 1.15 kart (sonraki
  kartın ucu görünür), 768 px'ten 2.15, 992 px'ten 3 (tam genişlikte
  dördüncü kart container'ın dışında görünür). Designer'da Item
  class'ına genişlik verirsen o kazanır. Kart sayısını değiştirmenin kolay
  yolu: kökte `--rc-card-slider-per-view` (site custom code'unda `<style>`).
- Düğmeler gerçek `<button>` (DOM element, tag `button`); site `button-round`
  class'ı uygun. `aria-disabled` kodundur, elle yazma.
- Kart görselleri kartın genişliğini doldurur (`width: 100%`, sıfır
  specificity); 16:9 görsel 16:9 kutuda tam oturur.
- `progress`: boş Div. Varsayılan 2px yükseklik, `currentColor`'ın %15'i
  zemin, dolgu `currentColor`; Designer'da yükseklik, renk (`color` dolgu,
  arka plan zemin), radius, üst boşluk verilebilir. Kod
  `--rc-card-slider-progress` ve `--rc-card-slider-visible` (0–1) yazar.
  Bütün kartlar sığınca görünmez.
- Kartın içi serbest: görsel, kategori, başlık, özet. Görsele hover büyütme
  Designer'da (görsel class'ının Hover durumu).

## Ayarlar (kökte)

| Attribute       | Değer                   | Ne                                                                                                                                                                                                                                                                                                                  |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-rc-fade`  | uzunluk ya da `%`, `10` | Kenar solmasının genişliği; varsayılan `min(10%, 7rem)`; `0` kapatır                                                                                                                                                                                                                                                |
| `data-rc-bleed` | —                       | Tam genişlik: satır viewport'un iki kenarına taşar, ilk kart container'ın kenarından başlar ve her kart oraya oturur; container yalnız başlangıç çizgisi. Kart genişlikleri yine container'a göre. Solma bu modda container dışındaki boşlukta kalır (`clamp(1.5rem, boşluk, 7rem)`), içerideki kartlar tam görünür |
| `data-rc-eager` | —                       | Görünüre girmeyi beklemeden yükle                                                                                                                                                                                                                                                                                   |

CSS değişkenleri (kökte, sıfır specificity'de varsayılanlar):
`--rc-card-slider-per-view`, `--rc-card-slider-gap`, `--rc-card-slider-fade`.

## Durumlar

- Kök: `start` (başta), `middle`, `end` (sonda), `static` (bütün kartlar
  sığıyor; solma yok, düğmeler görünmez ama yerini tutar), `empty` (okunan
  yazının kartı çıkınca hiç kart kalmadı; kök — bütün section — gizlenir).
- `track`: fareyle sürüklenirken `dragging` (imleç kapanır), trackpad /
  tekerlekle kayarken `wheeling`, bir karta doğru süzülürken `settling`;
  üçünde de snap bekler.

## JS yoksa, hareket azaltılmışsa

- **JS yoksa:** satır yine yatay kayar ve snap eder; solma yok; düğmeler
  görünmez (yer tutar, düzen kaymaz). İçerik ve linkler tam.
- **Reduced motion:** düğme ve sürükleme anında konumlanır, kaydırma animasyonu
  yok; solma geçişi kalır (hareket değil, saydamlık).

## Erişilebilirlik

- Düğmelerde `aria-label`; ok karakteri `aria-hidden="true"`.
- Uçtaki düğme `aria-disabled="true"`; odakta kalır, tıklama bir şey yapmaz.
- Düğmelerde `aria-controls` satırın id'si (yoksa kod verir).
- Kartlar gerçek link; Tab sırası satır sırası, odaklanan kart görünüre kayar.
  Ok tuşları satırın içinde kartlar arasında gezdirir.
- Yatay tekerlek ve trackpad satıra gider, dikey olan sayfaya.
- `progress` görsel bir göstergedir, `aria-hidden="true"`.
