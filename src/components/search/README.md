# search

Yazdıkça sonuç gösteren arama penceresi (ramp.com/blog aramasının
karşılığı): 300 ms gecikme, yükleniyor ikonu, eşleşen kısım kalın,
"Aramayı genişletmeyi dene" boş durumu, "Tüm sonuçları gör". Üstüne:

- **Gruplu sonuçlar:** yazılar, hizmetler, sözlük terimleri ("Anahtar
  kelimeler"), kategoriler — her grup Designer'da, istenen kadarı.
- **Türkçe eşleşme:** büyük/küçük harf ve aksan fark etmez (`sirket` →
  Şirket, `isik` → Işık); dört harften uzun kelimede bir-iki harflik yazım
  hatası tolere edilir (`manger` → Manager).
- **Klavye:** ⌘K / Ctrl K her yerde, `/` bir metin alanında değilken açar;
  ↓ ↑ sonuçlar arasında gezer, ↑ en üstte aramaya döner; Enter tam sonuç
  sayfasına gider; Esc kapatır, odak açan düğmeye döner.
- **Son aramalar:** sorgu boşken bu tarayıcıdaki son 5 arama (tıklayınca
  tekrar arar) ve Designer'daki popüler konular.
- Sonuç sayısı ekran okuyucuya duyurulur.

## Veri

`dist/search-index.json` — yayındaki Blog yazıları, Hizmetler, Sözlük ve
Blog kategorileri; `scripts/search-index.mjs` CMS'ten saatte bir üretir
(`.github/workflows/search-index.yml`, `WEBFLOW_API_TOKEN`), değiştiyse
commit eder. Hangi koleksiyon, hangi alan: `webflow/search-index.json`
(alanlar slug ya da görünen adla; bulunamayan alan sonuçta görünmez,
script uyarır). Yeni yazı aramada en geç bir saat sonra çıkar; aceleyse
Actions › "Arama dizini" › Run workflow.

Dizin, pencere ilk açılınca (ya da imleç tetikleyiciye gelince) bir kez
iner. Yeri varsayılan olarak kodun yanı (`dist/`); kökte `data-rc-index`
ile başka bir adres verilebilir. **Üretim modunda** (`cdnRef: "tag"`)
kod bir sürüme sabitlenir ama dizin saatlik güncellenir: o zaman
`data-rc-index`'i `main`'deki dosyaya ya da R2'ya yönlendir.

Arama sonuçları ziyaretçinin yazdığına cevaptır, sayfa içeriği değil: her
sonucun kendi sayfası içeriğini kendi HTML'inde taşır (kural 1).

## Designer'daki yapı

```
Div [data-rc="search"]                                   ← kök: tetikleyici + pencere
  Link [data-rc-part="open"] href="/search"              ← JS yokken arama sayfasına gider
    "Ara…" + Span [data-rc-part="shortcut-mac"] "⌘K" + Span [data-rc-part="shortcut-other"] "Ctrl K"
  DOM dialog [data-rc-part="dialog"] aria-label="Blogda ara"
    Div kutu (genişlik ~800px, max 95vw, üstten %10; arka plan, radius)
      DOM form [data-rc-part="form"] role="search" action="/search" method="get"
        DOM input [data-rc-part="input"] type="search" name="query" aria-label="Ara" autocomplete="off"
        Div [data-rc-part="loader"] aria-hidden="true"   ← dönen ikon
        DOM button [data-rc-part="close"] type="button" aria-label="Kapat"
      Div [data-rc-part="idle"]                          ← sorgu boşken
        Div [data-rc-part="recent"] › başlık + Div [data-rc-part="list"]
          DOM button [data-rc-part="recent-item"] › Span [data-rc-part="recent-text"]   ← şablon
        popüler konular (statik linkler)
      Div [data-rc-part="results"]                       ← sonuç varken
        Div [data-rc-part="group"] data-rc-type="term"     › başlık + Div [data-rc-part="list"] › şablon kart
        Div [data-rc-part="group"] data-rc-type="category" › …
        Div [data-rc-part="group"] data-rc-type="post"     › …
        Div [data-rc-part="group"] data-rc-type="service"  › …
        Link [data-rc-part="all"] "Tüm sonuçları gör"
      Div [data-rc-part="empty"] "Aramayı genişletmeyi dene."
      Div [data-rc-part="status"] class rc-sr-only aria-live="polite"
          data-rc-results="{n} sonuç bulundu" data-rc-none="Sonuç bulunamadı"
```

**Şablon kart:** her grubun `list`'indeki ilk `[data-rc-part="result"]`
(Link Block ya da link içeren Div). Kod onu sonuç başına kopyalar ve
içindeki parçaları doldurur: `result-title` (eşleşen kısım `<strong>`),
`result-text`, `result-image` (img ya da img içeren Div), `result-category`,
`result-minutes` (sayı; `data-rc-format="{n} dk okuma"` verirsen birimiyle
birlikte yazılır ve süre yoksa birlikte gizlenir). Değeri olmayan parça
gizlenir. Şablondan sonraki örnek kartlar silinir: Designer'da iki üç örnek
bırakmak serbest.

- Grup başına sonuç: `data-rc-limit` (varsayılan yazı 6, hizmet 3, terim 4,
  kategori 4). Sonuçsuz grup gizlenir.
- Sayfanın başka yerinde (ör. nav'daki büyüteç) `data-rc-search-open`
  attribute'lu her eleman da pencereyi açar.
- Pencerenin görünümü Designer'da; kod varsayılan olarak `dialog`'u tam
  ekran ve saydam yapar (kutu içinde), arka planı bulanıklaştırır (Ramp:
  `backdrop-blur-xl`). `::backdrop` Designer'dan verilemez, kodda.

## Durumlar

Kök: `idle` (sorgu boş), `loading`, `results`, `empty`; kapalıyken durum
yok. Hangi parça ne zaman görünür: CSS. Kök ayrıca `data-rc-platform`
(`mac` / `other`) taşır: kısayol ipucu ona göre.

## JS yoksa

Tetikleyici `/search`'e giden bir link, form oraya gönderir: Webflow'un
site araması çalışır (Site settings › Site search açık olmalı).
