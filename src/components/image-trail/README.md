# image-trail

İmleci kovalayan görsel yığını: öndeki kart fareyi izler, arkadakiler bir
öncekini; fare gezdikçe yığın kuyruk gibi açılır, durunca toplanır. Sayfa
sonundaki CTA section'ı için düşünüldü; içerik (başlık, buton) kartların
üstünde durur, kartlar tıklamayı engellemez. Kaynak: flowninja.com CTA.

## Designer'daki yapı

Statik; CMS yok. Kart sayısı 3–5.

```
Section                     [data-rc="image-trail"]          ← kök; imleç bu alanda izlenir
  Div                       [data-rc-part="trail"]           ← katman; kod: absolute, inset 0, clip
    Div                     [data-rc-part="item"]            ← kart yuvası ×5; kod konumlar
      Div                                                    ← kart: boyut, radius, gölge (Designer)
        Image  loading="lazy" alt=""                         ← cover (Designer)
  Container                                                  ← içerik: başlık, metin, buton
```

`trail` section'ın **ilk çocuğu** olsun: DOM sırası gereği içerik onun
üstüne boyanır, z-index gerekmez. Kart yuvasına boyut verme; boyutu içindeki
kart taşır, kod yuvayı kartın merkezinden konumlar.

Designer'da ayarlanacaklar:

- **Kart** → sabit kare (ör. `8.8125rem`), `border-radius`, `overflow: clip`;
  görsel `object-fit: cover`, `width/height: 100%`.
- **Görsel** → `loading="lazy"`, `alt=""` (dekoratif). Mobilde katman
  gizlenirse lazy görsel indirilmez.
- **Yükseklik** → section'a dikey padding ya da `min-height` (ör. `70svh`,
  flex column, justify center); sabit `height` verme. Katman section'ın
  kutusunu padding dahil kaplar, imleç alanı da odur: section ne kadar
  büyükse kuyruk o kadar yer gezer.
- **Mobil** → 992 px altında kod çalışmaz (`static`); kartlar CSS'teki sabit
  yelpazede durur. İstenmiyorsa katmanı tablet breakpoint'inde Display: None
  yap.
- Section'ın üst elemanlarında transform olması sorun değil; pin yok.

## Ayarlar (kökte)

| Attribute           | Değer     | Ne yapar                                               |
| ------------------- | --------- | ------------------------------------------------------ |
| `data-rc-lead`      | `0.25`    | Öndeki kartın her karede kapattığı mesafe payı         |
| `data-rc-follow`    | `0.16`    | Arkadaki kartların payı; küçüldükçe kuyruk uzar        |
| `data-rc-min-width` | px, `992` | Bu genişliğin altında efekt kapalı                     |
| `data-rc-eager`     | —         | Görünüre girmeyi beklemeden yükle (gerekmez, en altta) |

## Hareket

- Konum: her karede `state += (hedef − state) × pay` (lerp). Kod konumu
  `translate` özelliğiyle yazar, `transform`'a dokunmaz; açılış geçişi
  `scale` ve `clip-path` üstünden CSS'te, ikisi çakışmaz.
- Açılış: imleç section'a girince kök `active`; kartlar `scale .5 → 1`,
  `clip-path inset(50%) → 0`, 0.8 s `cubic-bezier(.87,0,.13,1)`. Çıkınca
  `idle`, aynı geçişle kapanır. Yığın ilk ziyarette section'ın ortasından
  imlece uçar.
- İçeri/dışarı kararı enter/leave olayından değil, son imleç konumunun
  section kutusuna göre yerinden verilir: imleç dururken sayfa kayınca da
  doğru çalışır.
- Döngü yalnız bir kart yoldayken döner; hedefe oturunca durur. İmleç
  dinleyicileri yalnız section ekrandayken takılı.
- Sıralama: öndeki kart en üstte (z-index kod verir).

## JS yoksa, hareket azaltılmışsa

- **JS gelmezse:** gizleyen kural `.rc-js`'e bağlı; kartlar CSS'teki sabit
  yelpazede görünür (kenarlarda beş nokta, orta boş).
- **`prefers-reduced-motion: reduce`, dokunmatik cihaz, 992 px altı:** kod
  `static` basar, aynı yelpaze. Tercih değişirse kod açılır ya da kapanır.
- **`rc.js` gelir, chunk henüz gelmemişse:** kartlar gizli bekler (hover-reveal
  ile aynı yaklaşım); section görünüre yaklaşınca chunk gelir.

## Erişilebilirlik

- Kartlar dekoratif: `alt=""`, `pointer-events: none`, klavyeyle etkileşim
  yok, ekran okuyucuya bir şey söylemez.
- İçerik kartların üstünde; imleç ne yaparsa yapsın buton tıklanır kalır.
- Buton düz Link Block, görünen metin; gizli kopya, `aria-hidden` metin yok.
