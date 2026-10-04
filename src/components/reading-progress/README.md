# reading-progress

Yazı okundukça dolan ince çubuk. Gövdenin üstü ekranın üstüne gelince boş,
gövdenin sonu ekranın altına gelince dolu. Süs: `aria-hidden`, yerleşimi
değiştirmez (genişlik değil `scaleX`).

Tarayıcı kaydırmaya bağlı CSS animasyonunu destekliyorsa (`animation-timeline:
view()`) çubuk yalnız CSS'le, ana iş parçacığının dışında çalışır; kod
yalnız `aria-hidden` verir. Desteklemeyende kod kaydırmayı izler ve kökte
`--rc-reading-progress`'i (0–1) yazar.

## Designer'daki yapı

Genellikle `toc` ile aynı kökte, aynı `body` parçasıyla:

```
Div / Article   [data-rc="toc reading-progress"]
  Div           [data-rc-part="bar"]     ← dolgu; kökün içinde herhangi bir yerde
  …
  Rich Text     [data-rc-part="body"]    ← Blog › İçerik
```

- **bar:** tam genişlik dolgu: `position: fixed; top: 0; left: 0; width:
100%`, yükseklik (ör. 3px), renk, `z-index`. `transform` verme (kod ve
  CSS ölçekler). İlk boyamada boş başlar (kritik CSS).
- Bir sayfada birden fazla `bar` olabilir; hepsi aynı gövdeyi izler.

## JS yoksa, hareket azaltılmışsa

- **JS yok:** destekleyen tarayıcıda çubuk CSS'le çalışmaya devam eder;
  desteklemeyende boş kalır.
- **Reduced motion:** çubuk kaydırmayı izlemeye devam eder (hareketi
  kullanıcının kendi kaydırması).
