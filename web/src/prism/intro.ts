import gsap from 'gsap'

import { lockDeck, unlockDeck } from '../deck/deck'
import { reducedMotion } from '../motion'
import { darkenScene, scene } from './scene'

/**
 * Açılış — site bir ışığın prizmadan geçişiyle açılır (kullanıcının tarifi).
 *
 *   0.0–1.2  karanlık, yıldızlar belirir
 *   0.3–1.2  prizmanın kenarları çizilir, arka yüz derinlik kazanır
 *   1.0–1.7  beyaz ışık soldan, ekranın dışından prizmaya uzanır
 *   1.7–2.5  camın içinden geçer, tayf yelpazesi açılır
 *   2.3–2.9  şerit ve soğurma çizgileri, slaytın tonu yanar
 *   2.3–3.3  arayüz: içerik, sonra üst çubuk ve slayt rayı
 *
 * Açılışın son karesi sitenin kendisi: animasyon bir perde değil, merkezdeki
 * prizmanın kurulma anı. Bitince hiçbir şey yerinden oynamaz.
 *
 * Kurallar:
 *   - Her girdi (tuş, tık, tekerlek, dokunma) atlatır → son kare.
 *   - Aynı oturumda ikinci açılış 3× hızlı (her yenilemede 3 sn beklenmesin).
 *   - Hareket hassasiyetinde hiç oynamaz; site ilk karede tam.
 *   - İçerik DOM'da baştan var (SEO, ekran okuyucu). Gizleme yalnızca
 *     `html[data-intro="pending"]` ile ve animasyon bitince kalkıyor.
 *   - ⚠️ Emniyet: rAF durursa (sekme arkada, tarayıcı paneli gizli — trex-portfolio'da
 *     ölçülmüş tuzak) içerik gizli kalmasın → zamanlayıcı son kareye sarar.
 *     Sekme ilk açılışta gizliyse açılış görünür olunca başlar.
 */

const SEEN_KEY = 'prizma.intro'

let pending = false
let tl: gsap.core.Timeline | null = null

/** main.tsx, React mount'tan ÖNCE — ilk karede içerik ve tam prizma parlamasın. */
export function prepareIntro(): void {
  if (reducedMotion()) return
  pending = true
  document.documentElement.dataset.intro = 'pending'
  darkenScene()
  lockDeck()
}

function seen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

/** Açılışta gösterilecek öğeler: kap, içerik blokları, sonra site çerçevesi. Pasif slaytlar hariç. */
function targets(selector: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(selector)].filter((el) => {
    const slide = el.closest<HTMLElement>('[data-slide]')
    return !slide || slide.dataset.state === 'active'
  })
}

function build(): gsap.core.Timeline {
  const root = document.documentElement
  const stars = document.querySelector<HTMLElement>('.starfield')
  const panels = targets('[data-reveal-panel]')
  const blocks = targets('[data-reveal]')
  const chrome = targets('[data-reveal-chrome]')
  const all = [...panels, ...blocks, ...chrome]

  const skipEvents = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const
  let safety = 0

  const finish = () => {
    if (!pending) return
    pending = false
    window.clearTimeout(safety)
    skipEvents.forEach((ev) => window.removeEventListener(ev, skip, true))
    delete root.dataset.intro
    gsap.set(all, { clearProps: 'opacity,transform' })
    if (stars) gsap.set(stars, { clearProps: 'opacity' })
    Object.assign(scene, { frame: 1, beam: 1, fan: 1, labels: 1, focus: 1, dirty: true })
    unlockDeck(400)
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Kaydedilemezse bir dahaki açılış da tam hızda oynar — sorun değil.
    }
  }

  const t = gsap.timeline({ onComplete: finish, onInterrupt: finish })
  if (stars) t.fromTo(stars, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power1.out' }, 0)
  t.to(scene, { frame: 1, duration: 0.9, ease: 'power2.inOut' }, 0.3)
    // Işık ivmelenerek gelir, prizmaya çarpar...
    .to(scene, { beam: 1, duration: 0.7, ease: 'power2.in' }, 1.0)
    // ...ve ayrışarak yavaşça açılır.
    .to(scene, { fan: 1, duration: 0.8, ease: 'power3.out' }, 1.7)
    .to(scene, { labels: 1, duration: 0.6, ease: 'power1.out' }, 2.3)
    .to(scene, { focus: 1, duration: 0.6, ease: 'power2.out' }, 2.4)
  if (panels.length) t.fromTo(panels, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 2.3)
  if (blocks.length)
    t.fromTo(
      blocks,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 },
      2.35,
    )
  if (chrome.length)
    t.fromTo(chrome, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power1.out', stagger: 0.1 }, 2.7)

  if (seen()) t.timeScale(3)

  function skip() {
    t.progress(1)
  }
  // Yakalama evresinde: deck'in dinleyicilerinden ÖNCE çalışsın ki kilidi o açsın.
  skipEvents.forEach((ev) => window.addEventListener(ev, skip, { capture: true, passive: true }))
  safety = window.setTimeout(skip, (t.duration() / t.timeScale()) * 1000 + 1500)
  return t
}

/** App mount olunca. Birden fazla çağrılabilir (StrictMode) — açılış bir kez kurulur. */
export function playIntro(): void {
  if (!pending || tl) return
  const start = () => {
    if (tl || document.visibilityState !== 'visible') return
    document.removeEventListener('visibilitychange', start)
    tl = build()
  }
  document.addEventListener('visibilitychange', start)
  start()
}
