// Seçenek sayfasıyla konuşma: görünüş (token + etki), slayt, uyku.
import gsap from 'gsap'
import { applyTheme } from 'site:theme/applyTheme'
import { cfg } from './cfg'

function fx(f?: { b?: string; c?: string; d?: string }) {
  const d = document.documentElement.dataset
  d.b = f?.b ?? ''; d.c = f?.c ?? ''; d.d = f?.d ?? ''
}
export function setupBridge(admin: boolean) {
  fx(cfg().fx)
  window.addEventListener('message', (e) => {
    const m = e.data
    if (!m || typeof m !== 'object') return
    if (m.type === 'look') {
      applyTheme(m.tokens)
      if (admin) document.documentElement.style.setProperty('--danger', m.tokens.accents[m.tokens.accents.length - 1])
      fx(m.fx)
    } else if (m.type === 'go') {
      const a = document.createElement('a')
      a.href = '#' + m.slug
      document.body.append(a); a.click(); a.remove()
    } else if (m.type === 'sleep') gsap.ticker.sleep()
    else if (m.type === 'wake') gsap.ticker.wake()
  })
  parent.postMessage({ type: 'ready' }, '*')
}
