# CSS kime ait?

Kısa cevap: **görünüm Designer'ın, mekanik repo'nun.** Uzun cevap aşağıda —
çünkü bu sınır net olmazsa iki taraf birbirini ezer ve hangi dosyayı
değiştireceğini kimse bilemez.

## Karar testi

> Bunu Designer'da tıklayarak yapabiliyor muyum?

**Evet ise Designer'da yap.** Boşluk, tipografi, renk, kenarlık, gölge, grid,
flex, breakpoint, hover rengi — hepsi Designer'ın. Repo'ya yazılırsa Designer'da
gördüğün şey gerçeği yansıtmamaya başlar, bu da en pahalı hata türü.

**Hayır ise repo'ya yazılır.** Pratikte şunlar:

| Repo'ya ait                              | Neden Designer yapamaz                   |
| ---------------------------------------- | ---------------------------------------- |
| `[data-rc-state]` geçişleri              | Durum JS tarafından basılıyor            |
| Açılma/kapanma mekaniği (`0fr → 1fr`)    | Designer bu selector'ü üretemez          |
| `@keyframes`                             | Designer'da tanımlanamaz                 |
| `:has()`, `:focus-visible`, `:where()`   | Designer selector yazdırmaz              |
| `@media (prefers-reduced-motion)`        | Designer'da yok                          |
| `@media (forced-colors)`, `@media print` | Designer'da yok                          |
| `.rc-sr-only`, `.rc-skip-link`           | Erişilebilirlik altyapısı, tasarım değil |
| `.rc-align-middle`                       | `vertical-align` Designer'da yok         |

## Çakışmayı mimariyle önlüyoruz

Component CSS'leri iki tür kural içerecek ve ikisi kasıtlı olarak farklı
davranacak:

**MECHANIC** — normal specificity, kazanmak zorunda. Bunları Designer'dan
ezersen component bozulur. CSS dosyasında `MECHANIC` etiketiyle işaretlenir.

**LOOK** — `:where()` içine sarılır, specificity'si sıfırdır. Aynı elemana
Designer'dan verdiğin herhangi bir class, `!important` gerekmeden bunu ezer.
Yani repo'daki görünüm kuralları **varsayılandır, dayatma değil**.

```css
/* MECHANIC — kazanmak zorunda */
.rc-js [data-rc~="accordion"] [data-rc-part="panel"] {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--rc-accordion-duration) ease;
}

/* LOOK — Designer istediği gibi ezer */
:where([data-rc~="accordion"] [data-rc-part="trigger"]) {
  width: 100%;
  cursor: pointer;
}
```

Ayarlanabilir her değer bir CSS değişkenidir:

```css
[data-rc~="accordion"] {
  --rc-accordion-duration: 200ms;
}
```

Bunu Designer'da sayfa ya da site custom code alanına yazman yeterli — repo'ya
dokunmadan zamanlamayı değiştirmiş olursun.

## "Bu CSS'i repo'ya ekle" demek istediğimde

Söylemen yeterli, ama nereye koyacağımız yazdığın şeye göre değişir:

- **Bir component'e ait** → `src/components/<name>/<name>.css`
- **Site geneli ve Designer gerçekten yapamıyor** → `src/base/site.css`
- **Designer yapabiliyor ama sen kodda tutmak istiyorsun** → yine
  `src/base/site.css`, ama **neden Designer'da olmadığını tek satır yorum olarak
  yazarız.** Bu kural olmadan o dosya altı ay içinde çöp çekmecesine döner.

`src/base/site.css` içindeki yorumsuz her blok, code review'da Designer'a geri
taşınmak üzere işaretlenir.

## Yükleme sırası ve specificity

Webflow'un kendi CSS'i `<head>`'de, `rc.css` ondan sonra async gelecek. Kaynak
sırası bizim lehimize — ama buna **güvenmiyoruz**, çünkü async yükleme sırası
garanti değil. Kazanan tarafı her zaman specificity belirler: MECHANIC
kuralları normal specificity'de, LOOK kuralları `:where()` ile sıfırda. Bu
yüzden `!important` kullanılmaz — tek istisna `motion.css`'teki
`prefers-reduced-motion` bloğu, ki o da Designer'da elle yazılmış geçişleri
durdurmak için var.
