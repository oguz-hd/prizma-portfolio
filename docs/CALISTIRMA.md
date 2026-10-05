# Projeyi Çalıştırma

> ⚠️ **Bu makinede `npm run dev` YEREL OLARAK ÇALIŞMAZ.** Sebebi aşağıda.
> Geliştirme Docker konteynerinde yapılır.

---

## Neden Docker zorunlu

Windows'ta **Smart App Control** açık (`VerifiedAndReputablePolicyState: 1`,
usermode code integrity enforced). Vite 8, bundler olarak **Rolldown** kullanıyor;
Rolldown Rust ile yazılmış, yani derlenmiş bir native binary olarak geliyor:

```
web/node_modules/@rolldown/binding-win32-x64-msvc/rolldown-binding.win32-x64-msvc.node  (20 MB)
```

Smart App Control bu imzasız dosyanın yüklenmesini engelliyor:

```
Error: Uygulama Denetimi ilkesi bu dosyayı engelledi.
```

`npm run dev` de `npm run build` de bu yüzden açılmadan ölüyor. **Kod hatası değil.**

Denenen ve işe yaramayan yol: `@rolldown/binding-wasm32-wasi` (WASM yedeği).
SAC engelini aşıyor ama Windows sürücü yollarını çözemiyor
(`Cannot resolve entry module C:\...\vite.config.ts`). Kaldırıldı.

Linux konteynerinde Smart App Control diye bir şey yok → Rolldown sorunsuz çalışır.
Lockfile'da `@rolldown/binding-linux-x64-musl` mevcut, yani alpine imajı doğru
binary'yi kuruyor.

**Not:** Smart App Control kapatılabilir ama **geri dönüşü yoktur** — kapatıldıktan
sonra Windows yeniden kurulmadan tekrar açılamaz. Bu yüzden tercih edilmedi.

---

## Geliştirme

Docker Desktop açık olmalı ("Engine running" yazana kadar bekle).

```powershell
cd C:\Users\drn49\Desktop\prizma-portfolio

# İlk sefer (imaj indirilir + npm ci çalışır, birkaç dakika sürebilir)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Sonraki seferler
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

→ **http://localhost:5174** (site) · **http://localhost:5175/admin/** (yönetim paneli,
dev: `admin@localhost` / `degistir`) · **http://localhost:8001/docs** (API)

Panel sitenin kaynağını import ediyor: compose `web/src`'yi panelin konteynerine
salt okunur bağlıyor (`/web/src`), fontları da sitenin sunucusundan alıyor (`/fonts`
yönlendirmesi). Panel sayfası 403 alan font gösteriyorsa: yönlendirme `changeOrigin`
açık kalmış olabilir — sitenin Vite'ı "web" adını tanımıyor (`admin/vite.config.ts`).

**İçerik API'den geliyor** (Faz 6): site açılırken `/content.json`'ı çekiyor, Vite
bunu API'ye yönlendiriyor (`vite.config.ts` → proxy; meta etiketleri de API'den).
API kapalıysa ya da henüz açılmadıysa site **"İçerik yüklenemedi"** ekranı gösterir —
yedek içerik bilerek yok. API ayağa kalkınca "Yeniden dene" yeter.

> Portlar trex-portfolio'dan (5173/8000) **bilerek farklı**: iki site aynı anda
> çalışabilsin. Vite konteynerin içinde de 5174'te dinliyor — HMR soketi sayfanın
> portuna bağlanıyor; 5173'e giderse eski sitenin sunucusuna düşer.
>
> ⚠️ Docker Desktop kapanıp açılırsa dev konteynerleri kendiliğinden kalkmaz
> (`restart: 'no'`, bilerek). Yukarıdaki `up` komutunu yeniden çalıştır.

Durdurmak için `Ctrl+C`, ya da başka bir pencereden:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### HMR (kaydet → tarayıcı yenilensin)

`docker-compose.dev.yml` içinde `VITE_USE_POLLING=1` var. Windows'ta bind mount
üzerinden inotify olayları konteynere ulaşmıyor; yoklama olmadan HMR gelmez.
`vite.config.ts` bu değişkeni okuyor.

Kaydettiğinde tarayıcı yenilenmiyorsa ilk bakılacak yer bu değişken.

### Yönetim API'sini denemek (Swagger)

**http://localhost:8001/docs** — dev hesabı `admin@localhost` / `degistir`.

1. `POST /api/auth/login` → *Try it out* → gövde
   `{"email": "admin@localhost", "password": "degistir"}` → *Execute*
2. Yanıttaki `accessToken`'ı kopyala → sağ üstte **Authorize** → yapıştır (başına
   `Bearer` yazma) → *Authorize*. Kilitli uç noktalar artık açık.
3. Bir kaydın güncel hâli için `GET /api/content`; gövdeyi oradan kopyalayıp değiştir.
   Swagger'ın örnek gövdesindeki boş metinler **422** verir — doğrulama böyle
   (iki dil birlikte dolu olmalı).

⚠️ Yazmalar GERÇEK: veritabanı ve `content.json` anında değişir, site yenilenince
görünür. Geri dönmek için aynı uç noktayla eski değeri yaz ya da dev verisini
sıfırla ("Temiz başlangıç"). `PUT /api/auth/password` dev parolasını da değiştirir —
`degistir`e API'den geri dönülemez (bilerek); dönmek için veritabanını sıfırla.

---

## Yayın (prod)

```powershell
copy .env.example .env      # sonra DOMAIN, ADMIN_EMAIL, JWT_SECRET, ADMIN_PASSWORD doldur
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`DOMAIN` boşsa Caddy `:80` dinler (yerel deneme).
Gerçek alan adı verilirse Let's Encrypt sertifikasını kendi alır.

