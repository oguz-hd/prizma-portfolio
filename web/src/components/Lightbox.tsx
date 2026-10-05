import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { mediaFallback, mediaSrcSet } from '../content/media'
import type { SectionMedia } from '../content/types'
import { lockDeck, unlockDeck } from '../deck/deck'
import { useStrings } from '../i18n/strings'

/**
 * Tam ekran büyütme (Faz 9, kullanıcı seçimi L1) — galerinin fotoğrafları.
 *
 * Yerleşik <dialog> + showModal(): odak içeride kalıyor, Esc kapatıyor, arka plan
 * erişilebilirlik ağacından düşüyor — elle yazılmadı. Açıkken deck KİLİTLİ: oklar
 * ve tekerlek slayt değiştirmesin (deck.ts → lockDeck). Sol/sağ ok fotoğraf değiştirir.
 * Kapanınca odak açan düğmeye döner (tarayıcı yapıyor).
 */
export function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: SectionMedia[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const t = useStrings()
  const ref = useRef<HTMLDialogElement>(null)
  const item = items[index]
  const go = (step: number) => onIndex((index + step + items.length) % items.length)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    // showModal ilk odaklanabilir öğeye (Önceki) gidiyor; ilk iş kapatmak olsun.
    dialog.querySelector<HTMLButtonElement>('.lightbox-close')?.focus()
    lockDeck()
    return () => {
      dialog.close()
      unlockDeck(0)
    }
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={item.alt || item.caption || t('enlarge')}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
      // Fotoğrafın dışına (zemine) tıklamak kapatır.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <figure className="lightbox-figure">
        <img
          key={item.id}
          srcSet={mediaSrcSet(item)}
          sizes="100vw"
          src={mediaFallback(item)}
          width={item.width}
          height={item.height}
          alt={item.alt}
        />
        <figcaption className="lightbox-caption">
          <span>{item.caption ?? item.alt}</span>
          <span className="label">
            {index + 1} / {items.length}
          </span>
        </figcaption>
      </figure>
      <div className="lightbox-tools">
        {items.length > 1 && (
          <>
            <button type="button" className="lightbox-btn" onClick={() => go(-1)} aria-label={t('previous')}>
              ←
            </button>
            <button type="button" className="lightbox-btn" onClick={() => go(1)} aria-label={t('next')}>
              →
            </button>
          </>
        )}
        <button type="button" className="lightbox-btn lightbox-close" onClick={onClose} aria-label={t('close')}>
          ×
        </button>
      </div>
    </dialog>,
    document.body,
  )
}
