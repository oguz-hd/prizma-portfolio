import gsap from 'gsap'

import './perf.css'

/**
 * Performans kademesi (`html[data-perf]`): cihaza göre sitenin ne kadar ağır çizeceği.
 *
 *   full      her şey açık: sıvı cam kırılması, tam hale, 60 yıldız, 74 fps
 *   balanced  cam kırılmasız, küçük hale, yarı yıldız, 60 fps, kısa geçiş
 *   lite      panelde bulanıklık yok, hale yok, geçişte yalnız bant, 45 fps (`html[data-lite]` da açık kalır)
 *
 * Başlangıç tahmini cihazın söylediklerinden (çekirdek, bellek, dokunmatik); asıl karar çalışırken kare
 * sürelerinden gelir ve yalnızca AŞAĞI iner (yukarı çıkmak bulanık/düz arasında gidip gelmeye yol açar).
 * GPU'yu sormanın güvenilir yolu yok; yavaşlık GPU, ekran geçişi (hibrit grafik) ya da yenileme hızından
 * gelebilir, hepsi aynı ölçüte düşer: kare süresi.
 *
 * Elle seçim: `?perf=full|balanced|lite` (o oturum) ya da `setTier()` (localStorage, ileride bir ayar).
 * Elle seçilince otomatik düşürme kapanır.
 */
export type Tier = 'full' | 'balanced' | 'lite'

const STORAGE_KEY = 'prizma.perf'
const ORDER: Tier[] = ['full', 'balanced', 'lite']
const FPS: Record<Tier, number> = { full: 74, balanced: 60, lite: 45 }

const SAMPLES = 90
const SLOW_MS = 22
const GAP_MS = 250
const WATCH_MS = 12_000 // bu süreden sonra izleme biter; geçici takılmalar kademeyi düşürmesin

let current: Tier = 'full'
let manual = false

const isTier = (v: unknown): v is Tier => v === 'full' || v === 'balanced' || v === 'lite'

function readOverride(): Tier | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('perf')
    if (isTier(fromUrl)) return fromUrl
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTier(stored) ? stored : null
  } catch {
    return null
  }
}

/** Cihazın söylediklerinden başlangıç kademesi. Emin değilse "tam": ölçüm gerekirse düşürür. */
function guess(): Tier {
  const cores = navigator.hardwareConcurrency || 8
  // deviceMemory yalnızca Chromium'da var; yoksa bilinmiyor sayılır.
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const phone = matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 768
  if (mem <= 2 || cores <= 2) return 'lite'
  if (mem <= 4 || cores <= 4 || phone) return 'balanced'
  return 'full'
}

function apply(tier: Tier): void {
  current = tier
  const root = document.documentElement
  root.dataset.perf = tier
  if (tier === 'lite') root.dataset.lite = ''
  else delete root.dataset.lite
  gsap.ticker.fps(FPS[tier])
}

export function getTier(): Tier {
  return current
}

/** `null`: otomatik (tahmin + ölçüm). Seçim localStorage'da kalır. */
export function setTier(next: Tier | null): void {
  manual = next !== null
  try {
    if (next) localStorage.setItem(STORAGE_KEY, next)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Kaydedilemezse bu oturumda seçim yine de geçerli.
  }
  apply(next ?? guess())
}

/** main.tsx, mount'tan ÖNCE: ilk karelerden doğru kademede boyansın. */
export function initPerf(): Tier {
  const override = readOverride()
  manual = override !== null
  apply(override ?? guess())
  return current
}

/** App içinde: kare ölçümü. Yavaşsa bir kademe iner, ölçüm sıfırlanıp sürer; 12 sn sonra biter. */
export function watchFrameRate(): () => void {
  if (manual) return () => {}
  const startedAt = performance.now()
  let deltas: number[] = []

  const tick = (_time: number, deltaTime: number) => {
    if (performance.now() - startedAt > WATCH_MS || current === 'lite') {
      gsap.ticker.remove(tick)
      return
    }
    if (deltaTime > GAP_MS) return // gizli sekmeden dönüş
    // Tema süpürmesinin kendisi kareyi yavaşlatabilir (theme/sweep.ts); onu cihazın hızı sayma.
    if ('sweeping' in document.documentElement.dataset) return
    deltas.push(deltaTime)
    if (deltas.length > SAMPLES) deltas.shift()
    if (deltas.length < SAMPLES) return
    const median = [...deltas].sort((a, b) => a - b)[SAMPLES >> 1]
    if (median > SLOW_MS) {
      apply(ORDER[ORDER.indexOf(current) + 1] ?? 'lite')
      deltas = []
    }
  }

  gsap.ticker.add(tick)
  return () => gsap.ticker.remove(tick)
}
