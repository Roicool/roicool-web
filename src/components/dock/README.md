# dock

Ekranın altına yapışan CTA çubuğu: logo şeridi, "Get started", "Book a
demo". İşaretlenen section'ı aşağı doğru geçince alttan kayarak gelir, o
section'ın üstüne geri çıkınca iner.

**Sayfada tetikleyici yoksa çubuk hiç çıkmaz** — uyarı da yazmaz; bu normal
bir sayfa. Böylece çubuk tüm sayfalarda duran bir Symbol'de yaşar, hangi
sayfada görüneceğine o sayfadaki section karar verir.

## Designer'daki yapı

İki ayrı yer: çubuğun kendisi ve geçilecek section.

```
Section (herhangi biri)           [data-rc-dock-trigger]         ← bu section geçilince çubuk gelir

…

Div (tag: aside)                  [data-rc="dock"]               ← çubuk; body'nin sonunda (Symbol olabilir)
                                  aria-label="Hızlı iletişim"
  Collection List Wrapper         [data-rc="marquee"]            ← logo şeridi (isteğe bağlı)
    Collection List               [data-rc-part="track"]
      Collection Item
  Link                            "Get started"
  Link Block                      [data-rc-part="pulse"]         ← "Book a demo"; nabız atar (isteğe bağlı)
    Div                           avatarlar (alt "")
    Text                          "Book a demo"
    Div                           ok ikonu (aria-hidden)
```

- **Tetikleyici** değersiz bir attribute: `data-rc-dock-trigger`. Sayfada
  birden fazla varsa ilki sayılır. Section şart değil; boş bir Div de olur
  ("bu noktadan sonra göster"). Tetikleyici o breakpoint'te `Display: None`
  ise çubuk o breakpoint'te çıkmaz.
- **Çubuk** body'nin sonunda dursun (footer Symbol'ünün altı iyi bir yer).
  `transform`, `filter` ya da `backdrop-filter` taşıyan bir elemanın içine
  koyma: `position: fixed` o zaman ekrana değil o elemana yapışır.
- Çubuğa `position`, `bottom`, `z-index`, `margin` verme; kod basar. Görünüm
  tamamen Designer'ın: arka plan, radius, padding, gap, gölge. Genişlik
  varsayılan olarak içerik kadar (ekrandan 2 × offset dar); Designer'da
  genişlik verirsen o kazanır.
- **Logo şeridi** mevcut [`marquee`](../marquee/README.md). `track`
  parçasını mutlaka yaz. Şeridin genişliğini Designer'da sınırla (ör.
  `width: 16rem`), yoksa çubuk ekran genişliğine yayılır.
- **pulse** → `overflow: hidden` verme; halka `::after` ile elemanın dışına
  çizilir. Designer'daki kendi `box-shadow`'u korunur.

Designer'ın canvas'ında kod çalışmaz: çubuk orada sayfanın sonunda normal
bir blok olarak görünür, stil vermek kolay olur.

## Ayarlar

Hepsi CSS değişkeni; site ya da sayfa custom code'unda değiştirilir.

| Değişken                   | Varsayılan               | Nerede      | Ne yapar                                        |
| -------------------------- | ------------------------ | ----------- | ----------------------------------------------- |
| `--rc-dock-offset`         | `1rem`                   | çubuk       | Ekranın altından ve yanlardan boşluk            |
| `--rc-dock-layer`          | `900`                    | çubuk       | `z-index`                                       |
| `--rc-dock-pulse-color`    | `rgb(193 175 145 / 0.5)` | çubuk       | Nabız halkasının rengi                          |
| `--rc-dock-pulse-duration` | `2.4s`                   | çubuk       | Bir nabzın süresi                               |
| `--rc-dock-pulse-count`    | `2`                      | çubuk       | Kaç nabız; `infinite` durmadan atar             |
| `--rc-dock-clearance`      | `6rem`                   | **`:root`** | Odaklanan eleman çubuğun ne kadar üstünde durur |

```html
<style>
  [data-rc~="dock"] {
    --rc-dock-pulse-count: 3;
  }
</style>
```

## Davranış

- Tetikleyicinin alt kenarı ekranın üstünden çıkınca kök
  `data-rc-state="shown"` alır; çubuk 0,5 sn'de alttan kayarak gelir.
  Tetikleyiciye geri çıkınca durum kalkar, çubuk 0,25 sn'de iner.
- Sayfa tetikleyicinin altından açılırsa (yenileme, anchor linki) çubuk
  hemen görünür.
- Nabız çubuk her gelişinde yarım saniye sonra başlar, iki kez atar, durur.
  İki nabız 4,8 sn: 5 saniyenin altında kaldığı için durdurma kontrolü
  gerekmez (WCAG 2.2.2). `infinite` yaparsan bu sınır aşılır.
- Durum yalnız kökte: `shown` ya da yok.

## JS yoksa

Çubuk Designer'da nereye konduysa orada normal bir blok olarak durur;
linkler çalışır.

## Erişilebilirlik

- Gizliyken `visibility: hidden`: Tab sırasında ve ekran okuyucuda yok.
- Odak çubuğun içindeyken çubuk gizlenmez; yukarı kaydırmak klavye
  kullanıcısının odağını düşürmez.
- Çubuk görünürken sayfaya `scroll-padding-bottom` verilir: Tab ile gelen
  eleman çubuğun altında kalmaz (WCAG 2.4.11).
- `aside` + `aria-label` çubuğu ayrı bir bölge olarak tanıtır. Avatarlar
  dekoratif (`alt=""`); linkin adı içindeki metinden gelir.
- Reduced motion: kayma ve nabız yok, çubuk yerinde belirir.

## Bağımlılık

Yok. Logo şeridi için `marquee`.
