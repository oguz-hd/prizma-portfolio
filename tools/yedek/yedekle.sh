#!/bin/sh
# Günlük yedek (yayına hazırlık, Oturum 6) — docker-compose.prod.yml → backup servisi.
#
#   /data/backups/site-YYYY-MM-DD.db       veritabanı, 14 gün
#   /data/backups/uploads-YYYY-MM-DD.tgz   yüklenen görseller, 7 gün
#
# `sqlite3 .backup` API çalışırken bile tutarlı kopya alır (dosyayı düz kopyalamak
# yazma anına denk gelirse bozuk kopya verebilir). Yedekler AYNI volume'da: yanlış
# düzenlemeye / bozulmaya karşı korur, makinenin kaybına karşı değil — sunucu dışına
# kopya barındırma kararından sonra (CALISTIRMA "Yedek").
# Caddy /data/*'yı HTTP'den sunmuyor (Caddyfile) — yedekler dışarıdan indirilemez.
#
# YEDEK_BIR_KEZ=1 → bir kez al ve çık (deneme).
set -eu

apk add --no-cache sqlite >/dev/null
dir=/data/backups
mkdir -p "$dir"

while true; do
  gun=$(date +%F)
  # İlk kurulumda veritabanını API kuruyor; yedek servisi ondan önce kalkarsa
  # 24 saat beklemesin, dakikada bir baksın.
  if [ ! -f /data/site.db ]; then
    [ "${YEDEK_BIR_KEZ:-}" = "1" ] && exit 1
    sleep 60
    continue
  fi
  if [ -f /data/site.db ]; then
    sqlite3 /data/site.db ".backup '$dir/site-$gun.db'"
    if [ -d /data/uploads ]; then
      tar czf "$dir/uploads-$gun.tgz" -C /data uploads
    fi
    find "$dir" -name 'site-*.db' -mtime +14 -delete
    find "$dir" -name 'uploads-*.tgz' -mtime +7 -delete
    echo "yedek alındı: $gun"
  fi
  [ "${YEDEK_BIR_KEZ:-}" = "1" ] && exit 0
  sleep 86400
done
