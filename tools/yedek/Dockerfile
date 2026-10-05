# Günlük yedek servisi (docker-compose.prod.yml → backup). sqlite imaja gömülü:
# eskiden her açılışta `apk add` ağdan kuruyordu — ağ yoksa `set -e` yüzünden
# servis yeniden başlatma döngüsüne giriyordu (kod incelemesi, 05.10.2026).
FROM alpine:3.20
RUN apk add --no-cache sqlite
