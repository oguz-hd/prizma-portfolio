import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'
import { useSlideIndex } from '../deck/deck'

/**
 * Bölüm navigasyonu — DÜZ bağlantılar.
 *
 * Tıklamayı deck.ts yakalıyor (sayfadaki her `#slug` bağlantısı gibi); Nav
 * yalnızca bağlantı. Deck çökse de bağlantının hedefi doğru kalır.
 *
 * Etkin bölüm aria-current ile işaretleniyor: slayt 0 giriş, bölümler 1'den başlıyor.
 */
export function Nav() {
  const { sections } = useContent()
  const t = useStrings()
  const active = useSlideIndex()

  return (
    <nav className="nav" aria-label={t('navLabel')} data-i18n-fade>
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
