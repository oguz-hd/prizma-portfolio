import { applyTheme } from './applyTheme'
import { mixTokens } from './mix'
import { getScheme, repaint, setScheme, tokensOf, type Scheme } from './scheme'
import { reducedMotion } from '../motion'
import { getTier } from '../perf'
import './sweep.css'

/**
 * Tema geçişi: soldan sağa bir tayf bandı geçer, bandın ön kenarında dalgalanan ince bir sıvı cam
 * şerit altındaki sayfayı kırar. Renkler şerit ekranın ortasından geçerken akar. Hiçbir şey
 * kopyalanmaz: sayfa baştan sona canlı, prizma sahnesi geçiş boyunca akmaya devam eder.
 *
 * Kırılma haritası squircle kenar profili y=(1-(1-x)^4)^(1/4) ve Snell yasasından (n=1,5) üretilir.
 * `backdrop-filter: url()` yalnızca Chromium'da çalışır (WebKit 245510 açık). Yedekler sırayla:
 * kırılmasız bulanık cam (Safari/Firefox) → yalnız bant (hafif kip, azaltılmış saydamlık) →
 * anında geçiş (hareketi azalt).
 *
 * ⚠️ Kenar çizgisinin `#fff`'i kuralı 1'in bilinçli istisnası: ışığın kendisi beyaz, temaya bağlı değil.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const SKEW = -12 // derece, bant ve cam aynı eğimde
const DURATION = { full: 1700, balanced: 1300, lite: 1100 } // ms, kademeye göre
const ROWS = 30 // dalga kenarının dikey örnek sayısı
const WAVE_STEP_MS = 16 // dalga/clip-path güncelleme aralığı: 240 Hz ekranda da ~60 Hz (GPU yükü yenileme hızıyla orantılı)
const MIX_STEPS = 30 // renk karışımı adım sayısı (her karede stil yeniden hesabı olmasın)
const FILTER_ID = 'scheme-glass'

/**
 * Cam görünümü. Tüm alanlar görünümdür, mantık değil: aynı süpürme, farklı cam.
 *   width    şeridin genişliği (px)
 *   scale    kırılma gücü (feDisplacementMap)
 *   split    >0: kromatik dispersiyon, R/G/B kanalları ayrı güçte kırılır (3 geçiş, daha pahalı)
 *   tint     iç dolgu beyaz alfası [orta, ön kenar]
 *   rim      kenar çizgilerinin kalınlık çarpanı
 *   glints   dalga tepelerinde kayan parlamalar
 *   topLight kenar çizgisi yukarıdan aydınlanır (üstte parlak, altta sönük)
 */
type Look = {
  width: number
  scale: number
  split: number
  tint: [number, number]
  rim: number
  glints: boolean
  topLight: boolean
}
export const LOOKS: Record<string, Look> = {
  A: { width: 150, scale: 80, split: 0, tint: [0.04, 0.13], rim: 1, glints: false, topLight: false },
  B: { width: 210, scale: 130, split: 0, tint: [0.02, 0.2], rim: 1.3, glints: false, topLight: true },
  C: { width: 170, scale: 100, split: 0.14, tint: [0.03, 0.12], rim: 1, glints: false, topLight: true },
  D: { width: 150, scale: 90, split: 0, tint: [0.02, 0.1], rim: 1.2, glints: true, topLight: true },
  E: { width: 96, scale: 150, split: 0, tint: [0, 0.05], rim: 1.6, glints: false, topLight: true },
}
const DEFAULT_LOOK = 'A'

/** Yalnızca geliştirmede: `?glass=B` görünümü, `?hold=0.5` süpürmeyi o ilerlemede dondurur (ekran görüntüsü için). */
const devParam = (name: string): string | null =>
  import.meta.env.DEV ? new URLSearchParams(window.location.search).get(name) : null

let busy = false
let cleanupTimer = 0

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Chromium'da gerçek kırılma var mı? CSS.supports Safari'de url() için güvenilmez, UA'ya da bakılıyor. */
function canRefract(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    CSS.supports('backdrop-filter', 'url(#x)') &&
    /Chrome\//.test(navigator.userAgent)
  )
}

/** Yatay 1B kırılma haritası: R kanalı yer değiştirme, G nötr. Kenar (sağ) güçlü, iç nötr. */
function buildMap(): string {
  const W = 256
  const RIM = 0.4 // genişliğin bu kısmından sonrası kenar bölgesi
  const disp: number[] = []
  let max = 0
  for (let x = 0; x < W; x++) {
    const t = x / (W - 1)
    let d = 0
    if (t > RIM) {
      const s = Math.max(0.02, 1 - (t - RIM) / (1 - RIM)) // kenardan uzaklık: 0 dış kenar, 1 iç
      const slope = Math.pow(1 - s, 3) / Math.pow(1 - Math.pow(1 - s, 4), 0.75) // squircle eğimi
      const t1 = Math.atan(slope * 0.6)
      const t2 = Math.asin(Math.sin(t1) / 1.5) // Snell, hava → cam
      d = Math.tan(t1 - t2)
    }
    disp.push(d)
    if (d > max) max = d
  }
  const c = document.createElement('canvas')
  c.width = W
  c.height = 2
  const g = c.getContext('2d')
  if (!g) return ''
  const img = g.createImageData(W, 2)
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      img.data[i] = Math.round(128 - (disp[x] / max) * 127) // iç tarafa doğru örnekle
      img.data[i + 1] = 128
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  g.putImageData(img, 0, 0)
  return c.toDataURL('image/png')
}

