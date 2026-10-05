# Günlük

> Oturum başına 3-5 cümle. Ayrıntı commit mesajlarında, kalıcı kararlar konu dosyalarında.

**Oturum 1 · Proje doğdu (28.09.2026).** trex-portfolio'nun hero prizması kullanıcıya
yeni bir site fikri verdi: prizma sitenin merkezi, açılış ışığın geçişi, sayfa yerine
slaytlar. Eski proje baştan sona incelendi; içerik, API, token sistemi, iki dillilik ve
Docker aynen taşındı, dino (4.800 satır) bırakıldı. Kullanıcı kararları: Tayf paleti,
prizma her slaytta ortada, bölüm başına bir slayt. Ekranda beş hata yakalandı — en
öğreticisi, prizmayı her slaytta göstermek için konan cam panelin prizmayı tamamen
yutmasıydı; karar kodda vardı, ekranda yoktu. Ayrıntı `DESIGN.md` § 8.

**Oturum 2 · Işık, daire, tek font (28.09.2026).** Site trycloudflare ile geçici olarak
yayına açıldı (Docker'da cloudflared). Kullanıcının geri bildirimiyle prizma parlatıldı ve
fareden koparıldı — artık kendi salınımı ve ışık darbeleriyle yaşıyor, mobilde de. İsim ve
bağlantılar prizmayı çevreleyen hayali bir dairenin yaylarına dizildi; site tek fonta
(Departure Mono) indi; Projeler'in yerini Deneyim ve Eğitim aldı; İletişim açılışın aynası
olan bir kapanış karesi oldu. Sırada beyaz tema.

**Oturum 3 · Kaydırma, çizgi, menü (30.09.2026).** "İki kez kaydırmak gerekiyor" şikâyetinin
kaynağı geçiş sürerken gelen hareketin yutulmasıydı; artık sıraya giriyor ve geçiş hızlanıyor.
Üçgendeki eğri çizgi (sol kenar parıltısı) kalktı; mobil menü içerikteki kısa adlarla sığıyor.
Yükleme ölçüldü: paket zaten küçük (~130 KB gzip), algılanan gecikmenin çoğu 3.4 sn'lik açılış.
Sonra: düzyazı Atkinson'a geçti (tek font kuralı iki role ayrıldı), tayf raya kadar uzadı,
isim harfleri genişledi, unvan "Yazılım geliştirici" oldu. Dil geçiş efekti bir seçenek sayfasından
seçildi (Katakana + tayf renkli harf çözülmesi); açılışta da çalışıyor.

**Oturum 4 · Alt sayfalar (30.09.2026).** Telefonda taşan slaytlar içeriden kaymak yerine
ölçülerek alt sayfalara bölünüyor (kullanıcı seçimi A1): her kaydırma bir adım, başlık
kalıyor, sayaç ve rayda alt sayfa çizgileri var. İş başka bir oturumda başlamış ve yarım
kalmıştı (derlenmiyordu, işaretler ve CSS yoktu); tamamlandı. İletişim kısa telefonlara
boşluklar daraltılarak sığdırıldı. Geçişte tayf büyüyüp küçülen bir dalga yapıyor (dört güç
sitede `?fx` ile denendi, hafifi seçildi); tayftaki çizgi ve yazılar sadelik için kalktı;
navbar'daki üçgenin yerine akan tayflı "INTRO" geldi. İletişim girişin dairesine taşındı
(ortak `Ring.tsx`); kod incelemesi o dairenin kısa ekranda küçülüp çöktüğünü buldu, düzeltildi.
Ardından ölü CSS/kod temizlendi ve proje GitHub'a (özel depo) yüklendi. Frontend'e ara verildi;
sırada back-end (kullanıcı kararı).

**Oturum 5 · Faz 6: içerik veritabanından (01.10.2026).** Back-end üç durağa bölündü (6 →
7a admin API → 7b panel). Site artık içeriği API'nin yazdığı `/content.json`'dan alıyor;
kullanıcı yedek istemedi, `site.ts` silindi (silmeden önce tohum verisiyle alan alan
karşılaştırıldı — tek fark bir kesme işaretiydi). Tarayıcılar JS çalıştırmadığı için meta
etiketlerini artık Caddy şablonu gömüyor. Prod denemesi, boş `DOMAIN`'in Caddy'yi hiç
açtırmadığını ortaya çıkardı (baştan beri bozukmuş); `down -v` de eski bir imajın
TypeScript'siz `node_modules`ünü geri getirdi — ikisi de düzeltildi, CALISTIRMA'da.
Ardından Faz 7a: yönetim API'si. Girdi çıktının şekliyle aynı (iki dil yan yana), yarım
çevrilmiş alan reddediliyor; parola değişince token'daki parola izi eski oturumları
düşürüyor. Uçtan uca bir betik her uç noktayı hatalı ve doğru girdiyle denedi, sonunda
içeriği başlangıçtakiyle birebir karşılaştırdı (83/83).
Sonra Faz 7b: yönetim paneli ayrı bir build olarak kuruldu, sözleşmeyi ve paletleri
sitenin kaynağından import ediyor. Kullanıcı testler sürerken paneli kendisi de
kullandı (paleti Turbo'ya, sonra Aurora'ya aldı) — panelin seçili paleti izlemesi o
sırada bozuldu: Aurora'da kırmızı ton yok, hata yazısı camgöbeği çıktı; panel hep Tayf'a
sabitlendi. Kullanıcı iki şey istedi: giriş ekranında prizma teması ve büyüyen içerik testleri.

## Oturum 6 · 01.10.2026 — panel girişi sitenin prizmasıyla
Giriş ekranının el çizimi prizması gitti; yerine sitenin `PrismStage` + `Starfield`'ı
(@site) ve `intro.ts`'in zamanlamaları geldi. ADMIN, kullanıcının "genel bir uyum"
isteğiyle Giriş slaytındaki isim gibi dairenin üst yayında (`Ring`, boyu sitedeki ismin
uzunluğundan); form alt alta, prizma biraz yukarıda. Yanlış parola tayfta "401 nm"; giriş
anında sahne tayfın içine yakınlaşıp ekranı sarıyor, aynı renkte örtü panelin üstünde
söner. Giriş ekranı sitenin seçili paletinde (herkese açık `/api/content`), panel Tayf'ta.
Tarayıcı MCP'leri bağlanmadı: doğrulama, PowerShell'den başlatılan başsız Chrome + CDP betiğiyle.
Oturum 6 sonu: ilk performans ölçümü (`tools/perf/olcum.mjs`, dört cihaz profili). Bellek
sorunsuz; asıl yük GPU'daydı ve ekranın yenileme hızıyla büyüyordu — prizma 74 fps'e
sınırlandı, zayıf GPU'da cam panelin bulanıklığı kendiliğinden kalkıyor (`html[data-lite]`).
Kod incelemesinin tek bulgusu düzeltildi: panelde çıkıştan sonra `scene.surge` 1'de kalıyordu.
Faz 9 (Oturum 6): panelden bölüm ekleme — serbest metin, zaman çizelgesi, projeler, duyuru,
galeri; fotoğraf yükleme (EXIF/GPS silinir, WebP). Bileşeni artık tür seçiyor. Şema göç
düzeni ve ilk kalıcı API testleri geldi; dev veritabanı kopyada denenip sıfırlanmadan yükseldi.
Görünüş seçenek sayfasıyla (A1 · B2 · L1 · C2 · D2); panel uçtan uca test yığınında denendi.
Güvenlik taraması (Oturum 6 sonu): kimlik denetiminden önce gövde okunuyordu ve sınırı aşan
yükleme bağlantıyı askıda bırakıyordu — sınır API'ye (gövde okunmadan) taşındı. Dev portları
yerele, API yayında root değil, belgeler kapalı. Yayın yığınının kopyasında uçtan uca, tarayıcı ve
Lighthouse testleri; bulunan gerileme: panel girişi korumalı adrese gidiyordu (düzeldi).
Oturum 7 (02.10.2026): site yayında — https://oguzhd.com. Önce yayın öncesi kontrol listesi kodla
karşılaştırıldı (güvenlik çoğu tamam; httpOnly çerez, IP kilidi, sitemap/canonical/llms.txt yok, 404
200 dönüyor). Hetzner'de ucuz tip stokta olmadığından DigitalOcean (1 GB + swap; derleme 94 sn).
Kullanıcı öğrenmek için sunucu komutlarını kendisi yazdı; Claude anlatıp ssh ile doğruladı.
İçerik temiz başladı (dev içeriği taşınmadı); canlıda uçtan uca 26/26.
Oturum 8 (05.10.2026): genel kod incelemesi — kritik bulgu yok; plan A (Safari) → B (yayın kontrol
listesi) → C (kararlar) → D (beyaz tema, Faz 8). Safari'de daire bağlantıları hiç tıklanmıyordu: WebKit
isabeti <textPath> içindeki <a>'ya indirmiyor; 03.10'daki CSS denemesi yetmemişti (test ölçtü). Her
bağlantı kendi <a><text>'i oldu (RingLinks), WebKit 12/12. B: gerçek 404, robots/sitemap/llms.txt,
canonical, sabit favicon, token 4 saat, alt metin yedeği, yedek imajı, ruff + oxlint, React 19.3.
