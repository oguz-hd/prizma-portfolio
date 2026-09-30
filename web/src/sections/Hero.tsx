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

type Geo = { W: number; H: number; r: number; name: number; nameLen: number; link: number }

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
/**
 * İsmin harfleri yatayda bu kat geniş (Oturum 3, kullanıcı: "harflerin genişliği
 * artsın, daha göz alıcı olur"). Departure Mono'nun tek genişliği var; SVG
 * `textLength` + `lengthAdjust="spacingAndGlyphs"` harfleri yay boyunca geriyor.
 */
const NAME_STRETCH = 1.3
/** İpucunun bağlantı yayından ve ekranın dibinden uzaklığı (px). */
const HINT_GAP = 16

function geometry(W: number, H: number, nameChars: number, linkChars: number, adv: number): Geo {
  const mobile = W < 768
  const r = mobile ? Math.min(W * 0.46, H * 0.3) : Math.min(W * 0.3, H * 0.37)
  /*
    İsmin kapladığı yay: masaüstünde ~85°, telefonda en çok ~110°.
    ⚠️ İlk denemede 110° idi ve ekranda ~150° gibi okunuyordu: harfler yarıçapa
    göre iri, uçtakiler 55° eğilip "Oğuz" neredeyse dik duruyordu (ölçüldü).
    Boyut en yakın 11'in katına yuvarlanıyor; izin verilen yayı aşarsa bir basamak küçülüyor.
  */
  // Geniş harflerle yay da biraz açılıyor (~100°): aynı yayda kalsa harfler
  // genişlemek yerine kısalırdı.
  const target = mobile ? 1.9 : 1.75
  const limit = mobile ? 2.1 : 1.9
  const perEm = nameChars * (adv * NAME_STRETCH + NAME_TRACKING)
  let name = snap11(Math.round((r * target) / perEm / 11) * 11, 22, 88)
  if ((name * perEm) / r > limit) name = Math.max(22, name - 11)
  // Son harfin ardındaki aralık yayda yer kaplamasın.
  const nameLen = name * (perEm - NAME_TRACKING)
  // Bağlantılar alt yayda 22px; yayın ~85°'sinden fazlasını kaplayacaksa 11px
  // (telefonda 22px'te ~150°'ye yayılıp "E-posta" dikleşiyordu — ölçüldü).
  // 11px'te dokunma alanı küçülmesin diye harflerin görünmez kalın bir
  // çerçevesi var (theme.css → .hero-arc-links a).
  const link = (linkChars * adv * 22) / (r + 16) < 1.5 ? 22 : 11
  return { W, H, r, name, nameLen, link }
}

export function Hero() {
  const { profile, links } = useContent()
  const t = useStrings()
  const boxRef = useRef<HTMLDivElement>(null)
  const linksRef = useRef<SVGTextElement>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)

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

  /*
    İpucu bağlantı yayının hemen ALTINDA (Oturum 3). Ekranın dibine sabitken
    1024×768, 1280×720, 1366×768'de yaya biniyordu (ölçüldü). Yer ölçülüyor —
    bağlantılar panelden değişse de doğru kalsın. Sığmazsa önce kısalır, sonra gizlenir.
    getBBox: açılışın kaydırması (üst <g>'deki transform) ölçüme girmiyor.
  */
  useLayoutEffect(() => {
    const links = linksRef.current
    const hint = hintRef.current
    if (!links || !hint) return
    const bb = links.getBBox()
    const top = bb.y + bb.height + HINT_GAP
    hint.style.bottom = 'auto'
    hint.style.top = `${top}px`
    // Önce tam hâli; sığmazsa hareketli çizgisiz (dizüstü 768/720 px), o da
    // sığmazsa gizli.
    const fits = () => top + hint.offsetHeight <= geo.H - HINT_GAP
    hint.classList.remove('is-compact')
    if (!fits()) hint.classList.add('is-compact')
    hint.style.visibility = fits() ? '' : 'hidden'
  }, [geo, linkChars])

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

              {/* İsim çevrilmiyor ama dil geçişine katılıyor (Oturum 3, kullanıcı
                  isteği): harfleri Katakana'dan geçip yine kendine oturuyor. */}
              <g className="hero-arc-name" aria-hidden="true" data-reveal data-i18n-fade>
                <text style={{ fontSize: geo.name }}>
                  {/* ⚠️ `textAnchor="middle"` burada KULLANILMIYOR: WebKit (iPhone
                      Safari) ortalamayı `textLength` germesinden ÖNCEKİ genişlikle
                      yapıyor, fazlalık yalnızca sağa taşıyor ve isim yayda saat
                      yönüne kayıyordu (ölçüldü, 30.09.2026). Başlangıç elle: yarım
                      dairenin boyu πr, isim tam ortasına. */}
                  <textPath
                    href={`#${ids.top}`}
                    startOffset={(Math.PI * geo.r - geo.nameLen) / 2}
                    textLength={geo.nameLen}
                    lengthAdjust="spacingAndGlyphs"
                  >
                    {profile.name}
                  </textPath>
                </text>
              </g>

              {/* curious.page kuralı 4: iletişim bariz olmalı, aranmamalı. */}
              <g className="hero-arc-links" data-reveal data-i18n-fade>
                <text ref={linksRef} style={{ fontSize: geo.link }}>
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
          <p ref={hintRef} className="label hero-hint" data-reveal data-i18n-fade>
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
