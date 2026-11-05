import { useState } from 'react'

import { useStrings } from '../i18n/strings'
import { useScheme } from '../theme/scheme'
import { sweepTo } from '../theme/sweep'

/**
 * Açık / koyu tema düğmesi (dil seçicisinin yanında). Bilgi yalnızca renkle taşınmaz (docs/DESIGN.md § F/6):
 * simge hedef temayı gösterir (koyudayken güneş, açıktayken ay), aria-label ne yapacağını söyler,
 * değişince ekran okuyucuya duyurulur.
 */
export function SchemeSwitch() {
  const t = useStrings()
  const scheme = useScheme()
  const next = scheme === 'dark' ? 'light' : 'dark'
  // İlk yüklemede değil, yalnızca kullanıcı değiştirince duyurulur.
  const [changed, setChanged] = useState(false)

  return (
    <>
    <button
      type="button"
      className="scheme-btn"
      onClick={() => {
        setChanged(true)
        sweepTo(next)
      }}
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
    <span className="sr-only" role="status">
      {changed ? t(scheme === 'dark' ? 'schemeNowDark' : 'schemeNowLight') : ''}
    </span>
    </>
  )
}