⚠️ **API üretimde varsayılanlarla AÇILMAZ** (Oturum 15): `JWT_SECRET` varsayılansa
ya da veritabanındaki admin hesabı `degistir` parolasını kabul ediyorsa API
başlarken hata verip kapanır. Site (Caddy) etkilenmez, yalnızca API.

### API prod'da açılmıyor: "Üretimde güvensiz varsayılanlar"

`.env`'e `JWT_SECRET` ve `ADMIN_PASSWORD` yaz. **Hesap zaten oluşmuşsa bu yetmez:**
tohumlama yalnızca boş veritabanında çalışır. Dev ve prod aynı `data` volume'unu
paylaşıyor — dev'de `degistir` ile kurulan hesap prod'a da taşınır. Çözüm
veritabanını sıfırlamak (aşağıdaki "Temiz başlangıç", **veri siler**) ya da
parolayı **dev'de** değiştirmek (`PUT /api/auth/password`, Faz 7'de panelden de):
prod API bu hesapla hiç açılmadığı için parola prod'dan değiştirilemez, ama
volume ortak olduğundan dev'de değişen parola prod'da da geçerli.

---

## Yayın (sunucu) — https://oguzhd.com

Kuruldu: 02.10.2026 (Oturum 7). Komutları kullanıcı kendisi yazdı; kurulum adımları aşağıda,
yeniden kurmak gerekirse aynı sırayla.

| Ne | Değer |
|---|---|
| Sunucu | DigitalOcean droplet `prizma`, Frankfurt (FRA1), 1 vCPU / 1 GB RAM / 25 GB, Ubuntu 24.04 |
| Adres | `142.93.162.220` · `2a03:b0c0:3:f0:0:3:b8e:e000` |
| Alan adı | `oguzhd.com`, Cloudflare Registrar; DNS Cloudflare'de |
| Kod | `/opt/prizma-portfolio` (GitHub deploy key, salt okunur: `~/.ssh/github_deploy`) |
| Gizli ayarlar | `/opt/prizma-portfolio/.env` (600) — `DOMAIN`, `ADMIN_EMAIL`, `JWT_SECRET`, `ADMIN_PASSWORD` |
| Veri | Docker volume `prizma-portfolio_data` → `/var/lib/docker/volumes/prizma-portfolio_data/_data` |

