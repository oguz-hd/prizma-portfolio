import type { ReactNode } from 'react'

/**
 * İçerik slaytının kabuğu — Hakkımda, Projeler, İletişim aynı iskeleti paylaşıyor.
 *
 * Prizma her slaytta ortada kalıyor (kullanıcı kararı). İçerik onun ÖNÜNDE,
 * yarı saydam bir cam panelin üstünde duruyor: sahne panelin arkasından
 * bulanık bir ışık olarak seçiliyor, metin okunur kalıyor.
 *
 * Slayt tek ekrana sığmazsa (telefon, kısa pencere) içerik `.slide-scroll`
 * içinde kayar; kenara gelince deck bir sonraki slayta geçer.
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
}

export function Section({
  id,
  index,
  heading,
  body,
  children,
  after,
}: SectionProps & { children: ReactNode; after?: ReactNode }) {
  const titleId = `${id}-title`

  return (
    <section id={id} className="slide" data-slide aria-labelledby={titleId}>
      <div className="slide-scroll" data-slide-scroll>
        <div className="slide-inner container">
          <div className="panel" data-reveal-panel>
            <header className="section-head" data-reveal data-i18n-fade>
              <p className="label section-index">{String(index).padStart(2, '0')}</p>
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
                  <p key={i}>{p}</p>
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
