import type { ThemeTokens } from './types'

/**
 * Token nesnesini CSS custom property olarak :root üstüne yazar.
 *
 * Projede renklerin CSS'e ulaştığı TEK nokta burası. Faz 8'de admin paneli de
 * aynı fonksiyonu çağıracak — yani panel için ayrı bir yol açmaya gerek kalmayacak.
 */

/**
 * Ön ayarlar farklı sayıda destek tonu taşıyabiliyor (Aurora 5, Tayf 6).
 * Geçiş yapılınca fazlalık değişkenler silinmezse önceki paletten artık kalır.
 */
const MAX_ACCENTS = 8

export function applyTheme(
  tokens: ThemeTokens,
  root: HTMLElement = document.documentElement,
): void {
  const s = root.style

  s.setProperty('--ground', tokens.ground)
  s.setProperty('--surface', tokens.surface)
  s.setProperty('--line', tokens.line)
  s.setProperty('--ink', tokens.ink)
  s.setProperty('--ink-dim', tokens.inkDim)
  s.setProperty('--ink-faint', tokens.inkFaint)
  s.setProperty('--lead', tokens.lead)

  for (let i = 0; i < MAX_ACCENTS; i++) {
    const name = `--accent-${i + 1}`
    const value = tokens.accents[i]
    if (value) s.setProperty(name, value)
    else s.removeProperty(name)
  }

  // Tüm tonlardan tek bir tayf şeridi: soldan mor, sağa kırmızı (accents sırası).
  // "Gökkuşağını gradyan olarak kullan, palet olarak değil" (docs/DESIGN.md § F/5)
  s.setProperty('--spectrum', `linear-gradient(90deg, ${tokens.accents.join(', ')})`)
  // Yalnızca duraklar — açısı öğede değişen gradyanlar için (üst çubuktaki
  // dönen prizma işareti: conic-gradient(from var(--spin), var(--spectrum-stops))).
  // Açı değişkeni kök değerin İÇİNE yazılamıyor: özel özellikteki var() kökte
  // çözülür, öğedeki animasyon ona ulaşmaz.
  s.setProperty('--spectrum-stops', tokens.accents.join(', '))
  // Tarayıcı arayüzü (kaydırma çubuğu, form denetimleri) de koyu tarafta kalsın.
  s.setProperty('color-scheme', 'dark')
}
