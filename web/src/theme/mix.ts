import type { ThemeTokens } from './types'

/**
 * İki token kümesi arasında ara değer (tema geçişi süpürmesi, sweep.ts).
 * Renkler sRGB'de doğrusal karışır; geçiş ~0,7 sn sürüyor, cam şeridin altında kalıyor.
 */
const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

function mixHex(a: string, b: string, t: number): string {
  const A = rgb(a)
  const B = rgb(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

export function mixTokens(a: ThemeTokens, b: ThemeTokens, t: number): ThemeTokens {
  // Ton sayıları farklı olabilir (Turbo 6, açık palet 7): başlangıcın sayısı korunur,
  // hedeften orantılı örneklenir. Sayı farkı bitişte tam token'larla kapanır.
  const n = a.accents.length
  const accents = a.accents.map((c, i) => {
    const j = n === 1 ? 0 : Math.round((i / (n - 1)) * (b.accents.length - 1))
    return mixHex(c, b.accents[j], t)
  })
  return {
    ground: mixHex(a.ground, b.ground, t),
    surface: mixHex(a.surface, b.surface, t),
    line: mixHex(a.line, b.line, t),
    ink: mixHex(a.ink, b.ink, t),
    inkDim: mixHex(a.inkDim, b.inkDim, t),
    inkFaint: mixHex(a.inkFaint, b.inkFaint, t),
    lead: mixHex(a.lead, b.lead, t),
    accents,
    // Etkiler (hale, multiply, réseau) yarıda değişir, cam şeridin tam altında.
    scheme: t < 0.5 ? a.scheme : b.scheme,
  }
}
