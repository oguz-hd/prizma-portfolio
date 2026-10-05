# CLAUDE.md — prizma-portfolio

> Bu dosya her oturumda otomatik okunur. **Diğer dosyalar okunmaz** — aşağıdaki
> tablo hangi işte hangisine bakılacağını söyler. Kullanıcıya baştan soru sorma.

Oğuz Han Duran'ın kişisel sitesi. Sitenin merkezinde bir **prizma** var: beyaz ışık
soldan gelir, prizmadan geçip sağda tayfına ayrılır. Site bu ışığın geçişiyle açılır;
sayfa kaymaz, bölümler **slayt** olarak bakılan alana gelir.

Kökeni: `C:\Users\drn49\Desktop\ozi\projects\trex-portfolio` (dino maskotlu site).
Oradaki hero prizması bu projenin fikrini doğurdu; içerik, API, token sistemi ve
iki dillilik oradan taşındı. **O proje olduğu gibi kalıyor — ona dokunma.**

## 🛑 Ortam — önce bunu oku

**`npm run dev` bu makinede ÇALIŞMAZ.** Windows Smart App Control, Vite 8'in
Rolldown native binary'sini engelliyor. **Kod hatası değil, düzeltmeye çalışma.**

```
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
→ http://localhost:5174          site (token laboratuvarı: /?lab)
→ http://localhost:5175/admin/   yönetim paneli (dev: admin@localhost / degistir)
→ http://localhost:8001/docs     API (OpenAPI arayüzü)
```
Portlar trex-portfolio'dan (5173/8000) **farklı** — iki site aynı anda çalışabilsin.
Vite konteyner içinde de 5174'te: HMR soketi sayfanın portuna bağlanıyor, 5173'e
giderse eski sitenin sunucusuna düşer. Sorun çıkarsa → `docs/CALISTIRMA.md`

**Doğrulama aracı: Chrome DevTools MCP** (başsız). ⚠️ Gizli sekmede/panelde
`requestAnimationFrame` durur → GSAP ilerlemez. Önce `document.visibilityState`.
Açılış gizli sekmede **başlamaz**, görünür olunca başlar (bilerek).
Animasyonu kare kare okumak: `gsap.globalTimeline.time(t)`.
Playwright MCP de kullanılıyor (Oturum 3-4): önce `page.bringToFront()` — sekme
arkada kalınca rAF duruyor ve açılış `pending`'de takılı görünüyor (hata değil).
**Testler dizüstü görünümünde** (1440×900, 1366×768) — kullanıcı tercihi; mobil
yalnızca değişiklik mobile özgüyse.

### Doğrulama — kapılar (site, panel, API)
```
docker exec prizma-portfolio-web-1 npm run typecheck   # tsc --noEmit
docker exec prizma-portfolio-web-1 npm run build       # asıl derleme
docker exec prizma-portfolio-admin-1 npm run typecheck
docker exec prizma-portfolio-admin-1 npm run build
docker exec prizma-portfolio-api-1 pytest           # API, 26 test (geçici veri klasöründe)
docker exec prizma-portfolio-api-1 ruff check       # lint (api), web/admin: npm run lint (oxlint)
```
API şeması değişince: `api/app/migrations.py`'ye adım ekle — açılışta uygulanır, önce
`/data/site.db.bak-v<n>` yedeği alınır. `down -v` artık gerekmez.
⚠️ Panel `web/src`'yi import ediyor (@site: `content/types.ts`, `theme/*`): sitede
bunlar değişince panelin kapıları da çalıştırılır.

## ⚠️ Bozulmaz kurallar

1. **Hiçbir renk CSS'e sabit yazılmaz.** Tek istisna `theme/presets.ts` (+ index.html zemin).
2. **`accents` mor → kırmızı sıralı** (kısa dalga boyundan uzuna). Prizma tonları
   bu sırayla tayfa diziyor, ray slaytları bu sırayla renklendiriyor.
3. **İçerik ≠ arayüz metni.** İçerik veritabanında (`/content.json`, ilk hâli
   `api/app/seed.py`); `i18n/strings.ts` arayüzün dili. **Bileşende sabit metin
   yazma.** Tayfsal simgeler (Hα 656, 404 nm) metin değil.
4. **`skills.items` çevrilmez** (React her dilde React). Açıklama gerekirse `note`.
5. **Prizma içerikten bağımsız.** Bölüm adı bilmez; deck ona sıra numarası verir,
   açı ve renk `optics.ts`'teki sayılardan türer. Sahnenin her alanının tek sahibi
   var — tablo `prism/scene.ts` başında.
