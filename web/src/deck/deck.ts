import gsap from 'gsap'
import { useSyncExternalStore } from 'react'

import { reducedMotion } from '../motion'
import { prismFocus } from '../prism/scene'

/**
 * Slayt gösterisi — sayfa kaymaz, bölümler bakılan alana GELİR.
 *
 * İçerikten bağımsız: bileşen adı, bölüm adı bilmez. Sahnedeki `[data-slide]`
 * öğelerini sırayla slayt sayar. İçerik yazarının işaretleri:
 *   data-slide           bir slayt (id'si bağlantı hedefi: #projeler)
 *   data-slide-scroll    slaytın kendi kaydırıcısı (taşan içerik burada kayar)
 *   data-slide-focus     klavyeyle/bağlantıyla gelinince odak buraya (başlık)
 *   data-reveal          geçişte kademeli giren/çıkan blok
 *   data-reveal-panel    geçişte yalnızca solup beliren kap (cam panel)
 *   data-prism="bright"  bu slaytta prizma kısılmaz (giriş)
 *
 * Durum öznitelikleri (data-state, inert, aria-hidden) JSX'te YOK, burada
 * yazılıyor — React aynı değerleri render etmediği için dil değişiminde ezmiyor.
 *
 * ★ Navigasyon animasyondan bağımsız (trex-portfolio kural 6'nın karşılığı):
 * slayt durumu geçişin BAŞINDA değişir; animasyon yalnızca görsel. Sekme
 * arkadayken rAF dursa bile emniyet zamanlayıcısı geçişi bitirir.
 */

type History = 'push' | 'replace' | 'none'
type GoOpts = { history?: History; focus?: boolean }

const OUT = 0.35
const IN = 0.6
const SHIFT = 28

/** Tekerlek: bu kadar birikmeden slayt değişmez (trackpad'in küçük dokunuşları). */
const THRESHOLD = 30
/** Tekerlek akışında bu kadar ms sessizlik olmadan yeni hareket sayılmaz (atalet). */
const GAP = 140
/** Dokunmatik: bu kadar px kaydırma bir slayt. */
const SWIPE = 48

let slides: HTMLElement[] = []
let index = 0
let busy = false
let pending: { index: number; opts: GoOpts } | null = null
let current: gsap.core.Timeline | null = null
let safety = 0
/** Girdi bu ana kadar kilitli (açılış sırasında sonsuz). Bağlantı tıklaması kilitten muaf. */
let lockedUntil = 0

const listeners = new Set<() => void>()

/* ── React tarafı ──────────────────────────────────────────────────────────── */

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useSlideIndex(): number {
  return useSyncExternalStore(subscribe, () => index, () => 0)
}

/* ── Yardımcılar ───────────────────────────────────────────────────────────── */

const scrollerOf = (slide: HTMLElement | undefined) =>
  slide?.querySelector<HTMLElement>('[data-slide-scroll]') ?? null

function canScroll(el: HTMLElement | null, dir: number): boolean {
  if (!el) return false
  return dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0
}

const blocks = (slide: HTMLElement) => [...slide.querySelectorAll<HTMLElement>('[data-reveal]')]
const panels = (slide: HTMLElement) => [...slide.querySelectorAll<HTMLElement>('[data-reveal-panel]')]

function setState(slide: HTMLElement, state: 'active' | 'leaving' | null) {
  if (state) slide.dataset.state = state
  else delete slide.dataset.state
  const hidden = state !== 'active'
  slide.inert = hidden
  if (hidden) slide.setAttribute('aria-hidden', 'true')
  else slide.removeAttribute('aria-hidden')
}

function indexFromHash(): number | null {
  const id = decodeURIComponent(window.location.hash.slice(1))
  if (!id) return null
  const i = slides.findIndex((s) => s.id === id)
  return i >= 0 ? i : null
}

function writeHistory(mode: History) {
  if (mode === 'none') return
  // Giriş slaytı adreste görünmesin: kök adres = giriş.
  const url =
    index === 0 ? window.location.pathname + window.location.search : `#${slides[index].id}`
  if (mode === 'push') window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)
}

