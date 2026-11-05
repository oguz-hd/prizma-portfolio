# CLAUDE.md — prizma-portfolio

> Bu dosya her oturumda otomatik okunur. **Diğer dosyalar okunmaz** — aşağıdaki
> tablo hangi işte hangisine bakılacağını söyler. Kullanıcıya baştan soru sorma.

Ortak ilkeler ve gizlilik kuralları: `../../CLAUDE.md` (otomatik okunur). **Sunucunun genel
yapısı, proje sayfaları (`proje.oguzhd.com`) ve yeni proje ekleme: `../../SUNUCU.md`.**

Oğuz Han Duran'ın kişisel sitesi. Sitenin merkezinde bir **prizma** var: beyaz ışık
soldan gelir, prizmadan geçip sağda tayfına ayrılır. Site bu ışığın geçişiyle açılır;
sayfa kaymaz, bölümler **slayt** olarak bakılan alana gelir.


## 🛑 Ortam — önce bunu oku

**`npm run dev` bu makinede ÇALIŞMAZ.** Windows Smart App Control, Vite 8'in
Rolldown native binary'sini engelliyor. **Kod hatası değil, düzeltmeye çalışma.**

```
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
→ http://localhost:5174          site (token laboratuvarı: /?lab)
→ http://localhost:5175/admin/   yönetim paneli (dev: admin@localhost / degistir)
→ http://localhost:8001/docs     API (OpenAPI arayüzü)
```
Vite konteyner içinde de 5174'te dinler: HMR soketi sayfanın portuna bağlanıyor, başka porta giderse
başka bir sitenin sunucusuna düşer. Sorun çıkarsa → `docs/CALISTIRMA.md`

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

1. **Hiçbir renk CSS'e sabit yazılmaz.** Tek yer `theme/presets.ts`. Bilinçli istisnalar: ilk boyama zeminleri
   (`web/index.html`, `admin/index.html`, `web/public/theme-init.js`) ve tema geçişindeki ışığın kendisi (`sweep.ts`
   kenar çizgisi `#fff`, `sweep.css` cam yüzeyi; temaya bağlı değil).
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

## Durum · 05.11.2026

