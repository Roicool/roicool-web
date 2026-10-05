# roicool-web

Roicool'un yeni Webflow sitesini besleyen ön yüz kütüphanesi.

Webflow Designer **görünümün** ve **içeriğin** sahibi. Bu repo yalnızca kodun
sahibi: davranış (JS), davranışsal stil (CSS) ve Designer'a yapıştırılan
snippet'ler. Hedefler: temiz HTML, yüksek erişilebilirlik, yüksek PageSpeed,
botların kolay taradığı yapı.

## Durum

**Geliştirme modu; sürüm tag'i henüz yok** (`package.json` 0.1.0'da bekliyor,
ilk tag canlıya çıkışta). Siteye giren
[`webflow/embeds/head.html`](./webflow/embeds/head.html): IX2 kapatıcı, `rc-js`
işareti, inline kritik CSS (odak halkası, skip link, `.rc-sr-only`, hero
başlangıç durumları), async `rc.css`, deferred `rc.js` (component keşfi,
site geneli yumuşak kaydırma, yüzen kaydırma çubuğu). Component'ler:
`marquee`, `hero`, `hero-video-scroll`, `carousel`, `hover-reveal`, `slideshow`,
`horizontal-scroll`, `image-trail`, `reveal`, `case-switcher`, `step-stack`,
`dock`, `reel`, `tabs`, `statistics`, `card-stack`, `website-ring`, `card-slider`, `paged-list`, `search`.

**Geliştirme modunda:** `head.html` `@main`'e bakar, her commit yayın demek
(`raw.githack.com` üzerinden, en geç 5 dakikada). Site canlıya çıkınca sürüm
tag'lerine geçilir — bkz.
[`docs/architecture.md › Sürümleme`](./docs/architecture.md#sürümleme).

## Geliştirme

```bash
npm install
npm run build        # src/ → dist/ + webflow/embeds/head.html (ikisi de commit'lenir)
npm test
npm run format
```

## Klasörler

| Klasör            | Ne var                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `src/runtime/`    | `rc.js` çekirdeği — component keşfi, DOM sözleşmesi, hareket tercihi, hata izleme (Sentry) |
| `src/a11y/`       | Planlandı, henüz yok: paylaşılan focus trap, live region                                   |
| `src/base/`       | Senkron yüklenen kritik CSS + global hareket politikası                                    |
| `src/components/` | Her component kendi klasöründe: js + css + README                                          |
| `src/effects/`    | Tek başına duran görsel efektler (component'e bağlı olmayan)                               |
| `webflow/`        | Designer'a yapıştırılan kod ve değişken referansı                                          |
| `assets/`         | İkon, marka görselleri, lottie kaynakları                                                  |
| `scripts/`        | Build araçları                                                                             |
| `dist/`           | **Üretilir ve commit'lenir** — CDN buradan servis eder                                     |
| `docs/`           | Mimari, isimlendirme, CSS sahipliği, erişilebilirlik, tarama, kurulum                      |

## Okuma sırası

1. [`docs/architecture.md`](./docs/architecture.md) — sistem nasıl çalışacak
2. [`docs/naming.md`](./docs/naming.md) — isimlendirme ve attribute sözleşmesi
3. [`docs/css-ownership.md`](./docs/css-ownership.md) — hangi CSS Designer'da, hangisi repo'da
4. [`docs/geo.md`](./docs/geo.md) — botların tarayabildiği HTML
5. [`docs/accessibility.md`](./docs/accessibility.md) — erişilebilirlik eşiği
6. [`docs/webflow-setup.md`](./docs/webflow-setup.md) — Designer tarafındaki kurulum

Ölçüm ve lead altyapısı (kaynağı başka repolarda, burada referans kopyası):

- [`docs/measurement.md`](./docs/measurement.md) — özet, bu repoya düşen parçalar, açık kararlar
- [`docs/server-side-tag-manager.md`](./docs/server-side-tag-manager.md) — sGTM kurulumu, kimlikler, doğrulama
- [`docs/lead-endpoint-contract.md`](./docs/lead-endpoint-contract.md) — CRM lead endpoint'inin kabul ettiği alanlar
- [`docs/lead-form-system.md`](./docs/lead-form-system.md) — form sistemi: bileşen, route, atıf, dataLayer, GTM, ChatGPT Ads
