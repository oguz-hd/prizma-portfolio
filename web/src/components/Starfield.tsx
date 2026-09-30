import { useMemo } from 'react'

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

  return (
    <div className="starfield" aria-hidden="true">
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
            // Keyframe bu değişkeni okuyor. Inline `opacity` yazsaydık
            // animasyon onu ezerdi ve her yıldız aynı sönüklükte olurdu.
            ['--star-dim' as string]: String(s.dim),
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
