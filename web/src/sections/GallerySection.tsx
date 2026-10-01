import { useState } from 'react'

import { Lightbox } from '../components/Lightbox'
import { mediaFallback, mediaSrcSet } from '../content/media'
import { useStrings } from '../i18n/strings'
import { Section, type SectionProps } from './Section'

/**
 * Galeri (Faz 9, kullanıcı seçimi B2 + L1) — ilk fotoğraf büyük, yanında küçükler;
 * sonrakiler üçlü sıralar hâlinde. Tıklayınca tam ekran (components/Lightbox.tsx).
 *
 * Her fotoğraf bir sayfa birimi: sığmayan galeri alt sayfalara bölünür. `width/height`
 * verili — görsel inmeden yer ayrılıyor, bölme ölçümü kaymıyor.
 */
export function GallerySection(props: SectionProps) {
  const items = props.section.media ?? []
  const t = useStrings()
  const [open, setOpen] = useState<number | null>(null)

  return (
    <Section {...props}>
      <ul className="gallery" data-reveal data-i18n-fade>
        {items.map((m, i) => (
          <li key={m.id} className="gallery-cell" data-page-unit>
            <figure className="gallery-figure">
              <button
                type="button"
                className="gallery-open"
                onClick={() => setOpen(i)}
                aria-label={`${t('enlarge')}: ${m.alt}`}
              >
                <img
                  srcSet={mediaSrcSet(m)}
                  sizes={i === 0 ? '(min-width: 768px) 60vw, 100vw' : '(min-width: 768px) 30vw, 50vw'}
                  src={mediaFallback(m)}
                  width={m.width}
                  height={m.height}
                  alt={m.alt}
                  loading="lazy"
                  decoding="async"
                />
              </button>
              {m.caption && <figcaption className="gallery-caption">{m.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </Section>
  )
}
