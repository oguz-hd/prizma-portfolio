# Mimari

> trex-portfolio'dan taşındı (28.09.2026). Oradaki kararlar (07.09.2026, Oturum 3)
> burada da geçerli: yığın, içerik modeli, API, "renkler veri", iki dillilik.
> Ön yüzün prizma/slayt katmanı → `DESIGN.md`. `content.json` bağlantısı Faz 6'da
> (Oturum 5) yapıldı — § 3; admin panel (Faz 7) ve tema paneli (Faz 8) sırada.
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

### Uygulama (Faz 6, Oturum 5)

| Parça | Nerede | Ne yapıyor |
|---|---|---|
| Yayın | `api/app/publish.py` | `/data/content.json` + `/data/meta.html`'i atomik yazar (geçici dosya → `os.replace`). API her açılışta çağırır; Faz 7'de her panel kaydından sonra |
| Sunum | `Caddyfile` | `/content.json` veri volume'undan, `Cache-Control: no-cache` + ETag (değişmediyse 304) |
| Okuma | `web/src/content/useContent.ts` → `loadContent()` | `main.tsx` mount'tan ÖNCE bekler; `useContent()` senkron kaldı, bileşenlere dokunulmadı. `index.html` dosyayı `<link rel="preload">` ile önden çeker — JS inerken içerik de iner |
| Meta | `content.py` → `render_meta` | `<title>`, description, og:title/description içerikten. Tarayıcılar JS çalıştırmadığı için sunucu gömer: yayında Caddy şablonu (`index.html` → `readFile /data/meta.html`), geliştirmede Vite `/api/meta`'dan |
| Geliştirme | `web/vite.config.ts` | `/content.json` → API'nin `/api/content`'i (aynı şekil, canlı) |

**Yedek içerik yok** (kullanıcı kararı): `site.ts` silindi, tek kaynak veritabanı.
`/content.json` gelmezse site mount edilmez, yerine "İçerik yüklenemedi" ekranı
(`components/LoadError.tsx`). Güvensiz varsayılanlarla API açılmayı reddetse bile
içeriği ÖNCE yayınlıyor — kapanan yalnızca panel, site ayakta.

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
sections        slaytlar: kind (bileşen), visible, duyuru bağlantısı + yayın aralığı (Faz 9)
section_media   galeri bölümünün görselleri ve sırası (Faz 9)
posts           blog yazıları                     (sonra)
media           yüklenen görseller: boyut, üretilen genişlikler (Faz 9)
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

Veritabanı (`/content.json`) → **içerik**, panelden düzenlenir (Faz 7). İlk hâli `api/app/seed.py`.
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
GET   /api/content              → tüm site, tek JSON (content.json'ın canlı hâli; ziyaretçi dosyayı okur)
GET   /api/meta                 → meta.html'in canlı hâli (geliştirmede Vite index.html'e gömer)
POST  /api/auth/login           → JWT
GET   /api/auth/me
PUT   /api/auth/password        → parola değiştir; YENİ token döner, eskiler geçersiz

── Yönetim (Faz 7a, api/app/admin.py) — hepsi JWT ister, yazmalar 204 ──
PUT   /api/admin/settings                  preset (listeden) + metaTitle/metaDescription
PUT   /api/admin/profile                   name, title, location, tagline, bio
POST  /api/admin/{skills|milestones|links}              oluştur (id: slug; varsa 409)
PUT   /api/admin/{skills|milestones|links|sections}/order   yeni sıra (kayıtların tamamı)
PUT   /api/admin/{skills|milestones|links|sections}/{id}    güncelle
DEL   /api/admin/{skills|milestones|links}/{id}             sil (çevirileriyle)

── Faz 9 ──
GET   /api/admin/content                   herkese açık içerik + gizli bölümler, yayında
                                           olmayan projeler, `visible`, medya kitaplığı
POST  /api/admin/sections                  yeni bölüm (kind: text|timeline|projects|announcement|gallery);
                                           İletişim'in ÖNÜNE girer (kapanış karesi sonda)
