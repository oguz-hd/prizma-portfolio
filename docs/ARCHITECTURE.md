# Mimari

> trex-portfolio'dan taşındı (28.09.2026). Oradaki kararlar (07.09.2026, Oturum 3)
> burada da geçerli: yığın, içerik modeli, API, "renkler veri", iki dillilik.
> Ön yüzün prizma/slayt katmanı → `DESIGN.md`. Admin panel ve `content.json`
> bağlantısı henüz yapılmadı (aşağıda "Faz 6/7/8" diye geçen işler).
>
> Site statik bir sayfa değil: **React ön yüz + admin panelli, içerik yönetilebilir bir uygulama.**

---

## 1. Neden bu değişiklik önemli

Kullanıcı admin paneli isteyince proje bir "portfolyo sayfası" olmaktan çıkıp
**tam yığın bir ürüne** dönüştü. Bu, sitenin tezini güçlendiriyor:

> "Bu siteyi yaptım" → "Bu siteyi **ve onu yöneten sistemi** yaptım."

CV'deki *Üniversite Proje Portalı (React.js + FastAPI + MySQL)* ile aynı şekle sahip —
yani kanıtlanmış zemin, öğrenilecek yeni bir şey yok. Risk düşük.

---

## 2. Yığın

| Katman | Seçim | Gerekçe |
|---|---|---|
| Ön yüz | **React + Vite + TypeScript** | Kullanıcı React istedi. Vite hızlı, yapılandırması az. |

> ⚠️ **TypeScript 7** kullanılıyor — Go tabanlı yeniden yazılmış derleyici.
> Bugüne kadar sorun çıkarmadı. Beklenmedik bir tsconfig sorunu çıkarsa
> **`typescript@5.9`'a düşülecek** — küçük bir geri dönüş, riski düşük.
> Vite 8 bundler olarak **Rolldown** kullanıyor; bunun bu makinede yarattığı
> kısıt için → `docs/CALISTIRMA.md`.
| Animasyon | **GSAP** | Açılış ve slayt geçişi zaman çizelgeleri; prizma GSAP ticker'ında çiziliyor → `DESIGN.md` |
| Backend | **FastAPI (Python)** | CV'de var, aynı şekilde bir proje zaten yapılmış. Otomatik OpenAPI dokümanı bedava. |
| Veritabanı | **SQLite → (gerekirse) MySQL** | Tek kullanıcılı bir CMS için SQLite fazlasıyla yeterli, sıfır kurulum. Şema aynı kaldığı için MySQL'e geçiş sonradan kolay. |
| Kimlik doğrulama | **JWT + tek admin kullanıcı** | Çok kullanıcı yok, karmaşıklığa gerek yok. Parola `argon2`/`bcrypt` ile hash'lenir. |
| Stil | **CSS custom properties** | ⚠️ Zorunlu — sebebi § 4'te |

### Alternatif (değerlendirildi, seçilmedi)
**Next.js + Postgres + Vercel** — tek deploy, daha kolay barındırma. Seçilmedi çünkü
FastAPI kullanıcının CV'sinde ve site kendi yığınının kanıtı olmalı. Barındırma
biraz daha iş, ama kazanç daha büyük.

---

## 3. Yayın akışı — hız pazarlık konusu değil

`curious.page` kuralı: **"Hız pazarlık konusu değil."** Her sayfa açılışında veritabanına
gitmek bu kuralı çiğner. Çözüm:

```
   ADMIN                          PUBLIC
   ─────                          ──────
   panelde düzenle
        ↓
   POST /api/admin/...
        ↓
   veritabanına yaz
        ↓
   ★ content.json ANLIK GÜNCELLENİR  ────────►  React uygulaması
     (tek dosya, tüm site içeriği)              yalnızca bu dosyayı okur
                                                → veritabanı sorgusu YOK
                                                → CDN'de önbelleklenebilir
                                                → statik site hızı
```

**Kazanç:** Statik sitenin hızı + CMS'in esnekliği. Ziyaretçi tarafı veritabanını hiç görmez.
Admin paneli çökse bile site ayakta kalır.

---

## 4. ⚠️ En kritik karar: Renkler veri olacak