**Yayında: https://oguzhd.com** (DigitalOcean, Caddy; sunucu işleri → `../../SUNUCU.md`, `docs/CALISTIRMA.md` "Yayın (sunucu)").
Biten: prizma sitesi, iki dil, yönetim paneli (Faz 7), bölüm türleri ve medya (Faz 9), güvenlik taraması + yayın kontrol
listesi, **beyaz tema**. Faz faz tarihçe: `docs/GUNLUK.md` (eski "Durum/Sırada" metni orada arşivde).
Kullanıcı notu (Claude Docs, API'yi denerken): https://claude.ai/code/artifact/8a071f83-aa54-4eb2-a4a7-592661b51c62

### Açık tema (05.11.2026)
- Yön A2·B2·C4·D4·E2 "Cam plaka" (seçenek sayfası, ekran görüntüleri: `docs/tasarim/beyaz-tema/`; ayrıntı: DESIGN § 15).
- Ziyaretçi seçer: üst çubukta güneş/ay düğmesi (`SchemeSwitch`, dil seçici gibi), `theme/scheme.ts`, localStorage
  `prizma.scheme`. **Varsayılan koyu** (`prefers-color-scheme` okunmaz). Panel hep koyu.
- Palet `LIGHT_TOKENS` (presets.ts), koyu ön ayarın ton sayısına örneklenir (`mix.ts → resample`: sahne ton sayısını
  yalnız kurulurken okur; sayı değişirse geçişte renk zıplar). Etkiler `theme/light.css` (**App'ten sonra yüklenir**,
  yoksa prism.css/starfield.css ezer).
- Geçiş `theme/sweep.ts`: tayf bandı + dalgalı sıvı cam ucu (squircle+Snell kırılma haritası, `backdrop-filter: url()`
  yalnız Chromium). Cam görünümü **D "Parlak damla"** (Oğuz seçimi; denenen A–E: `docs/tasarim/sivi-cam/`): berrak cam,
  yukarıdan aydınlanan kenar, dalga tepelerinde kayan parlamalar. Süre tam 2,1 sn / dengeli 1,6 / hafif 1,3. Yedekler: Safari/Firefox bulanık cam, `data-lite`/azaltılmış saydamlık yalnız bant, hareket azalt anında.
  Dalga ~60 Hz, renk karışımı 30 adım (GPU yükü yenileme hızıyla orantılı). `html[data-sweeping]` etkileri yumuşatır.
- **Performans kademesi** (`perf.ts`, `html[data-perf]`): `full` (her şey) / `balanced` (cam kırılmasız, küçük hale, yarı yıldız,
  60 fps, kısa geçiş) / `lite` (bulanıklık ve hale yok, yalnız bant; `data-lite` de açık). Başlangıç tahmini çekirdek, bellek,
  dokunmatik; çalışırken kare ölçümü yalnızca aşağı iner (12 sn izleme). Elle: `?perf=full|balanced|lite`, `setTier()`
  (localStorage `prizma.perf`; elle seçilince otomatik düşürme kapanır). Ayar arayüzü henüz yok.
- Yenilemede flaş yok: `public/theme-init.js` → `html[data-boot=light]` (CSP `script-src 'self'` yüzünden dış dosya).
- ⚠️ Tuzaklar: sitenin `svg{max-width:100%}` kuralı 0 genişlikli üst öğede svg'yi ezer (`.ss-edge{max-width:none}`);
  `#E4E7E1` (açık zemin) presets.ts, index.html ve theme-init.js'te, birlikte değişmeli.

## Sırada

1. **Canlıya alma (Oğuz, adım adım):** bu blok (açık tema, cam, kademeler, düzeltmeler) sunucuya çıkacak; Caddyfile'daki
   `/sites/*` kapatma ve önbellek başlıkları da onunla. Sonra performans kademesi için küçük bir ayar arayüzü
   (Otomatik / Tam / Hafif) istenirse eklenir; şimdilik `?perf=`.
2. Skill ve plugin konuşması + araştırma (hafıza: `skill-plugin-konusmasi-hatirlat`).
3. **Temaya özgü / uyum animasyonları, içerik düzenlemeleri, araştırmalar** (Oğuz, 05.11).
4. API bağımlılıkları kilitsiz: `uv lock` + `uv sync --frozen`, uv/alpine/caddy/node imajlarını sabitle (hafıza: `prizma-uv-lock-hatirlat`).
5. **Faz 8 tema paneli** ve bekleyen C kararları: httpOnly çerez, panel IP kilidi, analytics + gizlilik notu, CTA, og:image,
   HSTS `includeSubDomains`, sunucu dışı yedek.
6. **Sunucuya uygulanacaklar (Oğuz, adım adım):** Caddyfile'daki `/sites/*` kapatma ve `/fonts/*` + `/theme-init.js`
   önbellek başlıkları, yeni web/api imajları → `docs/CALISTIRMA.md` "Yayın (sunucu)". Sonra `uctan-uca` ve tarayıcı testi
   (yalnızca test yığınında; `CANLI_ONAY` olmadan canlıya çalışmaz).
7. İncelemeden (05.11) bilerek ertelenenler: HTTP/3 için UDP 443 ya da `protocols h1 h2`, `healthcheck`, `paginate` O(n²)
   (büyük içerikte), Docker volume sahiplik yarışı (yeni makine), konteyner sertleştirme, çok kareli ICC profili.

**GitHub:** özel depo `github.com/oguz-hd/prizma-portfolio`; `master` →
`origin/master`. `git push` doğrudan çalışıyor (kimlik Git Credential Manager'da).
Kullanıcı her iş sonunda **commit** istiyor; **push yalnızca isteyince**.

🛑 **Yeni bir faza kendiliğinden geçme — önce sor.** Ama ONAYLANMIŞ bir planın alt
fazları arasında onay sorma (kullanıcı: "yapayım mı diye sorma, seçmem gereken yerde sor"): kapılar → commit → devam; soru yalnızca gerçek seçimde (görsel, kapsam).

### Ertelenenler
- OG görseli (`web/public/og.png`, 1200×630) — tasarım oturunca çekilecek; `index.html`'e eklenecek (not: `api/app/content.py` → `render_meta`)
- Tema paneli (Faz 8): kontrast doğrulama, ince ayar, canlı önizleme — ARCHITECTURE § 4
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
