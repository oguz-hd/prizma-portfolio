import { reducedMotion } from './motion'
import { accentCount } from './prism/scene'

/**
 * Harf çözülmesi — her harf bir süre Katakana karakterlerinden geçip doğru
 * harfe oturur; dönen harfler tayfın tonlarından akar (Oturum 3, kullanıcı
 * seçimi: örnek sayfasındaki A7 "Katakana yağmuru" + A5 "tayf renkli").
 * Açılışta ve dil geçişinde çalışıyor.
 *
 * Yalnızca Departure Mono'daki metin çözülür: tek aralıklı olduğu için harfler
 * dönerken satır kıpırdamıyor. Düzyazı (Atkinson) orantılı — orada satır
 * titrerdi; onu çağıran taraf soldurarak değiştiriyor (`proseOf`).
 *
 * ⚠️ Metnin sahibi React. Metin düğümüne yalnızca `nodeValue` yazılıyor (React
 * de güncellerken bunu yapıyor); animasyon süresince düğüm boşalıyor ve yanına
 * geçici harf öğeleri konuyor, bitince kalkıyor ve düğüm son metne dönüyor.
 * React'in tuttuğu referans hiç değişmiyor.
 *
 * Katakana'da Departure Mono yok, yedek fontla çiziliyor ve genişliği farklı:
 *   HTML → dönen harf, gerçek harfin genişliğinde bir kutuda (ölçülüyor)
 *   SVG  → yay metninin boyu `textLength` ile sabitleniyor (isim zaten sabit)
 */

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン'
const TICK = 45
const SVG_NS = 'http://www.w3.org/2000/svg'

type Unit = {
  node: Text
  from: string
  to: string
  /** Geçici harf öğelerinin kabı (node'un hemen ardında). */
  box: Element
  chars: Element[]
  /** [başla, bitir] ms — öncesi eski harf, arası Katakana, sonrası yeni harf. */
  plan: [number, number][]
  /** Dönen harfin kutu genişliği (HTML). SVG'de null. */
  advance: number | null
}

/** Önceki metinler: kök → Departure Mono metin düğümlerinin değerleri + yay boyları. */
export type Snapshot = Map<Element, { texts: string[]; lengths: Map<Element, number> }>

const running = new Set<() => void>()

const isMono = (el: Element) => getComputedStyle(el).fontFamily.includes('Departure Mono')
const rnd = () => KATAKANA[(Math.random() * KATAKANA.length) | 0]

function textNodes(root: Element, mono: boolean): Text[] {
  const out: Text[] = []
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const parent = n.parentElement
    if (!parent || !n.nodeValue?.trim() || parent.closest('.sr-only')) continue
    if (isMono(parent) === mono) out.push(n as Text)
  }
  return out
}

/** Yay metinleri: kendi `textLength`'i olmayan textPath'ler (isimde React koyuyor). */
function freePaths(root: Element): Element[] {
  return [...root.querySelectorAll('textPath')].filter((p) => !p.hasAttribute('textLength'))
}

const pathLength = (p: Element) => (p as SVGTextContentElement).getComputedTextLength()

/** Dil değişmeden ÖNCE çağrılır — önce `settleScramble()`: süren çözülmede düğümler boş. */
export function snapshot(roots: Element[]): Snapshot {
  const snap: Snapshot = new Map()
  for (const r of roots) {
    snap.set(r, {
      texts: textNodes(r, true).map((n) => n.nodeValue ?? ''),
      lengths: new Map(freePaths(r).map((p) => [p, pathLength(p)])),
    })
  }
  return snap
}

/** Köklerin içindeki düzyazı blokları — çağıran taraf bunları soldurarak değiştirir. */
export function proseOf(roots: Element[]): HTMLElement[] {
  const set = new Set<HTMLElement>()
  roots.forEach((r) => textNodes(r, false).forEach((n) => set.add(n.parentElement!)))
  return [...set]
}

/** Süren bütün çözülmeleri son karesine getir (açılış atlatılınca). */
export function settleScramble(): void {
  ;[...running].forEach((end) => end())
}

/**
 * Kökleri çöz. `from` verilirse eski metinden yenisine (dil geçişi); verilmezse
 * her harf baştan Katakana'dır ve yerine oturur (açılış).
 * `stagger`: sonraki kök bu kadar ms geç başlar.
 */
