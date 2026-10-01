import { useEffect, useId, useRef } from 'react'
import gsap from 'gsap'

import { reducedMotion } from '../motion'
import {
  AP,
  BL,
  BR,
  DEPTH,
  L_MAX,
  L_MIN,
  P,
  PRISM_HEIGHT,
  Q,
  TRIANGLE,
  accentNm,
  beamDir,
  deg,
  yAt,
  type AbsorptionLine,
  type Pt,
} from './optics'
import { DIM, SURGE, accentCount, scene } from './scene'
import './prism.css'

/*
  Kare sınırı (ölçüldü, CALISTIRMA "Performans ölçümü"): prizma hiç durmadığı için
  GSAP varsayılanıyla ekranın yenileme hızında çiziliyordu — 240 Hz'de dahili GPU
  %70-90 doluydu, 60 Hz'de %24-36. Salınım 60'ın üstünde fark edilmiyor.
  60 değil 74: GSAP bir sonraki kareyi "öncekinden en az 1000/fps ms sonra" diye
  bekliyor; 60 verilirse 60 Hz ekranda mikrosaniyelik sapma kare atlatır. 74 →
  60 Hz: 60 · 120/240 Hz: 60 · 144 Hz: 72 · 165 Hz: ~55.
  Ticker ortak: geçişler ve panel de bu hızda.
*/
gsap.ticker.fps(74)

/**
 * ★ Sitenin merkezi: kalıcı prizma sahnesi.
 *
 * Ekranın tamamını kaplayan sabit bir SVG. Beyaz ışık soldan, ekranın dışından
 * gelir; tam ortadaki prizmadan geçip tayfına ayrılır ve sağda bir şeride düşer.
 * Şeridin üstünde gerçek soğurma çizgileri var — bir yıldızın ne olduğu bu
 * çizgilerden okunur (docs/DESIGN.md § 0).
 *
 * Oturum 2 (kullanıcı isteği):
 *   - "Renkler daha parlak ve göz alıcı" → tayf daha opak; altında bulanık,
 *     doygun bir hale katmanı (`.prism-glow`, aynı şekillerin <use> kopyası);
 *     camın içinde soluk bir gökkuşağı. (Sol kenardaki parıltı çizgisi Oturum 3'te
 *     kalktı: kenara paralel değildi, ikinci ve eğri bir kenar gibi okunuyordu.)
 *   - "Fareye bağlı olmasın, kendi hâlinde hareket etsin — mobilde fare yok"
 *     → imleç takibi KALKTI. Işık iki dalgalı yavaş bir salınımla kendi
 *     kendine dönüyor ve ışık darbeleri akıyor: huzmede parlak bir parçacık
 *     prizmaya koşuyor, çıkınca tayfın üstünden bir dalga olarak geçiyor.
 *     Dokunmatikte de birebir aynı.
 *
 * Bu bileşen yalnızca ÇİZER. Ne zaman neyin görüneceğine karar vermez:
 * `scene` (scene.ts) her karede okunur — açılış ve slayt geçişi onu sürer.
 *
 * Erişilebilirlik (§ 7): tamamen dekoratif → aria-hidden. Etiketler HTML.
 * Hareket hassasiyetinde döngü yok, darbe yok, yalnızca değişince çizilir.
 * Renk KODU yok: tonlar `--accent-*`, çizgiler `--ink`/`--ground`.
 */

/** Varsayılan: çizgisiz. Sabit bir dizi — her render'da yeni [] gelmesin. */
const NO_LINES: AbsorptionLine[] = []

type Props = {
  /** Soğurma çizgileri. Varsayılan yok (sade tayf, Oturum 4); 404 kendi çizgisini veriyor. */
  lines?: AbsorptionLine[]
  /** Çizgileri vurgula (404: tek, kalın, lider renkli etiket). */
  mark?: boolean
}

/** Görünür alanın dünya birimi cinsinden kutusu (y aşağı — SVG uzayı). */
type Layout = {
  W: number
  H: number
  s: number
  vx: number
  vy: number
  screenX: number
  stripW: number
  /** İki etiketin merkezleri arasındaki en küçük uzaklık (px). */
  labelStep: number
}

/** Prizmanın sınırlayıcı kutusunun merkezi (dünya y'si). Ekranın ortasına bu oturuyor. */
const BOX_CY = (AP.y + BL.y) / 2

/** Işık darbesi: bir turun süresi (sn), huzmede geçen payı, aynı anda kaç darbe. */
const PULSE_PERIOD = 3.4
const PULSE_BEAM_SHARE = 0.36
const PULSES = 2

