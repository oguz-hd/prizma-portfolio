# syntax=docker/dockerfile:1

# ───────────────────────────────────────────────────────────────────────────
#  prizma-portfolio · web
#
#  Üç aşama: deps → dev (Vite sunucusu) · deps → build → prod (Caddy)
#
#  ⚠️ Node sürümü: Vite 8, Node ^20.19 || >=22.12 istiyor. node:22-alpine
#  bu aralığın içinde. Yerel makinede Node 26 var; fark sorun değil çünkü
#  konteyner kendi node_modules'ünü kuruyor.
# ───────────────────────────────────────────────────────────────────────────

# --- Aşama 1: bağımlılıklar ------------------------------------------------
# Ayrı aşama: kaynak kod değişince npm ci yeniden çalışmasın, katman önbelleği tutsun.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


# --- Aşama 2: geliştirme ---------------------------------------------------
# Kaynak kod KOPYALANMIYOR — compose bind mount ile bağlıyor (docker-compose.dev.yml).
FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 5174
# --host olmadan sunucu yalnızca 127.0.0.1'i dinler ve konteyner dışından erişilemez.
# (vite.config.ts'te host: true zaten var; burada açıkça tekrar ediliyor.)
CMD ["npm", "run", "dev", "--", "--host"]


# --- Aşama 3: build --------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


# --- Aşama 4: yayın --------------------------------------------------------
# Statik çıktıyı Caddy servis ediyor. Node imajı yayına hiç çıkmıyor —
# hem küçük hem saldırı yüzeyi dar.
FROM caddy:2-alpine AS prod
COPY --from=build /app/dist /srv
EXPOSE 80 443
