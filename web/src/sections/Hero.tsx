import { useRef } from 'react'

import {
  INNER_GAP,
  MAX_SPAN,
  RingLinks,
  RingTitle,
  arc,
  arcSpan,
  usePlaceBelow,
  useRing,
} from '../components/Ring'
import type { Link } from '../content/types'
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
 * Alt yaydaki bağlantıların boyu (px).
 *
 * Oturum 4 (kullanıcı: "daha küçük olmalı, özellikle mobilde çok büyük"): her
 * yerde 22 → 11. Oturum 5 (kullanıcı: "biraz büyüsün, çok görünmüyorlar"):
 * masaüstünde 16.5 = 11 × 1.5 — iki basamağın ortası. 11'in katı değil (kural 11'in
 * istisnası, telefondaki 11 × 2/3 gibi): 2x ekranda her font pikseli tam 3 cihaz
 * pikseli, keskin; 1x ekranda hafif yumuşar. Telefonda 11 kaldı.
 * Dokunma alanı küçülmesin diye harflerin görünmez kalın bir çerçevesi var
 * (theme.css → .ring-links a).
 */
const linkSize = (W: number) => (W < 768 ? 11 : 16.5)

/** Harf aralıkları (em) — theme.css → .ring-links text, --label-tracking. */
const LINK_TRACKING = 0.04
const EYEBROW_TRACKING = 0.12
/** Ayraç " · " üç harf. */
const linkChars = (ls: Link[]) => ls.reduce((n, l) => n + l.label.length, 0) + 3 * (ls.length - 1)

/** Bağlantıları harf sayısına göre iki yarıya böl (sıra korunur). */
function halves(ls: Link[]): Link[][] {
  const half = linkChars(ls) / 2
  let n = 0
  const i = ls.findIndex((l) => (n += l.label.length + 3) > half)
  const cut = Math.max(1, Math.min(ls.length - 1, i))
  return [ls.slice(0, cut), ls.slice(cut)]
}

export function Hero() {
  const { profile, links } = useContent()
  const t = useStrings()
  const boxRef = useRef<HTMLDivElement>(null)
  const linksRef = useRef<SVGGElement>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)


  const geo = useRing(boxRef, profile.name.length)

  /*
    Bağlantılar yayda MAX_SPAN'ı aşmasın (Ring.tsx): önce küçük boy (11), o da
    sığmazsa ikinci yay — bir satır aşağıda, aynı merkezden.
  */
  const rowR = (size: number, row: number) => geo.r + size * 0.75 + row * size * 1.8
  const fits = (ls: Link[], size: number) =>
    arcSpan(geo, linkChars(ls), size, LINK_TRACKING, rowR(size, 0)) <= MAX_SPAN
  const link = fits(links, linkSize(geo.W)) ? linkSize(geo.W) : 11
  const rows = links.length > 1 && !fits(links, link) ? halves(links) : [links]

  /*
    Unvan · konum iç yayda: sığmazsa yalnızca unvan, o da sığmazsa kısaltılır.
    Tam metin görünmez <p>'de (ekran okuyucu).
  */
  const eyebrowSize = geo.W < 768 ? (11 * 2) / 3 : 11
  const maxChars = Math.floor(
    (MAX_SPAN * (geo.r - INNER_GAP)) / ((geo.adv + EYEBROW_TRACKING) * eyebrowSize),
  )
  const full = `${profile.title} · ${profile.location}`
  const eyebrow =
    full.length <= maxChars
      ? full
      : profile.title.length <= maxChars
        ? profile.title
        : `${profile.title.slice(0, maxChars - 1).trimEnd()}…`

  /*
    İpucu bağlantı yayının hemen ALTINDA (Oturum 3). Ekranın dibine sabitken
    1024×768, 1280×720, 1366×768'de yaya biniyordu (ölçüldü). Sığmazsa önce
    hareketli çizgisi kalkar, o da sığmazsa gizlenir → Ring.tsx usePlaceBelow.
  */
  usePlaceBelow(linksRef, hintRef, geo, 'is-compact', [links, link, rows.length])

  const ids = { top: 'hero-ring-top', inner: 'hero-ring-inner', bottom: 'hero-ring-bottom' }

  return (
    <section
      id="ust"
      className="slide slide-ring"
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
                {rows.map((_, row) => (
                  <path key={row} id={`${ids.bottom}-${row}`} d={arc(geo, rowR(link, row), 0)} />
                ))}
              </defs>

              <g className="ring-eyebrow" aria-hidden="true" data-reveal data-i18n-fade>
                <text>
                  <textPath href={`#${ids.inner}`} startOffset="50%" textAnchor="middle">
                    {eyebrow}
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
                {rows.map((row, r) => (
                  <RingLinks
                    key={r}
                    ref={r === rows.length - 1 ? linksRef : undefined}
                    geo={geo}
                    path={`${ids.bottom}-${r}`}
                    r={rowR(link, r)}
                    size={link}
                    track={LINK_TRACKING}
                    links={row}
                  />
                ))}
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
