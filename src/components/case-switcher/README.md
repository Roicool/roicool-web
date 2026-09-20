# case-switcher

Solda müşteri logolarından bir ızgara, sağda o vakanın başlığı ve rakamları.
Logonun üstüne gelince sağdaki panel o vakaya döner; logo vaka sayfasına
giden bir linktir. Kaynak: digidop.com "Recent projects we've supported".

**SEO/GEO:** her panelin metni HTML'de, kod hiçbir şey üretmez ve hiçbir şeyi
`display: none` yapmaz. Gösterilmeyen paneller yalnız `opacity: 0;
visibility: hidden` (sekme gibi; Google tam ağırlıkla dizinler). JS yoksa
bütün paneller alt alta görünür.

## Designer'daki yapı

İki Collection List, **aynı koleksiyon** (Case studies), **aynı sıralama,
filtre ve limit**: n. logo n. panele aittir. Kod sayıları farklıysa uyarır,
fazlalığı yok sayar. Koşulla gizlenen öğeler iki tarafta da atlanır.

```
Section ya da Div                     [data-rc="case-switcher"]      ← kök; iki listeyi de kapsar
  Div (grid, 2 kolon; Designer)
    Div                               (sol kutu; arka plan, radius)
      Collection List Wrapper
        Collection List               [data-rc-part="logos"]          ← ızgara (Designer: grid)
          Collection Item
            Link Block                [data-rc-part="logo"]           ← vaka sayfasına link; kare tile
              Image                   gri logo (alt = Name)           ← dinlenme hali
              Div                     [data-rc-part="cover"]          ← hover katmanı; kod absolute inset 0, opacity 0→1
                Image                 kare fotoğraf (alt "", cover)
                Div                   karartma
                Image                 beyaz logo (alt "")
              Div                     ok rozeti (aria-hidden)
    Div                               (sağ kutu; arka plan)
      Collection List Wrapper
        Collection List               [data-rc-part="panels"]         ← kod üst üste yığar
          Collection Item                                             ← panel; içi serbest
            Image                     gri logo (alt "")
            H3 + inline Text          Başlık + Başlık devamı
            Div                       rakam satırları (Rakam + açıklaması)
            Link Block                "Vakayı oku" (isteğe bağlı, önerilir)
```

Designer'da ayarlanacaklar:

- **logos** (Collection List) → `display: grid`, kolonlar
  (`repeat(auto-fit, minmax(13.75rem, 1fr))`), küçük gap. Wrapper'a stil
  verme.
- **logo** (Link Block) → `aspect-ratio: 1 / 1`, arka plan, radius,
  `overflow: hidden`, flex ile ortalama. `position` verme (kod `relative`).
  Gri logo için aynı beyaz Logo alanı kullanılabilir: Image class'ına
  Filters › `brightness(0)` + `opacity: 35%`.
- **cover** → stil verme; içindeki fotoğrafa `object-fit: cover; inset: 0`,
  karartmaya yarı saydam siyah, logoya boyut. Fotoğraf alanı boşsa Designer
  koşuluyla gizle; cover'a koyu arka plan ver ki gri logo altından
  görünmesin. Mobilde istenmiyorsa cover'ı breakpoint'te Display: None.
- **panels** (Collection List) → `display`, `grid` verme; kod yığar. Gap ve
  hizalama serbest. Wrapper'a stil verme.
- Panelin içi tamamen CMS bağlı, attribute yok. Başlık + gri devamı: h2 için
  kullandığımız satır içi rozet kalıbı (sarmalayıcı Div, H3 `inline`, Text
  Block `inline`).
- Link Block'un erişilebilir adı gri logonun `alt`'ından (Name'e bağla).
  Cover'daki iki görselin `alt`'ı boş.

## CMS alanları (Case studies)

Var olanlar yeter: Logo (beyaz), Başlık, Başlık devamı, Rakam, Rakam
açıklaması, Vaka bağlantısı, Sıra, Ana sayfada göster. Eklenecek:

- **Kare görsel** (Image, 1:1, isteğe bağlı) → cover'daki fotoğraf.
- **Rakam 2** + **Rakam 2 açıklaması** (isteğe bağlı) → ikinci KPI satırı.

## Davranış

- **İnce imleç (fare):** logonun üstüne gelince panel değişir; tık linke
  gider.
- **Dokunmatik:** ilk tap paneli açar (link engellenir), seçili logoya ikinci
  tap linke gider. Panelde ayrıca "Vakayı oku" linki olsun.
- **Klavye:** logoya odaklanınca panel değişir (yalnız klavye odağı; tıkla
  gelen odak değiştirmez).
- Açılışta ilk vaka seçili; kod gelmeden önce CSS ilk paneli gösterir.
- Durumlar: logo `data-rc-state="active"` + `aria-current="true"`; panel
  `data-rc-state="active"`; kök `ready`.
- Geçiş: çıkan panel 250 ms'de söner, giren 250 ms gecikmeyle 350 ms'de
  belirir; `translate` ile 1rem yükselir. Reduced motion'da `motion.css`
  süreleri sıfırlar.

## JS yoksa

Logolar düz link, hover'da cover CSS ile açılır; paneller alt alta, hepsi
görünür.

## Erişilebilirlik

- Her logo gerçek link; adı gri logonun `alt`'ı (müşteri adı).
- Seçili logo `aria-current="true"`.
- Gösterilmeyen paneller `visibility: hidden`: ekran okuyucu ve Tab yalnız
  seçili paneli görür; her vakaya logo linkinden gidilir.
- Cover `pointer-events: none`; tık her zaman linke gider.

## Bağımlılık

Yok.
