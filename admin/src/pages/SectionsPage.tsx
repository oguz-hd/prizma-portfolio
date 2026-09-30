import type { RawSection } from '@site/content/types'
import { LOCALES } from '@site/i18n/types'

import { Collection, type CollectionConfig } from '../collection'
import { EMPTY, LocalizedInput, paragraphsText, textParagraphs, type Loc } from '../fields'
import { Page } from './Page'

type Draft = { heading: Loc; navLabel: Loc; body: Loc }

/**
 * Menüde yazının sığacağı uzunluk (docs/ARCHITECTURE.md § 8). Oturum 3'te
 * "Deneyim ve Eğitim" (17) telefonda menüyü taşırdı; bugünküler en çok 10.
 */
const NAV_MAX = 12

function navWarning(draft: Draft): string | null {
  const long = LOCALES.filter((loc) => (draft.navLabel[loc].trim() || draft.heading[loc].trim()).length > NAV_MAX)
  if (long.length === 0) return null
  return `Menüdeki ad (${long.map((l) => l.toUpperCase()).join(', ')}) ${NAV_MAX} karakteri geçiyor — telefonda menü taşabilir. Kısa bir menü adı ver.`
}

/**
 * İletişim dairesi bölüm metni göstermiyor (yalnızca başlık, e-posta,
 * bağlantılar — Oturum 4). Alan sunulursa yazılan metin sessizce kaybolurdu (§ 8).
 */
const WITHOUT_BODY = new Set(['iletisim'])

const config: CollectionConfig<RawSection, Draft> = {
  select: (content) => content.sections,
  path: '/sections',
  toDraft: (s) => ({ heading: { ...s.heading }, navLabel: { ...(s.navLabel ?? EMPTY) }, body: paragraphsText(s.body) }),
  toBody: (draft) => ({ heading: draft.heading, navLabel: draft.navLabel, body: textParagraphs(draft.body) }),
  title: (draft) => draft.heading.tr,
  anchor: (section) => section?.slug ?? '',
  canDelete: false,
  fields: (draft, set, section) => (
    <>
      <LocalizedInput label="Başlık" required value={draft.heading} onChange={(heading) => set({ ...draft, heading })} />
      <LocalizedInput
        label="Menü adı"
        value={draft.navLabel}
        onChange={(navLabel) => set({ ...draft, navLabel })}
        hint="İsteğe bağlı; boşsa menüde başlık yazar."
        warning={navWarning(draft)}
      />
      {section && WITHOUT_BODY.has(section.slug) ? (
        <p className="hint">İletişim dairesi bölüm metni göstermiyor — bu yüzden metin alanı yok.</p>
      ) : (
        <LocalizedInput
          label="Bölüm metni"
          multiline
          rows={4}
          value={draft.body}
          onChange={(body) => set({ ...draft, body })}
          hint="İsteğe bağlı; başlığın altına düşer. Boş satır yeni paragraf."
        />
      )}
    </>
  ),
}

export function SectionsPage() {
  return (
    <Page
      title="Bölümler"
      lead="Slaytların başlıkları ve sırası. Bölüm eklenip silinemiyor: her bölümün sitede kendi bileşeni var (ARCHITECTURE § 8)."
    >
      <Collection config={config} />
    </Page>
  )
}
