import gsap from 'gsap'

/**
 * Hafif kip — zayıf GPU'da cam panelin bulanıklığını kaldırır (`html[data-lite]`).
 *
 * Ölçüm (CALISTIRMA "Performans ölçümü", 01.10.2026): GPU hızlandırması olmayan
 * cihazda içerik slaytı 41 fps'e düşüyor, karelerin %80'i kaçıyordu; panelin
 * `backdrop-filter`'ı kapatılınca 96 fps. Hale ya da ana iş parçacığı değil.
 *
 * GPU'yu sormanın güvenilir yolu yok; kare sürelerine bakılıyor. Son 90 karenin
 * ortancası 22 ms'yi (≈45 fps) aşınca kip açılır ve izleme biter — geri dönüş yok,
 * yoksa panel bulanık/düz arasında gidip gelir. Uzun boşluklar (gizli sekmeden
 * dönüş) sayılmaz. Görünüm CSS'te (theme.css → .panel).
 */
const SAMPLES = 90
const SLOW_MS = 22
const GAP_MS = 250

export function watchFrameRate(): () => void {
  const deltas: number[] = []

  const tick = (_time: number, deltaTime: number) => {
    if (deltaTime > GAP_MS) return
    deltas.push(deltaTime)
    if (deltas.length > SAMPLES) deltas.shift()
    if (deltas.length < SAMPLES) return
    const median = [...deltas].sort((a, b) => a - b)[SAMPLES >> 1]
    if (median > SLOW_MS) {
      document.documentElement.dataset.lite = ''
      gsap.ticker.remove(tick)
    }
  }

  gsap.ticker.add(tick)
  return () => gsap.ticker.remove(tick)
}
