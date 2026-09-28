import { useRef } from 'react'
import gsap from 'gsap'

import { LOCALES, LOCALE_LABELS, type Locale } from '../i18n/types'
import { setLocale, useLocale } from '../i18n/useLocale'

/**
 * TR / EN geçişi.
 *
 * docs/DESIGN.md § F/6: hiçbir bilgi yalnızca renkle taşınmaz — aktif dil
 * hem renkle, hem çerçeveyle, hem aria-current ile belirtiliyor.
 *
 * ── Geçiş animasyonu ────────────────────────────────────────────────────────
 * Metnin bir anda takla atması ucuz durur. Sitenin metaforu prizma: aynı ışık,
 * farklı ayrışma. Geçiş de öyle okunuyor —
 *
 *   bloklar hafifçe yukarı süzülüp söner → dil değişir → aşağıdan geri belirir
 *
 * Bloklar arasında küçük gecikme (stagger) var: hepsi aynı anda değil, kademe
 * kademe yeniden ayrışıyor. Süreler bilerek kısa; bu bir gösteri değil, bir geçiş.
 *
 * § C gereği yalnızca opacity ve transform anime ediliyor (GPU, layout thrash yok).
 */

/** Fade'e katılacak bloklar bu işareti taşıyor. Dil seçicinin kendisi taşımıyor —
 *  tıkladığın düğme gözünün önünde kaybolmamalı.
 *  Yalnızca görünen slayt ve üst çubuk: gizli slaytları da kademeye katmak
 *  görünen blokların sırasını boşuna geciktirirdi. */
const FADE_SELECTOR =
  '.site-header [data-i18n-fade], [data-slide][data-state="active"] [data-i18n-fade], .not-found [data-i18n-fade]'

const OUT = 0.16
const IN = 0.3

export function LocaleSwitch() {
  const locale = useLocale()
  // Animasyon sürerken ikinci tıklama timeline'ları üst üste bindirir.
  const busy = useRef(false)

  function pick(next: Locale) {
    if (next === locale || busy.current) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targets = document.querySelectorAll(FADE_SELECTOR)

    // Hareket hassasiyeti (§ C): geçiş anında olur, site tam çalışır.
    if (reduced || targets.length === 0) {
      setLocale(next)
      return
    }

    busy.current = true

    // Timeline yarıda kesilirse (sekme arkaya atılır, bileşen sökülür) toparla:
    // dil yine de değişmiş olsun, metin görünmez kalmasın, düğme kilitlenmesin.
    let swapped = false
    const swap = () => {
      if (!swapped) {
        swapped = true
        setLocale(next)
      }
    }
    const recover = () => {
      swap()
      gsap.set(targets, { opacity: 1, y: 0 })
      busy.current = false
    }

    gsap
      .timeline({ onComplete: () => (busy.current = false), onInterrupt: recover })
      .to(targets, {
        opacity: 0,
        y: -8,
        duration: OUT,
        ease: 'power2.in',
        stagger: 0.03,
      })
      // Metin tam görünmezken değişiyor — harflerin yer değiştirdiği görülmüyor.
      .add(swap)
      .fromTo(
        targets,
        { y: 8 },
        { opacity: 1, y: 0, duration: IN, ease: 'power2.out', stagger: 0.04 },
      )
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
