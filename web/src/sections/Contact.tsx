import { Fragment, useRef } from 'react'

import { INNER_GAP, RingTitle, arc, usePlaceBelow, useRing } from '../components/Ring'
import { SiteFooter } from '../components/SiteFooter'
import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'
import type { SectionProps } from './Section'

/**
 * İletişim — kapanış karesi, girişin aynası (Oturum 4, kullanıcı: "iletişimdeki
 * yazıyı kaldıralım, bu bölüm intro gibi dairesel olsun").
 *
 * Aynı görünmez daire (components/Ring.tsx), aynı başlık boyu:
 *   üst yay       İLETİŞİM — geniş, kalın
 *   üst iç yay    BANA YAZ
 *   alt yay       e-posta adresi (sayfanın asıl bağlantısı)
 *   alt iç yay    GitHub · LinkedIn
 *   dip           altbilgi — e-posta yayının altında; sığmazsa gizlenir
 *                 (daire Giriş'inkiyle birebir aynı kalsın, küçülmesin)
 *
 * Müsaitlik cümlesi (bölüm gövdesi) kalktı; içerikte de boş. curious.page
 * kuralı 4: iletişim bariz — e-posta alt yayda, başlıktan sonra en iri yazı.
 *
 * Başlık ekran okuyucu için ayrıca görünmez bir <h2>'de; yaydaki kopya
 * aria-hidden. Bağlantılar gerçek SVG <a> — klavyeyle odaklanıyor.
 */

/** Alt yaydaki e-posta: 22 px, yayın ~85°'sinden fazlasını kaplayacaksa 11 px. */
const MAIL = { big: 22, small: 11 }
/** E-postanın harf aralığı (em) — theme.css → .ring-links text ile aynı. */
const MAIL_TRACKING = 0.04
/** Alt iç yaydaki GitHub · LinkedIn. */
const SOCIAL = 11

export function Contact({ id, heading }: SectionProps) {
  const { profile, links } = useContent()
  const t = useStrings()
  const boxRef = useRef<HTMLDivElement>(null)
  const mailRef = useRef<SVGTextElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const titleId = `${id}-title`

  const email = links.find((l) => l.href.startsWith('mailto:'))
  const others = links.filter((l) => !l.href.startsWith('mailto:'))
  const address = email?.href.replace('mailto:', '') ?? ''

  const geo = useRing(boxRef, profile.name.length)
  // Büyük boyda adres, ÇİZİLDİĞİ yayın (r + boy × 0.75) ~85°'sinden fazlasını
  // kaplıyorsa küçük boy — uçtaki harfler dikleşmesin.
  const span = (size: number) =>
    (address.length * (geo.adv + MAIL_TRACKING) * size) / (geo.r + size * 0.75)
  const mail = span(MAIL.big) < 1.5 ? MAIL.big : MAIL.small
  usePlaceBelow(mailRef, footerRef, geo, null, [mail, address])

  const ids = {
    top: `${id}-ring-top`,
    inner: `${id}-ring-inner`,
    bottom: `${id}-ring-bottom`,
    innerBottom: `${id}-ring-inner-bottom`,
  }

  return (
    <section id={id} className="slide slide-ring" data-slide data-prism="bright" aria-labelledby={titleId}>
      <div className="slide-scroll" data-slide-scroll>
        <div className="ring-box" ref={boxRef}>
          <h2 id={titleId} className="sr-only" data-slide-focus tabIndex={-1}>
            {heading}
          </h2>
          {/* Yaydaki "Bana yaz" aria-hidden — ekran okuyucu bunu okusun. */}
          <p className="sr-only">{t('emailMe')}</p>

          <svg className="ring" viewBox={`0 0 ${geo.W} ${geo.H}`} width={geo.W} height={geo.H} focusable="false">
            <defs>
              <path id={ids.top} d={arc(geo, geo.r, 1)} />
              <path id={ids.inner} d={arc(geo, geo.r - INNER_GAP, 1)} />
              {/* Alt yaylar soldan dipten sağa: harfler dairenin üstünde duruyor, dik. */}
              <path id={ids.bottom} d={arc(geo, geo.r + mail * 0.75, 0)} />
              <path id={ids.innerBottom} d={arc(geo, geo.r - INNER_GAP, 0)} />
            </defs>

            <g aria-hidden="true" data-reveal data-i18n-fade>
              <RingTitle geo={geo} path={ids.top} text={heading} />
            </g>

            <g className="ring-eyebrow" aria-hidden="true" data-reveal data-i18n-fade>
              <text>
                <textPath href={`#${ids.inner}`} startOffset="50%" textAnchor="middle">
                  {t('emailMe')}
                </textPath>
              </text>
            </g>

            {email && (
              <g className="ring-links ring-mail" data-reveal data-i18n-fade>
                <text ref={mailRef} style={{ fontSize: mail }}>
                  <textPath href={`#${ids.bottom}`} startOffset="50%" textAnchor="middle">
                    <a href={email.href}>
                      <tspan>{address}</tspan>
                    </a>
                  </textPath>
                </text>
              </g>
            )}

            <g className="ring-links" data-reveal data-i18n-fade>
              <text style={{ fontSize: SOCIAL }}>
                <textPath href={`#${ids.innerBottom}`} startOffset="50%" textAnchor="middle">
                  {others.map((l, i) => (
                    <Fragment key={l.id}>
                      {i > 0 && <tspan className="ring-sep"> · </tspan>}
                      <a
                        href={l.href}
                        {...(l.href.startsWith('http')
                          ? { target: '_blank', rel: 'noreferrer noopener' }
                          : {})}
                      >
                        <tspan>{l.label}</tspan>
                      </a>
                    </Fragment>
                  ))}
                </textPath>
              </text>
            </g>
          </svg>

          <SiteFooter ref={footerRef} />
        </div>
      </div>
    </section>
  )
}
