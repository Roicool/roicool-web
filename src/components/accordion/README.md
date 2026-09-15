# accordion

Klavyeyle çalışan, kapalıyken bile metni belgede tutan açılır liste. SSS
bölümleri için varsayılan seçim — `FAQPage` JSON-LD ile birlikte kullanılır.

## Designer'daki yapı

```
[data-rc="accordion"]                 ← section / div
  [data-rc-part="item"]               ← her satır
    button[data-rc-part="trigger"]    ← Webflow'da Button elementi
    [data-rc-part="panel"]            ← div
      div                             ← TEK sarmalayıcı, içerik burada
```

Üç yapısal zorunluluk var:

1. `trigger` gerçek bir `<button>` olmalı. Div'e tıklama olayı bağlamak klavye
   ve ekran okuyucu kullanıcısını dışarıda bırakır; kod konsola uyarı düşer.
2. `panel`, `item`'ın **doğrudan** çocuğu olmalı.
3. `panel`'in içinde tek bir sarmalayıcı eleman olmalı. Kapanma animasyonu bu
   sarmalayıcıyı kırparak çalışır; birden fazla çocuk varsa animasyon bozulur.

## Ayarlar (kök elemanda)

| Attribute        | Değer       | Ne yapar                                        |
| ---------------- | ----------- | ----------------------------------------------- |
| `data-rc-single` | —           | Aynı anda tek satır açık kalır                  |
| `data-rc-open`   | `0`, `1`, … | Yüklenirken açık gelen satır (sıfırdan sayılır) |
| `data-rc-eager`  | —           | Görünüre girmeyi beklemeden hemen yükle         |

## Görünümü değiştirmek

Boşluk, tipografi, renk, kenarlık — hepsi Designer'ın. Bu dosyanın CSS'i yalnız
açılma/kapanma mekaniğini kurar ve süresi değişkenle ayarlanır:

```css
[data-rc~="accordion"] {
  --rc-accordion-duration: 200ms;
  --rc-accordion-easing: ease-out;
}
```

Ayrıntı: [`docs/css-ownership.md`](../../../docs/css-ownership.md).

## Erişilebilirlik

- `aria-expanded` tetikleyicide, `aria-controls` panele bağlı; `role="region"`
  ve `aria-labelledby` panelde.
- Kapalı panel `inert` alır — sekme sırasından ve erişilebilirlik ağacından
  çıkar, ama metni belgede kalır (tarayıcı botları ve arama okur).
- `prefers-reduced-motion: reduce` altında geçiş süresi global olarak sıfırlanır
  (`src/base/motion.css`); açılma/kapanma çalışmaya devam eder.

Henüz yok, gerekirse eklenecek: başlıklar arası ok tuşu gezinmesi. APG bunu
opsiyonel sayar ve her satır zaten Tab ile erişilebilir olduğu için
başlangıçta kapsam dışı bırakıldı.
