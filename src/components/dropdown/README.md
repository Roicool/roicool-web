# dropdown

Bir düğme ve altında açılan link listesi — Ramp blogundaki "Explore
categories" ("Kategorileri keşfet"). Blog sayfasında kategoriler için.
Linkler HTML'de (Collection List ya da statik link); kod yalnız aç / kapa
ve klavyeyi ekler. JS yoksa liste düğmenin altında açık durur.

## Designer'daki yapı

```
Div [data-rc="dropdown"]
  DOM button [data-rc-part="trigger"] type="button"   ← "Kategorileri keşfet"
    (isteğe bağlı) ikon [data-rc-part="caret"] aria-hidden="true"   ← açıkken döner
  Div [data-rc-part="menu"]                            ← açılan liste
    Collection List Wrapper › List › Item › Link       ← ya da statik linkler
```

- Liste düğmenin 8px altında, en az düğme genişliğinde, sağa hizalı açılır
  (`--rc-dropdown-offset`, `--rc-dropdown-layer` ile değişir).
- Listenin ve linklerin görünümü Designer'da; varsayılanı kodda sıfır
  specificity'de (beyaz kutu, ince çerçeve, 8px radius, hafif gölge; linkler
  soluk, üstüne gelince koyu ve gri zemin). Link kuralları bir eleman
  seçicisi taşır: sitenin çıplak `a` stiline yenilmez, Designer class'ı
  yine kazanır.
- Düğmenin yazısı tek satırda kalır (`white-space: nowrap`) ve düğme kökün
  yüksekliğini doldurur (JS'le kök `display: flex`): yanındaki arama
  düğmesiyle aynı satırda `align-items: stretch` ise ikisi eşit boyda.
- Bulunulan sayfanın linki `aria-current="page"` alır ve tıklanmaz.

## Klavye ve erişilebilirlik

WAI-ARIA disclosure (menü rolü değil, linkler link kalır): düğmede
`aria-expanded`, `aria-controls`. ↓ / Enter / Space açar ve ilk linke odaklar,
↑ son linke; listede ↑ ↓ gezer, Home / End uçlara, Esc kapatır ve odağı
düğmeye verir; Tab ile çıkmak ya da dışarı tıklamak kapatır.

## Durumlar

Kök açıkken `data-rc-state="open"`.
