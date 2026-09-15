# webflow/embeds/

Designer'a yapıştırılan kodun versiyonlu kopyası. Webflow'daki custom code
alanları sürüm geçmişi tutmaz; buradaki dosyalar o boşluğu doldurur.

**Kural: Designer'daki custom code alanı ile bu dosyalar birebir aynı olmalı.**
Designer'da bir şey değiştirdiysen aynı değişikliği buraya commit'le. Aksi halde
altı ay sonra sitede ne çalıştığını kimse bilemez.

| Dosya       | Nereye gider                       | İçinde ne var                 |
| ----------- | ---------------------------------- | ----------------------------- |
| `head.html` | Site Settings › Custom Code › Head | Webflow IX2 kapatıcı (inline) |

Dosyalarda açıklama yorumu tutulmaz: Webflow custom code'u olduğu gibi servis
eder, her yorum satırı her ziyaretçiye gider. Açıklama burada.

## IX2 kapatıcı — ne, neden, nasıl

**Ne yapar:** Webflow'un yerleşik Interactions motorunu (IX2) sayfa genelinde
kapatır. `<body>`'ye `data-wf-ix-vacation="1"` basar; Webflow'un runtime'ı bu
attribute'u görünce IX2'yi hiç başlatmaz.

**Neden:** animasyonlar bu repo üzerinden yönetilecek. IX2 açık kalırsa
Designer'da yanlışlıkla bırakılmış bir interaction araya girer, bir kare oynar
ve flash yapar. Ayrıca IX2'nin "başlangıçta opacity 0" deseni JS çalışmayan
her ziyaretçi ve bot için içeriği görünmez yapar — bkz.
[`docs/geo.md`](../../docs/geo.md).

**Neden inline ve `<head>`'de:** attribute, `<body>` oluştuğu _anda_ üstünde
olmalı. Dış dosya ağ isteği demek, geç kalır; `defer` parse sonrası demek, geç
kalır. Bunu garanti eden tek şey head içindeki inline script.

**Nasıl çalışır:** `<head>` çalışırken `<body>` henüz yok. Bir
`MutationObserver` `<html>`'in doğrudan çocuklarını izler, `<body>` eklenir
eklenmez attribute'u basar ve kendini kapatır. Script bir sebeple `<body>`
içine taşınırsa gözlemciye gerek kalmaz, doğrudan basar.

**Karar:** Designer'da native interaction kullanılacaksa bu blok kaldırılır;
yoksa o interaction'lar sessizce çalışmaz.

Kütüphane yayınlandığında `head.html`'i build üretecek: kaynak
`head.template.html` olacak, build kritik CSS'i `<style>` olarak gömüp sürüm
etiketini CDN linklerine yazacak. O noktadan sonra `head.html` elle
düzenlenmez — şablon düzenlenir, build alınır, çıktı yapıştırılır. Plan:
[`docs/architecture.md`](../../docs/architecture.md).
