import { useEffect, useLayoutEffect, useRef } from 'react'

import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'
import { useSlideIndex } from '../deck/deck'
import { reducedMotion } from '../motion'

/**
 * Bölüm navigasyonu — DÜZ bağlantılar.
 *
 * Tıklamayı deck.ts yakalıyor (sayfadaki her `#slug` bağlantısı gibi); Nav
 * yalnızca bağlantı. Deck çökse de bağlantının hedefi doğru kalır.
 *
 * Etkin bölüm aria-current ile işaretleniyor: slayt 0 giriş, bölümler 1'den başlıyor.
 *
 * ★ Kayan menü (Faz 9, kullanıcı seçimi D2): bölümler panelden eklendikçe menü
 * sığmayabilir. Tek satırda kalır, yatay kayar; taşan kenar söner (`data-fade`,
 * ölçülerek — sığıyorsa hiç sönme yok) ve etkin bölüm kendiliğinden görünür alana
 * kayar. `data-fade` JSX'te değil (kural 8): dil değişiminde React ezmesin.
 */
export function Nav() {
  const { sections } = useContent()
  const t = useStrings()
  const active = useSlideIndex()
  const ref = useRef<HTMLElement>(null)

  // Taşma ve sönen kenarlar: boyut, kaydırma ve içerik (dil) değişince yeniden.
  useLayoutEffect(() => {
    const nav = ref.current
    if (!nav) return
    const update = () => {
      const max = nav.scrollWidth - nav.clientWidth
      const fade = [nav.scrollLeft > 1 && 'start', nav.scrollLeft < max - 1 && 'end'].filter(Boolean)
      if (fade.length) nav.dataset.fade = fade.join(' ')
      else delete nav.dataset.fade
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(nav)
    nav.addEventListener('scroll', update, { passive: true })
    return () => {
      ro.disconnect()
      nav.removeEventListener('scroll', update)
    }
  }, [sections])

  // Etkin bölüm görünür alanda — yalnızca yatayda (sayfa dikeyde kaymıyor zaten).
  useEffect(() => {
    const nav = ref.current
    const link = nav?.querySelector<HTMLElement>('[aria-current]')
    if (!nav || !link) return
    const left = link.offsetLeft - nav.offsetLeft
    const right = left + link.offsetWidth
    const pad = 32 // sönen kenarın genişliği: bağlantı onun altında kalmasın
    let target = nav.scrollLeft
    if (left - pad < nav.scrollLeft) target = left - pad
    else if (right + pad > nav.scrollLeft + nav.clientWidth) target = right + pad - nav.clientWidth
    if (target !== nav.scrollLeft) nav.scrollTo({ left: target, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [active])

  return (
    <nav ref={ref} className="nav" aria-label={t('navLabel')} data-i18n-fade>
      {sections.map((s, i) => (
        <a
          key={s.id}
          href={`#${s.slug}`}
          className="nav-link"
          aria-current={active === i + 1 ? 'true' : undefined}
        >
          {s.navLabel}
        </a>
      ))}
    </nav>
  )
}