let mapHref = ''

/** Görünümün kırılma filtresi, ilk kullanımda kurulur. Adı güç ve dispersiyondan türer. */
function ensureFilter(look: Look): string | null {
  if (!canRefract()) return null
  mapHref ||= buildMap()
  if (!mapHref) return null
  const id = `${FILTER_ID}-${look.scale}-${Math.round(look.split * 100)}`
  if (document.getElementById(id)) return id
  const disp = (scale: number, result: string) =>
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale.toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="${result}"/>`
  const channel = (from: string, matrix: string, result: string) =>
    `<feColorMatrix in="${from}" type="matrix" values="${matrix}" result="${result}"/>`
  const body = look.split
    ? // Üç kanal ayrı güçte kırılır: gerçek cam gibi kenarda renk ayrışır.
      disp(look.scale * (1 - look.split), 'dr') +
      channel('dr', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 'r') +
      disp(look.scale, 'dg') +
      channel('dg', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 'g') +
      disp(look.scale * (1 + look.split), 'db') +
      channel('db', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 'b') +
      '<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/>'
    : disp(look.scale, 'out')
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  svg.innerHTML =
    `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feImage href="${mapHref}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>` +
    body +
    '</filter>'
  document.body.append(svg)
  return id
}

function el(tag: string, cls: string, parent: Element): HTMLElement {
  const e = document.createElement(tag)
  e.className = cls
  parent.append(e)
  return e
}

