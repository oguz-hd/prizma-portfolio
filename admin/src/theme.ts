import { applyTheme } from '@site/theme/applyTheme'
import { applyFavicon } from '@site/theme/favicon'
import { PRESETS } from '@site/theme/presets'

/**
 * Paneli sitenin paletiyle boyar — sitenin kendi fonksiyonları, aynı token'lar.
 *
 * ⚠️ Her zaman Tayf, sitenin SEÇİLİ paleti değil. Panelin anlamlı renkleri her
 * ön ayarda yok: hata metni tayfın kırmızı ucundan (`--danger`), Aurora'da ise
 * sıcak ton hiç yok — panel seçili paleti izlerken hata camgöbeği görünüyordu
 * (Oturum 5). Palet seçimi sitenin; Genel'deki kartlar her paleti kendi
 * renkleriyle gösteriyor.
 */
export function paintPanel(): void {
  const tokens = PRESETS.tayf.tokens
  applyTheme(tokens)
  applyFavicon(tokens)
  // Kırmızı uç: accents mor → kırmızı sıralı (CLAUDE.md kural 2), yani son ton.
  document.documentElement.style.setProperty('--danger', tokens.accents[tokens.accents.length - 1])
}
