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

→ **http://localhost:5174** (site) · **http://localhost:8001/docs** (API)

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
