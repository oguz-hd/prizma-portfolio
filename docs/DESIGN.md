# Tasarım Kararları

> Kaynak: trex-portfolio `docs/DESIGN.md`. § E (tayf içgörüsü), § F (karanlık tema),
> § G (tipografi) oradan AYNEN geçerli — burada özetlendi. § A (offline sanılmama)
> ve § B/D (dino) bu projede **yok**: maskot yok, o risk de yok.

---

## 0. Tez

> **Işık sitenin kendisi.** Açılış bir perde değil, merkezdeki prizmanın kurulma
> anı; slaytlar değiştikçe ışık başka açıyla girip tayfın başka rengini öne çıkarıyor.

Kökü trex-portfolio § E: CV'nin son satırı *teleskopla gözlem* — bir yıldızın ne
olduğu ışığını prizmadan geçirip tayfına ayırarak anlaşılır. Orada bu fikir renk
paletinin gerekçesiydi ve hero'nun sağ yarısında küçük bir prizmaydı; burada
sitenin omurgası.

## 1. Kullanıcının tarifi (Oturum 1)

| İstek | Karşılığı |
|---|---|
| Prizma animasyonuyla açılsın, sonra öğeler belirsin | `prism/intro.ts` — § 3 |
| Animasyon, merkezdeki prizma tasarımına dönüşsün | Açılışın son karesi = kalıcı sahne, hiçbir şey yerinden oynamıyor |
| Solda gelen ışık, sağda renk tayfı | `prism/PrismStage.tsx` — § 2 |
| Scroll'da sayfa kaymasın, bölümler slayt gibi gelsin | `deck/deck.ts` — § 4 |
| Dino sitesinin içeriği / istenen unsurlar geçerli | İçerik, iki dillilik, token sistemi, API aynen taşındı |

Soruyla netleşen üç karar: palet **Tayf** (tam gökkuşağı) · prizma **her slaytta
ortada** · **bölüm başına bir slayt** (taşan slayt içinde kayar).

## 2. Prizma — fizik ve kompozisyon

**Fizik** (`prism/optics.ts`): Snell yasası + BK7 camın Cauchy formülü, 60° tepe
açılı eşkenar prizma. Yayılım **10× abartılı** (gerçekte ~1.5°, burada ~16°).
trex'teki 25× yalnızca soğuk uç (390–500 nm) içindi; tam tayfta (390–700 nm) o
değer yelpazeyi 40°'ye açıyordu. Gelme açısı **40–62°** aralığında kalmalı —
dışında mor uç tam iç yansımaya giriyor (ölçüldü).

**Soğurma çizgileri**: Fraunhofer'in gerçek çizgileri — Hα 656 · Na D 589 · E 527 ·
Hβ 486 · G 431 · Ca II H+K 397/393. Aynı konumlar CSS maskesinde (`--fraunhofer`),
panel ve ayraçlardaki kısa tayf şeritlerinde.

**Renk**: `accents` mor → kırmızı sıralı; i. ton 400–680 nm arasına eşit dağılıyor
(`accentNm`). Ön ayar değişince tonlar değişir, yerleri değişmez.

**Kompozisyon**: prizmanın sınırlayıcı kutusu ekranın tam ortasında. Işık sol alttan,
ekranın dışından gelir; tayf sağa, hafif aşağı açılır. Böylece **üst orta ve alt orta
boş** kalır: isim üstte, tanıtım + bağlantılar altta. Orta satırın yüksekliği
prizmanın gerçek boyu (`--prism-box`) — metin prizmaya binmez.

**Ölçek**: masaüstünde `min(W·0.085, H·0.135)` px/birim (1440×900'de prizma 210 px
boyunda); telefonda `min(W·0.15, H·0.085)`. Telefonda etiket yok, şerit sağ kenardan
~50 px içeride (ray ile çakışmasın).

**Canlılık**: parlak slaytta açı ±1.6° yavaşça nefes alıyor; imlecin dikey konumu
±3.5° itiyor. İçerik slaytında nefes yok ve hiçbir şey değişmezse çizim atlanıyor.

## 3. Açılış (~3.4 sn)

