import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'
import { accentCount } from '../prism/scene'
import { slideAccent } from '../prism/optics'
import { useSlideIndex } from './deck'

/**
 * Slayt rayı — sağ kenarda, her slayt tayfta bir çizgi.
 *
 * Slaytlar tayfa sırayla yayılıyor: giriş mor, son slayt kırmızı. Prizmanın
 * içinde o an parlayan ışın da bu tonda (scene.ts → prismFocus) — ray ile sahne
 * aynı sayıdan türüyor (`slideAccent`), elle eşlenmiyor.
 *
 * Düz `#slug` bağlantıları: tıklamayı deck.ts yakalıyor. JS çökerse bile
 * bağlantı hedefi doğru.
 *
 * § F/6: bilgi yalnızca renkle taşınmıyor — etkin slayt hem daha uzun çizgi,
 * hem görünür etiket, hem aria-current.
 */
export function SlideRail() {
  const { sections } = useContent()
  const t = useStrings()
  const active = useSlideIndex()
  const count = accentCount()

  const items = [
    { id: 'ust', label: t('slideIntro') },
    ...sections.map((s) => ({ id: s.slug, label: s.heading })),
  ]

  return (
    <nav className="rail" aria-label={t('slidesLabel')} data-reveal-chrome>
      <ol>
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="rail-link"
              aria-current={i === active ? 'true' : undefined}
              style={{ ['--tone' as string]: `var(--accent-${slideAccent(i, items.length, count)})` }}
            >
              <span className="rail-label">{item.label}</span>
              <span className="rail-mark" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
