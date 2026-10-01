import type { RawProject } from '@site/content/types'

import { Collection, type CollectionConfig } from '../collection'
import { Checkbox, EMPTY, LocalizedInput, MediaSelect, TextInput, paragraphsText, slugify, textParagraphs, type Loc } from '../fields'
import { usePanel } from '../panel'
import { Page } from './Page'

/**
 * Projeler (Faz 9). Kayıtlar her zaman burada; sitede yalnızca Bölümler'de
 * "Projeler" türünde bir bölüm varsa görünür (kullanıcı kararı).
 */
type Draft = {
  title: Loc
  summary: Loc
  description: Loc
  tech: string
  repoUrl: string
  liveUrl: string
  published: boolean
  coverMediaId: string
}

const config: CollectionConfig<RawProject, Draft> = {
  select: (content) => content.projects,
  path: '/projects',
  toDraft: (p) => ({
    title: { ...p.title },
    summary: { ...p.summary },
    description: paragraphsText(p.description),
    tech: p.tech.join(', '),
    repoUrl: p.repoUrl ?? '',
    liveUrl: p.liveUrl ?? '',
    published: p.published,
    coverMediaId: p.cover?.id ?? '',
  }),
  toBody: (draft) => ({
    title: draft.title,
    summary: draft.summary,
    description: textParagraphs(draft.description),
    tech: draft.tech.split(',').map((t) => t.trim()).filter(Boolean),
    repoUrl: draft.repoUrl.trim() || null,
    liveUrl: draft.liveUrl.trim() || null,
    published: draft.published,
    coverMediaId: draft.coverMediaId || null,
  }),
  title: (draft) => draft.title.tr,
  anchor: () => 'projeler',
  fields: (draft, set) => <ProjectFields draft={draft} set={set} />,
  create: {
    label: 'Yeni proje',
    empty: {
      title: EMPTY,
      summary: EMPTY,
      description: EMPTY,
      tech: '',
      repoUrl: '',
      liveUrl: '',
      published: true,
      coverMediaId: '',
    },
    suggestId: (draft) => slugify(draft.title.en || draft.title.tr),
  },
}

function ProjectFields({ draft, set }: { draft: Draft; set: (next: Draft) => void }) {
  const { content } = usePanel()
  return (
    <>
      <LocalizedInput label="Başlık" required value={draft.title} onChange={(title) => set({ ...draft, title })} />
      <LocalizedInput label="Özet" required value={draft.summary} onChange={(summary) => set({ ...draft, summary })} hint="Kartta başlığın altındaki tek cümle." />
      <LocalizedInput
        label="Açıklama"
        multiline
        rows={4}
        value={draft.description}
        onChange={(description) => set({ ...draft, description })}
        hint="İsteğe bağlı. Boş satır yeni paragraf."
      />
      <TextInput label="Teknolojiler" value={draft.tech} onChange={(tech) => set({ ...draft, tech })} hint="Virgülle ayır; çevrilmez." />
      <TextInput label="Kaynak kodu" type="url" value={draft.repoUrl} onChange={(repoUrl) => set({ ...draft, repoUrl })} hint="İsteğe bağlı (https://…)." />
      <TextInput label="Canlı adres" type="url" value={draft.liveUrl} onChange={(liveUrl) => set({ ...draft, liveUrl })} hint="İsteğe bağlı." />
      <MediaSelect
        label="Kapak görseli"
        value={draft.coverMediaId}
        onChange={(coverMediaId) => set({ ...draft, coverMediaId })}
        library={content.media ?? []}
        hint="Medya sayfasından yüklenenler arasından."
      />
      <Checkbox label="Sitede göster" checked={draft.published} onChange={(published) => set({ ...draft, published })} />
    </>
  )
}

export function ProjectsPage() {
  const { content } = usePanel()
  const shown = content.sections.some((s) => s.kind === 'projects' && s.visible !== false)
  return (
    <Page
      title="Projeler"
      lead={
        shown
          ? 'Sitedeki Projeler bölümünde, bu sırayla.'
          : 'Sitede şu an görünmüyor: Bölümler sayfasından "Projeler" türünde bir bölüm ekle (ya da gizliyse göster).'
      }
    >
      <Collection config={config} />
    </Page>
  )
}
