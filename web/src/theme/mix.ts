import type { ThemeTokens } from './types'

/**
 * İki token kümesi arasında ara değer (tema geçişi süpürmesi, sweep.ts).
 * Renkler sRGB'de doğrusal karışır; karışım penceresi süpürmenin yalnızca ortasıdır (~0,2 sn), cam şeridin altında kalır.
 */
const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

function mixHex(a: string, b: string, t: number): string {
  const A = rgb(a)
  const B = rgb(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

export function mixTokens(a: ThemeTokens, b: ThemeTokens, t: number): ThemeTokens {
  // Ton sayıları farklıysa başlangıcın sayısı korunur, hedeften orantılı örneklenir
  // (açık palet zaten koyu ön ayarın sayısına indirilir, scheme.ts → resample; bu yalnızca yedek).
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

/**
 * Paleti `n` tona orantılı örnekler (uçlar korunur). Açık palet koyu ön ayarla aynı sayıda ton taşır:
 * sahne ton sayısını yalnız kurulurken okur, geçişte sayı değişirse son karede renk zıplar.
 */
export function resample(colors: string[], n: number): string[] {
  if (n === colors.length) return colors
  if (n <= 1) return [colors[0]]
  return Array.from({ length: n }, (_, i) => colors[Math.round((i / (n - 1)) * (colors.length - 1))])
}
