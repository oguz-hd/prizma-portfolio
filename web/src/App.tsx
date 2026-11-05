import { lazy, Suspense, useEffect, type ComponentType } from 'react'

import type { SectionKind } from './content/types'
import { useContent } from './content/useContent'
import { Hero } from './sections/Hero'
import { About } from './sections/About'
import { Experience } from './sections/Experience'
import { Contact } from './sections/Contact'
import { AnnouncementSection } from './sections/AnnouncementSection'
import { GallerySection } from './sections/GallerySection'
import { ProjectsSection } from './sections/ProjectsSection'
import { TextSection } from './sections/TextSection'
import { TimelineSection } from './sections/TimelineSection'
import type { SectionProps } from './sections/Section'
import { NotFound, NOT_FOUND_LINES } from './sections/NotFound'
import { SiteHeader } from './components/SiteHeader'
import { Starfield } from './components/Starfield'
import { Deck } from './deck/SlideDeck'
import { SlideRail } from './deck/SlideRail'
import { PrismStage } from './prism/PrismStage'
import { playIntro } from './prism/intro'
import { isLab, isNotFound } from './route'
import { watchFrameRate } from './lite'

/**
 * Bölüm TÜRÜ → bileşen. Panelden eklenen her
 * bölüm kod değişmeden slayt olur.
 *
 * Başlıklar ve sıra useContent().sections'tan geliyor — nav ve ray ile AYNI
 * kaynak. Bir bölümün adı değişince üçü birlikte değişir, kaymaz.
 */
// Yalnız geliştirmede: yayın paketine girmez (DEV sabiti derlemede `false` olur, import ağaçtan düşer).
const TokenLab = import.meta.env.DEV
  ? lazy(() => import('./lab/TokenLab').then((m) => ({ default: m.TokenLab })))
  : null

const SECTION_COMPONENTS: Record<SectionKind, ComponentType<SectionProps>> = {
  about: About,
  experience: Experience,
  contact: Contact,
  text: TextSection,
  timeline: TimelineSection,
  projects: ProjectsSection,
  announcement: AnnouncementSection,
  gallery: GallerySection,
}

/**
 * Katmanlar (arkadan öne):
 *   Starfield    gece göğü
 *   PrismStage   ★ merkezdeki prizma — her slaytta ortada
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

  if (isLab && TokenLab)
    return (
      <Suspense fallback={null}>
        <TokenLab />
      </Suspense>
    )

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
          // Önbellekteki eski paket, içeriğe sonradan eklenen bir türü tanımayabilir: düz metne düş.
          const Component = SECTION_COMPONENTS[s.kind] ?? TextSection
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
