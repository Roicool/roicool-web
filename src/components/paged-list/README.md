# paged-list

Webflow'un kendi Collection List sayfalaması, sayfa yenilenmeden:
"Sonraki" / "Önceki" listeyi yerinde değiştirir, adres çubuğu takip eder
(geri / ileri çalışır), okuyucu sayfada olduğu yerde kalır. Blog sayfasındaki
"Son yayınlananlar" için.

Her sayfa yine Webflow'un ürettiği kendi adresiyle durur (`?xxxx_page=2`),
yazıları HTML'de: botlar düz linkleri izler, JS yoksa link sayfayı normal
yükler. Kod aynı adresi indirir, oradaki listeyi alıp bu listenin yerine
koyar — sunucunun zaten ürettiği HTML'i taşır, içerik üretmez (kural 1).

## Designer'daki yapı

```
Collection List Wrapper   [data-rc="paged-list"]
  Collection List
    Collection Item …
  Pagination (Webflow: Collection List Settings › Paginate items)
    Previous / Next
    Page count [data-rc-part="count"]   ← "2 / 5"; Settings › Show page count
```

- Kök Wrapper'dır (ya da liste ile sayfalamayı birlikte saran herhangi bir
  eleman). Collection List ayarlarında **Paginate items** açık, sayfa başı
  sayı oradan.
- Linkler adresinden tanınır (bu sayfada `_page` ile biten bir parametre),
  Webflow class'larından değil. Sayfalamayı Designer'da istediğin gibi
  stillendir.
- **Numaralı sayfalar** (Ramp'teki KbPagination): Collection List
  ayarlarında **Show page count** açılır ve sayaç elemanına
  `data-rc-part="count"` verilir. Kod sayaçtaki "2 / 5"ten mevcut ve toplam
  sayfayı okur, sayacın önüne `1 2 3 … 5` linklerini koyar (`ol`
  `data-rc-part="pages"`), sayaç gizlenir. Numaralar Webflow'un zaten
  sunduğu `?xxxx_page=N` adreslerine giden linklerdir; kod yoksa Önceki /
  Sonraki ve sayaç kalır. Gösterilen numaralar: 5 sayfaya kadar hepsi;
  fazlasında ilk, son, mevcut ve komşuları, aralar "…" (1. ve son sayfada
  `1 2 … son−1 son`, 2. sayfada `1 2 3 … son`, sondan bir öncekinde
  `1 … son−2 son−1 son`). Görünüm varsayılanı kodda (32px yuvarlak, mevcut
  sayfa dolu); renkler `--rc-paged-list-active-background`,
  `--rc-paged-list-active-color`. Ekran okuyucu etiketi
  `data-rc-page-label` (varsayılan `Sayfa {n}`); mevcut sayfa
  `aria-current="page"`.
- Sayfada birden fazla `paged-list` olabilir; her biri fetch edilen sayfada
  kendi sırasındaki karşılığını alır.

## Davranış

- Tıklama: sayfa indirilir, liste değişir, adres `pushState` ile yazılır.
  Ctrl/⌘/Shift ile tıklama normal davranır (yeni sekme vb.).
- İmleç ya da odak bir sayfa linkine gelince o sayfa önceden indirilir;
  tık beklemeden açılır.
- İnerken kök `data-rc-state="loading"` + `aria-busy="true"`: liste yarı
  soluk, tıklanmaz.
- Listenin üstü ekranın üstünde kaldıysa liste görünüre kayar; değilse
  sayfa kıpırdamaz.
- Klavyeyle (Enter) geçilince odak yeni sayfanın ilk linkine gider.
- Yeni listedeki component'ler (ör. hover-reveal kartı) yeniden taranır.
- Hata (ağ, liste bulunamadı): sayfa normal yüklenir.

## JS yoksa, hareket azaltılmışsa

- JS yoksa: Webflow'un normal sayfalaması, her sayfa yüklenir.
- Reduced motion: listeye kayma animasyonsuz.

## Sınır

Webflow etkileşimleri (IX2) yeni gelen öğelerde yeniden kurulmaz; listede
Webflow interaction kullanma (hover efektleri Designer'ın Hover durumuyla).
