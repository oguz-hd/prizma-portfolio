import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './theme/fonts.css'
import './theme/theme.css'
import { applyTheme } from './theme/applyTheme'
import { applyFavicon } from './theme/favicon'
import { PRESETS } from './theme/presets'
import { getPreset, loadContent } from './content/useContent'
import { initLocale } from './i18n/useLocale'
import { prepareIntro } from './prism/intro'
import { isLab } from './route'
import { LoadError } from './components/LoadError'

import { App } from './App'

/**
 * Giriş noktası.
 *
 * ⚠️ Sıra önemli: içerik, tema, dil ve açılış React mount edilmeden ÖNCE hazır.
 *   - İçerik (`/content.json`) beklenmeden mount edilirse bileşenler boş okur;
 *     useContent() bilerek senkron (content/useContent.ts)
 *   - Tema sonra uygulanırsa ilk kare token'sız boyanır → renksiz bir an
 *   - <html lang> sonra ayarlanırsa ekran okuyucu ilk metni yanlış dilde okur
 *   - Açılış sonra hazırlanırsa ilk karede içerik ve tam prizma görünür,
 *     sonra sönüp yeniden belirir — açılışın bütün etkisi gider
 *
 * İçerik gelmezse site hiç mount edilmiyor; yerine LoadError. Açılış o yolda
 * hazırlanmıyor — `html[data-intro]` hata ekranını gizleyemesin (kural 7).
 */

const root = document.getElementById('root')
if (!root) throw new Error('#root bulunamadı — index.html ile main.tsx uyuşmuyor.')

async function boot(root: HTMLElement): Promise<void> {
  initLocale()

  try {
    await loadContent()
  } catch (err) {
    console.error(err)
    // İçerik yok → seçili ön ayar da bilinmiyor. Tayf: sitenin paleti, index.html
    // zemini de ondan — hata ekranı da token'larla boyanıyor (kural 1).
    const tokens = PRESETS.tayf.tokens
    applyTheme(tokens)
    applyFavicon(tokens)
    createRoot(root).render(<LoadError />)
    return
  }

  const tokens = PRESETS[getPreset()].tokens
  applyTheme(tokens)
  applyFavicon(tokens)
  if (!isLab) prepareIntro()

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot(root)
