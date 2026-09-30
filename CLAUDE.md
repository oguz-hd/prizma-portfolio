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
→ http://localhost:8001/docs     API (OpenAPI arayüzü)
```
Portlar trex-portfolio'dan (5173/8000) **farklı** — iki site aynı anda çalışabilsin.
Vite konteyner içinde de 5174'te: HMR soketi sayfanın portuna bağlanıyor, 5173'e
giderse eski sitenin sunucusuna düşer. Sorun çıkarsa → `docs/CALISTIRMA.md`

**Doğrulama aracı: Chrome DevTools MCP** (başsız). ⚠️ Gizli sekmede/panelde
`requestAnimationFrame` durur → GSAP ilerlemez. Önce `document.visibilityState`.
Açılış gizli sekmede **başlamaz**, görünür olunca başlar (bilerek).
Animasyonu kare kare okumak: `gsap.globalTimeline.time(t)`.

### Doğrulama — **test yok, kapı bu ikisi**
```
docker exec prizma-portfolio-web-1 npm run typecheck   # tsc --noEmit
docker exec prizma-portfolio-web-1 npm run build       # asıl derleme
```

## ⚠️ Bozulmaz kurallar

1. **Hiçbir renk CSS'e sabit yazılmaz.** Tek istisna `theme/presets.ts` (+ index.html zemin).
2. **`accents` mor → kırmızı sıralı** (kısa dalga boyundan uzuna). Prizma tonları
   bu sırayla tayfa diziyor, ray slaytları bu sırayla renklendiriyor.
3. **İçerik ≠ arayüz metni.** `content/site.ts` içerik; `i18n/strings.ts` arayüzün
   dili. **Bileşende sabit metin yazma.** Tayfsal simgeler (Hα 656, 404 nm) metin değil.
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
12. **Verimsiz kod yazma.** Bir sonraki faz için önden kod yazma.
13. **Prizma fareye bağlı DEĞİL** — hareketi kendi hâlinde (salınım + ışık darbeleri);
    mobilde de aynı görünmeli (kullanıcı kararı, Oturum 2).

## Durum · 28.09.2026

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
`deck/paginate.ts`; birimler `data-page-unit`) · İletişim kısa telefona sığıyor. → `DESIGN.md` § 12

⏭ **Sırada (kullanıcı): genel düzenleme/temizlik, sonra back-end** (panel, content.json).

⏸ **Beyaz tema** (kullanıcı "daha sonra" dedi) — presets.ts'e açık bir ön
ayar + seçici; theme.css renk kodu içermediği için bileşenlere dokunulmaz.
⚠️ Hale (`.prism-glow`) ve `mix-blend-mode: screen` koyu zemine göre — açık temada
yeniden düşünülmeli.

Yayın denemesi: trycloudflare hızlı tüneli (`cloudflare/cloudflared` imajı,
`prizma-tunel` + `prizma-yayin-web` konteynerleri, `prizma-yayin` ağı) — adres
her açılışta değişir. Kalıcı yayın için Cloudflare Pages önerildi, hesap gerekir.

🛑 **Bir sonraki faza kendiliğinden geçme — önce sor.** Kullanıcı her faz sonunda
durmak istiyor.

### Ertelenenler
- OG görseli (`web/public/og.png`, 1200×630) — tasarım oturunca çekilecek; `vite.config.ts`'e eklenecek
- Admin panel, `content.json` bağlantısı (trex-portfolio'nun Faz 6-8'i) — aynı sözleşme
- Proje `repoUrl`/`liveUrl` alanları boş — kullanıcı söyleyecek
- Git uzak reposu yok (yalnızca yerel `git init`)

## İçerik nereden geliyor

```
BUGÜN    web/src/content/site.ts ──> useContent() ──> sections/*
SONRA    api (SQLite) ──> GET /api/content ──> content.json ──> useContent()
```
**`content/types.ts` sözleşmedir** — API'nin döndürdüğü şekil ile birebir aynı.
İkinci kopya: `api/app/seed.py` (içerik değişirse ikisi de).

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
