import { mediaFallback, mediaSrcSet } from '../content/media'
import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'
import { Section, type SectionProps } from './Section'

/**
 * Projeler (Faz 9, kullanıcı seçimi C2) — kapaklı kartlar. Kayıtlar panelin Projeler
 * sayfasından; bu bölüm panelden eklenmedikçe sitede görünmüyor (kullanıcı kararı).
 *
 * Kapağı olmayan kart da yerini korur: aynı oranda boş bir çerçeve ve sıra numarası —
 * sıradaki kartların başlıkları aynı hizada kalsın. Sıra numarası tayf şeridiyle
 * aynı mantık: bilgi değil ritim (docs/DESIGN.md § F/6).
 *
 * Kart başına bir sayfa birimi; sığmayan liste alt sayfalara bölünür.
 */
export function ProjectsSection(props: SectionProps) {
  const { projects } = useContent()
  const t = useStrings()

  return (
    <Section {...props}>
      <ul className="project-list">
        {projects.map((p, i) => (
          <li key={p.id} data-reveal data-i18n-fade data-page-unit>
            <article className="project">
              {p.cover ? (
                <img
                  className="project-cover"
                  srcSet={mediaSrcSet(p.cover)}
                  sizes="(min-width: 1024px) 30vw, (min-width: 768px) 50vw, 100vw"
                  src={mediaFallback(p.cover)}
                  width={p.cover.width}
                  height={p.cover.height}
                  alt={p.cover.alt}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="project-cover project-cover-empty" aria-hidden="true">
                  <span className="label">{String(i + 1).padStart(2, '0')}</span>
                </div>
              )}

              <h3 className="project-title">{p.title}</h3>
              <p className="project-summary">{p.summary}</p>
              {p.description.map((para, j) => (
                <p key={j} className="project-para">
                  {para}
                </p>
              ))}

              <ul className="tech-list" aria-label={t('tech')}>
                {p.tech.map((tech) => (
                  <li key={tech} className="tech-badge">
                    {tech}
                  </li>
                ))}
              </ul>

              {/* Bağlantılar isteğe bağlı: ikisi de boşsa liste hiç basılmaz. */}
              {(p.repoUrl || p.liveUrl) && (
                <ul className="project-links">
                  {p.repoUrl && (
                    <li>
                      <a className="hero-link" href={p.repoUrl} target="_blank" rel="noreferrer noopener">
                        {t('source')}
                      </a>
                    </li>
                  )}
                  {p.liveUrl && (
                    <li>
                      <a className="hero-link" href={p.liveUrl} target="_blank" rel="noreferrer noopener">
                        {t('liveDemo')}
                      </a>
                    </li>
                  )}
                </ul>
              )}
            </article>
          </li>
        ))}
      </ul>
    </Section>
  )
}
