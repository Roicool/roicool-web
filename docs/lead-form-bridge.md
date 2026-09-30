| `allowedOrigins` | Kaç origin tanınıyor |
| `emailPolicy` | `corporate` mi `any` mi |
| `crmHost` | Hangi CRM adresine gidiliyor |
| `basePath` | Mount path (Webflow Cloud'da boş görünür, normaldir) |

### Sorun giderme

| Belirti                      | Sebep                                          |
| ---------------------------- | ---------------------------------------------- |
| `403 forbidden`              | Origin listede yok, ya da `Origin` başlığı yok |
| `422 missing_field`          | Zorunlu alan eksik, yanıtta hangisi yazar      |
| `422 invalid_phone`          | Cep numarası değil ya da TR öneki kapsam dışı  |
| Buton "Doğrulanıyor…" takılı | Turnstile jetonu gelmiyor, konsola bakın       |
| Form eski davranıyor         | Publish yapılmamış ya da tarayıcı önbelleği    |
| dataLayer'da `event_id` yok  | Eski bileşen yayında                           |
| Dönüşüm iki kez sayılıyor    | GTM'deki etiket `event_id` göndermiyor         |
| CRM'de utm alanları boş      | Attribution script'i head'de değil             |

Test gönderimi için `qa@roicool.com` gibi kurumsal bir adres kullanın; Gmail reddedilir.

---

## 17. Bilinen sınırlar ve alınmış kararlar

- **Virüs taraması yok.** Dosya kontrolü tür, boyut ve içerik imzasıyla sınırlı.
- **Telefon doğrulaması** numaranın biçimini ve aralığını kontrol eder, hattın gerçekten
  açık olduğunu bilmez.
- **CV indirme bağlantısı** tahmin edilemeyecek kadar uzun rastgele bir kimlik taşır ama
  bağlantıyı bilen herkes dosyayı indirebilir.
- **CRM'e ulaşılamadığında** ziyaretçi yine "teşekkürler" görür. Bilinçli tercih.
- **Onay mekanizması yok**, kişisel veri dataLayer'a düz metin olarak konur (§6).
- **56x cep öneki kapsam dışı.** 561 gerçek bir Turkcell öneki; geri istenirse tek satır.
- **Ad soyad ilk boşluktan bölünür.** CRM'le tutarlı olsun diye. Son boşluktan bölmeye
  geçilecekse CRM tarafıyla birlikte değişmeli, yoksa hash'ler ayrışır.
- **lp.roicool.com bu depodaki köprüyü kullanmıyor**, kendi vanilla script'i ve Payload
  backend'i var. `LEAD_ALLOWED_ORIGINS` içindeki girdisi kaldırılabilir.

---

## 18. Depo ve deploy

Depo: `Roicool/roicool-main`, dal `main`.

```
main'e push
   ├─► Webflow Cloud uygulaması          otomatik, birkaç dakika, Publish gerekmez
   └─► GitHub Actions
         ├─ testler + typecheck + bundle
         └─ devlink import → workspace    2-3 dakika
              └─► Webflow'da Publish      ELLE — bileşen bu olmadan ziyaretçiye ulaşmaz
```

Route değişikliği kendiliğinden canlıya çıkar. Bileşen değişikliği Publish bekler.

Yerel:

```bash
npm run typecheck
npm test
npm run build
npm run components:bundle   # yerel derleme kontrolü
```
