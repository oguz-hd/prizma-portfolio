import { flushSync } from 'react-dom'
import gsap from 'gsap'

import { LOCALES, LOCALE_LABELS, type Locale } from '../i18n/types'
import { setLocale, useLocale } from '../i18n/useLocale'
import { reducedMotion } from '../motion'
import { proseOf, scramble, settleScramble, snapshot } from '../scramble'

/**
 * TR / EN geçişi.
 *
 * docs/DESIGN.md § F/6: hiçbir bilgi yalnızca renkle taşınmaz — aktif dil
 * hem renkle, hem çerçeveyle, hem aria-current ile belirtiliyor.
 *
 * ── Geçiş animasyonu (Oturum 3, kullanıcı seçimi) ───────────────────────────
 * Dil ANINDA değişir; Departure Mono'daki her harf bir süre Katakana'dan ve
 * tayfın tonlarından geçip yeni harfine oturur (scramble.ts). Düzyazı
 * (Atkinson, orantılı) harf harf çözülürse satır titrer — o yumuşakça belirir.
 *
 * Eskiden bloklar süzülüp sönüyordu; o sırada üst çubuk ayrı bir katmana
 * alınıyor, menü alt çizgisi bir kare görünüp kayboluyordu (kullanıcı ekranında).
 */

/** Geçişe katılan bloklar bu işareti taşıyor. Dil seçicinin kendisi taşımıyor.
 *  Yalnızca görünen slayt ve üst çubuk: gizli slaytlar zaten görünmüyor. */
const FADE_SELECTOR =
  '.site-header [data-i18n-fade], [data-slide][data-state="active"] [data-i18n-fade], .not-found [data-i18n-fade]'

export function LocaleSwitch() {
  const locale = useLocale()

  function pick(next: Locale) {
    if (next === locale) return
    const roots = [...document.querySelectorAll(FADE_SELECTOR)]
    if (reducedMotion() || roots.length === 0) {
      setLocale(next)
      return
    }
    settleScramble()
    const before = snapshot(roots)
    // Dil hemen değişsin ki çözülme eski metinden YENİ metne yürüsün.
    flushSync(() => setLocale(next))
    scramble(roots, { from: before, duration: 800 })
    const prose = proseOf(roots)
    if (prose.length)
      gsap.fromTo(prose, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out', clearProps: 'opacity' })
  }

  return (
    <div className="locale-switch">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          aria-current={l === locale ? 'true' : undefined}
          className={l === locale ? 'locale-btn is-active' : 'locale-btn'}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  )
}