**Erişim** (bilgisayardan): `ssh prizma` — `~/.ssh/config`'te `HostName 142.93.162.220`,
`User oguz`, `IdentityFile ~/.ssh/prizma_sunucu` (parolasız anahtar). Root ve parolayla giriş kapalı.

**Güncelleme** (kod push edildikten sonra):
```bash
ssh prizma
cd /opt/prizma-portfolio && git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build   # ~1,5 dk
```
Veri volume'da — container yeniden kurulsa da kalır. ⚠️ Sunucuda **asla `down -v`** (volume'u siler).

**Kayıtlar / durum:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f web   # Caddy, sertifika
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api
```

**Canlı test** (bilgisayardan; parola sunucudan, ekrana yazılmadan — kayıt açıp siler, parolayı geri alır):
```bash
ADMIN_EMAIL=drn4902@gmail.com ADMIN_PASSWORD="$(ssh prizma "grep '^ADMIN_PASSWORD=' /opt/prizma-portfolio/.env | cut -d= -f2-")" node tools/yayin/uctan-uca.mjs https://oguzhd.com
```

**Kurulum adımları** (sırasıyla): `apt update && apt upgrade` + reboot → `adduser oguz`,
`usermod -aG sudo,docker`, root'un `.ssh`'ı kopyalandı → `/etc/ssh/sshd_config.d/00-sertlestirme.conf`
(`PermitRootLogin no`, `PasswordAuthentication no`, `KbdInteractiveAuthentication no`; `00-` çünkü
sshd ilk okunan değeri kullanıyor, DO'nun `50-cloud-init.conf`'unu geçsin) → `ufw allow OpenSSH, 80,
443` + `enable` → 2 GB `/swapfile` (+ fstab) → `timedatectl set-timezone Europe/Istanbul` → Docker
resmî apt deposundan → deploy key + clone → `.env` (`openssl rand -hex 32`, parola
`openssl rand -base64 18 | tr -d '/+='`) → DNS → `up -d --build`. Otomatik güvenlik güncellemeleri
(`unattended-upgrades`) Ubuntu'da hazır açık.

**DNS (Cloudflare):** `A @ → 142.93.162.220` ve `AAAA @ → 2a03:…` **DNS only (gri)** — turuncu
bulutta Caddy istemci IP'sini göremez, giriş sınırı (`throttle.py`) herkesi tek IP sayar.
`CNAME www → oguzhd.com` **Proxied** + Redirect Rule (`http.host eq "www.oguzhd.com"` →
`concat("https://oguzhd.com", http.request.uri.path)`, 301, sorgu korunur) — www sunucuya hiç gelmez.

**Yedek:** günlük, aynı volume'da (aşağıdaki "Yedek"). Sunucu dışı kopya YOK — kullanıcı kararı
(02.10.2026, içerik az). Droplet silinirse içerik gider; içerik birikince DigitalOcean Backups
(~%20) ya da yedeği bilgisayara çekmek.

İçerik temiz başladı (seed). Bilgisayardaki dev volume'u taşımak gerekirse: dev API durmuşken
`site.db` + `uploads/` arşivlenip sunucuda `api` durdurularak volume'a açılır; dev hesabı
`degistir` parolalı olduğundan API açılmaz → hesap `docker compose … run --rm api python -c …`
ile (`app.auth.hash_password`) `.env`'deki e-posta/parolaya çekilir.

---

## Telefonda deneme (geçici yayın)

Kalıcı yayın yok; telefonda denemek için site Cloudflare'in hızlı tüneliyle geçici bir
adrese açılıyor. Hesap gerekmiyor, adres her başlatmada değişiyor. Dev konteynerleri
çalışıyor olmalı — içerik dev'in veritabanından geliyor (panelde yapılan değişiklik
telefonda da hemen görünür).

⚠️ Faz 6'dan beri `web/dist`'i düz bir statik sunucu SUNAMAZ: `index.html`'deki meta
şablonunu Caddyfile işliyor, `/content.json` veri volume'undan geliyor. Bu yüzden tünelin
arkasında **yayın imajı + projenin Caddyfile'ı + dev'in veri volume'u** duruyor.
(`web/dist`'i bind mount etmek olmuyor: salt okunur bağlamanın içine volume bağlanamıyor.)

```powershell
# 1) Derle: yayın imajı (kod her değiştiğinde)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build web