/** Şerit genişliği ve etiketin şeritten uzaklığı (px). */
const STRIP_PX = 9
const LABEL_GAP = 10
/** Sağ kenardan rayın en uzun işaretine (24 + 36 px) ve ondan bir nefes (20 px). */
const RAIL_ROOM = 80

const sy = (y: number) => -y
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const pts = (list: Pt[]) => list.map((p) => `${p.x},${sy(p.y)}`).join(' ')

/**
 * Ölçek: dünya biriminin kaç piksel olduğu. Masaüstünde prizma ekran yüksekliğinin
 * ~%23'ü; telefonda genişliğe göre, isim ve metin yer bulsun diye biraz küçük.
 */
function scaleFor(W: number, H: number): number {
  return W < 768 ? Math.min(W * 0.15, H * 0.085) : Math.min(W * 0.085, H * 0.135)
}

export function PrismStage({ lines = NO_LINES, mark = false }: Props) {
  const id = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const glowRef = useRef<SVGSVGElement>(null)
  const beamRef = useRef<SVGPolygonElement>(null)
  const beamGradRef = useRef<SVGLinearGradientElement>(null)
  const innerRef = useRef<SVGLineElement>(null)
  const fanRef = useRef<SVGPolygonElement>(null)
  const coreRef = useRef<SVGPolygonElement>(null)
  const coreGradRef = useRef<SVGLinearGradientElement>(null)
  const stripRef = useRef<SVGPolygonElement>(null)
  const gradRef = useRef<SVGLinearGradientElement>(null)
  const stopRefs = useRef<(SVGStopElement | null)[]>([])
  const focusRef = useRef<SVGLineElement>(null)
  const faceRef = useRef<SVGPolygonElement>(null)
  const glassRef = useRef<SVGPolygonElement>(null)
  const backRef = useRef<SVGGElement>(null)
  const rayRefs = useRef<(SVGLineElement | null)[]>([])
  const gapRefs = useRef<(SVGLineElement | null)[]>([])
  const beamPulseRefs = useRef<(SVGPolygonElement | null)[]>([])
  const fanPulseRefs = useRef<(SVGLineElement | null)[]>([])
  const labelsRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([])

  const count = accentCount()
  const labelled = lines.filter((l) => l.label)

  useEffect(() => {
    const root = rootRef.current
    const svg = svgRef.current
    const glow = glowRef.current
    if (!root || !svg || !glow) return

    let L: Layout = layout()

    function layout(): Layout {
      const W = root!.clientWidth || window.innerWidth
      const H = root!.clientHeight || window.innerHeight
      const s = scaleFor(W, H)
      const vx = -W / 2 / s
      const vy = sy(BOX_CY) - H / 2 / s
      const vb = `${vx} ${vy} ${W / s} ${H / s}`
      svg!.setAttribute('viewBox', vb)
      glow!.setAttribute('viewBox', vb)
      // Şerit ekranın sağ kısmında. Telefonda etiket yok; ama sağ kenarda slayt
      // rayı var — şerit ona binmesin diye kenardan ~50px içeride.
      // Masaüstünde (Oturum 3, kullanıcı: "tayf daha uzun olsun") şerit, etiketleri
      // raya değmeden sığabilecek en sağa gidiyor. Önceki W×0.33, 1440'ta sağda
      // ~80px boş bırakıyor, 1024'te ise etiketi rayın 4px yanına kadar itiyordu (ölçüldü).
      const labelW = Math.max(0, ...labelRefs.current.map((el) => el?.offsetWidth ?? 0))
      const first = labelRefs.current[0]
      const labelStep = first ? parseFloat(getComputedStyle(first).fontSize) * 1.3 : 0
      const room = W / 2 - RAIL_ROOM - LABEL_GAP - labelW - STRIP_PX
      const screenX = W < 768 ? (W / 2 - 52) / s : Math.min(room / s, 7)
      // Yerleşim prizmanın boyunu bilsin (giriş ızgarası ortadaki boşluğu buna göre açıyor).
      const rs = document.documentElement.style
      rs.setProperty('--prism-box', `${Math.round(PRISM_HEIGHT * s)}px`)
      rs.setProperty('--prism-w', `${Math.round(2 * s)}px`)
      return { W, H, s, vx, vy, screenX, stripW: STRIP_PX / s, labelStep }
    }

    /** Dünya noktası → sahne kutusuna göre piksel (etiketler için). */
    const px = (x: number) => (x - L.vx) * L.s
    const py = (y: number) => (sy(y) - L.vy) * L.s

    function draw(theta: number, time: number, pulsing: boolean) {
      const { s, vx, screenX: sc, stripW: sw } = L
      const bright = clamp01((scene.dim - DIM) / (1 - DIM))

      // Geçiş dalgasında tayf orta çizgisinden açılır. Bütün tayf noktaları bu
      // yardımcıdan geçiyor (yelpaze, şerit, ışınlar, darbeler, etiketler): ölçek
      // doğrusal olduğu için gradyan oranları ve tonların sırası bozulmuyor.
      const spread = 1 + scene.surge * SURGE.spread
      // Dalgada çizgiler ve etiketler söner: açılan renk bantları sade görünsün.
      const lineAlpha = SURGE.spread ? 1 - scene.surge : 1
      const Y = (nm: number, x: number): number | null => {
        const y = yAt(theta, nm, x)
        if (y === null || spread === 1) return y
        const a = yAt(theta, L_MAX, x)
        const b = yAt(theta, L_MIN, x)
        if (a === null || b === null) return y
        const mid = (a + b) / 2
        return mid + (y - mid) * spread
      }

      // ── Prizma: kenarlar çizilerek belirir, arka yüz sonra ──────────────
      const face = faceRef.current
      if (face) {
        face.style.strokeDashoffset = String(1 - scene.frame)
        // ⚠️ Ön yüz vector-effect KULLANMIYOR: non-scaling-stroke pathLength'i
        // bozuyor, kesik çizgi piksel ölçüsüne düşüp yüz kesik kesik görünüyordu
        // (ekranda yakalandı). Kalınlık dünya biriminde, ölçekten türetiliyor.
        face.style.strokeWidth = String(1.5 / s)
      }
      if (glassRef.current) glassRef.current.style.opacity = String(scene.frame)
      if (backRef.current) backRef.current.style.opacity = String(clamp01((scene.frame - 0.4) / 0.6))

      // ── Gelen beyaz ışık: ekranın solundan, başı parlak bir huzme ─────────
      const dir = beamDir(theta)
      const cx = Math.cos(dir)
      const cy = Math.sin(dir)
      const t = (P.x - (vx - 0.5)) / cx
      const start = { x: P.x - cx * t, y: P.y - cy * t }
      const head = { x: start.x + (P.x - start.x) * scene.beam, y: start.y + (P.y - start.y) * scene.beam }
      const nx = -cy
      const ny = cx
      const band = (a: Pt, b: Pt, w: number) =>
        pts([
          { x: a.x + nx * w, y: a.y + ny * w },
          { x: b.x + nx * w, y: b.y + ny * w },
          { x: b.x - nx * w, y: b.y - ny * w },
          { x: a.x - nx * w, y: a.y - ny * w },
        ])
      beamRef.current?.setAttribute('points', scene.beam <= 0 ? '' : band(start, head, 1.6 / s))
      // Gradyan huzmeyle birlikte ilerliyor: baş hep parlak, kuyruk sönük.
      const bg = beamGradRef.current
      if (bg) {
        bg.setAttribute('x1', String(start.x))
        bg.setAttribute('y1', String(sy(start.y)))
        bg.setAttribute('x2', String(head.x))
        bg.setAttribute('y2', String(sy(head.y)))
      }

      // ── Camın içindeki yol, sonra yelpaze ───────────────────────────────
      const inner = clamp01(scene.fan / 0.25)
      const ie = { x: P.x + (Q.x - P.x) * inner, y: P.y + (Q.y - P.y) * inner }
      const il = innerRef.current
      if (il) {
        il.setAttribute('x2', String(ie.x))
        il.setAttribute('y2', String(sy(ie.y)))
        il.style.opacity = scene.fan > 0 ? '1' : '0'
      }

      const fr = clamp01((scene.fan - 0.2) / 0.8)
      const xe = Q.x + (sc - Q.x) * fr
      const yTop = Y(L_MAX, xe)
      const yBot = Y(L_MIN, xe)
      if (yTop === null || yBot === null) return
      const fanPts = fr <= 0 ? '' : pts([Q, { x: xe, y: yTop }, { x: xe, y: yBot }])
      fanRef.current?.setAttribute('points', fanPts)
      coreRef.current?.setAttribute('points', fanPts)

      // Tonlar kendi dalga boylarının düştüğü yerde. Oran x'ten bağımsız
      // (hepsi aynı noktadan çıkan doğrular) → şeridin hizasında hesaplanıyor.
      // ⚠️ Gradyan ALTTAN (mor) ÜSTE (kırmızı): SVG durakların ofsetlerinin
      // belge sırasında artmasını şart koşuyor. Tersi çizilince bütün tonlar
      // ilk durağın ofsetine yığılıyor, tayf baştan sona mor görünüyordu.
      const g = gradRef.current
      if (g) {
        g.setAttribute('x1', String(xe))
        g.setAttribute('x2', String(xe))
        g.setAttribute('y1', String(sy(yBot)))
        g.setAttribute('y2', String(sy(yTop)))
      }
      const sTop = Y(L_MAX, sc)!
      const sBot = Y(L_MIN, sc)!
      const off = (nm: number) => ((Y(nm, sc) ?? sBot) - sBot) / (sTop - sBot)
      for (let i = 0; i < count; i++) {
        stopRefs.current[i]?.setAttribute('offset', String(off(accentNm(i, count))))
      }

      // Prizmadan yeni çıkan ışık henüz ayrışmamış: çekirdek beyaz, dışa doğru söner.
      const cg = coreGradRef.current
      if (cg) {
        cg.setAttribute('x1', String(Q.x))
        cg.setAttribute('x2', String(Q.x + (sc - Q.x) * 0.4))
        cg.setAttribute('y1', String(sy(Q.y)))
        cg.setAttribute('y2', String(sy(Q.y)))
      }

      // ── Şerit, soğurma çizgileri, vurgulanan ışın ───────────────────────
      stripRef.current?.setAttribute(
        'points',
        pts([
          { x: sc, y: sTop },
          { x: sc + sw, y: sTop },
          { x: sc + sw, y: sBot },
          { x: sc, y: sBot },
        ]),
      )
      if (stripRef.current) stripRef.current.style.opacity = String(scene.labels)

      lines.forEach(({ nm }, i) => {
        const ray = rayRefs.current[i]
        const gap = gapRefs.current[i]
        const yr = Y(nm, xe)
        const ys = Y(nm, sc)
        if (ray && yr !== null) {
          ray.setAttribute('x2', String(xe))
          ray.setAttribute('y2', String(sy(yr)))
          ray.style.opacity = fr > 0 ? String(lineAlpha) : '0'
        }
        if (gap && ys !== null) {
          gap.setAttribute('x1', String(sc))
          gap.setAttribute('x2', String(sc + sw))
          gap.setAttribute('y1', String(sy(ys)))
          gap.setAttribute('y2', String(sy(ys)))
          gap.style.opacity = String(scene.labels * lineAlpha)
        }
      })

      const fl = focusRef.current
      if (fl) {
        const yf = Y(accentNm(scene.accent - 1, count), xe)
        if (yf !== null) {
          fl.setAttribute('x2', String(xe))
          fl.setAttribute('y2', String(sy(yf)))
        }
        fl.style.stroke = `var(--accent-${scene.accent})`
        fl.style.opacity = String(scene.focus * fr * lineAlpha)
      }

      // ── Işık darbeleri ───────────────────────────────────────────────────
      // Tur: önce huzmede parlak bir parçacık prizmaya koşar (hızlanarak),
      // sonra tayfın üstünden dikey bir ışık dalgası olarak şeride akar.
      const on = pulsing && scene.beam >= 1 && fr >= 1
      const alpha = on ? Math.min(1, (0.55 + 0.35 * bright) * (1 + 0.6 * scene.surge)) : 0
      for (let k = 0; k < PULSES; k++) {
        const bp = beamPulseRefs.current[k]
        const fp = fanPulseRefs.current[k]
        if (!bp || !fp) continue
        const ph = (time / PULSE_PERIOD + k / PULSES) % 1
        if (ph < PULSE_BEAM_SHARE) {
          const u = ph / PULSE_BEAM_SHARE
          const e = u * u
          const c = { x: start.x + (P.x - start.x) * e, y: start.y + (P.y - start.y) * e }
          const len = 0.9
          const a = { x: c.x - cx * len, y: c.y - cy * len }
          bp.setAttribute('points', band(a, c, 2.2 / s))
          bp.style.opacity = String(alpha * Math.min(1, u * 4))
          fp.style.opacity = '0'
        } else {
          const v = (ph - PULSE_BEAM_SHARE) / (1 - PULSE_BEAM_SHARE)
          const x = Q.x + (sc - Q.x) * v
          const y1 = Y(L_MAX, x)
          const y2 = Y(L_MIN, x)
          if (y1 !== null && y2 !== null) {
            fp.setAttribute('x1', String(x))
            fp.setAttribute('x2', String(x))
            fp.setAttribute('y1', String(sy(y1)))
            fp.setAttribute('y2', String(sy(y2)))
          }
          fp.style.opacity = String(alpha * Math.pow(1 - v, 0.7))
          bp.style.opacity = '0'
        }
      }

      // ── Etiketler (HTML) ─────────────────────────────────────────────────
      // Çizgiler şeritte birbirine yakın düşebiliyor (Hα 656 ↔ Na D 589): şerit
      // kısaldıkça etiketler üst üste biniyordu (1024 px'te 14 px, ölçüldü).
      // Yukarıdan aşağı sırayla, yakın olan bir alttakini en az labelStep iter.
      let prev = -Infinity
      labelled
        .map(({ nm }, i) => ({ el: labelRefs.current[i], y: Y(nm, sc) }))
        .filter((l): l is { el: HTMLSpanElement; y: number } => !!l.el && l.y !== null)
        .map((l) => ({ el: l.el, top: py(l.y) }))
        .sort((a, b) => a.top - b.top)
        .forEach(({ el, top }) => {
          const y = Math.max(top, prev + L.labelStep)
          prev = y
          el.style.transform = `translate(${px(sc + sw) + LABEL_GAP}px, ${y}px) translateY(-50%)`
        })

      // Dalgada kısık sahne (içerik slaytı) bir an tam parlaklığa yaklaşır.
      root!.style.opacity = String(scene.dim + (1 - scene.dim) * scene.surge * SURGE.flash)
      // Etiketler yalnızca parlak slaytta: içerik slaytlarında panelin kenarından
      // yarım harfler taşıyordu ("+K", "9"). Kısılma ne kadar ilerlediyse o kadar söner.
      if (labelsRef.current) labelsRef.current.style.opacity = String(scene.labels * bright * lineAlpha)
    }

    const reduced = reducedMotion()
    let theta = scene.base
    /** Darbelerin kendi saati: dalgada hızlanıyor, sıçramadan (zaman çarpılmıyor, toplanıyor). */
    let pulseClock = 0

    const tick = (time: number, dt: number) => {
      if (reduced) {
        if (!scene.dirty) return
        scene.dirty = false
        theta = scene.base
        draw(theta, 0, false)
        return
      }
      // Kendi hâlinde salınım: iki yavaş dalga üst üste — düzenli bir sarkaç
      // değil, canlı bir ışık. İçerik slaytında daha sakin (okuma sürüyor).
      const bright = clamp01((scene.dim - DIM) / (1 - DIM))
      const amp = (0.6 + 0.4 * bright) * (1 + scene.surge * SURGE.sway)
      const sway = amp * (deg(3.6) * Math.sin(time * 0.42) + deg(1.1) * Math.sin(time * 1.07 + 1.3))
      const target = scene.base + sway
      theta += (target - theta) * (1 - Math.pow(0.9, dt / 16.67))
      pulseClock += (dt / 1000) * (1 + scene.surge * SURGE.pulse)
      draw(theta, pulseClock, true)
    }

    const onResize = () => {
      L = layout()
      scene.dirty = true
    }

    draw(theta, 0, false)
    gsap.ticker.add(tick)
    window.addEventListener('resize', onResize)

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', onResize)
    }
    // `lines` bağımlılık değil: içeriği sabit (boş ya da 404'ün tek çizgisi),
    // her render'da yeni dizi gelse döngü boşuna yeniden kurulurdu.
  }, [count])

  const gradId = `pg-${id}`
  const glassId = `pgl-${id}`
  const beamId = `pb-${id}`
  const coreId = `pc-${id}`
  const fanId = `pf-${id}`
  const stripId = `ps-${id}`
  const beamShapeId = `pbs-${id}`

  return (
    <div className={mark ? 'prism-stage is-mark' : 'prism-stage'} ref={rootRef} aria-hidden="true">
      {/*
        Hale: aynı ışık şekillerinin kopyası, CSS'te bulanık ve doygun. Ana
        çizimin ALTINDA — renkler etrafa taşıyor, keskin kenarlar üstte kalıyor.
      */}
      <svg ref={glowRef} className="prism-glow" focusable="false">
        <use href={`#${beamShapeId}`} />
        <use href={`#${fanId}`} />
        <use href={`#${stripId}`} />
      </svg>

      <svg ref={svgRef} className="prism-main" focusable="false">
        <defs>
          <linearGradient id={gradId} ref={gradRef} gradientUnits="userSpaceOnUse">
            {Array.from({ length: count }, (_, i) => (
              <stop
                key={i}
                ref={(el) => {
                  stopRefs.current[i] = el
                }}
                style={{ stopColor: `var(--accent-${i + 1})` }}
              />
            ))}
          </linearGradient>
          {/* Camın içindeki soluk gökkuşağı — ışık cam içinde de hafifçe ayrışıyor. */}
          <linearGradient id={glassId} x1="0" y1="0" x2="1" y2="1">
            {Array.from({ length: count }, (_, i) => (
              <stop
                key={i}
                offset={count < 2 ? 0 : i / (count - 1)}
                style={{ stopColor: `var(--accent-${count - i})` }}
              />
            ))}
          </linearGradient>
          <linearGradient id={beamId} ref={beamGradRef} gradientUnits="userSpaceOnUse">
            <stop offset="0" className="prism-light-stop" style={{ stopOpacity: 0 }} />
            <stop offset="0.7" className="prism-light-stop" style={{ stopOpacity: 0.6 }} />
            <stop offset="1" className="prism-light-stop" style={{ stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id={coreId} ref={coreGradRef} gradientUnits="userSpaceOnUse">
            <stop offset="0" className="prism-light-stop" style={{ stopOpacity: 0.7 }} />
            <stop offset="1" className="prism-light-stop" style={{ stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* Işık: gelen huzme, yelpaze, beyaz çekirdek */}
        <polygon id={beamShapeId} ref={beamRef} fill={`url(#${beamId})`} />
        <polygon id={fanId} ref={fanRef} className="prism-fan" fill={`url(#${gradId})`} />
        <polygon ref={coreRef} fill={`url(#${coreId})`} />

        {/* Soğurma çizgileri — zemin renginde, ışığı "kesiyor" */}
        {lines.map((l, i) => (
          <line
            key={`r${l.nm}`}
            ref={(el) => {
              rayRefs.current[i] = el
            }}
            className="prism-ray-gap"
            x1={Q.x}
            y1={sy(Q.y)}
          />
        ))}

        {/* Slaytın tonu: tayfın içinde tek parlak ışın */}
        <line ref={focusRef} className="prism-focus" x1={Q.x} y1={sy(Q.y)} />

        {/* Işık darbeleri: huzmede parçacık, tayfta dalga */}
        {Array.from({ length: PULSES }, (_, k) => (
          <g key={k}>
            <polygon
              ref={(el) => {
                beamPulseRefs.current[k] = el
              }}
              className="prism-pulse"
            />
            <line
              ref={(el) => {
                fanPulseRefs.current[k] = el
              }}
              className="prism-wave"
            />
          </g>
        ))}

        {/* Şerit ve üstündeki boşluklar */}
        <polygon id={stripId} ref={stripRef} fill={`url(#${gradId})`} />
        {lines.map((l, i) => (
          <line
            key={`g${l.nm}`}
            ref={(el) => {
              gapRefs.current[i] = el
            }}
            className="prism-strip-gap"
          />
        ))}

        {/* Prizma: arka yüz + derinlik kenarları, cam, içerideki yol, ön yüz */}
        <g ref={backRef}>
          <polygon
            className="prism-back"
            points={pts(TRIANGLE.map((p) => ({ x: p.x + DEPTH.x, y: p.y + DEPTH.y })))}
          />
          {[BL, BR, AP].map((p, i) => (
            <line
              key={i}
              className="prism-back"
              x1={p.x}
              y1={sy(p.y)}
              x2={p.x + DEPTH.x}
              y2={sy(p.y + DEPTH.y)}
            />
          ))}
        </g>
        <polygon ref={glassRef} className="prism-glass" points={pts(TRIANGLE)} fill={`url(#${glassId})`} />
        <line ref={innerRef} className="prism-inner" x1={P.x} y1={sy(P.y)} x2={P.x} y2={sy(P.y)} />
        <polygon ref={faceRef} className="prism-face" points={pts(TRIANGLE)} pathLength={1} />
      </svg>

      <div className="prism-labels" ref={labelsRef}>
        {labelled.map((l, i) => (
          <span
            key={l.nm}
            className="prism-label"
            ref={(el) => {
              labelRefs.current[i] = el
            }}
          >
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
