import { flushSync } from 'react-dom'

import { useStrings } from '../i18n/strings'
import { reducedMotion } from '../motion'
import { setScheme, useScheme } from '../theme/scheme'

/**
 * Açık / koyu tema düğmesi (dil seçicisinin yanında).
 *
 * Bilgi yalnızca renkle taşınmaz (docs/DESIGN.md § F/6): simge hedef temayı gösterir
 * (koyudayken güneş, açıktayken ay), aria-label ne yapacağını söyler.
 *
 * Geçiş: View Transitions ile düğmeden büyüyen bir daire — yeni tema dairenin içinde
 * açılır. Desteklemeyen tarayıcıda ya da "hareketi azalt"ta renk anında değişir.
 */
const DURATION_MS = 400

export function SchemeSwitch() {
  const t = useStrings()
  const scheme = useScheme()
  const next = scheme === 'dark' ? 'light' : 'dark'

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const start = document.startViewTransition?.bind(document)
    if (!start || reducedMotion()) {
      setScheme(next)
      return
    }
    // Klavyeyle tıklamada (0,0) gelir; o zaman dairenin merkezi düğmenin kendisi.
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX || rect.left + rect.width / 2
    const y = e.clientY || rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

    const transition = start(() => flushSync(() => setScheme(next)))
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: DURATION_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }

  return (
    <button
      type="button"
      className="scheme-btn"
      onClick={toggle}
      aria-label={t(scheme === 'dark' ? 'schemeToLight' : 'schemeToDark')}
      title={t(scheme === 'dark' ? 'schemeToLight' : 'schemeToDark')}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        {scheme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
          </>
        ) : (
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
        )}
      </svg>
    </button>
  )
}