function edgePath(pts: number[][], dx = 0): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${(p[0] + dx).toFixed(1)} ${p[1].toFixed(1)}`).join('')
}

export function sweepTo(next: Scheme): void {
  if (busy) return
  const from = getScheme()
  if (from === next) return
  if (reducedMotion()) {
    setScheme(next)
    return
  }
  busy = true

  const root = document.documentElement
  // sweep.css: tema etkileri (hale, gravür, yıldız) tek karede değil, yumuşak geçsin.
  window.clearTimeout(cleanupTimer)
  root.dataset.sweeping = ''
  const tier = getTier()
  const lite = tier === 'lite'
  const glassOk = !lite && !matchMedia('(prefers-reduced-transparency: reduce)').matches
  const look = LOOKS[devParam('glass') ?? DEFAULT_LOOK] ?? LOOKS[DEFAULT_LOOK]
  const GW = look.width
  const filterId = tier === 'full' && glassOk ? ensureFilter(look) : null // dengeli: cam var, kırılma yok
  const hold = Number(devParam('hold')) || null
  const W = innerWidth
  const H = innerHeight
  const Hh = H * 1.24
  const bandW = W * 0.34
  const A = tokensOf(from)
  const B = tokensOf(next)

  const overlay = el('div', 'scheme-sweep', document.body)
  overlay.setAttribute('aria-hidden', 'true')
  overlay.style.opacity = '0' // ilk kareye kadar (gizli sekmede uzun sürebilir) cam sol kenarda görünmesin
  const run = el('div', 'ss-run', overlay)
  run.style.height = `${Hh}px`
  run.style.top = `${-H * 0.12}px`

  const band = el('div', 'ss-band', run)
  band.style.width = `${bandW}px`
  band.style.right = `${GW * 0.2}px`
  band.style.background = `linear-gradient(90deg, ${B.accents.join(', ')})`
  if (lite) band.style.filter = 'none'

  let glass: HTMLElement | null = null
  const paths: SVGPathElement[] = []
  if (glassOk) {
    glass = el('div', 'ss-glass', run)
    glass.style.width = `${GW}px`
    glass.style.right = `${-GW * 0.25}px`
    glass.style.background = `linear-gradient(90deg, transparent, rgb(255 255 255 / ${look.tint[0]}) 55%, rgb(255 255 255 / ${look.tint[1]}))`
    const bf = `${filterId ? `url(#${filterId}) ` : 'blur(5px) '}saturate(1.7) brightness(1.1)`
    glass.style.backdropFilter = bf
    glass.style.setProperty('-webkit-backdrop-filter', bf)

    const edge = document.createElementNS(SVG_NS, 'svg')
    edge.setAttribute('class', 'ss-edge')
    edge.setAttribute('width', String(GW + 24))
    edge.setAttribute('height', String(Hh))
    edge.style.right = `${-GW * 0.25 - 12}px`
    // Alttan üste: koyu zeminde okunsun diye kontur, kromatik ayrışma (kırmızı/camgöbeği), parlak kenar.
    if (look.topLight) {
      // Işık yukarıdan: kenar üstte parlak, altta sönük (tek ışık kaynağı hissi).
      const defs = document.createElementNS(SVG_NS, 'defs')
      defs.innerHTML =
        `<linearGradient id="ss-top" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${Hh}">` +
        '<stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0.4"/></linearGradient>'
      edge.append(defs)
    }
    const layers: [string, number, number, boolean][] = [
      ['var(--ink)', 3.6 * look.rim, 0.28, false],
      [B.accents[B.accents.length - 1], 1.6, 0.8, true],
      [B.accents[2 % B.accents.length], 1.6, 0.8, true],
      [look.topLight ? 'url(#ss-top)' : '#fff', 2.2 * look.rim, 0.95, false],
    ]
    if (look.glints) layers.push(['#fff', 7, 0.5, false]) // 5. yol: dalga tepelerinde kayan parlama
    for (const [color, w, o, screen] of layers) {
      const p = document.createElementNS(SVG_NS, 'path')
      p.setAttribute('fill', 'none')
      p.setAttribute('stroke', color)
      p.setAttribute('stroke-width', String(w))
      p.setAttribute('stroke-opacity', String(o))
      p.setAttribute('stroke-linejoin', 'round')
      if (screen) p.style.mixBlendMode = 'screen'
      if (look.glints && paths.length === 4) {
        p.setAttribute('stroke-dasharray', '70 330')
        p.setAttribute('stroke-linecap', 'round')
        p.style.filter = 'blur(2px)'
      }
      edge.append(p)
      paths.push(p)
    }
    run.append(edge)
  }

  const t0 = performance.now()
  let flipped = false
  let lastStep = -1
  let lastWave = -Infinity

  const finish = () => {
    overlay.remove()
    if (!flipped) setScheme(next, false)
    repaint() // tam token'lar
    busy = false
    cleanupTimer = window.setTimeout(() => delete root.dataset.sweeping, 700) // etkilerin geçişi bitsin
  }

  const frame = (now: number): void => {
    try {
      step(now)
    } catch (err) {
      console.error(err)
      finish() // takılı kalan overlay/`busy` düğmeyi sayfa yenilenene kadar ölü bırakmasın
    }
  }

  const step = (now: number) => {
    const p = hold ?? clamp01((now - t0) / DURATION[tier])
    const lead = -GW + ease(p) * (W + GW * 2 + bandW * 0.25)
    run.style.transform = `translate3d(${lead.toFixed(1)}px,0,0) skewX(${SKEW}deg)`
    overlay.style.opacity = Math.min(1, Math.sin(Math.PI * Math.min(1, p * 1.03)) * 1.9).toFixed(3)

    if (glass && now - lastWave >= WAVE_STEP_MS) {
      lastWave = now
      const t = now / 1000
      const amp = 1 + 0.35 * Math.sin(Math.PI * p) // ortada dalgalar büyür
      const front: number[][] = []
      const back: number[][] = []
      for (let i = 0; i <= ROWS; i++) {
        const y = (i / ROWS) * Hh
        front.push([GW + amp * (9 * Math.sin(y * 0.0155 + t * 2.4) + 4.5 * Math.sin(y * 0.043 - t * 3.6)) - 8, y])
        back.push([8 + 7 * Math.sin(y * 0.012 - t * 1.8 + 1), y])
      }
      const poly = front
        .concat(back.slice().reverse())
        .map((q) => `${q[0].toFixed(1)}px ${q[1].toFixed(1)}px`)
        .join(',')
      glass.style.clipPath = `polygon(${poly})`
      // SVG kenar, cam kutusundan 12 px dışarı taşıyor: x'e +12.
      const shifted = front.map((q) => [q[0] + 12, q[1]])
      paths[0].setAttribute('d', edgePath(shifted))
      paths[1].setAttribute('d', edgePath(shifted, 1.6))
      paths[2].setAttribute('d', edgePath(shifted, -1.6))
      paths[3].setAttribute('d', edgePath(shifted))
      if (paths[4]) {
        paths[4].setAttribute('d', edgePath(shifted))
        paths[4].setAttribute('stroke-dashoffset', String(-t * 220)) // parlamalar dalgayla birlikte kayar
      }
    }

    // Renk akışı: yalnızca şerit ekranın ortasından geçerken (yaklaşık %28–72).
    const q = clamp01((lead / W - 0.28) / 0.44)
    const stepQ = Math.round(q * MIX_STEPS)
    if (stepQ !== lastStep) {
      lastStep = stepQ
      if (q > 0 && q < 1) applyTheme(mixTokens(A, B, ease(stepQ / MIX_STEPS)))
      if (q >= 0.5 && !flipped) {
        flipped = true
        setScheme(next, false) // durum + düğme simgesi; boyama karışımla sürüyor
      }
    }

    if (p < 1 || hold) requestAnimationFrame(frame)
    else finish()
  }
  requestAnimationFrame(frame)
}