Kullanıcı **panelden renkleri değiştirebilmek** istedi. Bu, tek bir teknik zorunluluk doğuruyor:

**Hiçbir renk CSS'e sabit yazılamaz.** Her renk bir CSS custom property olmalı ve
değeri `content.json`'dan gelmeli:

```html
<style>
  :root{
    --ground:#080B12;
    --lead:#34D399;
    /* ... hepsi veriden enjekte edilir */
  }
</style>
```

Bu karar **şimdi** verilmek zorunda. Sonradan dönmek, yazılmış her bileşene tek tek
girmek demek.

### ⚠️⚠️ Ve daha büyük bir tehlike

**Serbest renk seçici, tasarımı yok eder.**

Panelde ham bir renk seçici (color picker) koyarsak, kullanıcı bir gün metni
zemine yakın bir renge çekip **siteyi okunmaz** hâle getirebilir. Ya da Tayf sistemini
bozup ortaya alakasız bir palet çıkabilir. Ya da — en tehlikelisi — renkleri griye
çekip siteyi **offline sayfası görünümüne** geri düşürebilir (`DESIGN.md` § A / K1).

Yani "renkleri düzenleyebilme" özelliği, dikkatsiz yapılırsa projenin tüm tasarım
savunmasını tek tıkla siler.

### Çözüm: kısıtlı düzenleme

| ❌ Yapmayacağımız | ✅ Yapacağımız |
|---|---|
| Her renk için ham color picker | **Palet ön ayarları** (AURORA, TAYF, YILDIZ TAYFI, TURBO) — tek tıkla geçiş |
| Sınırsız özgürlük | Ön ayar üzerinde **sınırlı ince ayar** (lider renk, vurgu) |
| Sessiz kaydetme | **Kaydetmeden önce kontrast doğrulama** — 4.5:1 altındaysa uyar/reddet |
| Kör kaydetme | **Canlı önizleme** — kaydetmeden önce sonucu gör |
| — | **"Varsayılana dön"** butonu her zaman erişilebilir |

> Bu, kısıtlama değil **özellik**. "Renk seçici yaptım"dan çok daha iyi bir portfolyo
> maddesi: *"tasarım sisteminin farkında olan, kontrastı doğrulayan bir yönetim paneli yaptım."*

---

## 5. İçerik modeli

```
site_settings   tema ön ayarı, token geçersiz kılmaları, meta/SEO, OG görseli
profile         ad, unvan, konum, kısa bio, uzun bio, foto
skills          gruplu yetenek listesi (grup adı + not çevrilir, items çevrilmez)
experience      kurum, rol, dönem, not        ─┐ aynı şekil, tek bileşen render ediyor
education       kurum, rol, dönem, not        ─┘
projects        başlık, slug, özet, açıklama, tech[], repo_url, live_url,
                görsel, sıra, yayında mı
links           etiket, url, ikon, sıra          (github, linkedin, e-posta)
sections        "hakkımda" vb. serbest içerik blokları
posts           blog yazıları                     (Faz 7 — sonra)
media           yüklenen görseller
admin_user      tek kullanıcı, hash'li parola
translations    ★ (entity, entity_id, field, locale, value) — iki dillilik
```

### ★ İki dillilik (karar: Oturum 7)

Site **TR + EN**. Yalnızca *düzyazı* çevriliyor:

| Çevrilir | Çevrilmez |
|---|---|
| title, summary, description, bio, tagline, heading, body, label, meta* | id, slug, href, icon, order, published, tech[], preset, name |

Aynı URL'yi ya da `tech[]` listesini iki dilde tutmak **kaymaya davetiye çıkarır** —
biri güncellenip diğeri unutulur. Bu yüzden yapısal veri tek kaynakta.

Koşul (Faz 5): `translations(entity, entity_id, field, locale, value)` tablosu.
Ön yüzde karşılığı `Localized<T> = Record<Locale, T>` (`web/src/i18n/types.ts`).

### ★ Arayüz metni ≠ içerik (karar: Oturum 9)

`content/site.ts` → **içerik**, panelden düzenlenecek (Faz 7).
`i18n/strings.ts` → **arayüz metni** ("Deneyim", "Bana yaz"), tasarımın parçası.

