import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './theme/fonts.css'
import './theme/theme.css'
import { applyTheme } from './theme/applyTheme'
import { applyFavicon } from './theme/favicon'
import { PRESETS } from './theme/presets'
import { getPreset } from './content/useContent'
import { initLocale } from './i18n/useLocale'
import { prepareIntro } from './prism/intro'
import { isLab } from './route'

import { App } from './App'

/**
 * Giriş noktası.
 *
 * ⚠️ Sıra önemli: tema, dil ve açılış React mount edilmeden ÖNCE ayarlanıyor.
 *   - Tema sonra uygulanırsa ilk kare token'sız boyanır → renksiz bir an
 *   - <html lang> sonra ayarlanırsa ekran okuyucu ilk metni yanlış dilde okur
 *   - Açılış sonra hazırlanırsa ilk karede içerik ve tam prizma görünür,
 *     sonra sönüp yeniden belirir — açılışın bütün etkisi gider
 *
 * Faz 6'da content.json da tam burada, mount öncesi yüklenecek.
 */

initLocale()
const tokens = PRESETS[getPreset()].tokens
applyTheme(tokens)
applyFavicon(tokens)
if (!isLab) prepareIntro()

const root = document.getElementById('root')
if (!root) throw new Error('#root bulunamadı — index.html ile main.tsx uyuşmuyor.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
