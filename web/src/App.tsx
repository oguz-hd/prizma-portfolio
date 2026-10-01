import { useEffect, type ComponentType } from 'react'

import type { SectionKind } from './content/types'
import { useContent } from './content/useContent'
import { Hero } from './sections/Hero'
import { About } from './sections/About'
import { Experience } from './sections/Experience'
import { Contact } from './sections/Contact'
import { TextSection } from './sections/TextSection'
import { TimelineSection } from './sections/TimelineSection'
import type { SectionProps } from './sections/Section'
import { NotFound, NOT_FOUND_LINES } from './sections/NotFound'
import { SiteHeader } from './components/SiteHeader'
import { Starfield } from './components/Starfield'
import { TokenLab } from './lab/TokenLab'
import { Deck } from './deck/SlideDeck'
import { SlideRail } from './deck/SlideRail'
import { PrismStage } from './prism/PrismStage'
import { playIntro } from './prism/intro'
import { isLab, isNotFound } from './route'
import { watchFrameRate } from './lite'

/**
 * Bölüm TÜRÜ → bileşen (Faz 9; eskiden slug'a göre elle). Panelden eklenen her
 * bölüm kod değişmeden slayt olur.
 *
 * Başlıklar ve sıra useContent().sections'tan geliyor — nav ve ray ile AYNI
 * kaynak. Bir bölümün adı değişince üçü birlikte değişir, kaymaz.
 */
const SECTION_COMPONENTS: Record<SectionKind, ComponentType<SectionProps>> = {
  about: About,
  experience: Experience,
  contact: Contact,
  text: TextSection,
  timeline: TimelineSection,
  // Görünüşleri seçenek sayfasından (Faz 9b) — o zamana kadar başlık + metin.
  projects: TextSection,
  announcement: TextSection,
  gallery: TextSection,
}

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

  useEffect(() => (isLab ? undefined : watchFrameRate()), [])

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
          const Component = SECTION_COMPONENTS[s.kind]
          return (
            <Component
              key={s.id}
              id={s.slug}
              index={i + 1}
              heading={s.heading}
              body={s.body}
              section={s}
            />
          )
        })}
      </Deck>
      <SlideRail />
    </>
  )
}