6. **Navigasyon animasyondan bağımsız.** Slayt durumu geçişin BAŞINDA değişir,
   animasyon yalnızca görsel; emniyet zamanlayıcısı rAF dursa da bitirir.
   Sayfadaki her `#slug` bağlantısı deck'e gider — özel kod yazma.
7. **Açılış içeriği kalıcı gizleyemez.** Gizleme yalnızca `html[data-intro]` ile;
   her girdi atlatır, emniyet zamanlayıcısı son kareye sarar.
8. **Durum öznitelikleri JSX'te yok** (`data-state`, `inert`, `aria-hidden` slaytlarda
   deck.ts'in). JSX'e yazılırsa dil değişiminde React ezer.
9. **`[data-i18n-fade]`** dil geçişi, **`[data-reveal]`** slayt geçişi/açılış.
   Yeni blok eklersen ikisini de düşün. İçlerindeki Departure Mono metin harf harf
   çözülür (`scramble.ts`), düzyazı solar — ayrım fonttan, işaret gerekmez.
10. **dev/prod ayrı imaj adı** (`:dev` / `:prod`).
11. **İki font, iki rol** (Oturum 3): **Departure Mono** kimlik ve arayüz — her boyutu
    11px'in katı (11/22/33/44/55/88), tek ağırlık, kalın yazma (`font-synthesis: none`).
    **Atkinson Hyperlegible Next** yalnızca düzyazı (theme.css → düzyazı seçici listesi;
    yeni paragraf bloğu oraya eklenir), `--text-prose` ölçeği.
    İstisnalar (Oturum 4): daire başlığı "kalın" ama sahte kalın değil, kendi
    renginde miter kontur (`.ring-title`); telefonda daire iç yazısı 11 × 2/3 px
    (3x ekranda keskin, ölçüldü).
12. **Verimsiz kod yazma.** Bir sonraki faz için önden kod yazma.
13. **Prizma fareye bağlı DEĞİL** — hareketi kendi hâlinde (salınım + ışık darbeleri);
    mobilde de aynı görünmeli (kullanıcı kararı, Oturum 2).

## Durum · 05.10.2026 (yayında)

✅ **v1** (Oturum 1) — iskele · taşınan katmanlar · prizma sahnesi · açılış ·
slayt gösterisi · cam panel · ray · 404 nm · favicon · API kopyası.
✅ **v2** (Oturum 2) — parlak tayf + hale + ışık darbeleri · isim/bağlantılar
prizmayı çevreleyen dairede (isim büyük harf) · motto kalktı · üst çubukta çizgi
ve isim yok, menü solda, dönen tayflı üçgen · tek font · Projeler slaytı kalktı,
yerine Deneyim ve Eğitim · mezuniyet paragrafı kalktı · İletişim = kapanış karesi.
Slaytlar: Giriş · Hakkımda · Deneyim ve Eğitim · İletişim.
✅ **Oturum 3** (30.09.2026) — geçiş sürerken kaydırma sıraya giriyor · üçgendeki
parıltı çizgisi kalktı · mobil menü `navLabel` ile sığıyor · düzyazı Atkinson ·
tayf raya kadar uzun · isim harfleri 1.3× geniş · sekme adı yalnız isim, unvan
"Yazılım geliştirici" · menü alt çizgisi titremesi. → `DESIGN.md` § 11
· **site İngilizce açılır** (tarayıcı dili okunmaz; seçim hatırlanır) ·
kapanış karesi kısa ekranda sığıyor, kaydırma çubuğu yeri sabit
· **harf çözülmesi** (Katakana + tayf, `scramble.ts`) açılışta ve dil geçişinde —
seçenekler artifact'taydı (https://claude.ai/artifact/LN9aUxFhh1JwEP9kEBX7zi, A7+A5).

