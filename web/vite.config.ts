import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * API'nin adresi — geliştirme sunucusu içeriği ve meta etiketlerini buradan alıyor.
 * Docker'da compose veriyor (`http://api:8000`, docker-compose.dev.yml); yerelde
 * API'nin dışarı açılan portu.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8001'

/** index.html'de meta etiketlerinin yeri. */
const META_MARKER = '<!--site-meta-->'

/**
 * Paylaşım kartı ve arama sonucu etiketleri — İÇERİKTEN, sunucu tarafında.
 *
 * Sosyal ağların ve arama motorlarının tarayıcıları JS çalıştırmaz: etiketler
 * statik HTML'de olmak zorunda. İçerik ise artık build sırasında elde değil
 * (Faz 6: tek kaynak veritabanı) — etiketleri API üretiyor (api/app/content.py
 * → render_meta), sunucu HTML'e gömüyor:
 *
 *   build  → Caddy şablonu: yayın anında /data/meta.html okunur (Caddyfile →
 *            templates). Panelden yapılan değişiklik yeniden build istemez.
 *   dev    → API'den her istekte çekilir.
 *
 * ⚠️ Build çıktısını (`dist`) yalnızca bu projenin Caddyfile'ıyla sun: başka bir
 * sunucu şablonu işlemez, `{{…}}` sayfaya düz metin olarak düşer.
 */
function metaFromContent(): Plugin {
  return {
    name: 'meta-from-content',
    async transformIndexHtml(html, ctx) {
      if (!ctx.server) {
        return html.replace(
          META_MARKER,
          '{{if fileExists "/data/meta.html"}}{{readFile "/data/meta.html"}}{{end}}',
        )
      }
      try {
        const res = await fetch(`${API_ORIGIN}/api/meta`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return html.replace(META_MARKER, await res.text())
      } catch (err) {
        // API henüz açılmadıysa sayfa yine gelsin; sekme adını App zaten koyuyor.
        ctx.server.config.logger.warn(`meta etiketleri alınamadı (${API_ORIGIN}): ${err}`)
        return html
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), metaFromContent()],
  server: {
    // Konteyner dışından erişilebilmesi için 0.0.0.0'a bağlan.
    host: true,
    port: 5174,
    strictPort: true,
    // Yayındaki adresin aynısı: orada Caddy /data/content.json'ı sunuyor,
    // burada API aynı içeriği canlı üretiyor (api/app/content.py → read_content).
    proxy: {
      '/content.json': { target: API_ORIGIN, rewrite: () => '/api/content' },
    },
    watch: {
      // Windows'ta bind mount üzerinden dosya değişikliği bildirimleri konteynere
      // ulaşmıyor; yoklama olmadan HMR gelmez. Yerel geliştirmede boşuna CPU
      // yakmaması için yalnızca Docker'da açılıyor (docker-compose.dev.yml).
      usePolling: process.env.VITE_USE_POLLING === '1',
      interval: 300,
    },
  },
})
