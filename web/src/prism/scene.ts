import gsap from 'gsap'

import { getPreset } from '../content/useContent'
import { PRESETS } from '../theme/presets'
import { reducedMotion } from '../motion'
import { deg, slideAccent, slideAngle } from './optics'

/**
 * Sahnenin durumu — prizmayı süren TEK nesne.
 *
 * PrismStage her karede bunu okuyup çizer; kimse SVG'ye doğrudan dokunmaz.
 * Açılış (intro.ts) ve slayt geçişi (deck.ts) bu alanları GSAP ile tween'liyor.
 *
 * ── Sahiplik (trex-portfolio kural 5'in karşılığı: her alanın tek sahibi) ──
 *   frame · beam · fan · labels   → açılış (intro.ts); sonra hep 1
 *   base · dim · accent · focus   → slayt geçişi (prismFocus, aşağıda)
 *   gerçek açı (theta)            → PrismStage — base'e imleç + nefes eklenip yumuşatılıyor
 * İki şey aynı alanı sürerse GSAP'te biri diğerini yer; bu yüzden ayrık.
 *
 * ⚠️ İçerikten bağımsız: sahne bölüm adı bilmez. Deck yalnızca sıra numarası
 * ve "parlak mı" bilgisini verir; açı ve renk o sayılardan türer.
 */
export const scene = {
  /** Deck'in istediği gelme açısı (radyan). */
  base: deg(slideAngle(0)),
  /** Prizma kenarlarının çizilme oranı. */
  frame: 1,
  /** Beyaz ışığın soldan prizmaya ilerleme oranı. */
  beam: 1,
  /** İçerideki yol + yelpazenin açılma oranı. */
  fan: 1,
  /** Tayf şeridi ve soğurma etiketlerinin görünürlüğü. */
  labels: 1,
  /** Sahnenin parlaklığı: giriş slaytında 1, içerik slaytlarında kısık. */
  dim: 1,
  /** Vurgulanan ton (`--accent-N`) — slayt rayındaki rengin tayftaki ışını. */
  accent: 1,
  /** O ışının görünürlüğü. */
  focus: 1,
  /** Hareket hassasiyetinde çizim yalnızca değişince yapılır. */
  dirty: true,
}

/**
 * İçerik slaytlarında sahnenin parlaklığı — cam panelin arkasında seçilsin,
 * okumayı bölmesin. 0.5'te prizma panelin arkasında kayboluyordu ("hep ortada"
 * kararı ekranda karşılıksız kalıyordu, ölçüldü); panel inceltildi, bu arttı.
 */
export const DIM = 0.8

export function accentCount(): number {
  return PRESETS[getPreset()].tokens.accents.length
}

/** Açılış öncesi: her şey karanlık. main.tsx mount'tan ÖNCE çağırıyor — ilk karede tam prizma parlamasın. */
export function darkenScene(): void {
  Object.assign(scene, { frame: 0, beam: 0, fan: 0, labels: 0, focus: 0, dirty: true })
}

let focusTl: gsap.core.Timeline | null = null

/**
 * Slayt değişince prizma döner: gelme açısı yeni slaytınkine süpürür, sahne
 * parlar ya da kısılır, vurgulanan ışın solup yeni tonunda yeniden yanar.
 */
export function prismFocus(index: number, total: number, bright: boolean, instant = false): void {
  const base = deg(slideAngle(index))
  const accent = slideAccent(index, total, accentCount())
  const dim = bright ? 1 : DIM

  focusTl?.kill()
  if (instant || reducedMotion()) {
    Object.assign(scene, { base, accent, dim, dirty: true })
    return
  }

  focusTl = gsap
    .timeline()
    .to(scene, { base, duration: 1.1, ease: 'power3.inOut' }, 0)
    .to(scene, { dim, duration: 0.8, ease: 'power2.inOut' }, 0)
    .to(scene, { focus: 0, duration: 0.3, ease: 'power1.in' }, 0)
    .set(scene, { accent }, 0.3)
    .to(scene, { focus: 1, duration: 0.6, ease: 'power2.out' }, 0.45)
}
