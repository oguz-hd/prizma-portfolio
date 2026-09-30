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