# 2) Yayın sunucusu (her derlemeden sonra yeniden kur)
docker network create prizma-yayin            # yalnızca ilk sefer
docker rm -f prizma-yayin-web
docker run -d --name prizma-yayin-web --network prizma-yayin `
  -v prizma-portfolio_data:/srv/data:ro `
  -v "C:\Users\drn49\Desktop\prizma-portfolio\Caddyfile:/etc/caddy/Caddyfile:ro" `
  prizma-portfolio-web:prod

# 3) Tünel (yalnızca ilk sefer — sunucu yeniden kurulunca tünele dokunmak gerekmiyor)
docker run -d --name prizma-tunel --network prizma-yayin `
  cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://prizma-yayin-web:80

# 4) Adres
docker logs prizma-tunel 2>&1 | Select-String trycloudflare.com
```

- **Bilgisayar uyudu / şarj bitti → adres çözülmüyor:** `docker restart prizma-tunel`,
  yeni adres loglarda (Oturum 4'te yaşandı).
- Tünelde `/api` çalışmaz (yayın sunucusu dev API'sinin ağında değil) — ziyaretçi
  sitesinin API'ye ihtiyacı yok, panel yerelde kullanılır.
- Kapatmak: `docker rm -f prizma-tunel prizma-yayin-web`

---

## Sorun giderme

### Site "İçerik yüklenemedi" diyor

`/content.json` gelmedi. Geliştirmede: API konteyneri çalışıyor mu
(`docker ps`, `docker logs prizma-portfolio-api-1`)? Yayında: API en az bir kez açılıp
`/data/content.json`'ı yazmış olmalı (her açılışta yazıyor — güvensiz varsayılanlar
yüzünden kapanmadan ÖNCE de, yani site o durumda da ayakta).

### `npm run typecheck`: "Unable to resolve @typescript/typescript-linux-x64"

Konteynerin `node_modules`ü eski bir imajdan geliyor (Oturum 5'te yaşandı: 28.09'daki
`npm ci` katmanı TypeScript 7'nin Linux paketini kurmamıştı, build önbelleği de onu
tutuyordu; `down -v` sonrası konteyner o imajın paketlerine döndü). İmajı önbelleksiz
yeniden kur ve anonim volume'u yenile:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache web
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --renew-anon-volumes web
```

### Build hiç başlamıyor / çıktı vermeden düşüyor

Docker Desktop yeni açıldıysa engine hazır olmadan komut gitmiş olabilir. Önce:

```powershell
docker run --rm hello-world
```

Bu çalışıyorsa daemon sağlamdır. Sonra imajları ayrı çek — en uzun adım bu,
ayrı çekince ilerlemeyi görürsün:

```powershell
docker pull node:22-alpine
docker pull caddy:2-alpine
```