```
0.0–1.2  yıldızlar belirir
0.3–1.2  prizmanın kenarları çizilir (pathLength=1 + dashoffset), arka yüz
1.0–1.7  beyaz ışık soldan gelir — ivmelenerek (power2.in), başı parlak huzme
1.7–2.5  camın içinden geçer, yelpaze açılır (power3.out) — çarpıp yavaşça ayrışma
2.3–2.9  şerit, soğurma çizgileri, slaytın tonu
2.3–3.3  içerik kademeli; en son üst çubuk ve ray
```
- Her girdi atlatır (yakalama evresinde — deck'ten önce, kilidi o açsın; ardından
  400 ms kilit: atlatan tuş slayt da değiştirmesin).
- Aynı oturumda ikinci açılış 3× hızlı. Hareket hassasiyetinde hiç yok.
- İçerik DOM'da baştan var; gizleme yalnızca `html[data-intro="pending"]`.
  Emniyet zamanlayıcısı süre + 1.5 sn'de son kareye sarar. Sekme gizliyse açılış
  görünür olunca başlar.
- Doğrudan bağlantıyla (`/#projeler`) gelinince açılış o slaytın içeriğini açar.

## 4. Slayt gösterisi

- 4 slayt: Giriş · Hakkımda · Projeler · İletişim (+ altbilgi). Belge kaymaz; her
  şey `position: fixed` katmanlarda.
- Girdi: tekerlek (30 px eşik; ataletin kalanı için 140 ms sessizlik şartı),
  dokunma (48 px), klavye (↓↑ PgDn PgUp Boşluk Home End), sayfadaki her `#slug`
  bağlantısı, geri tuşu. `gsap/Observer` planlanmıştı, **kullanılmadı**: iç içe
  kaydırmayı (taşan slayt) onunla doğru ayırmak mümkün değildi.
- **Taşan slayt**: içerik o yöne kayabiliyorsa önce o kayar; kenara yeni
  dayandıysa (250 ms) yeni bir hareket beklenir. Aşağıdan gelinen slayt dibinden açılır.
- Geçiş (~0.9 sn): giden bloklar süzülüp söner → gelen kademeli girer; aynı anda
  prizma yeni slaytın açısına süpürür, vurgulanan ışın solup yeni tonunda yanar.
  Slayt durumu geçişin **başında** değişir; animasyon yalnızca görsel.
- Ray: her slayt tayfta bir ton (giriş mor → iletişim kırmızı). Etiketler yalnızca
  üstüne gelince — kabın kenarına binmesinler. Üst çubuğun alt çizgisi ilerleme.
- Adres: giriş = kök adres; bağlantı tıklaması geçmişe ekler, tekerlek/klavye değiştirir.

## 5. Cam panel — "hep ortada" kararının bedeli

Prizma her slaytta ortada; içerik onun önünde yarı saydam bir panelde
(`--surface` %48 + 6 px bulanıklık). İçerik slaytlarında sahne %80'e kısılır,
tayf etiketleri söner.
⚠️ İlk deneme (%72 + 18 px, sahne %50) prizmayı **tamamen kaybediyordu** — karar
ekranda karşılıksız kalıyordu. Ölçülüp inceltildi. Bulanıklık desteklenmezse panel opak.

## 6. 404 · "404 nm"

Aynı prizma, tayfta tek karanlık çizgi: **404.66 nm, cıvanın gerçek "h" çizgisi**.
"Bu dalga boyunda bir sayfa yok — aradığın sayfa orada soğurulmuş." Şaka fiziğin
kendisiyle kuruluyor. `noindex`.

## 7. Erişilebilirlik & performans

- Sahne, yıldızlar, ray işareti dekoratif → `aria-hidden`. Tüm metin gerçek HTML.
- Pasif slaytlar `inert` + `aria-hidden`; klavye/bağlantıyla gelinince odak başlığa.
- Hareket hassasiyeti: açılış yok, geçiş anında, prizma tek kare (ölçüldü).
- Yalnızca transform/opacity anime ediliyor; prizma SVG öznitelikleri tek ticker'da.
- Ölçüm (başsız Chrome, 4× işlemci yavaşlatma): giriş 58 fps, içerik slaytı
  57 fps, geçiş 48 fps — geçişin başında tek bir ~114 ms kare (yeni slaytın ilk
  boyanması; gerçek hızda ~28 ms). İleride gerekirse ilk kez gösterilecek slaytlar
  önceden boyatılabilir.

