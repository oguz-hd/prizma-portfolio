# Safari'nin motoru (WebKit) ile tarayıcı testi — yalnızca WebKit, ~400 MB.
# mcr.microsoft.com/playwright imajı (~2 GB, üç tarayıcı) indirmede takılıyordu (03.10.2026).
FROM node:22-bookworm-slim
WORKDIR /pw
# ca-certificates: slim imajda yok — WebKit HTTPS'i "Unacceptable TLS certificate" ile
# reddediyordu (05.10.2026; Node kendi kök listesini taşıdığı için onda sorun yoktu).
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates
RUN npm i --no-save --no-audit --no-fund playwright@1.55.0 \
 && npx playwright install --with-deps webkit \
 && rm -rf /var/lib/apt/lists/* /root/.npm