Sonra build'i ayrıntılı log ile çalıştır:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml build --progress=plain
```

### Konteyner açılıyor ama sayfa boş / node_modules hatası

`docker-compose.dev.yml` içindeki anonim volume satırı (`- /app/node_modules`)
silinmiş olabilir. O satır host'un Windows için kurulmuş `node_modules`ünün
konteynerinkini gölgelemesini engelliyor. Silinirse konteyner win32 binary'leri
kullanmaya çalışır ve aynı hataya düşer.

### Temiz başlangıç

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

⚠️ `-v` volume'ları da siler. Faz 5'ten sonra bu, veritabanını silmek demek —
içerik `seed.py`'deki ilk hâline döner, panelden yapılan her düzenleme gider.
Konteynerin anonim `node_modules` volume'u da silinir; yenisi imajdan kurulur
(imaj eskiyse yukarıdaki typecheck sorunu).

---

## Performans ölçümü

`tools/perf/olcum.mjs` — bağımlılıksız; Chrome'u kendi başlatır (CDP), GPU'yu Windows
sayaçlarından okur. **Yayın derlemesini** ölç (dev'de React geliştirme kipi şişirir):

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml build web
docker rm -f prizma-olcum-web
docker run -d --name prizma-olcum-web -p 127.0.0.1:5180:80 `
  -v prizma-portfolio_data:/srv/data:ro `
  -v "C:\Users\drn49\Desktop\prizma-portfolio\Caddyfile:/etc/caddy/Caddyfile:ro" `
  prizma-portfolio-web:prod
node tools/perf/olcum.mjs http://localhost:5180/ dizustu,orta,telefon,gpusuz   # PowerShell'den
```
Sonuçlar `tools/perf/sonuclar/` (git'e girmiyor). Ölçerken Chrome penceresini
örtme/küçültme — sekme gizlenirse rAF durur, betik o profili "görünür değil" diye atlar.
⚠️ Chrome bu makinede dahili **Radeon 610M**'yi seçiyor (RTX değil) ve ekranın yenileme
hızında (60 ya da 240 Hz) çiziyor — GPU yükü yenileme hızıyla orantılı; karşılaştırırken bak.
`OLCUM_SINIRSIZ=1` vsync'i kapatır (yüksek yenileme taklidi) ama betiğin kendi rAF döngüsü
saniyede ~1500 kare ürettirir → CPU/GPU rakamları anlamsızlaşır; yalnızca "prizma saniyede
kaç kez çiziliyor" gibi sayımlar için (Oturum 6: 1134 rAF'ta 74 çizim).

---

## Büyüyen içerik testi

Düzen içerik büyüyünce dayanıyor mu? Asıl veritabanına dokunmadan, iki ayrı yığın
(kendi boş veritabanları, yayın imajı). `tools/icerik/buyut.mjs` senaryoları anlatıyor.

```powershell
foreach ($s in @(@{n='a';api=8011;web=5181},@{n='b';api=8012;web=5182})) { $n=$s.n
  docker run -d --name "prizma-buyuk-$n-api" -p "127.0.0.1:$($s.api):8000" -v "prizma-buyuk-${n}:/data" `
    -e DATA_DIR=/data -e DEBUG=1 prizma-portfolio-api:dev      # DEBUG yoksa varsayılan parolayla açılmaz
  docker run -d --name "prizma-buyuk-$n-web" -p "127.0.0.1:$($s.web):80" -v "prizma-buyuk-${n}:/srv/data:ro" `
    -v "C:\Users\drn49\Desktop\prizma-portfolio\Caddyfile:/etc/caddy/Caddyfile:ro" prizma-portfolio-web:prod }
node tools/icerik/buyut.mjs A http://localhost:8011    # → http://localhost:5181
node tools/icerik/buyut.mjs B http://localhost:8012    # → http://localhost:5182
```
Senaryo yalnızca boş (yeni tohumlanmış) veritabanına bir kez uygulanır; tekrar için
`docker rm -f prizma-buyuk-a-api prizma-buyuk-a-web; docker volume rm prizma-buyuk-a`.
⚠️ Betik dosyalarını PowerShell'in `Get-Content`/`Set-Content`'iyle düzenleme —
`-Encoding` verilmezse Türkçe karakterler bozulur (Oturum 6'da oldu).

C senaryosu (Faz 9 türleri): `node tools/icerik/buyut.mjs C http://localhost:8013` — yeni
türlerden birer bölüm ve 6 örnek görsel. Test yığınında panel açmak (senin içeriğine dokunmadan):
```powershell
docker network create prizma-c
# --network-alias api: Caddyfile API'yi `api:8000` diye arıyor (yoksa her istek DNS'te asılı kalır)
docker run -d --name prizma-c-api --network prizma-c --network-alias api -p 127.0.0.1:8013:8000 -v prizma-buyuk-c:/data `
  -v "C:\Users\drn49\Desktop\prizma-portfolio\api\app:/app/app" -e DATA_DIR=/data -e DEBUG=1 prizma-portfolio-api:dev
