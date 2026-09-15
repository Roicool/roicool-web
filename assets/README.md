# assets/

Webflow'a yüklenen görsellerin kaynağı. Webflow'un Assets paneli sürüm geçmişi
tutmaz ve dosyaları yeniden adlandırır; buradaki kopya orijinaldir.

| Klasör    | Ne                                        |
| --------- | ----------------------------------------- |
| `icons/`  | Arayüz ikonları — tek renk SVG            |
| `brand/`  | Logo, favicon, sosyal paylaşım görselleri |
| `motion/` | Lottie JSON                               |

## İkon kuralları

- 24×24 `viewBox`, üzerinde çizim 20×20 alana oturur.
- Renk `currentColor` — SVG içinde sabit renk yok. Metin rengini almaları
  gerekiyor.
- `width`/`height` attribute'u yok, yalnız `viewBox`. Boyut CSS'ten verilir.
- `id` yok. Aynı sayfada iki kez kullanılan ikon, çakışan id üretir.
- Dosya adı ne çizdiğini söyler, nerede kullanıldığını değil:
  `arrow-right.svg` ✅, `hero-icon-2.svg` ❌.

## Görseller

Webflow'a yüklemeden önce boyutlandır ve sıkıştır — Webflow otomatik
`srcset` üretir ama kaynağı küçültmez. Fotoğraf için genişlik en fazla 2400px.
