import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'
import { Section, type SectionProps } from './Section'

/**
 * Projeler.
 *
 * curious.page kuralı 2: 3-5 proje, BAĞLAMIYLA — problem, yığın, sonuç.
 * Sadece isim listelemek değil; her kart "bu neden vardı" ile başlıyor.
 *
 * Ayrı detay rotası yok: üç proje için ayrı sayfa gereksiz sürtünme.
 * Açıklama kartın içinde duruyor.
 *
 * Bölüm başına bir slayt (kullanıcı kararı): üç proje yan yana üç sütun, her
 * biri geçişte kendi sırasıyla giriyor. Dar ekranda alt alta, slaytın içi kayar.
 */
export function Projects(props: SectionProps) {
  const { projects } = useContent()
  const t = useStrings()

  return (
    <Section {...props}>
      <ul className="project-list">
        {projects.map((p, i) => (
          <li key={p.id} data-reveal data-i18n-fade>
            <article className="project">
              {/* Sıra numarası: tayf şeridiyle aynı mantık — accent'ler
                  bilgi taşımıyor, yalnızca ritim veriyor (docs/DESIGN.md § F/6). */}
              <p className="label project-index">{String(i + 1).padStart(2, '0')}</p>

              <div className="project-body">
                <h3 className="project-title">{p.title}</h3>
                <p className="project-summary">{p.summary}</p>

                {p.description.map((para, j) => (
                  <p key={j} className="project-para">
                    {para}
                  </p>
                ))}

                <p className="label project-tech-label">{t('tech')}</p>
                <ul className="tech-list">
                  {p.tech.map((tech) => (
                    <li key={tech} className="tech-badge">
                      {tech}
                    </li>
                  ))}
                </ul>

                {/*
                  Bağlantılar opsiyonel: ikisi de boşsa liste hiç basılmaz.
                  curious.page kuralı 2 "bağlamıyla" derken kaynağı da kastediyor —
                  ama masaüstü uygulamasının canlı demosu olmaz, o yüzden ikisi ayrı.
                */}
                {(p.repoUrl || p.liveUrl) && (
                  <ul className="project-links">
                    {p.repoUrl && (
                      <li>
                        <a
                          className="hero-link"
                          href={p.repoUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {t('source')}
                        </a>
                      </li>
                    )}
                    {p.liveUrl && (
                      <li>
                        <a
                          className="hero-link"
                          href={p.liveUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {t('liveDemo')}
                        </a>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Section>
  )
}