docker run -d --name prizma-c-web --network prizma-c -p 127.0.0.1:5183:80 -v prizma-buyuk-c:/srv/data:ro `
  -v "C:\Users\drn49\Desktop\prizma-portfolio\Caddyfile:/etc/caddy/Caddyfile:ro" prizma-portfolio-web:prod
docker run -d --name prizma-c-admin --network prizma-c -p 127.0.0.1:5186:5175 -e VITE_USE_POLLING=1 `
  -e API_ORIGIN=http://prizma-c-api:8000 -e WEB_ORIGIN=http://prizma-c-web:80 -e VITE_SITE_URL=http://localhost:5183/ `
  -v "C:\Users\drn49\Desktop\prizma-portfolio\admin:/app" -v /app/node_modules `
  -v "C:\Users\drn49\Desktop\prizma-portfolio\web\src:/web/src:ro" prizma-portfolio-admin:dev
```

---

## Şema göçleri ve yedekler

API açılışta eksik şema adımlarını uygular (`api/app/migrations.py`); her uygulamadan önce
`/data/site.db.bak-v<eski sürüm>` kopyası alınır. Geri dönmek: API'yi durdur, `.bak`'ı
`site.db`'nin yerine kopyala. Faz 9 göçünün yedeği: volume'da `site.db.bak-v0` ve masaüstünde
`prizma-site.db.yedek-2026-10-01`.


---

## Yedek

