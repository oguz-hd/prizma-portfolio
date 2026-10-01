import { fileURLToPath } from 'node:url'

import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * ★ Sitenin kaynağı — panel içerik sözleşmesini (content/types.ts) ve paletleri
 * (theme/presets.ts) oradan DOĞRUDAN import ediyor: üçüncü bir kopya yok, site
 * değişince panel derlenmez hâle gelir (fark edilir).
 *
 * Docker'da `../web/src` = /web/src: geliştirmede compose salt okunur bağlıyor,
 * yayında web/Dockerfile → admin-build aynı yere kopyalıyor.
 */
const SITE_SRC = fileURLToPath(new URL('../web/src', import.meta.url))

/** Docker'da compose veriyor (docker-compose.dev.yml); yerelde dışarı açılan portlar. */
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8001'
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5174'

export default defineConfig({
  // Yayında Caddy paneli sitenin altında sunuyor: /admin/ (Caddyfile).
  base: '/admin/',
  plugins: [react()],
  resolve: {
    alias: { '@site': SITE_SRC },
    // Sitenin kaynağındaki `react`/`gsap` importları panelin node_modules'una
    // çözülsün: /web/src'nin yanında node_modules yok (ve olsa iki React olurdu).
    dedupe: ['react', 'react-dom', 'gsap'],
  },
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    // Vite proje kökü dışındaki dosyayı sunmuyor; sitenin kaynağına izin ver.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), SITE_SRC] },
    proxy: {
      // Yayındakiyle aynı adresler: orada ikisi de aynı kökte (Caddy).
      '/api': API_ORIGIN,
      // Fontlar sitenin (theme/fonts.css → /fonts/…). changeOrigin kapalı: açıkken
      // Host "web" gidiyor, sitenin Vite'ı tanımadığı adı reddediyor (403).
      '/fonts': { target: WEB_ORIGIN, changeOrigin: false },
    },
    watch: {
      // Windows bind mount'unda dosya bildirimi konteynere ulaşmıyor (web ile aynı).
      usePolling: process.env.VITE_USE_POLLING === '1',
      interval: 300,
    },
  },
})
