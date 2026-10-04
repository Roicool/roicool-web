# toc

Blog yazısının içindekileri: gövdedeki H2'lere çapa, okunan bölümün listede
işaretlenmesi, dar ekranda altta yüzen ve açılınca listeyi yukarı doğru
açan bir menü.

**Liste kodda üretilmez** (kural 1). Saatlik CMS işi
(`scripts/cms-derived-fields.mjs`) gövdenin H2'lerinden listeyi çıkarır ve
Blog › **Table of contents** alanına `<ul><li><a href="#çapa">…</a></li></ul>`
olarak yazar; Designer bu zengin metni `list` parçasına bağlar. Webflow'un
zengin metni başlığa `id` veremediği için çapaları bu kod verir: her H2'ye,
script'in aynı metinden hesapladığı çapayı (`runtime/anchors.js`, iki taraf
aynı fonksiyonlar). Böylece liste HTML'de (bot ve yapay zeka görür), çapa
tarayıcıda.

Linke basınca kaydırmayı tarayıcı ya da Lenis yapar; ikisi de başlığın
`scroll-margin-top`'ına uyar (`--rc-toc-offset`, yapışkan başlığın altında
durur). Kod ayrıca: adreste `#çapa` varsa sayfa açılınca o başlığa iner
(çapa kod gelmeden yoktu).

## Designer'daki yapı

```
Div / Article          [data-rc="toc reading-progress post"] [data-rc-eager]   ← yazının sarmalayıcısı
  Div                  [data-rc-part="bar"]                     ← okuma çubuğu (reading-progress)
  Div  (yerleşim: masaüstünde kenar sütun + gövde)
    Nav                [data-rc-part="navigation"] aria-label="İçindekiler"
      Div              [data-rc-part="panel"]                   ← tek çocuk: liste
        Rich Text      [data-rc-part="list"]                    ← Blog › Table of contents
      DOM `button`     [data-rc-part="more"] hidden aria-label="Tüm başlıkları göster"  ← ok; yalnız geniş ekranda, liste uzunsa
      DOM `button`     [data-rc-part="toggle"]                  ← "İçindekiler" (+ ikon); yalnız dar ekranda
    Rich Text          [data-rc-part="body"]                    ← Blog › Body
```

- **Sıra:** `panel` `toggle`'dan önce: dar ekranda liste düğmenin üstünde
  açılır.

**Görünüm kodda (sahibinin kararı).** Liste, kenar sütunun sticky payı ve
dar ekrandaki yüzen menünün yüzeyi `toc.css`'te; Designer'ın tag
varsayılanlarını (`ul` padding'i, `li` yazı boyu) ve bu elemanlardaki utility
class'ları ezecek kadar özgül. Ayar Designer'dan değil, aşağıdaki
değişkenlerle yapılır. Designer'da bu parçalara stil verme; verilen değer ya
ezilir ya da görünümü bozar.

- **navigation:** masaüstünde (992 px ve üstü) `top` kodda
  (`--rc-toc-offset`); `position: sticky` Designer'da (`sticky` class'ı).
  Dar ekranda (991 px ve altı) kod `position: fixed` ile ekranın altına alır
  (kenarlardan `--rc-toc-inset`); beyaz yüzey, radius, gölge kodda.
- **panel:** stil verme; kod dar ekranda katlar (`display: grid`). Açık
  listenin en fazla yüksekliği `--rc-toc-panel-height` (60svh), uzunsa
  kendi içinde kayar.
- **toggle:** dar ekranda tam genişlik satır + ok işareti kodda; masaüstünde
  ve JS yokken kod gizler. Metni "İçindekiler" gibi sabit; `aria-expanded`,
  `aria-controls` kodda.
- **more:** boş DOM `button`, `hidden` attribute'u ve `aria-label` ile.
  Liste geniş ekranda `--rc-toc-collapsed-height`'tan (22rem) uzunsa kod
  görünür yapar: altında bir ok. Basınca liste ekran boyuna açılır, ok
  yukarı döner; tekrar basınca katlanır. Kesik listede okunan başlık
  listenin görünen kısmında tutulur (liste kendi içinde kayar, sayfa
  kaymaz); gizli uç tarafı solar.
- **Açık menünün arkası:** dar ekranda liste açıkken sayfanın geri kalanı
  bulanıklaşır ve hafif kararır (`--rc-toc-blur`, `--rc-toc-scrim`);
  arkaya dokunmak menüyü kapatır.
