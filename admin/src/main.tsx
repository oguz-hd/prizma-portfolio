import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Sitenin fontları (Departure Mono + Atkinson) — dosyalar sitenin /fonts'unda
// (build'deki "didn't resolve at build time" uyarısı bu yüzden, beklenen).
import '@site/theme/fonts.css'
import './admin.css'
import { App } from './App'
import { paintPanel } from './theme'

paintPanel()

const root = document.getElementById('root')
if (!root) throw new Error('#root bulunamadı — index.html ile main.tsx uyuşmuyor.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