✅ **Oturum 4** (30.09.2026) — sığmayan slayt alt sayfalara bölünüyor (A1,
`deck/paginate.ts`; birimler `data-page-unit`) · İletişim kısa telefona sığıyor ·
geçiş dalgası (`scene.surge`, hafif) · tayfta çizgi/etiket yok (yalnızca 404'te) ·
navbar'da akan tayflı "INTRO" · çözülme süresi her yerde 900 ms · İletişim girişin
dairesinde (`components/Ring.tsx` ortak), müsaitlik cümlesi yok · isim kalın ·
kartların sol üstündeki tayf çizgisi kalktı · kod incelemesi düzeltmeleri (daire
artık hiç küçülmüyor; altbilgi/ipucu `usePlaceBelow` ile yayın altına) · temizlik
(ölü CSS/kod) · GitHub'a yüklendi. → `DESIGN.md` § 12

✅ **Oturum 5 · Faz 6** (01.10.2026) — back-end başladı (kullanıcı kararı: Faz 6 →
7a admin API → 7b admin paneli, her birinin sonunda dur). **Site içeriği artık
veritabanından:** API `/data/content.json` + `meta.html` yazıyor (`publish.py`), site
mount'tan önce onu çekiyor; `site.ts` silindi, **yedek içerik yok** (kullanıcı kararı) —
gelmezse "İçerik yüklenemedi" ekranı. Meta etiketlerini yayında Caddy şablonu gömüyor.
Dev volume sıfırlandı (eski müsaitlik cümlesi gitti). Prod'da boş `DOMAIN` Caddy'yi
açtırmıyordu — düzeltildi. → ARCHITECTURE § 3 "Uygulama"

✅ **Oturum 5 · Faz 7a** — yönetim API'si (`api/app/admin.py`): ayarlar, profil,
yetenekler, deneyim/eğitim (`milestones`), bağlantılar, bölümler (yalnızca düzenleme
+ sıra), parola değiştirme (eski oturumlar düşer). Her yazma → `publish()`. Uçtan uca
83 kontrol geçti. Swagger ile denemek → CALISTIRMA. Kararlar → ARCHITECTURE § 6.

✅ **Oturum 5 · Faz 7b** — yönetim paneli (`admin/`, ayrı build; dev 5175, yayında
`/admin/` — web imajı derliyor). Sözleşme ve paletler `@site` alias'ıyla sitenin
kaynağından. Sayfalar: Genel (palet + meta) · Profil · Yetenekler · Deneyim · Eğitim ·
Bağlantılar · Bölümler (yalnızca düzenleme + sıra) · Hesap. TR/EN yan yana, yarım
çeviri uyarısı, kaydedilmemiş değişiklik uyarısı, kart başına kaydet. Panel hep Tayf'ta
(Aurora'da kırmızı yok → hata rengi kayboluyordu). → ARCHITECTURE § 7

✅ **Oturum 5 · sonrası** — daire masaüstünde %90 (`DESKTOP_SCALE`), girişteki bağlantılar
16.5 px (DESIGN § 13). Panel girişi İngilizce, seçenek sayfasından **B + E + F** seçildi
(https://claude.ai/artifact/1CCFheJHSJoFp7dJC7kSBb); ilk sürüm `admin/src/Login.tsx`
(kendi SVG'si + CSS). Prizma/yıldız stilleri bileşenlerin yanına taşındı
(`prism/prism.css`, `components/starfield.css`); `scene.accentCount()` artık uygulanmış
temadan (`applyTheme` → `appliedTokens`), içerikten değil — panel sahneyi içeriksiz kullanabilir.

⏭ **Sırada (kullanıcı, Oturum 5 sonu — yarım kaldı):**
1. ✅ (Oturum 6) **Panel girişi sitenin prizmasıyla** — `PrismStage` + `Starfield` + `Ring`
   (@site), intro zamanlamaları, ADMIN dairenin üst yayında, form alt alta, prizma `--lift`
   kadar yukarıda, hata = "401 nm", giriş = yakınlaşma + örtü (`.veil`). Giriş ekranı
   sitenin SEÇİLİ paletinde (`paintLogin`), panel Tayf'ta. `.ring`/`.ring-title` stilleri
   `components/ring.css`'e taşındı. Panel, sitenin `react`/`gsap` importlarını kendi
   node_modules'una çözüyor (vite `dedupe`, tsconfig `paths`). Tarayıcı MCP'leri yoksa:
   başsız Chrome'u **PowerShell'den** başlat (Bash'ten port açmıyor) + CDP betiği.
2. ✅ (Oturum 6) **Büyüyen içerik** — senaryolar kalıcı: `tools/icerik/buyut.mjs` (A/B, ayrı
   test yığını, CALISTIRMA "Büyüyen içerik testi"). Düzeltildi: bölünen slayt geniş ekranda
   iki sütunu koruyor (sütunu biten sayfada öbürü tam genişlikte, maddeleri iki sütunda);
   giriş yaylarına açı sınırı `MAX_SPAN` (~130°, Ring.tsx) — bağlantılar önce 11 px, sonra
   iki yay; unvan·konum sığmazsa yalnız unvan, o da sığmazsa "…". 25 harflik isim sorun
   değil (görüldü). Panel girişindeki yakınlaşma takılıyordu → `will-change` (60 fps).
3. **Beyaz tema** (kullanıcı: back-end'den sonra planlansın; site + panel, farklı estetik,
   prizma temasını koruyan) → önerilen sıra: Faz 7 bitince, Faz 8'den (tema paneli) ÖNCE.
4. ✅ (Oturum 6) **Performans** — ölçüm betiği `tools/perf/olcum.mjs` (CALISTIRMA "Performans
   ölçümü"). Bulgular: JS belleği 3-4 MB, sızıntı yok, arka plan sekmesi %0 CPU; GPU yükü
   yenileme hızıyla orantılıydı (240 Hz'de dahili GPU %70-90). Yapılan: `gsap.ticker.fps(74)`
   (PrismStage.tsx başı, neden 74 orada) · hafif kip `lite.ts` → `html[data-lite]` panelin
   bulanıklığını kaldırır (GPU'suz cihazda içerik slaytı 41 → 60 fps) + "saydamlığı azalt".
   Kalan aday: `brand-flow` (navbar, background-position + drop-shadow) ve 60 yıldızın
   `twinkle`'ı hâlâ ekranın yenileme hızında — kullanıcıya önerildi, yanıt yok.
   Ucuz telefon profili ölçülemedi (pencere arkada kaldı). `Projects.tsx` silindi (kullanıcı).
5. ✅ (Oturum 6) **Faz 9 · Bölüm türleri ve medya** — panelden bölüm ekleme (serbest metin,
   zaman çizelgesi, projeler, duyuru, galeri), projeler ve medya sayfaları, fotoğraf yükleme
   (EXIF/GPS silinir, WebP), bileşeni TÜR seçiyor, göç düzeni + pytest. Görünüş A1·B2·L1·C2·D2
   (DESIGN § 14). Kararlar ARCHITECTURE § 6. Test yığını/senaryo C → CALISTIRMA.
6. ✅ **Yayında: https://oguzhd.com** (Oturum 7, 02.10.2026) — DigitalOcean droplet (Frankfurt,
   1 GB + swap), Cloudflare'de alan adı (DNS gri bulut, www → apex Cloudflare kuralıyla), Let's
   Encrypt Caddy'de. Canlıda `uctan-uca` 26/26. İçerik TEMİZ başladı (seed; dev içeriği taşınmadı —
   kullanıcı "önemli değil"); içerik artık yalnızca canlı panelden. Sunucu dışı yedek yok
   (kullanıcı: "o kadar yedeklik bir şey yok") — içerik birikince yeniden sor. Sunucu, erişim,
   güncelleme → CALISTIRMA "Yayın (sunucu)". **Sunucu işlerini kullanıcı kendisi yazıyor**
   (öğrenmek için) — Claude adım adım anlatır, `ssh prizma` ile salt okunur doğrular.
   ✅ (Oturum 8, 05.10.2026) kontrol listesi: gerçek 404 (`handle_errors`), robots/sitemap/llms.txt +
   canonical/og:url (`api/app/discovery.py`, alan adı `DOMAIN`'den), `/favicon.svg`, alt metin iki dil
   uyarısı + sitede diğer dile düşme, token 12 → 4 saat, giriş sayacı temizleniyor, yedek imajı (sqlite
   gömülü), ruff + oxlint, React 19.3 / Vite 8.3. **Safari bağlantı hatası** düzeldi (Ring.tsx →
   `RingLinks`; WebKit testi `tools/safari`). Kod incelemesi + plan bu oturumda (A → B → C → D).
   ⏭ Sırada (kullanıcı: "geri kalanı sonraki oturumlarda"):
   **C · kullanıcı kararı:** httpOnly çerez, panel IP kilidi, analytics + gizlilik notu, CTA, og:image,
   HSTS includeSubDomains (alt alan adı planı yoksa), sunucu dışı yedek.
   **D · Beyaz tema → Faz 8 tema paneli** (aşağıdaki ⏸ notları; önce canlı seçenek sayfası).
   Küçük: `@types/node` 22 → 26 bilerek yapılmadı (konteyner Node 22); 4 saatlik token panelde
   kaydedilmemiş düzenlemeyi düşürebilir — şikâyet gelirse sessiz yenileme.
7. ✅ (Oturum 6) **Güvenlik taraması + yayın öncesi testler** (kullanıcı isteği) — rapor:
   https://claude.ai/code/artifact/b63b856b-06fa-4ae0-948f-e70fbed95811 · 1 kritik (/data/site.db,
   daha önce kapandı), 2 yüksek (kimlikten önce gövde okuma, sınırda asılı kalan yükleme), orta/düşükler;
   hepsi giderildi. Araçlar: `tools/guvenlik/yokla.mjs` (37), `tools/yayin/uctan-uca.mjs` (26),
   `tools/yayin/tarayici.mjs` (13), pytest 23, Lighthouse 100/100/100 → CALISTIRMA "Yayın öncesi testler".
8. ⏸ **Beyaz tema** (yarım: altyapı `scheme` hazır, açık ön ayar yok) → sonra Faz 8 tema paneli.
Plan: `C:\Users\drn49\.claude\plans\hadi-back-and-e-hidden-puddle.md`.
Kullanıcı notu (Claude Docs, API'yi denerken bilinmesi gerekenler):
https://claude.ai/code/artifact/8a071f83-aa54-4eb2-a4a7-592661b51c62

**GitHub:** özel depo `github.com/oguz-hd/prizma-portfolio`; `master` →
`origin/master`. `git push` doğrudan çalışıyor (kimlik Git Credential Manager'da).
Kullanıcı her iş sonunda **commit** istiyor; **push yalnızca isteyince** (Oturum 5: "her seferinde push etme").

⏸ **Beyaz tema** (kullanıcı "daha sonra" dedi) — presets.ts'e açık bir ön
ayar + seçici; theme.css renk kodu içermediği için bileşenlere dokunulmaz.
⚠️ Hale (`.prism-glow`) ve `mix-blend-mode: screen` koyu zemine göre — açık temada
yeniden düşünülmeli.

Telefonda deneme: trycloudflare hızlı tüneli (`prizma-tunel` + `prizma-yayin-web`,
`prizma-yayin` ağı). Faz 6'dan beri `web/dist` değil, **yayın imajı** + Caddyfile +
dev'in veri volume'u sunuluyor (meta şablonu ve content.json için) — adres her
başlatmada değişir, bilgisayar uyuyunca kopar. → `docs/CALISTIRMA.md` "Telefonda deneme".
Kalıcı yayın için Cloudflare Pages önerildi, hesap gerekir.

🛑 **Yeni bir faza kendiliğinden geçme — önce sor.** Ama ONAYLANMIŞ bir planın alt
fazları arasında onay sorma (kullanıcı, Oturum 6: "yapayım mı diye sorma, seçmem gereken
yerde sor"): kapılar → commit → devam; soru yalnızca gerçek seçimde (görsel, kapsam).

### Ertelenenler
- OG görseli (`web/public/og.png`, 1200×630) — tasarım oturunca çekilecek; `index.html`'e eklenecek (not: `api/app/content.py` → `render_meta`)
- Tema paneli (Faz 8): kontrast doğrulama, ince ayar, canlı önizleme — ARCHITECTURE § 4
- Görsel yükleme — içerikte görsel alanı yok, gerekince
- Proje `repoUrl`/`liveUrl` alanları boş — kullanıcı söyleyecek

## İçerik nereden geliyor

```
api (SQLite) ──publish.py──> /data/content.json ──Caddy──> loadContent() ──> useContent() ──> sections/*
                        └──> /data/meta.html   ──Caddy şablonu──> index.html <head>
geliştirmede: Vite /content.json → API /api/content (canlı, aynı şekil)
```
**`content/types.ts` sözleşmedir** — `api/app/schemas.py` ile birebir aynı şekil.
İçeriğin ilk hâli `api/app/seed.py` (yalnızca BOŞ veritabanını doldurur); sonrası
panelden (Faz 7). Panel gelene kadar metin değiştirmek: `seed.py` + dev volume'u
sıfırla (`down -v`, CALISTIRMA "Temiz başlangıç").

## Şunu yaparken şunu oku

| İş | Dosya |
|---|---|
| Prizma, açılış, slaytlar, tipografi, tasarım kararları | `docs/DESIGN.md` |
| Yığın, içerik modeli, API, "renkler veri", iki dillilik | `docs/ARCHITECTURE.md` |
| Ortam sorunu, Docker, çalıştırma | `docs/CALISTIRMA.md` |
| *"Bunu neden böyle yapmışız?"* | `docs/GUNLUK.md` + `git log` |

## Not tutma

Kalıcı bilgi → ilgili **konu dosyasına**. `docs/GUNLUK.md`'ye oturum başına
**3-5 cümle**. Ayrıntılı tarihçe commit mesajlarında.
