# Lead endpoint sözleşmesi — kabul edilen ve dönen her değer

`POST https://crm.roicool.com/s/webhook/lead` için eksiksiz referans. Yalnızca form gönderimini
kapsar: istek nasıl okunur, hangi değerler kabul edilir, CRM ne türetir, hangi kayıtları yazar,
ne döner. Entegrasyon adımları (script'ler, Turnstile kurulumu, backend örneği) için
[`lead-endpoint-integration.md`](lead-endpoint-integration.md).

Bu belge koddan çıkarıldı (`inbound-lead.ts`, `lead-intake.ts`, `spam-guard.ts`,
`normalize.ts`, `lead-scoring.ts`, `channel.ts`, `email-domain.ts`, `industry.ts`,
`rejected-submission.ts`). Kod değişirse burası da değişmeli.

---

## 1. İstek

|             |                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Yöntem      | `POST`, gövde JSON (`Content-Type: application/json`)                                                                                                        |
| Kimlik      | `x-roicool-token: <LEAD_WEBHOOK_TOKEN>` header'ı **ya da** `?token=<LEAD_WEBHOOK_TOKEN>` query parametresi. Değer trim'lenir, sabit zamanlı karşılaştırılır. |
| Ek header   | `x-roicool-form-type` (isteğe bağlı; gövdede `formType` yoksa okunur)                                                                                        |
| İletilen IP | `cf-connecting-ip`, yoksa `x-forwarded-for`'un ilk adresi — yalnızca Turnstile doğrulamasına gider                                                           |
| Zaman aşımı | 30 sn                                                                                                                                                        |

İşlem sırası: **token → gövde JSON mu → alan okuma → spam kontrolü → kayıt**. Spam kontrolü
kaydın önündedir; spam sayılan gönderim kişi, fırsat, not ya da bildirim üretmez.

---

## 2. Kabul edilen alanlar

Hepsi isteğe bağlı. Tek zorunluluk spam kontrolünden geçmek için **geçerli bir e-posta ya da
en az 7 haneli bir telefon**. Bilinmeyen alanlar sessizce yok sayılır (honeypot listesindekiler hariç, §5).

### 2.1 Kimlik

| Alan                     | Alternatif adlar | Kabul edilen değer | Nasıl işlenir                                                                                                                                                                                                                                                        |
| ------------------------ | ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email`                  | —                | metin              | Trim + küçük harf. `@` yoksa **yok sayılır** (boş kabul edilir). Kişi eşlemesinin birincil anahtarı.                                                                                                                                                                 |
| `phone`                  | —                | metin, her format  | Rakam dışı her şey atılır. 7 haneden azsa yok sayılır. `0` ile başlayan 11 hane → `90…`; `5` ile başlayan 10 hane → `90…`. Ülke kodu 40 kodluk tablodan ayrıştırılır (en uzun kod önce; `971` `97`'yi ezer). Eşleşen kod yoksa tümü numara olarak, ülke boş yazılır. |
| `firstName` + `lastName` | —                | metin              | Verilirse olduğu gibi (trim).                                                                                                                                                                                                                                        |
| `fullName`               | `name`           | metin              | `firstName`/`lastName` yoksa boşluktan bölünür: **son kelime soyadı**, kalanı ad. Tek kelime → ad.                                                                                                                                                                   |
