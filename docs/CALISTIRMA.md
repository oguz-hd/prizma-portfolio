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
Faz 7'deki panelden parolayı değiştirmek.

---

## Telefonda deneme (geçici yayın)

Kalıcı yayın yok; telefonda denemek için derlenmiş site (`web/dist`) Cloudflare'in
hızlı tüneliyle geçici bir adrese açılıyor. Hesap gerekmiyor, adres her başlatmada
değişiyor. Dev konteyneri çalışıyor olmalı.

```powershell
# 1) Derle (web/dist güncellenir — tünel yeni dosyaları hemen sunar, bind mount)
docker exec prizma-portfolio-web-1 npm run build

# 2) İlk sefer: ağ + statik sunucu + tünel
docker network create prizma-yayin
docker run -d --name prizma-yayin-web --network prizma-yayin `
  -v "C:\Users\drn49\Desktop\prizma-portfolio\web\dist:/srv:ro" `
  caddy:2-alpine caddy file-server --root /srv --listen :80
docker run -d --name prizma-tunel --network prizma-yayin `
  cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://prizma-yayin-web:80

# 3) Adres
docker logs prizma-tunel 2>&1 | Select-String trycloudflare.com
```

- **Bilgisayar uyudu / şarj bitti → adres çözülmüyor:** `docker restart prizma-tunel`,
  yeni adres loglarda (Oturum 4'te yaşandı).
- ⚠️ Oturum 3'te kurulan `prizma-yayin-web` ayar dosyasını (Caddyfile) o oturumun
  geçici klasöründen bağlıyor. Dosya silinirse konteyner yeniden başlamaz →
  `docker rm -f prizma-yayin-web` ve yukarıdaki komutla yeniden kur (ayar dosyası gerekmiyor).
- `caddy file-server`'da SPA yönlendirmesi yok: `/#hakkimda` gibi adresler çalışır,
  `/yok` gibi yollar sitenin 404'ü yerine sunucunun boş 404'ünü verir.
- Kapatmak: `docker rm -f prizma-tunel prizma-yayin-web`

---

## Sorun giderme

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

⚠️ `-v` volume'ları da siler. Faz 5'ten sonra bu, veritabanını silmek demek.