function focusSlide(slide: HTMLElement) {
  slide.querySelector<HTMLElement>('[data-slide-focus]')?.focus({ preventScroll: true })
}

function syncShared() {
  listeners.forEach((fn) => fn())
}

/* ── Geçiş ─────────────────────────────────────────────────────────────────── */

export function goTo(target: number, opts: GoOpts = {}): void {
  if (!slides.length) return
  const next = Math.max(0, Math.min(slides.length - 1, target))
  if (busy) {
    pending = { index: next, opts }
    return
  }
  if (next === index) {
    if (opts.focus) focusSlide(slides[index])
    return
  }

  const from = slides[index]
  const to = slides[next]
  const dir = next > index ? 1 : -1
  index = next
  writeHistory(opts.history ?? 'replace')
  syncShared()
  prismFocus(index, slides.length, to.dataset.prism === 'bright')

  // Aşağıdan gelinen uzun slayt dibinden, yukarıdan gelinen tepesinden açılır —
  // okuma kesintisiz sürsün. Bağlantıyla atlanınca her zaman tepesi.
  const sc = scrollerOf(to)
  if (sc) sc.scrollTop = dir < 0 && !opts.focus ? sc.scrollHeight : 0

  const outEls = blocks(from)
  const outPanels = panels(from)
  const inEls = blocks(to)
  const inPanels = panels(to)

  setState(from, 'leaving')
  setState(to, 'active')
  if (opts.focus) focusSlide(to)

  if (reducedMotion()) {
    setState(from, null)
    return
  }

  busy = true
  if (inEls.length) gsap.set(inEls, { opacity: 0, y: SHIFT * dir })
  if (inPanels.length) gsap.set(inPanels, { opacity: 0 })

  const done = () => {
    if (!busy) return
    busy = false
    current = null
    window.clearTimeout(safety)
    setState(from, null)
    const touched = [...outEls, ...outPanels, ...inEls, ...inPanels]
    if (touched.length) gsap.set(touched, { clearProps: 'opacity,transform' })
    if (pending) {
      const p = pending
      pending = null
      goTo(p.index, p.opts)
    }
  }

  // Giriş slaytında cam panel yok: boş listeye tween kurulursa GSAP konsola uyarı basıyor.
  const tl = gsap.timeline({ onComplete: done, onInterrupt: done })
  if (outEls.length)
    tl.to(outEls, { opacity: 0, y: -SHIFT * dir, duration: OUT, ease: 'power2.in', stagger: 0.02 }, 0)
  if (outPanels.length) tl.to(outPanels, { opacity: 0, duration: OUT, ease: 'power1.in' }, 0.1)
  if (inPanels.length) tl.to(inPanels, { opacity: 1, duration: IN, ease: 'power2.out' }, OUT * 0.6)
  if (inEls.length)
    tl.to(inEls, { opacity: 1, y: 0, duration: IN, ease: 'power3.out', stagger: 0.06 }, OUT * 0.7)
  current = tl

  // rAF durursa (sekme arkada) geçiş askıda kalmasın — setTimeout arkada da çalışır.
  safety = window.setTimeout(() => current?.progress(1), 2500)
}

/* ── Açılışla el sıkışma ───────────────────────────────────────────────────── */

export function lockDeck(): void {
  lockedUntil = Infinity
}

/** Açılış bitti. Kısa bir süre daha kilitli: açılışı atlayan tuş/tekerlek slayt da değiştirmesin. */
export function unlockDeck(cooldown: number): void {
  lockedUntil = performance.now() + cooldown
  needGap = true
}

/* ── Girdi ─────────────────────────────────────────────────────────────────── */

let acc = 0
let lastWheel = 0
let innerAt = 0
let needGap = false