Aynı ayrım `theme.css ↔ presets.ts`'te de var: **sabit sistem ↔ düzenlenebilir veri.**
Panel şeması (Faz 7) yalnızca içeriği kapsayacak, arayüz metinlerini değil.

> Bu ayrım bir hatadan doğdu: `About.tsx`'te "Deneyim"/"Eğitim" sabit yazılmıştı,
> İngilizce'ye geçince Türkçe kalıyordu. Aynı hatanın ikinci yüzü `skills.items`
> içindeydi — "çevrilmez" alana açıklama konmuştu.

⚠️ **Bileşenler dili bilmiyor.** `useContent()` çözülmüş (düz string) içerik
döndürüyor. Faz 7'de panel çeviri alanlarını yan yana düzenletmeli — dil başına
ayrı kayıt değil, aynı kaydın iki dili.

## 6. API yüzeyi

```
GET   /api/content              → tüm site, tek JSON (public, önbelleklenir)
POST  /api/auth/login           → JWT
GET   /api/auth/me

GET   /api/admin/{kaynak}       ┐
POST  /api/admin/{kaynak}       │ kimlik doğrulama gerektirir
PATCH /api/admin/{kaynak}/{id}  │
DEL   /api/admin/{kaynak}/{id}  ┘

POST  /api/admin/media          → görsel yükleme
POST  /api/admin/theme/validate → kontrast kontrolü (kaydetmeden önce)
```

## 7. Klasör düzeni (planlanan)

```
trex-portfolio/
├─ docs/                  notlar (mevcut)
├─ research/              araştırma (mevcut)
├─ web/                   React + Vite + TS  — halka açık site
│  ├─ src/prism/          ★ prizma: optik, sahne, açılış (SVG + GSAP)
│  ├─ src/deck/           slayt gösterisi
│  ├─ src/theme/          token sistemi, content.json'dan beslenir
│  └─ src/sections/
├─ admin/                 React — yönetim paneli (ayrı build)
└─ api/                   FastAPI + SQLite
```

**Not:** `admin/` ayrı bir build. Ziyaretçi panel kodunu asla indirmez — hem hız hem
güvenlik kazancı.

---

## 8. Açık konular

### ★ Panel gereksinimi: içerik değişince yerleşim kendiliğinden uymalı (kullanıcı, Oturum 3)

> "Yönetimden yeni bir sayfa oluşturduğumda veya bir sayfanın uzunluğunu
> arttırdığımda bunun otomatik olabilmesini sağlamalıyız — yönetimi yaparken düşünürüz."

Oturum 3'te bazı sığma sorunları **elle ayarlanmış eşiklerle** çözüldü; içerik
panelden değişince bunlar kendiliğinden işlemeyebilir. Panel (Faz 6-8) yazılırken ele alınacak:

| Bugün elle | Neden kırılabilir | Panelde |
|---|---|---|
| Kapanış karesi `max-height: 820 / 740 px` kademeleri (theme.css) + `.closing-intro` 56ch | Müsaitlik cümlesi uzarsa kısa ekranda yine taşar | Kareyi ölçüp sığdıran bir yerleşim (boşlukları `clamp()` ile yüksekliğe bağla) ya da kaydetmeden önce "bu metin 1366×768'de taşıyor" uyarısı |
| Menüde kısa ad (`navLabel`) | Yeni bölümün adı uzunsa telefonda menü yine kayar | Yeni bölüm eklerken `navLabel` alanı; uzunluk sınırı / önizleme |
| Yeni slayt | Bölüm ↔ bileşen eşlemesi `App.tsx`'te elle | Bölüm türü (serbest metin / zaman çizelgesi / kapanış) seçilerek genel bir bileşen |

Kendiliğinden işleyenler (ölçüme dayalı, dokunmaya gerek yok): kaydırma çubuğu yeri
(`scrollbar-gutter`), taşan slaytın içinde kayma (deck), tayf uzunluğu (etiket
genişliği ölçülüyor), etiket çakışması, "SCROLL" ipucunun yeri, isim yayının boyutu.

- Barındırma nerede? (backend bir sunucu istiyor — Railway / Render / Fly.io / VPS)
- Domain
- Görsel yükleme: diskte mi, bir nesne depolamada mı?
