/**
 * Hareket hassasiyeti (docs/DESIGN.md § C) — tek sorgu noktası.
 *
 * Açıksa: açılış animasyonu oynamaz, slaytlar anında değişir, prizma tek karede
 * durur. Site tam çalışır — hareket bir süsleme, işlev ona bağlı değil.
 */
export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
