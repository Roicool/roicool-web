# Erişilebilirlik

Hedef: **WCAG 2.2 AA**. Bu bir temenni değil, kabul kriteri — aşağıdaki
maddeleri geçmeyen bir component yayına girmez.

Erişilebilirlik ile GEO aynı yöne bakar: ekran okuyucunun anlayabildiği sayfa,
yanıt motorunun da anlayabildiği sayfadır. İkisi için ayrı iş yapılmıyor.

## Her sayfada

- `<html lang="tr">` ya da `lang="en"` — Designer'da sayfa ayarından.
- Body'nin ilk odaklanabilir elemanı skip link:
  ```html
  <a class="rc-skip-link" href="#main">İçeriğe atla</a>
  ```
  Hedefi `<main id="main" tabindex="-1">` olmalı; `tabindex="-1"` olmadan odak
  oraya inmez.
- Landmark'lar gerçek etiketlerle: `header`, `nav`, `main`, `aside`, `footer`.
- Odak halkası görünür. `src/base/critical.css` bunu `:focus-visible` ile
  garanti eder ve `:where()` kullandığı için tasarımın kasıtlı override'ı kazanır.
- Metin/zemin kontrastı en az 4.5:1 (büyük metinde 3:1). Bu Designer'da,
  renk seçilirken kontrol edilir.

## Her component'te

1. **Klavye.** Fare olmadan tamamı kullanılabilir. Tıklanan her şey `<button>`
   ya da `<a>` — tıklama olayı bağlanmış bir div değil. Kod, `<button>`
   olmayan tetikleyiciler için konsola uyarı düşer.
2. **Odak görünür ve mantıklı yerde.** Bir katman açıldığında odak içine girer
   (`src/a11y/focus-trap.js`), kapandığında geldiği yere döner.
3. **Durum okunabilir.** Açık/kapalı, seçili, yükleniyor — `aria-expanded`,
   `aria-selected`, `aria-busy` ile bildirilir. Yalnızca renkle anlatılmaz.
4. **Görünmeyen içerik erişilebilirlik ağacında da olmaz.** Kapalı panel
   `inert` alır; `visibility` veya `opacity` ile gizlenmiş bir eleman ekran
   okuyucuda hâlâ durur ve sekme sırasını kirletir.
5. **Sessiz değişiklik yok.** Görsel olarak fark edilen ama metinle
   duyurulmayan her değişiklik `src/a11y/live-region.js` ile duyurulur —
   filtre sonucu sayısı, form hatası, "kopyalandı".
6. **Hareket isteğe bağlı.** `prefers-reduced-motion: reduce` altında component
   tam işlevsel kalır. Global geri çekilme `src/base/motion.css`'te; JS tarafı
   `src/runtime/motion.js` ile kontrol edilir.
7. **Otomatik hareket durdurulabilir.** 5 saniyeden uzun süren otomatik
   kaydırma/slider'ın durdurma kontrolü olur (WCAG 2.2.2).

## Paylaşılan katman

Her component kendi focus trap'ini yazmaz. `src/a11y/` altındakiler kullanılır:

| Dosya            | Ne zaman                                                   |
| ---------------- | ---------------------------------------------------------- |
| `focus-trap.js`  | Sayfayı kapatan her katman — modal, drawer, tam ekran menü |
| `live-region.js` | Metinle duyurulması gereken her değişiklik                 |

Yeni bir ortak ihtiyaç çıkarsa component'in içine değil, buraya yazılır.

Henüz yok, gerektiğinde eklenecek: `roving-tabindex.js` (tab listesi, toolbar,
menü gibi tek Tab durağı olup ok tuşlarıyla gezilen desenler için).

## Test

Otomatik araçlar sorunların yaklaşık üçte birini yakalar; gerisi elle bakmayı
gerektirir. Yayına çıkmadan önce her sayfada:

- Sekme tuşuyla baştan sona gez. Odak her adımda görünüyor mu? Sıra ekrandaki
  düzenle uyuşuyor mu? Görünmeyen bir şeye takılıyor musun?
- JS'i kapat. Tüm metin hâlâ okunuyor mu?
- Sayfayı %200 yakınlaştır. Yatay kaydırma çıkıyor mu?
- Ekran okuyucuyla bir tur: macOS'ta VoiceOver (⌘F5), Windows'ta NVDA.