- **list:** madde işareti yok, solda ince çizgi, her link blok ve solda 2 px
  şeffaf kenar; okunan linkin kenarı `--rc-toc-indicator` rengine boyanır,
  okunmayanlar `--rc-toc-rest` opaklıkta. Yazı boyu listenin class'ından
  (`text-sm`) gelir.
- Sarmalayıcıya ve üstlerine `overflow: hidden` verme (sticky ve fixed
  bozulur).

## Ayarlar

| Değişken                    | Varsayılan                 | Ne                                                |
| --------------------------- | -------------------------- | ------------------------------------------------- |
| `--rc-toc-offset`           | `6rem`                     | Başlığın kaydırınca ekranın üstünde bıraktığı pay |
| `--rc-toc-inset`            | `1rem`                     | Yüzen menünün ekran kenarlarından uzaklığı        |
| `--rc-toc-layer`            | `90`                       | Yüzen menünün `z-index`'i                         |
| `--rc-toc-panel-height`     | `60svh`                    | Açık listenin en fazla yüksekliği                 |
| `--rc-toc-rest`             | `0.55`                     | Okunmayan linklerin opaklığı                      |
| `--rc-toc-indicator`        | `--brand-primary--500`     | Okunan linkin sol border'ının rengi               |
| `--rc-toc-line`             | metin rengi %14            | Listenin soldaki çizgisi, açık menüdeki ayraç     |
| `--rc-toc-item-padding`     | `.4375rem 0 .4375rem 1rem` | Bir linkin iç boşluğu                             |
| `--rc-toc-line-height`      | `1.4`                      | Linklerin satır yüksekliği                        |
| `--rc-toc-surface`          | `#fff`                     | Yüzen menünün arka planı                          |
| `--rc-toc-radius`           | `1rem`                     | Yüzen menünün köşeleri                            |
| `--rc-toc-collapsed-height` | `22rem`                    | Geniş ekranda kesik listenin yüksekliği           |
| `--rc-toc-fade`             | `2.5rem`                   | Kesik listenin uçlarındaki solma                  |
| `--rc-toc-blur`             | `6px`                      | Açık mobil menünün arkasındaki bulanıklık         |
| `--rc-toc-scrim`            | `rgb(20 18 40 / .12)`      | Arkadaki karartma                                 |
| `--rc-toc-shadow`           | ince çerçeve + gölge       | Yüzen menünün gölgesi                             |

Değişkenler sarmalayıcıya ya da `site.css`'e yazılır.

## Davranış

- **Çapalar:** gövdedeki her dolu H2'ye script'le aynı çapa
  (`neden-webflowa-gecmeli`; tekrar eden başlık `-2`, `-3`). Liste gövdeden
  eskiyse (başlık değişti, saatlik iş daha çalışmadı) kod konsola kaç linkin
  boşa düştüğünü yazar; iş bir saat içinde listeyi yeniler.
- **Okunan bölüm:** üst payın 8 px altına kadar gelmiş son H2'nin linki
  `data-rc-state="active"` + `aria-current="true"`. Sayfanın sonuna
  inilince son bölüm. İlk H2'nin üstünde hiçbiri.
- **Dar ekran (991 px ve altı):** menü altta, katlı. Düğme açar; bir link,
  düğme, Escape (odak düğmeye döner) ya da menü dışına basmak kapatır.
  Gövde ekranda değilken (yazının üstü, sonu) menü aşağı çekilip gizlenir.
  Kökte durumlar: `ready`, `open`, `away`; geniş ekranda `long` (liste
  kesik), `expanded` (açık). Listenin kendi durumu: `start`, `end` (o uç
  görünüyor).
- Yüzen menü ve katlama kritik CSS'te (`toc.critical.css`): ilk boyamada
  yerinde, kod gelince kayma olmaz.

## JS yoksa, kod gelmezse, hareket azaltılmışsa

- **JS yok:** liste Designer'ın koyduğu yerde, açık; düğme gizli; linkler
  sayfaya gider (çapa yok, kaydırmaz).
- **`toc` chunk'ı gelmezse:** `rc.js` çalışmıyorken ve kökte durum yokken
  liste 4 saniye sonra kendiliğinden açılır; menü düğmesiz de okunur.
- **Reduced motion:** açılma ve gizlenme geçişleri `motion.css` ile anında.

## Erişilebilirlik

- `navigation` gerçek `<nav>` ve `aria-label="İçindekiler"` (Designer).
- Düğme `aria-expanded` / `aria-controls`; açılır menü modal değil, odak
  hapsedilmez.
- Okunan link `aria-current="true"`.

## Bağımlılık

`runtime/anchors.js` (script ile ortak), `runtime/scroll.js` (Lenis).
