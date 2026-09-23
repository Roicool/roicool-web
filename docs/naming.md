# İsimlendirme

## Genel

- Klasör ve dosya adları: `kebab-case`, İngilizce, tekil.
- Kod — değişken, fonksiyon, yorum: İngilizce.
- Dokümanlar: Türkçe.
- Kısaltma yok. `navigation`, `nav` değil. `button`, `btn` değil. `image`,
  `img` değil. Tek istisna sektörde tek anlamı olanlar: `url`, `id`, `css`, `js`.
- Şu adlarda klasör veya dosya açılmaz: `misc`, `utils`, `helpers`, `common`,
  `shared`, `temp`, `old`, `new`, `_archive`, `v2`. Bir şeyin gideceği yer
  yoksa eksik olan klasör adıdır, çekmece değil. Eski sürüm git'te durur.

## Component adı dört yerde aynıdır

```
src/components/hero-slider/hero-slider.js     klasör + dosya
data-rc="hero-slider"                          Designer'daki attribute
[data-rc~="hero-slider"]                       CSS seçicisi
dist/components/hero-slider.js                 CDN yolu
```

Ad tek bir isim tamlamasıdır: ne olduğunu söyler, nerede kullanıldığını değil.
`hero-slider` iyi; `homepage-top-thing` kötü.

## Attribute sözleşmesi

| Attribute                  | Nerede       | Ne                                                                           |
| -------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `data-rc="<ad>"`           | Kök eleman   | Hangi component. Boşlukla ayırarak birden fazla: `data-rc="reveal parallax"` |
| `data-rc-part="<parça>"`   | Kökün içinde | Adlandırılmış parça                                                          |
| `data-rc-state="<durum>"`  | JS basar     | Durum — CSS buradan stillenir                                                |
| `data-rc-<ayar>="<değer>"` | Yalnız kök   | Component ayarı                                                              |

**Ayar mı parça mı belirsizliği yok:** kökteki `data-rc-*` bir ayardır, alttaki
`data-rc-part` bir parçadır. İki ayrı attribute adı, iki ayrı yer.

Rezerve adlar — ayar olarak kullanılamaz: `part`, `state`, `eager`.

`data-rc-eager` her component'te geçerlidir: görünüre girmeyi beklemeden hemen
yükler. Ekranın üst kısmındaki component'lerde (navigasyon, hero) kullanılır.

### Kökün dışındaki işaretler

Bir component bazen kendi kökünün dışındaki bir elemana bakmak zorunda: ör.
`dock` çubuğu, sayfada hangi section geçilince görüneceğini bilmeli. Bu
eleman ne parça (kökün içinde değil) ne ayar (kökte değil); adı
`data-rc-<component>-<rol>` olur: `data-rc-dock-trigger`. Component adıyla
başladığı için hangi koda ait olduğu HTML'den okunur.

### İç içe component'ler

Parçalar her zaman **en yakın** `[data-rc]` köküne aittir. Bir accordion'ın
içindeki video component'inin parçaları accordion'a sızmaz.

## CSS sınıfları

Kod, Webflow'un class'larına dokunmaz — ne okur ne yazar. Kodun tanımladığı tek
class ailesi `rc-` öneklidir ve sayısı azdır:

- `.rc-sr-only` — yalnız ekran okuyucuya görünür
- `.rc-skip-link` — içeriğe atlama bağlantısı
- `html.rc-js` — JavaScript çalıştı işareti

Durum, class ile değil `data-rc-state` ile ifade edilir. Gerekçe: Designer'da
bir combo class ile çakışma riski yok, ve HTML'e bakan biri durumun nereden
geldiğini görür.

## CSS değişkenleri

`--rc-` önekli. Component'e özel olanlar component adını taşır:

```
--rc-focus-ring
--rc-accordion-duration
--rc-accordion-easing
```

Webflow Variables'tan gelen tasarım token'ları da `--rc-` öneklidir ve
[`webflow/tokens/variables.reference.css`](../webflow/tokens/variables.reference.css)
içinde belgelenir — ama o dosya sitede yüklenmez.

## Commit mesajı

```
<alan>: <ne yapıldı>

accordion: tek açılır mod ekle
runtime: iç içe component'lerde parça sızıntısını düzelt
docs: CSS sahiplik sınırını yaz
```

Alan adı = klasör adı ya da component adı. Emoji, sürüm numarası, model adı yok.