DEL   /api/admin/sections/{id}             yalnızca eklenen türler (hazırlarda 409); maddeleri/galerisiyle
POST|PUT|DEL /api/admin/sections/{id}/items[/{item}], PUT …/items/order   zaman çizelgesi maddeleri
PUT   /api/admin/sections/{id}/media       galerinin görselleri + altyazıları (liste baştan yazılır)
POST|PUT|DEL /api/admin/projects[/{id}], PUT /projects/order              projeler (+ kapak)
POST  /api/admin/media (multipart) · PUT /media/{id} (alt) · DEL         kullanılan görsel silinmez (409)

── Sonra ──
POST  /api/admin/theme/validate → kontrast kontrolü (Faz 8)
```

**Faz 9 kararları (01.10.2026):**
- **Bileşeni TÜR seçiyor** (`sections.kind`), slug değil — panelden eklenen bölüm kod
  değişmeden slayt olur (§ 8'deki açık konu kapandı). Hazırlar (about/experience/contact)
  silinmez, `visible=false` ile gizlenir.
- **Projeler** panelde yönetilir; sitede yalnızca "projects" türünde bölüm varsa görünür.
- **Duyurunun yayın aralığı sitede süzülüyor** (`useContent` → `inWindow`): content.json
  her gün yeniden yazılmıyor, tarih geçince duyuru kendiliğinden düşmeli.
- **Görsel:** `api/app/media.py` — JPEG/PNG/WebP (biçim içerikten), 15 MB, 40 MP sınırı;
  **EXIF/GPS silinir**, orijinal saklanmaz; 640/1280/1920 WebP (`/data/uploads/{id}-{w}.webp`,
  Caddy sunuyor; geliştirmede API `/uploads`'ı bağlıyor). Alt metin ve altyazı çeviri tablosunda.
- **Şema göçleri:** `api/app/migrations.py` (`PRAGMA user_version`); açılışta eksik adımlar,
  önce `site.db.bak-v<n>`. Veritabanı artık sıfırlanmadan yükseliyor.
- **Testler:** `api/tests` (pytest, geçici veri klasöründe) — kapılardan biri.

**Faz 7a kararları:**
- **Okuma ayrı değil:** panel `GET /api/content`'i kullanıyor (aynı veri, aynı şekil).
  Yazmalar gövdesiz 204 döner; panel kaydettikten sonra içeriği yeniden çeker.
- **Girdi = çıktının şekli:** çevrilen alanlar `{tr, en}` — aynı kaydın iki dili
  yan yana (§ 5). Doğrulama sitenin kendisine göre: yarım çevrilmiş alan dil
  değişince boş satır demek, o yüzden iki dil **birlikte dolu ya da birlikte boş**
  (opsiyonel alan boşsa hiç yazılmaz). Bağlantılar yalnızca `https`/`http`/`mailto`.
- **Deneyim ve eğitim tek kaynak** (`milestones`, gövdede `kind`) — tablo da tek.
  Tür sonradan değişmez (sil + oluştur).
- ~~Bölümler yalnızca düzenlenir; projeler panelde yok~~ → Faz 9'da değişti (aşağıda).
- **Parola değişince bütün oturumlar düşer:** token, parola hash'inden türeyen bir
  iz taşıyor (`auth.py` → `_password_mark`); şemaya sütun eklemeden. Varsayılan
  parola (`degistir`) ve 10 karakterden kısası kabul edilmiyor.

## 7. Klasör düzeni (30.09.2026)

```
prizma-portfolio/
├─ docs/                  kararlar: DESIGN · ARCHITECTURE · CALISTIRMA · GUNLUK
├─ web/                   React + Vite + TS — halka açık site
│  └─ src/
│     ├─ prism/           ★ prizma: optik, sahne (scene), açılış (intro), çizim
│     ├─ deck/            slayt gösterisi, alt sayfalar (paginate), ray
│     ├─ components/      üst çubuk, dil seçici, daire (Ring), altbilgi, yıldızlar
│     ├─ sections/        slaytlar: Hero · About · Experience · Contact · 404
│     ├─ content/         ★ içerik sözleşmesi (types.ts) + /content.json okuyucu (useContent)
│     ├─ i18n/            arayüz metni + dil durumu
│     ├─ theme/           token sistemi, ön ayarlar, fontlar
│     ├─ lab/             token laboratuvarı (/?lab)
│     └─ scramble.ts      harf çözülmesi (açılış + dil geçişi)
├─ api/                   FastAPI + SQLite (içerik, çeviriler, tohum verisi, yayın → content.json)
└─ admin/                 yönetim paneli (Faz 7b) — ayrı build, React + Vite + TS
   └─ src/
      ├─ api.ts           sunucuyla konuşulan TEK yer (token, hatalar Türkçe)
      ├─ panel.tsx        ortak durum: içerik + reload, taslak, kaydedilmemiş değişiklik
      ├─ fields.tsx       TR/EN yan yana alan, form, kaydetme satırı, slug
      ├─ collection.tsx   sıralı kayıt listesi (kart, sırala, sil, yeni)
      └─ pages/           Genel · Profil · Yetenekler · Deneyim/Eğitim · Bağlantılar · Bölümler · Hesap
