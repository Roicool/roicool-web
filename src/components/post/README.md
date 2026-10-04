# post

Blog yazısının zengin metninin kendi başına yapamadıkları: telefonda yana
kayan tablolar, kaynaklara çapa (`#kaynak-n`) ve yazı içi CTA'nın gövdenin
ortasına taşınması. Genellikle `toc` ile aynı kökte, aynı `body` parçasıyla:
`data-rc="toc reading-progress post"`.

## Designer'daki yapı

```
Article            [data-rc="toc reading-progress post"]   (+ isteğe bağlı data-rc-cta-before)
  …
  Rich Text        [data-rc-part="body"]      ← Blog › İçerik
  Div              [data-rc-part="cta"]       ← yazı içi CTA kutusu; gövdenin hemen altında
  …
  Rich Text        [data-rc-part="sources"]   ← Blog › Kaynaklar (numaralı liste)
```

- **Tablo:** gövdedeki tablolar sütundan genişse kendi kutusunda yana kayar
  (`display: block; overflow-x: auto`). Taşan tablo klavyeyle de kaydırılır
  (`tabindex="0"`). Tablo görünümü Designer'da, zengin metnin Tables
  stillerinde.
- **Kaynaklar:** n. madde `kaynak-n` çapasını alır. Gövdedeki dipnot linki
  yazının kendi adresi + `#kaynak-3` olur; tıklayınca o maddeye iner
  (yapışkan başlığın altında, `--rc-toc-offset`). Adres `#kaynak-3` ile
  açılırsa sayfa o maddeye iner.
- **CTA:** şablonda bir kez, gövdenin altına koy. Kod onu gövdedeki ortadaki
  H2'nin önüne taşır (8 H2'de 5.'nin önü). Yeri değiştirmek için kökte
  `data-rc-cta-before="3"`: 3. H2'nin önü. İkiden az H2 varsa ya da JS
  yoksa kutu yerinde, gövdenin altında kalır.

## Ayar (kökte)

| Attribute            | Ne                                                    |
| -------------------- | ----------------------------------------------------- |
| `data-rc-cta-before` | CTA hangi H2'nin önüne (1'den başlar); yoksa ortadaki |
