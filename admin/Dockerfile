# syntax=docker/dockerfile:1

# ───────────────────────────────────────────────────────────────────────────
#  prizma-portfolio · admin (yönetim paneli, Faz 7b)
#
#  Yalnızca GELİŞTİRME imajı. Yayında panel ayrı bir sunucu değil: web imajı
#  onu da derleyip /srv/admin'e koyuyor (web/Dockerfile → admin-build), Caddy
#  sitenin altında sunuyor (/admin/).
# ───────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Kaynak KOPYALANMIYOR — compose bind mount ile bağlıyor (docker-compose.dev.yml),
# sitenin kaynağını da (/web/src, @site alias'ı).
FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 5175
CMD ["npm", "run", "dev", "--", "--host"]
