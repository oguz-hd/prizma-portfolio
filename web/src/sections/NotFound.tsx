import { useEffect } from 'react'

import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'
import type { AbsorptionLine } from '../prism/optics'

/**
 * 404 — "404 nm".
 *
 * trex-portfolio'daki offline şakası dinoya aitti; burada yerini tayf şakası
 * alıyor. Aynı prizma, aynı ışık — ama tayfta yalnızca TEK karanlık çizgi var,
 * 404 nm'de: "aradığın sayfa bu dalga boyunda soğurulmuş".
 *
 * ★ Uydurma değil: 404.66 nm cıvanın gerçek "h" çizgisi (Hg I), tayf
 * lambalarının en bilinen mor çizgilerinden. Şaka fiziğin kendisiyle kuruluyor.
 *
 * Etiket bir ölçüm ("404 nm"), arayüz metni değil — her dilde aynı; Hα 656 gibi.
 *
 * SPA'da sunucu bilinmeyen her yol için index.html dönüyor (200). Arama
 * motorları bu sayfayı dizine eklemesin diye `noindex` konuyor.
 */
export const NOT_FOUND_LINES: AbsorptionLine[] = [{ nm: 404.66, label: '404 nm' }]

export function NotFound() {
  const { profile } = useContent()
  const t = useStrings()

  useEffect(() => {
    const title = document.title
    document.title = `404 · ${profile.name}`
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.appendChild(robots)
    return () => {
      document.title = title
      robots.remove()
    }
  }, [profile.name])

  return (
    <main className="not-found">
      <div className="frame container">
        <div className="frame-top">
          <h1 className="not-found-title" data-reveal data-i18n-fade>
            {t('notFoundTitle')}
          </h1>
        </div>
        <div className="frame-gap" aria-hidden="true" />
        <div className="frame-bottom">
          <p className="not-found-body" data-reveal data-i18n-fade>
            {t('notFoundBody')}
          </p>
          <a className="hero-link not-found-home" href="/" data-reveal data-i18n-fade>
            {t('notFoundHome')}
          </a>
        </div>
      </div>
    </main>
  )
}
