# webflow/embeds/

Designer'a yapıştırılan kodun versiyonlu kopyası. Webflow'daki custom code
alanları sürüm geçmişi tutmaz; buradaki dosyalar o boşluğu doldurur.

**Kural: Designer'daki custom code alanı ile bu dosyalar birebir aynı olmalı.**
Designer'da bir şey değiştirdiysen aynı değişikliği buraya commit'le. Aksi halde
altı ay sonra sitede ne çalıştığını kimse bilemez.

| Dosya       | Nereye gider                       | İçinde ne var                 |
| ----------- | ---------------------------------- | ----------------------------- |
| `head.html` | Site Settings › Custom Code › Head | Webflow IX2 kapatıcı (inline) |

Kütüphane yayınlandığında `head.html`'i build üretecek: kaynak
`head.template.html` olacak, build kritik CSS'i `<style>` olarak gömüp sürüm
etiketini CDN linklerine yazacak. O noktadan sonra `head.html` elle
düzenlenmez — şablon düzenlenir, build alınır, çıktı yapıştırılır. Plan:
[`docs/architecture.md`](../../docs/architecture.md).
