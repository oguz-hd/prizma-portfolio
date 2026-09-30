import gsap from 'gsap'
import { useSyncExternalStore } from 'react'

import { reducedMotion } from '../motion'
import { prismFocus } from '../prism/scene'
import { firstVisibleUnit, pageCount, pageOf, pageOfUnit, paginate, setPage } from './paginate'

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
 *   data-page-unit       ekrana sığmayan slayt bu birimlerle alt sayfalara bölünür
 *                        (paginate.ts). Her hareket bir adım: önce sonraki sayfa,
 *                        sonra sonraki slayt.
 *
 * Durum öznitelikleri (data-state, inert, aria-hidden) JSX'te YOK, burada
 * yazılıyor — React aynı değerleri render etmediği için dil değişiminde ezmiyor.
 *
 * ★ Navigasyon animasyondan bağımsız (trex-portfolio kural 6'nın karşılığı):
 * slayt durumu geçişin BAŞINDA değişir; animasyon yalnızca görsel. Sekme
 * arkadayken rAF dursa bile emniyet zamanlayıcısı geçişi bitirir.
 */

type History = 'push' | 'replace' | 'none'
/** `atEnd`: hedef slayt son sayfasından / dibinden açılsın (geri adım). */
type GoOpts = { history?: History; focus?: boolean; atEnd?: boolean }

const OUT = 0.35
const IN = 0.6
const SHIFT = 28

/** Tekerlek: bu kadar birikmeden slayt değişmez (trackpad'in küçük dokunuşları). */
const THRESHOLD = 30
/** Tekerlek akışında bu kadar ms sessizlik olmadan yeni hareket sayılmaz (atalet). */
const GAP = 140
/** Dokunmatik: bu kadar px kaydırma bir slayt. */
const SWIPE = 48
/**
 * Geçiş sürerken yeni bir hareket gelirse: sıraya girer, süren geçiş bu kat
 * hızlanır. Önceden bu hareket yutuluyordu — normal hızda kaydıran kullanıcı
 * her slayt için iki kez kaydırmak zorunda kalıyordu (Oturum 3, ölçüldü).
 */
const RUSH = 3
/**
 * Bu kadar px'lik taşma "kayabilir" sayılmaz. İletişim 390×844'te 4 px
 * taşıyordu; o 4 px'i kaydırmak bir hareketi yutuyordu (ölçüldü).
 */
const SLACK = 8

let slides: HTMLElement[] = []
let index = 0
let busy = false
/** Geçiş sürerken gelen hareket — geçiş bitince çalışır. */
let pending: (() => void) | null = null
/** Geçiş sürerken istenen yeniden bölme — geçiş bitince yapılır. */
let repaginateLater = false
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

/** Etkin slaytın alt sayfaları — ray bunları kısa çizgilerle gösteriyor (A1). */
export type SlidePages = { count: number; page: number }
const NO_PAGES: SlidePages = { count: 1, page: 0 }
let pages: SlidePages = NO_PAGES

export function useSlidePages(): SlidePages {
  return useSyncExternalStore(subscribe, () => pages, () => NO_PAGES)
}

/* ── Yardımcılar ───────────────────────────────────────────────────────────── */

const scrollerOf = (slide: HTMLElement | undefined) =>
  slide?.querySelector<HTMLElement>('[data-slide-scroll]') ?? null

function canScroll(el: HTMLElement | null, dir: number): boolean {
  if (!el) return false
  if (el.scrollHeight - el.clientHeight <= SLACK) return false
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
  // Aynı değerde aynı nesne kalsın: useSyncExternalStore her yeni nesnede çizer.
  const slide = slides[index]
  const count = pageCount(slide)
  const page = pageOf(slide)
  if (count !== pages.count || page !== pages.page) pages = count > 1 ? { count, page } : NO_PAGES
  listeners.forEach((fn) => fn())
}

/* ── Geçiş ─────────────────────────────────────────────────────────────────── */

function goTo(target: number, opts: GoOpts = {}): void {
  if (!slides.length) return
  const next = Math.max(0, Math.min(slides.length - 1, target))
  if (busy) {
    if (next === index) return
    pending = () => goTo(next, opts)
    current?.timeScale(RUSH)
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
  prismFocus(index, slides.length, to.dataset.prism === 'bright')

  // Aşağıdan gelinen uzun slayt son sayfasından/dibinden, yukarıdan gelinen
  // tepesinden açılır — okuma kesintisiz sürsün. Bağlantıyla atlanınca tepesi.
  const atEnd = opts.atEnd ?? (dir < 0 && !opts.focus)
  setPage(to, atEnd ? -1 : 0)
  syncShared()
  const sc = scrollerOf(to)
  if (sc) sc.scrollTop = atEnd ? sc.scrollHeight : 0

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
    setState(from, null)
    const touched = [...outEls, ...outPanels, ...inEls, ...inPanels]
    if (touched.length) gsap.set(touched, { clearProps: 'opacity,transform' })
    settle()
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

/** Geçiş bitti: kilidi aç, bekleyen bölmeyi ve hareketi çalıştır. */
function settle() {
  busy = false
  current = null
  window.clearTimeout(safety)
  if (repaginateLater) repaginate()
  if (pending) {
    const p = pending
    pending = null
    p()
  }
}

/**
 * Aynı slaytın başka sayfasına geç. Bloklar slayt geçişindeki gibi çıkar;
 * ortada (hepsi saydamken) sayfa değişir, sonra yeni birimlerle girer.
 * Bloklar (`data-reveal`) iki sayfada da aynı kaplar — değişen içleri.
 */
function turnPage(page: number, dir: number, opts: GoOpts) {
  const slide = slides[index]
  const els = blocks(slide)
  const flip = () => {
    setPage(slide, page)
    syncShared()
    const sc = scrollerOf(slide)
    if (sc) sc.scrollTop = 0
    if (opts.focus) focusSlide(slide)
  }

  if (reducedMotion() || !els.length) {
    flip()
    return
  }

  busy = true
  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(els, { clearProps: 'opacity,transform' })
      settle()
    },
    onInterrupt: () => settle(),
  })
  tl.to(els, { opacity: 0, y: -SHIFT * dir, duration: OUT, ease: 'power2.in', stagger: 0.02 }, 0)
  tl.call(flip, [], OUT + 0.02)
  tl.fromTo(
    els,
    { opacity: 0, y: SHIFT * dir },
    { opacity: 1, y: 0, duration: IN, ease: 'power3.out', stagger: 0.06, immediateRender: false },
    OUT + 0.04,
  )
  current = tl
  safety = window.setTimeout(() => current?.progress(1), 2500)
}

