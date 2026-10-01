import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'
import type { Milestone } from '../content/types'
import { Section, type SectionProps } from './Section'

/**
 * Deneyim ve Eğitim — Projeler slaytının yerinde (kullanıcı isteği, Oturum 2).
 *
 * İki sütun: solda deneyim, sağda eğitim. Aynı şekle sahipler (kurum + rol +
 * dönem + not) → tek Timeline bileşeni.
 */
export function Experience(props: SectionProps) {
  const { profile } = useContent()
  const t = useStrings()

  return (
    <Section {...props}>
      <div className="timeline-grid">
        <div data-reveal data-i18n-fade>
          <Timeline label={t('experience')} items={profile.experience} />
        </div>
        <div data-reveal data-i18n-fade>
          <Timeline label={t('education')} items={profile.education} />
        </div>
      </div>
    </Section>
  )
}

/** Zaman çizelgesi listesi — Deneyim ve panelden eklenen zaman çizelgesi bölümleri ortak. */
export function Timeline({ label, items }: { label?: string; items: Milestone[] }) {
  return (
    <>
      {label && <p className="label">{label}</p>}
      <ul className="timeline">
        {items.map((m) => (
          <li key={m.id} className="timeline-item" data-page-unit>
            <p className="timeline-role">{m.role}</p>
            <p className="timeline-org">{m.org}</p>
            {m.period && <p className="label timeline-period">{m.period}</p>}
            {m.note && <p className="timeline-note">{m.note}</p>}
          </li>
        ))}
      </ul>
    </>
  )
}
