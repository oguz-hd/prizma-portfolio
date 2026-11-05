import { applyTheme } from './applyTheme'
import { mixTokens } from './mix'
import { getScheme, repaint, setScheme, tokensOf, type Scheme } from './scheme'
import { reducedMotion } from '../motion'
import './sweep.css'

/**
 * Tema geçişi: ışık süpürmesi + sıvı cam ucu (Oğuz seçimi G3, 05.11.2026).
 *
 * Soldan sağa bir tayf bandı geçer; bandın ön kenarında, dalgalanan ince bir sıvı cam
 * şerit altındaki sayfayı kırar. Renkler şerit ekranın ortasından geçerken akar.
 * View Transitions'ın eski-görüntü donmasından kaçınmak için hiçbir şey kopyalanmıyor:
 * sayfa baştan sona canlı, prizma sahnesi geçiş boyunca akmaya devam ediyor.
 *
 * Kırılma haritası kube.io'daki yöntemin kendi uygulaması: squircle kenar profili
 * y=(1-(1-x)^4)^(1/4) ve Snell yasası (n=1,5). Kod kopyalanmadı, formülden yazıldı.
 * `backdrop-filter: url()` yalnızca Chromium'da çalışır (WebKit 245510 açık). Yedekler:
 * kırılmasız bulanık cam (Safari/Firefox) → yalnız bant (hafif kip) → anında geçiş
 * (hareketi azalt).
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const GLASS_W = 150 // px, cam şeridin genişliği
const SKEW = -12 // derece, bant ve cam aynı eğimde
const DURATION = 1700 // ms
const ROWS = 30 // dalga kenarının dikey örnek sayısı
const FILTER_ID = 'scheme-glass'

let busy = false
let filterReady = false

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Chromium'da gerçek kırılma var mı? CSS.supports Safari'de url() için güvenilmez, UA'ya da bakılıyor. */
function canRefract(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    CSS.supports('backdrop-filter', `url(#${FILTER_ID})`) &&
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

function ensureFilter(): boolean {
  if (filterReady) return true
  if (!canRefract()) return false
  const href = buildMap()
  if (!href) return false
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  svg.innerHTML =
    `<filter id="${FILTER_ID}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feImage href="${href}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="80" xChannelSelector="R" yChannelSelector="G"/></filter>`
  document.body.append(svg)
  filterReady = true
  return true
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
  root.dataset.sweeping = '' // light.css/sweep.css: etkiler (hale, gravür, yıldız) tek karede değil, yumuşak geçsin
  const lite = 'lite' in root.dataset
  const glassOk = !lite
  const refract = glassOk && ensureFilter()
  const W = innerWidth
  const H = innerHeight
  const Hh = H * 1.24
  const bandW = W * 0.34
  const A = tokensOf(from)
  const B = tokensOf(next)

  const overlay = el('div', 'scheme-sweep', document.body)
  overlay.setAttribute('aria-hidden', 'true')
  const run = el('div', 'ss-run', overlay)
  run.style.height = `${Hh}px`
  run.style.top = `${-H * 0.12}px`

  const band = el('div', 'ss-band', run)
  band.style.width = `${bandW}px`
  band.style.right = `${GLASS_W * 0.2}px`
  band.style.mixBlendMode = from === 'dark' ? 'screen' : 'multiply'
  band.style.background = `linear-gradient(90deg, ${B.accents.join(', ')})`
  if (lite) band.style.filter = 'none'

  let glass: HTMLElement | null = null
  const paths: SVGPathElement[] = []
  if (glassOk) {
    glass = el('div', 'ss-glass', run)
    glass.style.width = `${GLASS_W}px`
    glass.style.right = `${-GLASS_W * 0.25}px`
    const bf = `${refract ? `url(#${FILTER_ID}) ` : ''}blur(${refract ? 1 : 5}px) saturate(1.7) brightness(1.1)`
    glass.style.backdropFilter = bf
    glass.style.setProperty('-webkit-backdrop-filter', bf)

    const edge = document.createElementNS(SVG_NS, 'svg')
    edge.setAttribute('class', 'ss-edge')
    edge.setAttribute('width', String(GLASS_W + 24))
    edge.setAttribute('height', String(Hh))
    edge.style.right = `${-GLASS_W * 0.25 - 12}px`
    // Alttan üste: koyu zeminde okunsun diye kontur, kromatik ayrışma (kırmızı/camgöbeği), parlak kenar.
    const layers: [string, number, number, boolean][] = [
      ['var(--ink)', 3.6, 0.28, false],
      [B.accents[B.accents.length - 1], 1.6, 0.8, true],
      [B.accents[2 % B.accents.length], 1.6, 0.8, true],
      ['#fff', 2.2, 0.95, false],
    ]
    for (const [color, w, o, screen] of layers) {
      const p = document.createElementNS(SVG_NS, 'path')
      p.setAttribute('fill', 'none')
      p.setAttribute('stroke', color)
      p.setAttribute('stroke-width', String(w))
      p.setAttribute('stroke-opacity', String(o))
      p.setAttribute('stroke-linejoin', 'round')
      if (screen) p.style.mixBlendMode = 'screen'
      edge.append(p)
      paths.push(p)
    }
    run.append(edge)
  }

  const t0 = performance.now()
  let flipped = false
  let lastQ = -1

  const frame = (now: number) => {
    const p = clamp01((now - t0) / DURATION)
    const lead = -GLASS_W + ease(p) * (W + GLASS_W * 2 + bandW * 0.25)
    run.style.transform = `translate3d(${lead.toFixed(1)}px,0,0) skewX(${SKEW}deg)`
    overlay.style.opacity = Math.min(1, Math.sin(Math.PI * Math.min(1, p * 1.03)) * 1.9).toFixed(3)

    if (glass) {
      const t = now / 1000
      const amp = 1 + 0.35 * Math.sin(Math.PI * p) // ortada dalgalar büyür
      const front: number[][] = []
      const back: number[][] = []
      for (let i = 0; i <= ROWS; i++) {
        const y = (i / ROWS) * Hh
        front.push([GLASS_W + amp * (9 * Math.sin(y * 0.0155 + t * 2.4) + 4.5 * Math.sin(y * 0.043 - t * 3.6)) - 8, y])
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
    }

    // Renk akışı: yalnızca şerit ekranın ortasından geçerken (yaklaşık %28–72).
    const q = clamp01((lead / W - 0.28) / 0.44)
    if (q !== lastQ) {
      lastQ = q
      if (q > 0 && q < 1) applyTheme(mixTokens(A, B, ease(q)))
      if (q >= 0.5 && !flipped) {
        flipped = true
        setScheme(next, false) // durum + düğme simgesi; boyama karışımla sürüyor
      }
    }

    if (p < 1) requestAnimationFrame(frame)
    else {
      overlay.remove()
      if (!flipped) setScheme(next, false)
      repaint() // tam token'lar
      busy = false
      setTimeout(() => delete root.dataset.sweeping, 700) // etkilerin geçişi bitsin
    }
  }
  requestAnimationFrame(frame)
}
