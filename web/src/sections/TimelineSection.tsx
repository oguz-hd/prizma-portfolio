import { Timeline } from './Experience'
import { Section, type SectionProps } from './Section'

/**
 * Zaman çizelgesi bölümü (Faz 9) — panelden eklenen tarihli maddeler (ör. Ödüller,
 * Gönüllülük). Deneyim'in Timeline'ı; tek liste olduğu için geniş ekranda maddeler
 * iki sütuna diziliyor (theme.css → .timeline-wide).
 */
export function TimelineSection(props: SectionProps) {
  return (
    <Section {...props}>
      <div className="timeline-wide" data-reveal data-i18n-fade>
        <Timeline items={props.section.items ?? []} />
      </div>
    </Section>
  )
}
