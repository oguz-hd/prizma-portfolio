import type { ReactNode } from 'react'

import type { Section as SectionData } from '../content/types'

/**
 * İçerik slaytının kabuğu — Hakkımda, Projeler, İletişim aynı iskeleti paylaşıyor.
 *
 * Prizma her slaytta ortada kalıyor (kullanıcı kararı). İçerik onun ÖNÜNDE,
 * yarı saydam bir cam panelin üstünde duruyor: sahne panelin arkasından
 * bulanık bir ışık olarak seçiliyor, metin okunur kalıyor.
 *
 * Slayt tek ekrana sığmazsa (telefon, kısa pencere) `data-page-unit` birimleriyle
 * alt sayfalara bölünür (deck/paginate.ts, Oturum 4 · A1); başlık her sayfada
 * kalır. Tek birim ekrandan büyükse o sayfa `.slide-scroll` içinde kayar.
 *
 * Numaralı etiket (01/02/03) Departure Mono'da: sayfanın "veri" dili.
 */

/**
 * Bölüm bileşenlerinin aldığı prop'lar. App bunları useContent().sections'tan
 * geçiyor; bileşenler olduğu gibi Section'a devrediyor ({...props}).
 */
export type SectionProps = {
  id: string
  index: number
  heading: string
  body: string[]
  /** Bölümün tamamı — türe özgü alanlar (maddeler, galeri, duyuru) için. */
  section: SectionData
}

export function Section({
  id,
  index,
  heading,
  body,
  children,
  after,
}: Omit<SectionProps, 'section'> & { children?: ReactNode; after?: ReactNode }) {
  const titleId = `${id}-title`

  return (
    <section id={id} className="slide" data-slide aria-labelledby={titleId}>
      <div className="slide-scroll" data-slide-scroll>
        <div className="slide-inner container">
          <div className="panel" data-reveal-panel>
            <header className="section-head" data-reveal data-i18n-fade>
              {/* data-page-count: bölünen slaytta sayaç ("1/2") buraya (paginate.ts). */}
              <p className="label section-index" data-page-count>
                {String(index).padStart(2, '0')}
              </p>
              <h2 id={titleId} className="section-heading" data-slide-focus tabIndex={-1}>
                {heading}
              </h2>
            </header>
            {/*
              Serbest bölüm metni. İçerikten geliyor, bileşenden değil — panelden
              düzenlenecek olan da bu. Boşsa hiç basılmıyor.
            */}
            {body.length > 0 && (
              <div className="section-intro" data-reveal data-i18n-fade>
                {body.map((p, i) => (
                  <p key={i} data-page-unit>
                    {p}
                  </p>
                ))}
              </div>
            )}
            {children}
          </div>
          {after}
        </div>
      </div>
    </section>
  )
}
