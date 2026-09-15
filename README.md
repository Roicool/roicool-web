# roicool-web

Roicool'un yeni Webflow sitesini besleyen ön yüz kütüphanesi.

Webflow Designer **görünümün** sahibi. Bu repo **davranışın** (JS), **davranışsal
stilin** (CSS) ve **makine okunur içeriğin** (JSON-LD, `llms.txt`) sahibi. İkisi
tek bir sözleşmede buluşur: `data-rc-*` attribute'ları.

## Siteye nasıl bağlanır

Webflow → Site Settings → Custom Code → Head bölümüne
[`webflow/embeds/head.html`](./webflow/embeds/head.html) yapıştırılır. Hepsi bu.
Sayfaya component eklemek için Designer'da attribute yazmak yeterli — ayrı
script etiketi, init bloğu, sıralama derdi yok.

```html
<section data-rc="accordion" data-rc-single>
  <div data-rc-part="item">
    <button data-rc-part="trigger">Roicool ne yapar?</button>
    <div data-rc-part="panel"><div>…</div></div>
  </div>
</section>
```

Runtime bu elemanı görünce `dist/components/accordion.js` dosyasını getirir.
Sayfanın kullanmadığı hiçbir component indirilmez.

## Geliştirme

```bash
npm install
npm run build        # src/ → dist/  (dist/ commit'lenir, jsDelivr oradan servis eder)
npm run build:seo    # content/ → dist/seo/*.jsonld
npm test
npm run format
```

## Klasörler

| Klasör            | Ne var                                                                            |
| ----------------- | --------------------------------------------------------------------------------- |
| `src/runtime/`    | `rc.js` çekirdeği — component keşfi, DOM sözleşmesi, hareket tercihi, log         |
| `src/a11y/`       | Paylaşılan erişilebilirlik yardımcıları (focus trap, live region)                 |
| `src/base/`       | Senkron yüklenen kritik CSS + global hareket politikası                           |
| `src/components/` | Her component kendi klasöründe: js + css + README                                 |
| `src/seo/`        | JSON-LD üreticileri (build zamanında, Node'da çalışır)                            |
| `content/`        | GEO'nun kaynağı — kurum kimliği, hizmet tanımları, sözlük, SSS, redirect haritası |
| `webflow/`        | Designer'a yapıştırılan kod ve değişken referansı                                 |
| `assets/`         | İkon, marka görselleri, lottie                                                    |
| `scripts/`        | Build araçları                                                                    |
| `dist/`           | **Üretilir ve commit'lenir** — CDN buradan servis eder                            |
| `docs/`           | Mimari, isimlendirme, erişilebilirlik, GEO ve Webflow kurulum kuralları           |

## Okuma sırası

1. [`docs/architecture.md`](./docs/architecture.md) — sistem nasıl çalışır
2. [`docs/naming.md`](./docs/naming.md) — isimlendirme ve attribute sözleşmesi
3. [`docs/geo.md`](./docs/geo.md) — içerik ve tarama kuralları
4. [`docs/accessibility.md`](./docs/accessibility.md) — erişilebilirlik eşiği
5. [`docs/webflow-setup.md`](./docs/webflow-setup.md) — Designer tarafındaki kurulum