function onWheel(e: WheelEvent) {
  if (e.ctrlKey) return // yakınlaştırma
  const now = performance.now()
  const gap = now - lastWheel
  lastWheel = now

  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
  const dy = e.deltaY * unit
  if (dy === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  const dir = dy > 0 ? 1 : -1

  // Slaytın içi bu yönde kayabiliyorsa önce o kayar.
  const sc = scrollerOf(slides[index])
  if (!busy && canScroll(sc, dir)) {
    innerAt = now
    // İmleç kaydırıcının dışındaysa (üst çubuk, ray) tarayıcı kaydırmaz — elle.
    if (!sc!.contains(e.target as Node)) {
      e.preventDefault()
      sc!.scrollTop += dy
    }
    return
  }

  e.preventDefault()
  if (busy || now < lockedUntil) {
    needGap = true
    return
  }
  // İçerik kenara yeni dayandıysa ataletin kalanı slaytı değiştirmesin.
  if (now - innerAt < 250) needGap = true
  if (needGap) {
    if (gap < GAP) return
    needGap = false
  }
  if (gap > 200) acc = 0
  acc += dy
  if (Math.abs(acc) < THRESHOLD) return
  acc = 0
  needGap = true
  goTo(index + dir)
}

let touchY = 0
let touchX = 0
let touchCan = { up: false, down: false }
let touching = false

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) {
    touching = false
    return
  }
  touching = true
  touchY = e.touches[0].clientY
  touchX = e.touches[0].clientX
  const sc = scrollerOf(slides[index])
  touchCan = { up: canScroll(sc, -1), down: canScroll(sc, 1) }
}

function onTouchEnd(e: TouchEvent) {
  if (!touching) return
  touching = false
  const t = e.changedTouches[0]
  const dy = touchY - t.clientY
  if (Math.abs(dy) < SWIPE || Math.abs(t.clientX - touchX) > Math.abs(dy)) return
  const dir = dy > 0 ? 1 : -1
  // Parmak kalktığında içerik o yöne hâlâ kayabiliyorduysa bu bir içerik kaydırmasıydı.
  if (dir > 0 ? touchCan.down : touchCan.up) return
  if (busy || performance.now() < lockedUntil) return
  goTo(index + dir)
}

function onKey(e: KeyboardEvent) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
  const el = e.target instanceof HTMLElement ? e.target : null
  if (el?.closest('input, textarea, select, [contenteditable="true"]')) return

  const sc = scrollerOf(slides[index])
  const page = (sc?.clientHeight ?? window.innerHeight) * 0.85
  let dir = 0
  let step = 0
  let jump: number | null = null
  switch (e.key) {
    case 'ArrowDown':
      dir = 1
      step = 80
      break
    case 'ArrowUp':
      dir = -1
      step = 80
      break
    case 'PageDown':
      dir = 1
      step = page
      break
    case 'PageUp':
      dir = -1
      step = page
      break
    case ' ':
      // Odaktaki düğme/bağlantı için boşluk onun işi.
      if (el?.closest('a, button')) return
      dir = e.shiftKey ? -1 : 1
      step = page
      break
    case 'Home':
      jump = 0
      break
    case 'End':
      jump = slides.length - 1
      break
    default:
      return
  }
  e.preventDefault()
  if (performance.now() < lockedUntil) return

  if (jump !== null) {
    goTo(jump, { focus: true })
    return
  }
  if (canScroll(sc, dir)) {
    sc!.scrollBy({ top: dir * step, behavior: reducedMotion() ? 'auto' : 'smooth' })
    return
  }
  if (e.repeat || busy) return
  goTo(index + dir, { focus: true })
}

/** Sayfadaki HER `#slayt` bağlantısı — nav, ray, "başa dön". Özel kod yok. */
function onClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return
  const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null
  if (!a) return
  const id = decodeURIComponent(a.getAttribute('href')!.slice(1))
  const i = slides.findIndex((s) => s.id === id)
  if (i < 0) return
  e.preventDefault()
  goTo(i, { history: 'push', focus: true })
}

function onPop() {
  goTo(indexFromHash() ?? 0, { history: 'none' })
}

/* ── Kurulum ───────────────────────────────────────────────────────────────── */

export function initDeck(root: HTMLElement): () => void {
  slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')]
  index = indexFromHash() ?? 0
  slides.forEach((s, i) => setState(s, i === index ? 'active' : null))
  prismFocus(index, slides.length, slides[index]?.dataset.prism === 'bright', true)
  syncShared()

  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('keydown', onKey)
  document.addEventListener('click', onClick)
  window.addEventListener('popstate', onPop)

  return () => {
    current?.progress(1)
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('keydown', onKey)
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onPop)
  }
}
