import type { Media } from './types'

/**
 * Yüklenen görselin adresleri (Faz 9). API her görseli birkaç genişlikte WebP
 * olarak yazıyor (`/data/uploads/{id}-{w}.webp`, api/app/media.py); Caddy
 * `/uploads/` altında sunuyor. Tarayıcı `srcset` + `sizes` ile ekrana uygun olanı seçer.
 */
export const mediaSrc = (m: Media, width: number) => `/uploads/${m.id}-${width}.webp`

export const mediaSrcSet = (m: Media) => m.widths.map((w) => `${mediaSrc(m, w)} ${w}w`).join(', ')

/** `src` yedeği: listedeki en büyük. */
export const mediaFallback = (m: Media) => mediaSrc(m, m.widths[m.widths.length - 1])
