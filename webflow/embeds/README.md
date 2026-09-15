# webflow/embeds/

Designer'a yapıştırılan kodun versiyonlu kopyası. Webflow'daki custom code
alanları sürüm geçmişi tutmaz; buradaki dosyalar o boşluğu doldurur.

**Kural: Designer'daki custom code alanı ile bu dosyalar birebir aynı olmalı.**
Designer'da bir şey değiştirdiysen aynı değişikliği buraya commit'le. Aksi halde
altı ay sonra sitede ne çalıştığını kimse bilemez.

| Dosya       | Nereye gider                       |
| ----------- | ---------------------------------- |
| `head.html` | Site Settings › Custom Code › Head |

Sayfa bazında JSON-LD blokları `dist/seo/` altında üretilir (`npm run build:seo`)
ve ilgili sayfanın Page Settings › Custom Code › Head alanına yapıştırılır.
Onlar üretilen çıktı oldukları için burada tutulmaz.
