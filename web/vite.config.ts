import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

import { SITE } from './src/content/site'

/**
 * Paylaşım kartı ve arama sonucu etiketleri — İÇERİKTEN, build sırasında.
 *
 * Sosyal ağların ve arama motorlarının tarayıcıları JS çalıştırmaz: etiketler
 * statik HTML'de olmak zorunda. Metni elle index.html'e yazmak içeriği ikinci bir
 * yerde tutmak olurdu (CLAUDE.md kural 3) — o yüzden `site.ts`'ten basılıyor.
 * Varsayılan dil İngilizce (Oturum 3); dil değişince sekme başlığını App günceller.
 *
 * ⚠️ `og:image` henüz YOK: paylaşım görseli sitenin kendi ekran görüntüsü olacak,
 * tasarım oturunca çekilecek (`web/public/og.png`, 1200×630). Gelince buraya
 * og:image + boyutları eklenir ve kart `summary_large_image` olur. Alan adı
 * belli olunca adres mutlak olmalı — bazı platformlar göreli görseli okumaz.
 */
function metaFromContent(): Plugin {
  const esc = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return {
    name: 'meta-from-content',
    transformIndexHtml(html) {
      const title = esc(SITE.settings.metaTitle.en)
      const desc = esc(SITE.settings.metaDescription.en)
      const tags = [
        `<title>${title}</title>`,
        `<meta name="description" content="${desc}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${desc}" />`,
        `<meta property="og:locale" content="en_US" />`,
        `<meta property="og:locale:alternate" content="tr_TR" />`,
        `<meta name="twitter:card" content="summary" />`,
      ].join('\n    ')
      return html.replace(/<title>[^<]*<\/title>/, tags)
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
    watch: {
      // Windows'ta bind mount üzerinden dosya değişikliği bildirimleri konteynere
      // ulaşmıyor; yoklama olmadan HMR gelmez. Yerel geliştirmede boşuna CPU
      // yakmaması için yalnızca Docker'da açılıyor (docker-compose.dev.yml).
      usePolling: process.env.VITE_USE_POLLING === '1',
      interval: 300,
    },
  },
})
