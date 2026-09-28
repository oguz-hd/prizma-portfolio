import { useLayoutEffect, useRef, type ReactNode } from 'react'

import { initDeck } from './deck'

/**
 * Slaytların kabı. İşi deck.ts yapıyor; bu yalnızca kök öğeyi veriyor.
 *
 * useLayoutEffect: slayt durumu ilk boyamadan ÖNCE kurulsun — yoksa bir kare
 * boyunca hiçbir slayt görünmez ya da hepsi üst üste görünür.
 */
export function Deck({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    return initDeck(ref.current)
  }, [])

  return (
    <main className="deck" ref={ref}>
      {children}
    </main>
  )
}