Yayın yığınında `backup` servisi (docker-compose.prod.yml → `tools/yedek/yedekle.sh`) her gün
`/data/backups/`'a veritabanının tutarlı kopyasını (`sqlite3 .backup`, 14 gün) ve görsellerin
arşivini (7 gün) yazar. Elle bir kez almak:
```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm -e YEDEK_BIR_KEZ=1 backup
```
Geri yüklemek: API'yi durdur → `site-YYYY-MM-DD.db`'yi `/data/site.db`'nin yerine kopyala →
görseller için arşivi `/data`'ya aç → API'yi başlat.
⚠️ Yedekler aynı volume'da: yanlış düzenlemeye ve bozulmaya karşı korur, sunucunun kaybına karşı
DEĞİL. Sunucu dışına kopya, barındırma seçildikten sonra kurulacak.
⚠️ Caddy `/data/*`'yı HTTP'den sunmuyor (Caddyfile) — eskiden `/data/site.db` indirilebiliyordu
(Oturum 6'da kapatıldı). Caddyfile'ı değiştirirken bu bloğu koru.

## Güvenlik (yayında)

- Giriş: aynı IP'den 15 dakikada 5 hatalı deneme → 429 (`api/app/throttle.py`).
- Başlıklar (Caddyfile): CSP (betik yalnızca kendi kökten), nosniff, X-Frame-Options DENY,
  Referrer-Policy, Permissions-Policy, HSTS. Site ve panelde CSP ihlali yok (ölçüldü).
- Yükleme: Caddy 16 MB'ın üstünü API'ye iletmiyor; API 15 MB + 40 MP sınırı, EXIF/GPS siliniyor.
- Gövde sınırı API'de (`api/app/limits.py`, 16 MB, gövde okunmadan): token'sız yönetim isteği
  gövdesi okunmadan 401. Caddy'nin payı (20 MB) bundan BÜYÜK kalmalı — eşitken bağlantı asılı
  kalıyordu. Caddy zaman aşımları: başlık 10 sn, gövde 2 dk, API yanıtı 2 dk.
- Yayında API belgeleri (`/docs`, `/openapi.json`) kapalı; API `uid 10001` ile çalışıyor; JWT
  anahtarı 32 karakterden kısaysa API açılmıyor.
- Geliştirme portları yalnızca `127.0.0.1` (dev parolası varsayılan) — test yığınlarını da öyle aç.
- İlk yayından önce: `.env`'de `JWT_SECRET` (`openssl rand -hex 32`) ve güçlü `ADMIN_PASSWORD`; dev
  veritabanı taşınacaksa paneldeki "Hesap"tan parolayı değiştir — API varsayılan parolayla açılmaz.
- Rapor: https://claude.ai/code/artifact/b63b856b-06fa-4ae0-948f-e70fbed95811 (01.10.2026).

## Yayın öncesi testler

Hepsi yayın yığınının birebir kopyasında (yayın imajları, Caddyfile, yedek servisi), ayrı proje
adıyla ve yalnızca bu bilgisayarda (8090). `test.env`: `DOMAIN=`, `ADMIN_EMAIL=…`, 64 karakterlik
`JWT_SECRET`, güçlü `ADMIN_PASSWORD`; `ports.yml`: `services.web.ports: !override ['127.0.0.1:8090:80']`
ve `services.api.ports: ['127.0.0.1:8013:8000']`.
```powershell
docker compose -p prizma-yayin-test --env-file test.env -f docker-compose.yml -f docker-compose.prod.yml -f ports.yml up -d --build
$env:ADMIN_EMAIL='…'; $env:ADMIN_PASSWORD='…'
node tools/yayin/uctan-uca.mjs http://127.0.0.1:8090    # ziyaretçi + yönetici yolu, 404/robots/llms/favicon, 30 kontrol
node tools/yayin/tarayici.mjs  http://127.0.0.1:8090    # gerçek Chrome: site, 404, panel girişi, 13 kontrol
docker exec prizma-portfolio-api-1 pytest                # API, 26 test
# Güvenlik yoklaması uç noktaları /openapi.json'dan okuyor — yayın API'sinde kapalı. Aynı
# veri ve anahtarla DEBUG'lı bir kopya açılır (giriş bilgileri ADMIN_EMAIL/ADMIN_PASSWORD'dan):
docker run -d --rm --name prizma-yayin-test-apidebug --network prizma-yayin-test_default --env-file test.env `
  -e DATA_DIR=/data -e DEBUG=1 -v prizma-yayin-test_data:/data -p 127.0.0.1:8014:8000 prizma-portfolio-api:prod
node tools/guvenlik/yokla.mjs http://127.0.0.1:8090 http://127.0.0.1:8014   # 37 kontrol
docker stop prizma-yayin-test-apidebug
# Safari (WebKit) — dairedeki bağlantılar gerçekten tıklanıyor mu (masaüstü + iPhone):
docker build -t prizma-portfolio-safari tools/safari
docker run --rm --add-host=host.docker.internal:host-gateway -v "${PWD}/tools/safari:/t" -w /pw prizma-portfolio-safari `
  sh -c "cp /t/tikla.mjs . && node tikla.mjs http://host.docker.internal:8090"
docker compose -p prizma-yayin-test -f docker-compose.yml -f docker-compose.prod.yml -f ports.yml down -v
```
Lint: `docker exec prizma-portfolio-api-1 ruff check` · `docker exec prizma-portfolio-web-1 npm run lint`
· `docker exec prizma-portfolio-admin-1 npm run lint` (oxlint; `.oxlintrc.json` — React Compiler
kuralları kapalı, `exhaustive-deps` uyarı: PrismStage/Ring'deki eksik bağımlılıklar bilerek).
Lighthouse (Chrome DevTools MCP → `lighthouse_audit`, masaüstü + mobil): 01.10.2026'da erişilebilirlik,
en iyi uygulamalar, SEO 100/100/100. `uctan-uca` ve `tarayici` ilk gerçek yayından hemen sonra canlı
adreste de çalıştırılır (içerik girilmeden: kayıt açıp siler, parolayı değiştirip geri alır).
