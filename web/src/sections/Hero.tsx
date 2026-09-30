import { Fragment, useRef } from 'react'

import { INNER_GAP, RingTitle, arc, usePlaceBelow, useRing } from '../components/Ring'
import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'

/**
 * Giriş slaytı — isim ve bağlantılar prizmayı çevreleyen bir dairenin üstünde.
 *
 * Kullanıcının tarifi (Oturum 2): "Prizma üçgenini merkezde olan bir daire hayal
 * edin; ismim üst kısımda o dairenin çizgisine uygun şekilde bükülmüş, alt
 * kısımda linkler de o çizgiye uysun. Mottoyu kaldıralım."
 *
 * Daire ve ölçüleri İletişim'le ortak → components/Ring.tsx.
 *
 * Metin SVG `<textPath>` üstünde ama GERÇEK metin; bağlantılar gerçek bağlantı
 * (SVG `<a>`, klavyeyle odaklanıyor). İsim ekran okuyucu ve arama motoru için
 * ayrıca görünmez bir <h1>'de — yaydaki kopya aria-hidden, iki kez okunmasın.
 *
 * `data-prism="bright"`: bu slaytta sahne kısılmıyor. `id="ust"`: "Başa dön"ün
 * ve kök adresin hedefi.
 */

/**
 * Bağlantılar alt yayda 11 px (Oturum 4, kullanıcı: "e-posta, github, linkedin
 * daha küçük olmalı, özellikle mobilde çok büyük"). Eskiden masaüstünde 22 px.
 * Dokunma alanı küçülmesin diye harflerin görünmez kalın bir çerçevesi var
 * (theme.css → .ring-links a).
 */
const LINK = 11
export function Hero() {
  const { profile, links } = useContent()
  const t = useStrings()
  const boxRef = useRef<HTMLDivElement>(null)
  const linksRef = useRef<SVGTextElement>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)


  const geo = useRing(boxRef, profile.name.length)

  /*
    İpucu bağlantı yayının hemen ALTINDA (Oturum 3). Ekranın dibine sabitken
    1024×768, 1280×720, 1366×768'de yaya biniyordu (ölçüldü). Sığmazsa önce
    hareketli çizgisi kalkar, o da sığmazsa gizlenir → Ring.tsx usePlaceBelow.
  */
  usePlaceBelow(linksRef, hintRef, geo, 'is-compact', [links])

  const ids = { top: 'hero-ring-top', inner: 'hero-ring-inner', bottom: 'hero-ring-bottom' }

  return (
    <section
      id="ust"
      className="slide slide-hero"
      data-slide
      data-prism="bright"
      aria-labelledby="ust-title"
    >
      <div className="slide-scroll" data-slide-scroll>
        <div className="hero" ref={boxRef}>
          <h1 id="ust-title" className="sr-only" data-slide-focus tabIndex={-1}>
            {profile.name}
          </h1>
          <p className="sr-only">
            {profile.title} · {profile.location}
          </p>

          <svg
              className="ring"
              viewBox={`0 0 ${geo.W} ${geo.H}`}
              width={geo.W}
              height={geo.H}
              focusable="false"
            >
              <defs>
                {/* Üst yay soldan tepeden sağa: harfler dairenin DIŞINDA, dik. */}
                <path id={ids.top} d={arc(geo, geo.r, 1)} />
                <path id={ids.inner} d={arc(geo, geo.r - INNER_GAP, 1)} />
                {/* Alt yay soldan dipten sağa: harfler dairenin üstünde duruyor, dik. */}
                <path id={ids.bottom} d={arc(geo, geo.r + LINK * 0.75, 0)} />
              </defs>

              <g className="ring-eyebrow" aria-hidden="true" data-reveal data-i18n-fade>
                <text>
                  <textPath href={`#${ids.inner}`} startOffset="50%" textAnchor="middle">
                    {`${profile.title} · ${profile.location}`}
                  </textPath>
                </text>
              </g>

              {/* İsim çevrilmiyor ama dil geçişine katılıyor (Oturum 3, kullanıcı
                  isteği): harfleri Katakana'dan geçip yine kendine oturuyor. */}
              <g aria-hidden="true" data-reveal data-i18n-fade>
                <RingTitle geo={geo} path={ids.top} text={profile.name} />
              </g>

              {/* curious.page kuralı 4: iletişim bariz olmalı, aranmamalı. */}
              <g className="ring-links" data-reveal data-i18n-fade>
                <text ref={linksRef} style={{ fontSize: LINK }}>
                  <textPath href={`#${ids.bottom}`} startOffset="50%" textAnchor="middle">
                    {links.map((l, i) => (
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

          {/* Sayfanın kaymadığını, slaytların geldiğini söyleyen tek ipucu. */}
          <p ref={hintRef} className="label hero-hint" data-reveal data-i18n-fade>
            {t('scrollHint')}
          </p>
        </div>
      </div>
    </section>
  )
}
