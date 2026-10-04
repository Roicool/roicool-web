# copy

Panoya kopyalayan düğme: sayfanın linki ya da yazının Markdown'ı (başlık,
link, gövde) — not uygulamasına, bir yapay zeka sohbetine yapıştırmak için.

Düğmenin metinleri HTML'de (kural 1): `label` normalde, `done`
("Kopyalandı") kopyaladıktan sonra iki saniye görünür; kod yalnız
aralarında geçiş yapar (kökte `copied`). Markdown sayfadan okunur ve yalnız
panoya gider, sayfaya yazılmaz.

## Designer'daki yapı

```
DOM `button`   [data-rc="copy"]                            ← linki kopyala
  DOM `span`   [data-rc-part="label"]   "Linki kopyala"
  DOM `span`   [data-rc-part="done"]    "Kopyalandı"
DOM `button`   [data-rc="copy"] [data-rc-content="markdown"] ← Markdown olarak kopyala
  DOM `span`   [data-rc-part="label"]   "Markdown olarak kopyala"
  DOM `span`   [data-rc-part="done"]    "Kopyalandı"
```

Görünüm Designer'ın (ikon `label`'ın yanında olabilir). `label` ve `done`'a
`display` verme; kod hangisinin görüneceğini seçer.

## Ayarlar (kökte)

| Attribute         | Değer                           | Ne                                                      |
| ----------------- | ------------------------------- | ------------------------------------------------------- |
| `data-rc-content` | `link` (varsayılan), `markdown` | Ne kopyalanır                                           |
| `data-rc-source`  | CSS seçicisi                    | Markdown'ın gövdesi; varsayılan `[data-rc-part="body"]` |

- **Link:** sayfanın canonical adresi; yoksa `#`'siz adres.
- **Markdown:** `# H1`, link, `---`, gövde. Başlıklar, kalın/eğik, linkler
  (tam adres), iç içe listeler, alıntı, kod, görsel + altyazı, tablo
  (GitHub biçimi). Gizli öğeler (`aria-hidden`, script, form) atlanır.

## JS yoksa

Düğme bir şey yapamayacağı için gösterilmez.

## Erişilebilirlik

- Gerçek `<button>`; adı `label`'dan.
- `done` kod tarafından `role="status"` alır: görününce ekran okuyucu
  "Kopyalandı" der.