export function scramble(
  roots: Element[],
  { from, duration = 800, stagger = 0 }: { from?: Snapshot; duration?: number; stagger?: number } = {},
): void {
  if (reducedMotion() || !roots.length) return

  const units: Unit[] = []
  const locks: { path: Element; a: number; b: number }[] = []

  roots.forEach((root, ri) => {
    const nodes = textNodes(root, true)
    const prev = from?.get(root)
    const paired = prev && prev.texts.length === nodes.length
    const offset = ri * stagger

    freePaths(root).forEach((path) => {
      const b = pathLength(path)
      locks.push({ path, a: prev?.lengths.get(path) ?? b, b })
    })

    nodes.forEach((node, ni) => {
      const to = node.nodeValue ?? ''
      const old = from ? (paired ? prev!.texts[ni] : '') : null
      const n = Math.max(to.length, old?.length ?? 0)
      const parent = node.parentElement!
      const svg = parent.namespaceURI === SVG_NS
      const make = () => (svg ? document.createElementNS(SVG_NS, 'tspan') : document.createElement('span'))

      const box = make()
      box.setAttribute('aria-hidden', 'true')
      box.setAttribute('data-scramble', '')
      const chars = Array.from({ length: n }, () => box.appendChild(make()))

      units.push({
        node,
        from: old ?? '',
        to,
        box,
        chars,
        advance: svg ? null : measure(parent),
        plan: Array.from({ length: n }, () => {
          // Dil geçişinde eski harf bir an kalır; açılışta her harf baştan döner.
          const s = offset + (old === null ? 0 : Math.random() * duration * 0.25)
          return [s, s + duration * (0.35 + Math.random() * 0.65)]
        }),
      })
    })
  })

  const total = units.length ? duration + (roots.length - 1) * stagger : 0
  if (!total) return

  // Yerleştir: React'in düğümü boşalır, geçici harfler hemen ardında.
  units.forEach((u) => {
    u.node.after(u.box)
    u.node.nodeValue = ''
  })

  const tones = accentCount()
  const count = units.reduce((s, u) => s + u.chars.length, 0) || 1
  let lastTick = -1
  let raf = 0
  let finished = false
  const t0 = performance.now()

  const end = () => {
    if (finished) return
    finished = true
    running.delete(end)
    cancelAnimationFrame(raf)
    window.clearTimeout(safety)
    units.forEach((u) => {
      u.box.remove()
      u.node.nodeValue = u.to
    })
    locks.forEach(({ path }) => {
      path.removeAttribute('textLength')
      path.removeAttribute('lengthAdjust')
    })
  }

  const frame = (now: number) => {
    const t = now - t0
    if (t >= total) return end()
    const tick = Math.floor(t / TICK)
    if (tick !== lastTick) {
      lastTick = tick
      draw(t)
    }
    raf = requestAnimationFrame(frame)
  }

  function draw(t: number) {
    const p = Math.min(1, t / total)
    locks.forEach(({ path, a, b }) => {
      path.setAttribute('textLength', String(a + (b - a) * p))
      path.setAttribute('lengthAdjust', 'spacingAndGlyphs')
    })
    let g = 0
    for (const u of units) {
      u.chars.forEach((el, i) => {
        const [s, e] = u.plan[i]
        const a = u.from[i] ?? ''
        const b = u.to[i] ?? ''
        g++
        if (t >= e || (a === ' ' && b === ' ') || (b === ' ' && t >= s)) {
          show(el, b, null, u.advance)
        } else if (t < s) {
          show(el, a, null, u.advance)
        } else {
          // Ton: harfin konumu + zaman — tayf metnin üstünden akıyor.
          const k = 1 + (Math.floor((g / count) * tones + t / 90) % tones)
          show(el, rnd(), `var(--accent-${k})`, u.advance)
        }
      })
    }
  }

  running.add(end)
  draw(0)
  raf = requestAnimationFrame(frame)
  // rAF durursa (sekme arkada) metin yarım kalmasın.
  const safety = window.setTimeout(end, total + 500)
}

/** Bir harfin gerçek genişliği (harf aralığı dahil) — dönen harfin kutusu bu. */
function measure(parent: HTMLElement): number {
  const probe = document.createElement('span')
  probe.textContent = 'MMMMMMMMMM'
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre'
  parent.appendChild(probe)
  const w = probe.getBoundingClientRect().width / 10
  probe.remove()
  return w
}

function show(el: Element, ch: string, color: string | null, advance: number | null) {
  if (el.textContent !== ch) el.textContent = ch
  const s = (el as HTMLElement | SVGElement).style
  if (advance === null) {
    s.fill = color ?? ''
  } else {
    s.color = color ?? ''
    // Dönen harf yedek fontta: gerçek harfin kutusunda dursun, satır kıpırdamasın.
    const boxed = color !== null
    s.display = boxed ? 'inline-block' : ''
    s.width = boxed ? `${advance}px` : ''
    s.textAlign = boxed ? 'center' : ''
    // Katakana tam genişlik (1em), Departure Mono ~0.65em: küçülmezse komşuya biniyor.
    s.fontSize = boxed ? '0.72em' : ''
  }
}
