# GEO — yanıt motorları ve tarayıcı botları için yapı

GEO (Generative Engine Optimization), sitenin bir yanıt motoru tarafından
**anlaşılıp alıntılanabilir** olmasıdır. Klasik SEO sıralamayı hedefler; GEO
cümlenin kaynak olarak gösterilmesini hedefler. İkisi çelişmez, ama GEO daha
katı: bot sayfayı okuyamıyorsa sıralama tartışması başlamıyor bile.

## Demir kural: JS içerik üretmez

Metin, başlık, liste, tablo, fiyat, SSS cevabı — hepsi ilk HTML yanıtında
bulunur. JS yalnızca davranış ekler.

Gerekçe pratik: Googlebot JavaScript çalıştırır ama render kuyruğu gecikmelidir;
GPTBot, ClaudeBot, PerplexityBot ve benzerleri **çoğunlukla çalıştırmaz**. JS ile
enjekte edilen bir cümle bu motorlar için yoktur.

Uygulamadaki karşılığı: bir şeyi gizleyen her CSS kuralı `.rc-js` önekiyle
yazılır. JS çalışmazsa içerik açık kalır. Accordion component'i bunun örneğidir
— kapalı panel `inert` alır ama metni belgede durur.

```css
/* Doğru */
.rc-js [data-rc~="accordion"] [data-rc-part="panel"] {
  grid-template-rows: 0fr;
}

/* Yanlış — JS gelmezse içerik sonsuza dek kapalı */
[data-rc~="accordion"] [data-rc-part="panel"] {
  grid-template-rows: 0fr;
}
```

## Sayfa yapısı

- Sayfa başına **tek `<h1>`**, sonra atlamasız `h2` → `h3`.
- Landmark'lar gerçek etiketlerle: `<header>`, `<nav>`, `<main id="main">`,
  `<aside>`, `<footer>`. Designer'da bir div'i section yapmak bir tık.
- Her bölüm bir başlıkla açılır. Başlıksız bölüm, bir yanıt motoru için bağlamı
  olmayan metindir.
- Görseller: anlam taşıyorsa açıklayıcı `alt`, dekoratifse `alt=""`.
- Bağlantı metni tek başına anlamlı: "Fiyatlandırmayı incele", "buraya tıkla"
  değil.

## Yazım — tanım önce

Her bölüm ilk cümlede soruyu yanıtlar, özneyi tekrar eder ve bağlam gerektirmez.
Bir yanıt motoru paragrafı bağlamından kopararak alıntılar; o cümle tek başına
ayakta durmalı.

|     |                                                                                              |
| --- | -------------------------------------------------------------------------------------------- |
| ✅  | "Pazarlama analitiği, reklam harcamasının hangi gelire dönüştüğünü ölçen veri çalışmasıdır." |
| ❌  | "Bunu biz sizin için yapıyoruz."                                                             |

Sayı, tarih ve kaynak, alıntılanma olasılığını belirgin biçimde artırır. "Çok
sayıda müşteri" yerine "40 müşteri"; "geçen yıl" yerine "2025".

## Yapılandırılmış veri

Her sayfada, `<head>` içinde, statik `<script type="application/ld+json">`:

| Kapsam                | Tür                                                           |
| --------------------- | ------------------------------------------------------------- |
| Her sayfa             | `Organization` (site geneli) + `BreadcrumbList`               |
| Hizmet sayfası        | `Service`                                                     |
| Blog / makale         | `Article` — `author`, `datePublished`, `dateModified` zorunlu |
| SSS bölümü olan sayfa | `FAQPage`                                                     |

Bloklar `content/` içinden üretilir (`npm run build:seo`), elle yazılmaz.
Gerekçe: yapılandırılmış veri ile görünen sayfanın çelişmesi Google yönergelerine
aykırıdır ve yanıt motorlarında güven kaybettirir. Tek kaynaktan üretilirse
çelişemezler.

## URL ve dil

- Kalıcı, okunabilir, kısa yollar. Tarih ve id yok.
- Dil öneki yol üzerinde: `/tr/...`, `/en/...`.
- Her sayfada tek `canonical`, kendi diline işaret eder.
- Diller arasında `hreflang` + `x-default`.
- **Taşımada:** eski sitedeki her yol `content/redirects.csv` içinde bir satır
  alır. Taşıma sonrası trafik kaybının birinci sebebi eksik 301'dir.

## robots.txt ve llms.txt

**robots.txt** — Webflow › Site Settings › SEO › robots.txt. Yanıt motorlarında
görünmek istiyorsak AI tarayıcıları açıkça engellenmez (varsayılan davranış
zaten izin vermektir; yanlışlıkla eklenmiş bir `Disallow` olmadığından emin ol).
Staging alan adı (`*.webflow.io`) tamamen kapalı olmalı — aksi halde staging
kopyası gerçek siteyle çift içerik üretir.

**llms.txt** — sitenin ne olduğunu ve önemli sayfaların nerede olduğunu düz
metinle anlatan, kök dizinde (`/llms.txt`) durması gereken dosya.

> ⚠️ **Açık konu.** Webflow kök dizine rastgele dosya koymaya izin vermiyor.
> `/llms.txt` yayınlamak için ya sitenin önüne bir proxy (Cloudflare Worker) ya
> da bir Webflow Cloud app gerekiyor. Şu anki kapsamda ikisi de yok. Dosya
> `content/`'ten üretilebilir durumda tutulacak, yayın yolu ayrı bir karar.

## Sayfa yayına çıkmadan önce

- [ ] Tek `h1`, hiyerarşik başlıklar
- [ ] `<main id="main">` var ve skip link ona gidiyor
- [ ] JS kapalıyken tüm metin okunabiliyor
- [ ] `canonical` + `hreflang` doğru
- [ ] JSON-LD var ve sayfadaki metinle birebir uyuşuyor
- [ ] Görsellerde `alt`
- [ ] Eski URL varsa `content/redirects.csv`'de satırı var
