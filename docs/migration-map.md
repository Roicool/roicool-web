# Taşıma planı

Eski roicool.com → yeni Webflow sitesi. Bu dosya taşımanın kontrol listesi;
URL eşlemesinin kendisi makine okunur olarak
[`content/redirects.csv`](../content/redirects.csv) içinde durur.

## Durum

Henüz başlanmadı. Aşağıdaki iki girdi olmadan eşleme çıkarılamaz:

- [ ] Eski sitenin `sitemap.xml`'i (ya da tam URL listesi)
- [ ] Search Console'dan son 12 ayın en çok tıklanan sayfaları

> Not: bu oturumda roicool.com'a ağ erişimi yoktu, IA otomatik çıkarılamadı.

## Sıra

**1. Envanter.** Eski sitedeki her URL bir satır. Trafik ve backlink verisiyle
birleştirilir — hangi sayfanın kaybı pahalı, önce o bilinir.

**2. Eşleme.** Her eski yol için yeni karşılığı. Karşılığı olmayan sayfa ana
sayfaya değil, **en yakın üst sayfaya** yönlendirilir; ana sayfaya toplu
yönlendirme Google tarafından soft 404 sayılır ve sinyali yok eder.

**3. İçerik aktarımı.** Metinler `content/` altına taşınırken
[`geo.md`](./geo.md)'deki "tanım önce" kuralına göre gözden geçirilir. Taşıma,
metni yeniden yazmak için tek ve en ucuz fırsat.

**4. Yayın öncesi.**

- [ ] `content/redirects.csv` → Webflow › Site Settings › Publishing › 301 redirects
- [ ] Staging'in (`*.webflow.io`) robots.txt'i kapalı, canlının açık
- [ ] `canonical` ve `hreflang` her sayfada doğru
- [ ] JSON-LD blokları yerinde (`npm run build:seo`)
- [ ] Yeni `sitemap.xml` Search Console'a gönderildi

**5. Yayın sonrası — ilk 30 gün.**

- [ ] Hafta 1: Search Console › Coverage — 404 ve yönlendirme hatası taraması
- [ ] Hafta 2: en çok tıklanan 50 eski URL elle kontrol
- [ ] Hafta 4: trafik karşılaştırması; düşüş varsa kaynağı eksik redirect mi,
      içerik değişimi mi, ayrıştır

## Trafik kaybının bilinen sebepleri

Sırasıyla, en sık görülenden:

1. Eksik veya yanlış 301 — envanterdeki her satır eşlenmeli
2. Staging kopyasının indekslenmesi — `*.webflow.io` kapalı tutulmalı
3. Sayfa birleştirmede içerik kaybı — eski sayfa siliniyorsa metni yeni sayfaya taşı
4. `canonical`'ın eski alan adını göstermesi
5. Başlık ve meta açıklamaların kopyalanmaması
