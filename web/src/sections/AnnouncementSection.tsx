import { useLocale } from '../i18n/useLocale'
import { useStrings } from '../i18n/strings'
import { Section, type SectionProps } from './Section'

/**
 * Duyuru (Faz 9, kullanıcı seçimi A1) — diğer bölümler gibi bir slayt: üstte tarih
 * işareti, başlık, metin, isteğe bağlı tek düğme. Yayın aralığı dışındaysa bölüm hiç
 * gelmiyor (content/useContent.ts → inWindow); burada yalnızca gösteriliyor.
 */
export function AnnouncementSection(props: SectionProps) {
  const { link, startsOn, endsOn } = props.section
  const locale = useLocale()
  const t = useStrings()
  const range = formatRange(startsOn, endsOn, locale)

  return (
    <Section
      {...props}
      before={
        <p className="label announcement-mark" data-reveal data-i18n-fade>
          <span className="announcement-dot" aria-hidden="true" />
          {t('announcement')}
          {range && <span className="announcement-range">{range}</span>}
        </p>
      }
    >
      {link && (
        <p data-reveal data-i18n-fade data-page-unit>
          <a
            className="announcement-cta"
            href={link.href}
            {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          >
            {link.label} →
          </a>
        </p>
      )}
    </Section>
  )
}

/** "1–31 Eki 2026" / "Oct 1 – 31, 2026" (Intl kısaltıyor); tek uç varsa yalnız o. */
function formatRange(start: string | undefined, end: string | undefined, locale: string): string | null {
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  // Yerel gün: "2026-10-01" UTC sayılırsa batıdaki ziyaretçide bir gün geri kayar.
  const parse = (iso: string) => new Date(`${iso}T00:00:00`)
  if (start && end) return format.formatRange(parse(start), parse(end))
  const only = start ?? end
  return only ? format.format(parse(only)) : null
}
