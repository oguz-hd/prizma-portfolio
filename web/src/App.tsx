import { useEffect } from 'react'

import { useContent } from './content/useContent'
import { Hero } from './sections/Hero'
import { About } from './sections/About'
import { Experience } from './sections/Experience'
import { Contact } from './sections/Contact'
import { NotFound, NOT_FOUND_LINES } from './sections/NotFound'
import { SiteHeader } from './components/SiteHeader'
import { Starfield } from './components/Starfield'
import { TokenLab } from './lab/TokenLab'
import { Deck } from './deck/SlideDeck'
import { SlideRail } from './deck/SlideRail'
import { PrismStage } from './prism/PrismStage'
import { playIntro } from './prism/intro'
import { isLab, isNotFound } from './route'

/**
 * Bölüm slug'ı → bileşen.
 *
 * Başlıklar ve sıra useContent().sections'tan geliyor — nav ve ray ile AYNI
 * kaynak. Bir bölümün adı değişince üçü birlikte değişir, kaymaz.
 */
const SECTION_COMPONENTS = {
  hakkimda: About,
  deneyim: Experience,
  iletisim: Contact,
} as const

/**
 * Katmanlar (arkadan öne):
 *   Starfield    gece göğü
 *   PrismStage   ★ merkezdeki prizma — her slaytta ortada (kullanıcı kararı)
 *   Deck         slaytlar; içerik slaytlarında cam panel prizmanın önünde
 *   SiteHeader   sabit üst çubuk
 *   SlideRail    sağ kenarda tayf rayı
 */
export function App() {
  const { sections, settings } = useContent()

  /*
    Sekme başlığı içerikten ve dile göre. index.html'dekini build sırasında
    vite.config.ts basıyor (paylaşım kartları JS çalıştırmaz); dil değişince
    bu günceller.
  */
  useEffect(() => {
    if (!isNotFound && !isLab) document.title = settings.metaTitle
  }, [settings.metaTitle])

  useEffect(() => {
    if (!isLab) playIntro()
  }, [])

  if (isLab) return <TokenLab />

  if (isNotFound) {
    return (
      <>
        <Starfield />
        <PrismStage lines={NOT_FOUND_LINES} mark />
        <NotFound />
      </>
    )
  }

  return (
    <>
      <Starfield />
      <PrismStage />
      <SiteHeader />
      <Deck>
        <Hero />
        {sections.map((s, i) => {
          const Component = SECTION_COMPONENTS[s.slug as keyof typeof SECTION_COMPONENTS]
          if (!Component) return null
          return (
            <Component key={s.id} id={s.slug} index={i + 1} heading={s.heading} body={s.body} />
          )
        })}
      </Deck>
      <SlideRail />
    </>
  )
}