```

**`admin/` ayrı bir build.** Ziyaretçi panel kodunu asla indirmez — hem hız hem
güvenlik kazancı. Yayında web imajı onu da derleyip `/srv/admin`'e koyuyor
(`web/Dockerfile` → `admin-build`, compose `additional_contexts`); Caddy `/admin/`
altında sunuyor, çerçeveye alınmasını yasaklıyor (`X-Frame-Options: DENY`).

**Panel sitenin kaynağını import ediyor** (`@site` → `web/src`): içerik sözleşmesi
(`content/types.ts`), paletler (`theme/presets.ts`), `applyTheme`, favicon, fontlar.
Üçüncü bir kopya yok — site değişince panel derlenmez hâle gelir, fark edilir.
Panel hep **Tayf**'la boyanıyor, sitenin seçili paletiyle değil: panelin anlamlı
renkleri her ön ayarda yok (Aurora'da kırmızı yok, hata rengi camgöbeği oluyordu).
Panel tek dilli (Türkçe) — iki dillilik içerik için, panelin kendi yazıları için değil.

---

## 8. Açık konular

### ★ Panel gereksinimi: içerik değişince yerleşim kendiliğinden uymalı (kullanıcı, Oturum 3)

> "Yönetimden yeni bir sayfa oluşturduğumda veya bir sayfanın uzunluğunu
> arttırdığımda bunun otomatik olabilmesini sağlamalıyız — yönetimi yaparken düşünürüz."

Oturum 3'te bazı sığma sorunları **elle ayarlanmış eşiklerle** çözüldü; içerik
panelden değişince bunlar kendiliğinden işlemeyebilir. Panel (Faz 6-8) yazılırken ele alınacak:

| Bugün elle | Neden kırılabilir | Panelde |
|---|---|---|
| İletişim dairesinde yalnızca başlık, e-posta ve bağlantılar var (Oturum 4); bölüm gövdesi gösterilmiyor | Panelden İletişim'e gövde metni girilirse sessizce düşer | Ya panel İletişim için gövde alanını hiç sunmasın, ya da daire bir yazı için yer açsın (tasarım kararı) |
| 404'ün `.frame` ızgarası, `max-height: 820 / 740 px` kademeleri | 404 metni uzarsa kısa ekranda taşar | Metin kısa ve sabit (arayüz metni); gerekirse aynı ölçüm yaklaşımı |
| Menüde kısa ad (`navLabel`) | Yeni bölümün adı uzunsa telefonda menü yine kayar | Yeni bölüm eklerken `navLabel` alanı; uzunluk sınırı / önizleme |
| Yeni slayt | Bölüm ↔ bileşen eşlemesi `App.tsx`'te elle | Bölüm türü (serbest metin / zaman çizelgesi / kapanış) seçilerek genel bir bileşen |

Kendiliğinden işleyenler (ölçüme dayalı, dokunmaya gerek yok): kaydırma çubuğu yeri
(`scrollbar-gutter`), taşan slaytın içinde kayma (deck), tayf uzunluğu (etiket
genişliği ölçülüyor), etiket çakışması, "SCROLL" ipucunun yeri, isim yayının boyutu.

- Barındırma nerede? (backend bir sunucu istiyor — Railway / Render / Fly.io / VPS)
- Domain
- Görsel yükleme: diskte mi, bir nesne depolamada mı?
