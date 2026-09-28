import { Fragment, useLayoutEffect, useRef, useState } from 'react'

import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'

/**
 * Giriş slaytı — isim ve bağlantılar prizmayı çevreleyen bir dairenin üstünde.
 *
 * Kullanıcının tarifi (Oturum 2): "Prizma üçgenini merkezde olan bir daire hayal
 * edin; ismim üst kısımda o dairenin çizgisine uygun şekilde bükülmüş, alt
 * kısımda linkler de o çizgiye uysun. Mottoyu kaldıralım."
 *
 * Daire görünmüyor — yalnızca harflerin dizildiği yol. Merkezi ekranın ortası,
 * yani prizmanın kutusunun merkezi (PrismStage aynı noktaya oturtuyor).
 *
 * Metin SVG `<textPath>` üstünde ama GERÇEK metin; bağlantılar gerçek bağlantı
 * (SVG `<a>`, klavyeyle odaklanıyor). İsim ekran okuyucu ve arama motoru için
 * ayrıca görünmez bir <h1>'de — yaydaki kopya aria-hidden, iki kez okunmasın.
 *
 * Boyutlar ekrandan hesaplanıyor: yarıçap pencereye, isim boyutu yayın boyuna
 * göre; sonuç Departure Mono'nun keskin kaldığı 11 px'in katına yuvarlanıyor.
 *
 * `data-prism="bright"`: bu slaytta sahne kısılmıyor. `id="ust"`: "Başa dön"ün
 * ve kök adresin hedefi.
 */

type Geo = { W: number; H: number; r: number; name: number; link: number }

/** 11'in katına aşağı yuvarla, aralıkta tut. */
const snap11 = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.floor(v / 11) * 11))

/**
 * Harf genişliği (em) — Departure Mono tek aralıklı; font gelince ölçülüyor.
 * Tahmin ölçülen değere yakın (0.64 + harf aralığı) ki ilk karede yay zıplamasın.
 */
const ADV_GUESS = 0.65
/** İsmin harf aralığı (em) — theme.css → .hero-arc-name ile aynı; yay hesabına giriyor. */
const NAME_TRACKING = 0.06

function geometry(W: number, H: number, nameChars: number, linkChars: number, adv: number): Geo {
  const mobile = W < 768
  const r = mobile ? Math.min(W * 0.46, H * 0.3) : Math.min(W * 0.3, H * 0.37)
  /*
    İsmin kapladığı yay: masaüstünde ~85°, telefonda en çok ~110°.
    ⚠️ İlk denemede 110° idi ve ekranda ~150° gibi okunuyordu: harfler yarıçapa
    göre iri, uçtakiler 55° eğilip "Oğuz" neredeyse dik duruyordu (ölçüldü).
    Boyut en yakın 11'in katına yuvarlanıyor; izin verilen yayı aşarsa bir basamak küçülüyor.
  */
  const target = mobile ? 1.75 : 1.5
  const limit = mobile ? 1.95 : 1.62
  const perEm = nameChars * (adv + NAME_TRACKING)
  let name = snap11(Math.round((r * target) / perEm / 11) * 11, 22, 88)
  if ((name * perEm) / r > limit) name = Math.max(22, name - 11)
  // Bağlantılar alt yayda 22px; yayın ~85°'sinden fazlasını kaplayacaksa 11px
  // (telefonda 22px'te ~150°'ye yayılıp "E-posta" dikleşiyordu — ölçüldü).
  // 11px'te dokunma alanı küçülmesin diye harflerin görünmez kalın bir
  // çerçevesi var (theme.css → .hero-arc-links a).
  const link = (linkChars * adv * 22) / (r + 16) < 1.5 ? 22 : 11
  return { W, H, r, name, link }
}

export function Hero() {
  const { profile, links } = useContent()
  const t = useStrings()
  const boxRef = useRef<HTMLDivElement>(null)

  const linkChars = links.reduce((n, l) => n + l.label.length, 0) + (links.length - 1) * 3

  /*
    ⚠️ İlk değer pencereden, HEMEN: yay ilk karede DOM'da olmalı. Açılış
    (intro.ts) gösterilecek öğeleri App'in ilk etkisinde topluyor; yay bir
    ölçüm sonrasına kalırsa o listeye girmiyor, açılışın sonunda birden
    beliriyordu. Slayt kabı pencereyle aynı boyda — ölçüm yalnızca düzeltir.
  */
  const [geo, setGeo] = useState<Geo>(() =>
    geometry(window.innerWidth, window.innerHeight, profile.name.length, linkChars, ADV_GUESS),
  )

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    let adv = ADV_GUESS

    const measure = () => {
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx) return
      ctx.font = '100px "Departure Mono"'
      adv = ctx.measureText('M').width / 100 || adv
    }

    const update = () => {
      const W = box.clientWidth
      const H = box.clientHeight
      if (!W || !H) return
      setGeo(geometry(W, H, profile.name.length, linkChars, adv))
    }

    measure()
    update()
    // Font geldiğinde harf genişliği değişir → yeniden ölç.
    document.fonts?.ready.then(() => {
      measure()
      update()
    })
    const ro = new ResizeObserver(update)
    ro.observe(box)
    return () => ro.disconnect()
  }, [profile.name, linkChars])

  const ids = { top: 'hero-arc-top', inner: 'hero-arc-inner', bottom: 'hero-arc-bottom' }

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
              className="hero-arc"
              viewBox={`0 0 ${geo.W} ${geo.H}`}
              width={geo.W}
              height={geo.H}
              focusable="false"
            >
              <defs>
                {/* Üst yay soldan tepeden sağa: harfler dairenin DIŞINDA, dik. */}
                <path id={ids.top} d={arc(geo.W / 2, geo.H / 2, geo.r, 1)} />
                <path id={ids.inner} d={arc(geo.W / 2, geo.H / 2, geo.r - 30, 1)} />
                {/* Alt yay soldan dipten sağa: harfler dairenin üstünde duruyor, dik. */}
                <path id={ids.bottom} d={arc(geo.W / 2, geo.H / 2, geo.r + geo.link * 0.75, 0)} />
              </defs>

              <g className="hero-arc-eyebrow" aria-hidden="true" data-reveal data-i18n-fade>
                <text>
                  <textPath href={`#${ids.inner}`} startOffset="50%" textAnchor="middle">
                    {`${profile.title} · ${profile.location}`}
                  </textPath>
                </text>
              </g>

              <g className="hero-arc-name" aria-hidden="true" data-reveal>
                <text style={{ fontSize: geo.name }}>
                  <textPath href={`#${ids.top}`} startOffset="50%" textAnchor="middle">
                    {profile.name}
                  </textPath>
                </text>
              </g>

              {/* curious.page kuralı 4: iletişim bariz olmalı, aranmamalı. */}
              <g className="hero-arc-links" data-reveal data-i18n-fade>
                <text style={{ fontSize: geo.link }}>
                  <textPath href={`#${ids.bottom}`} startOffset="50%" textAnchor="middle">
                    {links.map((l, i) => (
                      <Fragment key={l.id}>
                        {i > 0 && <tspan className="hero-arc-sep"> · </tspan>}
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
          <p className="label hero-hint" data-reveal data-i18n-fade>
            {t('scrollHint')}
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * Yarım daire yolu, soldan sağa. `sweep` 1 → tepeden (saat yönü), 0 → dipten.
 * İkisi de soldan sağa aktığı için harfler her iki yayda da dik okunuyor.
 */
function arc(cx: number, cy: number, r: number, sweep: 0 | 1): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 ${sweep} ${cx + r} ${cy}`
}
