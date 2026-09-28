import type { ThemeTokens } from './types'

/**
 * Favicon — merkezdeki prizmanın küçük kopyası, renk token'larından.
 *
 * Dosya değil, çalışma anında üretilen bir SVG: renkler veri olduğu için
 * (kural 1) sabit bir .ico'ya gömülemez; ön ayar değişince sekme simgesi de
 * değişmeli. Panel temayı değiştirince bu da çağrılmalı.
 *
 * 24 px'e tayfın tamamı sığmıyor: üçgen + soldan beyaz ışık + sağda üç ton
 * (tayfın iki ucu ve ortası). Açık renkli tarayıcı çubuğunda da seçilsin diye
 * zemini var.
 */
const SIZE = 24

export function applyFavicon(tokens: ThemeTokens): void {
  const a = tokens.accents
  const tones = [a[a.length - 1], a[Math.floor(a.length / 2)], a[0]]
  const rays = tones
    .map((c, i) => `<line x1="14" y1="12" x2="23" y2="${13 + i * 2.5}" stroke="${c}" stroke-width="1.6"/>`)
    .join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<rect width="${SIZE}" height="${SIZE}" rx="5" fill="${tokens.ground}"/>` +
    `<line x1="1" y1="15" x2="8" y2="12" stroke="${tokens.ink}" stroke-width="1.4" stroke-opacity="0.8"/>` +
    rays +
    `<polygon points="11,4 18,17 4,17" fill="${tokens.ground}" fill-opacity="0.6" stroke="${tokens.ink}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `</svg>`

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
}