## 8. Ekranda yakalanan hatalar (Oturum 1)

1. **Kesik kesik prizma.** `vector-effect: non-scaling-stroke` + `pathLength` birlikte
   çalışmıyor; kesik çizgi piksele düşüyor. Ön yüz vector-effect'siz, kalınlık JS'ten.
2. **Baştan sona mor tayf.** SVG gradyan duraklarının ofsetleri belge sırasında
   artmalı; tersi yazılınca hepsi ilk durağa yığılıyor. Gradyan alttan (mor) üste.
3. **`Deck.tsx` ↔ `deck.ts`.** Windows'ta fark yok, konteynerde (Linux) tsc karıştırıyor.
   Bileşen `SlideDeck.tsx`.
4. **Panel kenarından taşan etiketler** ("+K", "9") → etiketler parlaklığa bağlı söner.
5. Test tuzağı: `/` açıkken `/#x`'e gitmek sayfayı YENİLEMEZ (aynı belge) — eski
   modülle ölçülür. Yenile ya da sorgu ekle.

## 9. Taşınan kurallar (trex-portfolio § E/F/G)

- **Karanlık tema**: saf siyah yok (`#070A12`), saf beyaz metin yok, kontrast ≥ 4.5:1,
  gökkuşağı gradyan olarak (palet olarak değil), bilgi yalnızca renkle taşınmaz.
- **Tipografi**: Cabinet Grotesk (başlık) · Satoshi (gövde) · Departure Mono (etiket,
  11 px'in katları). Kendi sunucumuzda. Inter / Space Grotesk kullanılmaz.
- Bağlantı etiketleri büyük harfe çevrilmez (`lang="tr"` "GİTHUB" yapıyordu).

## 10. Oturum 2 — kullanıcı geri bildirimi (hepsi ekranda doğrulandı)

| İstek | Karşılığı |
|---|---|
| Prizma renkleri daha parlak, göz alıcı | Tayf %62 opak; altında bulanık + doygun hale (`.prism-glow`, aynı şekillerin `<use>` kopyası); camda soluk gökkuşağı, sol kenarda parıltı |
| Prizma fareye bağlı olmasın, kendi hareket etsin (mobil) | İmleç takibi kalktı. İki dalgalı salınım (±3.6° + ±1.1°) + ışık darbeleri: huzmede parçacık → tayfta dikey dalga, 3.4 sn tur, aynı anda 2 |
| İsim, prizmayı çevreleyen dairenin üst yayında; bağlantılar alt yayında; motto yok | `Hero.tsx`: SVG `textPath`, yarıçap `min(W·0.3, H·0.37)`; isim ~85° yaya yayılır, büyük harf. Ekran okuyucu için görünmez `<h1>` |
| Üst çubukta alt çizgi olmasın, isim olmasın, menü solda | İlerleme çizgisi ve isim kalktı; zemin sert kenar yerine aşağı sönüyor |
| Üçgen parlak, içi rengarenk | `conic-gradient` + `@property --spin` ile dönen tayf, `drop-shadow` ışıma |
| Hakkımda'dan mezuniyet bilgisi kalksın | bio'nun ilk paragrafı çıktı (site.ts + seed.py); bilgi eğitim kaydının notunda |
| Projeler kalksın, yerine Deneyim ve Eğitim | Yeni slayt (`Experience.tsx`); proje kayıtları içerikte duruyor, bölüm eklenirse geri gelir |
| En alt daha iyi, temaya uygun | İletişim = kapanış karesi: panel yok, prizma tam parlak, açılışın aynası |
| Header'daki font tüm sitenin fontu | Yalnızca Departure Mono; ölçek 11'in katları (§ 11 kuralı). Cabinet Grotesk / Satoshi silindi |

Yakalanan: isim ilk denemede yayın ~110°'sine yayılıyordu, ekranda ~150° okunuyordu
(harfler yarıçapa göre iri) → ~85°. Telefonda "Deneyim ve Eğitim" üst çubuğu taşırıp
dil seçiciyi ekran dışına itiyordu → menü yatay kayıyor. Alt yay bağlantıları telefonda
22px'te dikleşiyordu → 11px + saydam kalın çerçeve (dokunma alanı).
Ölçüm (4× işlemci yavaşlatma): giriş 102 fps, içerik 112 fps, geçişte en uzun kare 47 ms.
