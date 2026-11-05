// Sitenin main.tsx'inin birebir sırası; içerik fetch'i sayfadaki ön betikten (gerçek oguzhd.com/content.json).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'site:theme/fonts.css'
import 'site:theme/theme.css'
import './fx.css'
import { applyTheme } from 'site:theme/applyTheme'
import { PRESETS } from 'site:theme/presets'
import { getPreset, loadContent } from 'site:content/useContent'
import { initLocale } from 'site:i18n/useLocale'
import { prepareIntro } from 'site:prism/intro'
import { App } from 'site:App'
import { setupBridge } from './bridge'

async function boot() {
  initLocale()
  await loadContent()
  applyTheme(PRESETS[getPreset()].tokens)
  prepareIntro()
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
  setupBridge(false)
}
void boot()