/** Bir hareket: slaytın sonraki/önceki sayfası, yoksa sonraki/önceki slayt. */
function step(dir: number, opts: GoOpts = {}) {
  if (busy) {
    pending = () => step(dir, opts)
    current?.timeScale(RUSH)
    return
  }
  const slide = slides[index]
  const page = pageOf(slide) + dir
  if (page >= 0 && page < pageCount(slide)) turnPage(page, dir, opts)
  else goTo(index + dir, { ...opts, atEnd: dir < 0 })
}

/**
 * Bütün slaytları yeniden böl (boyut, font ya da metin değişti). Etkin slaytta
 * okuyucu aynı birimde kalır. Geçiş sürerken ertelenir — kaplar animasyonda.
 */
function repaginate() {
  if (busy) {
    repaginateLater = true
    return
  }
  repaginateLater = false
  const active = slides[index]
  const anchor = active ? firstVisibleUnit(active) : null
  slides.forEach((s) => paginate(s))
  if (active) setPage(active, pageOfUnit(active, anchor))
  syncShared()
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
  if (now < lockedUntil) {
    needGap = true
    return
  }
  // İçerik kenara yeni dayandıysa ataletin kalanı slaytı değiştirmesin.
  // Geçiş sürerken de yalnızca YENİ hareket sayılır: ataletin kuyruğu (aralıksız
  // olay akışı) geçmez, sessizlikten sonra gelen tekerlek sıraya girer.
  if (busy || now - innerAt < 250) needGap = true
  if (needGap) {
    if (gap < GAP) return
    needGap = false
  }
  if (gap > 200) acc = 0
  acc += dy
  if (Math.abs(acc) < THRESHOLD) return
  acc = 0
  needGap = true
  step(dir)
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
  if (performance.now() < lockedUntil) return
  step(dir)
}

function onKey(e: KeyboardEvent) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
  const el = e.target instanceof HTMLElement ? e.target : null
  if (el?.closest('input, textarea, select, [contenteditable="true"]')) return

  const sc = scrollerOf(slides[index])
  const page = (sc?.clientHeight ?? window.innerHeight) * 0.85
  let dir = 0
  // `step` değil: aynı adlı fonksiyonu (sonraki sayfa/slayt) gölgeliyordu.
  let amount = 0
  let jump: number | null = null
  switch (e.key) {
    case 'ArrowDown':
      dir = 1
      amount = 80
      break
    case 'ArrowUp':
      dir = -1
      amount = 80
      break
    case 'PageDown':
      dir = 1
      amount = page
      break
    case 'PageUp':
      dir = -1
      amount = page
      break
    case ' ':
      // Odaktaki düğme/bağlantı için boşluk onun işi.
      if (el?.closest('a, button')) return
      dir = e.shiftKey ? -1 : 1
      amount = page
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
    sc!.scrollBy({ top: dir * amount, behavior: reducedMotion() ? 'auto' : 'smooth' })
    return
  }
  if (e.repeat) return
  step(dir, { focus: true })
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

  // Bölme: şimdi, font gelince, pencere değişince ve metin değişince (dil,
  // harf çözülmesi bitince). Gözlemci öznitelikleri izlemiyor — bölmenin kendi
  // yazdıkları onu yeniden tetiklemesin. Çözülme her 45 ms'de metin yazıyor;
  // bekleme süresi onun bitmesini bekliyor.
  repaginate()
  let timer = 0
  const later = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(repaginate, 180)
  }
  document.fonts?.ready.then(repaginate)
  window.addEventListener('resize', later)
  const mo = new MutationObserver(later)
  mo.observe(root, { childList: true, characterData: true, subtree: true })

  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('keydown', onKey)
  document.addEventListener('click', onClick)
  window.addEventListener('popstate', onPop)

  return () => {
    current?.progress(1)
    window.clearTimeout(timer)
    window.removeEventListener('resize', later)
    mo.disconnect()
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('keydown', onKey)
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onPop)
  }
}
