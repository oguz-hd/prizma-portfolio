import { useEffect, useMemo, useRef } from 'react'

import './starfield.css'

/**
 * Gece göğü.
 *
 * docs/DESIGN.md § E'nin görsel karşılığı: CV'deki teleskop hobisi → yıldız tayfı.
 * ★ Yıldızlar --accent-* token'larından renkleniyor. Yani tayf anlatısı dekorasyon
 * değil, tema sisteminin kendisi — ön ayar değişince gökyüzü de değişiyor.
 *
 * Sabit katman, prizmanın arkasında: slaytlar değişir, gök yerinde kalır.
 * Açılışta ilk belirenler bunlar (prism/intro.ts) — ışık gelmeden önce gece.
 *
 * Erişilebilirlik ve performans (docs/DESIGN.md § C):
 *   - aria-hidden — tamamen dekoratif, ekran okuyucu görmemeli
 *   - yalnızca opacity anime ediliyor (GPU; layout thrash yok)
 *   - prefers-reduced-motion → parıltı durur, yıldızlar sabit kalır (theme.css)
 */

const STAR_COUNT = 60
const ACCENT_COUNT = 5

type Star = {
  left: number
  top: number
  size: number
  accent: number
  delay: number
  duration: number
  dim: number
}

/** Deterministik sözde-rastgele: her render'da yıldızlar yer değiştirmesin. */
function makeStars(): Star[] {
  let seed = 20260908
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  return Array.from({ length: STAR_COUNT }, () => ({
    left: next() * 100,
    top: next() * 100,
    // Çoğu yıldız küçük, birkaçı büyük — gerçek gökyüzü gibi.
    size: next() < 0.85 ? 1 : 2,
    accent: Math.floor(next() * ACCENT_COUNT) + 1,
    delay: next() * 6,
    duration: 3 + next() * 5,
    dim: 0.25 + next() * 0.5,
  }))
}

export function Starfield() {
  const stars = useMemo(makeStars, [])
  const root = useRef<HTMLDivElement>(null)

  // Parıltı CSS @keyframes yerine Web Animations ile: keyframe içinde `var()` olunca Chrome, kökte
  // her token değiştiğinde (tema süpürmesinde 30 kez) 60 yıldızın animasyonunu baştan çözüyordu.
  // Burada anahtar kareler sabit sayı; görüntü aynı, stil hesabı hafif.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const running = Array.from(root.current?.children ?? []).map((el, i) => {
      const s = stars[i]
      return el.animate([{ opacity: s.dim }, { opacity: 1 }, { opacity: s.dim }], {
        duration: s.duration * 1000,
        delay: s.delay * 1000,
        iterations: Infinity,
        easing: 'ease-in-out',
        fill: 'both',
      })
    })
    return () => running.forEach((a) => a.cancel())
  }, [stars])

  return (
    <div ref={root} className="starfield" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: `var(--accent-${s.accent})`,
          }}
        />
      ))}
    </div>
  )
}
