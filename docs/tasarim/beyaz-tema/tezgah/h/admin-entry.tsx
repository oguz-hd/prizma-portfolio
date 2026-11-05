import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'site:theme/fonts.css'
import 'admin:admin.css'
import './fx.css'
import { App } from 'admin:App'
import { paintPanel } from 'admin:theme'
import { setupBridge } from './bridge'

paintPanel()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
setupBridge(true)
