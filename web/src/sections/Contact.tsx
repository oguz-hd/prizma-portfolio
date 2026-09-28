import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'
import { SiteFooter } from '../components/SiteFooter'
import type { SectionProps } from './Section'

/**
 * İletişim — kapanış karesi (Oturum 2, kullanıcı: "en altta daha iyi bir
 * tasarım olsun, sitenin temasına uysun").
 *
 * Açılışın aynası: cam panel yok, prizma tam parlaklıkta ortada. Üstte bölüm
 * başlığı ve müsaitlik cümlesi, altta e-posta ve bağlantılar, en dipte altbilgi.
 * Site bir ışıkla açılıyor, aynı ışığın önünde kapanıyor.
 *
 * curious.page kuralı 4: iletişim BARİZ — e-posta sayfanın en büyük yazılarından.
 *
 * Kabuk Section değil (o cam panel kuruyor); slayt işaretleri aynı:
 * data-slide · data-slide-scroll · data-slide-focus · data-reveal.
 */
export function Contact({ id, index, heading, body }: SectionProps) {
  const { links } = useContent()
  const t = useStrings()
  const titleId = `${id}-title`

  const email = links.find((l) => l.href.startsWith('mailto:'))
  const others = links.filter((l) => !l.href.startsWith('mailto:'))

  return (
    <section id={id} className="slide" data-slide data-prism="bright" aria-labelledby={titleId}>
      <div className="slide-scroll" data-slide-scroll>
        <div className="frame container">
          <div className="frame-top">
            <p className="label section-index" data-reveal>
              {String(index).padStart(2, '0')}
            </p>
            <h2 id={titleId} className="closing-heading" data-slide-focus tabIndex={-1} data-reveal data-i18n-fade>
              {heading}
            </h2>
            {body.length > 0 && (
              <div className="closing-intro" data-reveal data-i18n-fade>
                {body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </div>

          <div className="frame-gap" aria-hidden="true" />

          <div className="frame-bottom">
            {email && (
              <div className="closing-mail" data-reveal data-i18n-fade>
                {/* mailto: önekini kırpıp adresi olduğu gibi göster — tıklanacak şey bu. */}
                <a className="contact-email" href={email.href}>
                  {email.href.replace('mailto:', '')}
                </a>
                <p className="label contact-cta">{t('emailMe')}</p>
              </div>
            )}

            <ul className="closing-links" data-reveal data-i18n-fade>
              {others.map((l) => (
                <li key={l.id}>
                  <a href={l.href} target="_blank" rel="noreferrer noopener" className="hero-link">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>

            <SiteFooter />
          </div>
        </div>
      </div>
    </section>
  )
}
