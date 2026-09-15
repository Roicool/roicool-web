# content/

Sitenin makine okunur içerik kaynağı. Burada yazılan şey üç yere birden gider:
Webflow'daki görünür metin, sayfa head'indeki JSON-LD ve `llms.txt`. Aynı cümle
üç yerde de aynı olur — yapılandırılmış veriyle görünen sayfanın çelişmesi hem
Google yönergelerine aykırı hem de yanıt motorlarında güven kaybı.

## Yapı

```
content/
  organization.yml        kurum kimliği — dilden bağımsız alanlar + dilli açıklama
  redirects.csv           eski roicool.com → yeni URL (301 haritası)
  tr/
    services/<slug>.yml   hizmet: tanım, kime, nasıl, SSS
    glossary/<slug>.yml   kavram tanımları
    faq/<slug>.yml        sayfaya bağlı SSS setleri
  en/
    …aynı yapı
```

Dosya adı = URL slug'ı. `tr/services/pazarlama-analitigi.yml` →
`/tr/hizmetler/pazarlama-analitigi`. İki dilde slug'lar farklı olabilir; eşleme
dosyanın içindeki `slug` alanındadır, dosya adı kanonik anahtardır.

## Yazım kuralı — tanım önce

Her `definition` alanı **tek başına alıntılanabilir** olmalı: soruyu ilk cümlede
yanıtlar, özneyi tekrar eder, bağlam gerektirmez.

İyi: "Pazarlama analitiği, reklam harcamasının hangi gelire dönüştüğünü ölçen
veri çalışmasıdır."

Kötü: "Bunu biz sizin için yapıyoruz." — özne yok, alıntılanamaz.

Gerekçe ve tam kural seti: [`docs/geo.md`](../docs/geo.md).

## Şema

`services/<slug>.yml`:

```yaml
slug: pazarlama-analitigi
name: Pazarlama Analitiği
definition: Tek cümlelik, alıntılanabilir tanım.
audience: Kime — tek cümle.
faq:
  - question: …
    answer: …
related: [veri-gorsellestirme] # aynı dildeki diğer slug'lar
updated: 2026-09-15
```

`glossary/<slug>.yml`:

```yaml
slug: roas
term: ROAS
definition: ROAS, reklam harcamasının getirdiği geliri ölçen orandır.
alsoKnownAs: [Return on Ad Spend]
updated: 2026-09-15
```
