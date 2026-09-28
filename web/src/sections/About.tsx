import { useContent } from '../content/useContent'
import { Section, type SectionProps } from './Section'

/**
 * Hakkımda — bio ve yetenekler, iki sütun.
 *
 * Oturum 2 (kullanıcı isteği): mezuniyet paragrafı çıktı, deneyim ve eğitim
 * kendi slaytına taşındı (Experience.tsx). Tümü useContent()'ten geliyor;
 * bu dosyada tek bir içerik dizesi yok.
 */
export function About(props: SectionProps) {
  const { profile } = useContent()

  return (
    <Section {...props}>
      <div className="about">
        <div className="about-bio" data-reveal data-i18n-fade>
          {profile.bio.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="about-side" data-reveal data-i18n-fade>
          {profile.skills.map((group) => (
            <div key={group.id} className="skill-group">
              <p className="label">{group.group}</p>
              {/*
                Teknoloji listesi gerçek <ul> — ekran okuyucu "4 öğeli liste" desin.
                docs/DESIGN.md § 7: tüm metin gerçek HTML.
              */}
              <ul className="skill-items">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {group.note && <p className="skill-note">{group.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
