import { useState } from 'react'

import type { RawMilestone, RawSection, SectionKind } from '@site/content/types'
import { LOCALES } from '@site/i18n/types'

import { api } from '../api'
import { Collection, type CollectionConfig } from '../collection'
import {
  Checkbox,
  EMPTY,
  Form,
  LocalizedInput,
  Select,
  TextInput,
  Thumb,
  paragraphsText,
  slugify,
  textParagraphs,
  type Loc,
} from '../fields'
import { useAction, useDraft, usePanel } from '../panel'
import { Page } from './Page'

/**
 * Bölümler = sitedeki slaytlar (Faz 9). Türü bileşeni seçer (web/src/App.tsx).
 * Hazır türler (Hakkımda, Deneyim, İletişim) silinmez, gizlenir; panelden eklenenler
 * silinir. Türe özgü düzenleyiciler (maddeler, galeri) kartın altında, kendi formuyla.
 */

const KIND_LABELS: Record<SectionKind, string> = {
  about: 'Hakkımda (hazır)',
  experience: 'Deneyim ve Eğitim (hazır)',
  contact: 'İletişim (hazır)',
  text: 'Serbest metin',
  timeline: 'Zaman çizelgesi',
  projects: 'Projeler',
  announcement: 'Duyuru',
  gallery: 'Galeri',
}
const ADDABLE: SectionKind[] = ['text', 'timeline', 'projects', 'announcement', 'gallery']
const BUILTIN = new Set<SectionKind>(['about', 'experience', 'contact'])

/**
 * Menüde yazının sığacağı uzunluk (docs/ARCHITECTURE.md § 8). Oturum 3'te
 * "Deneyim ve Eğitim" (17) telefonda menüyü taşırdı; bugünküler en çok 10.
 */
const NAV_MAX = 12

type Draft = {
  kind: SectionKind
  heading: Loc
  navLabel: Loc
  body: Loc
  visible: boolean
  linkLabel: Loc
  linkHref: string
  startsOn: string
  endsOn: string
}

function navWarning(draft: Draft): string | null {
  const long = LOCALES.filter((loc) => (draft.navLabel[loc].trim() || draft.heading[loc].trim()).length > NAV_MAX)
  if (long.length === 0) return null
  return `Menüdeki ad (${long.map((l) => l.toUpperCase()).join(', ')}) ${NAV_MAX} karakteri geçiyor — telefonda menü taşabilir. Kısa bir menü adı ver.`
}

const config: CollectionConfig<RawSection, Draft> = {
  select: (content) => content.sections,
  path: '/sections',
  toDraft: (s) => ({
    kind: s.kind,
    heading: { ...s.heading },
    navLabel: { ...(s.navLabel ?? EMPTY) },
    body: paragraphsText(s.body),
    visible: s.visible !== false,
    linkLabel: { ...(s.link?.label ?? EMPTY) },
    linkHref: s.link?.href ?? '',
    startsOn: s.startsOn ?? '',
    endsOn: s.endsOn ?? '',
  }),
  toBody: (draft) => ({
    // `kind` yalnızca oluştururken okunuyor; güncellemede sunucu yok sayıyor.
    kind: draft.kind,
    heading: draft.heading,
    navLabel: draft.navLabel,
    body: textParagraphs(draft.body),
    visible: draft.visible,
    ...(draft.kind === 'announcement' && {
      link: draft.linkHref.trim() ? { label: draft.linkLabel, href: draft.linkHref.trim() } : null,
      startsOn: draft.startsOn || null,
      endsOn: draft.endsOn || null,
    }),
  }),
  title: (draft) => draft.heading.tr,
  anchor: (section) => section?.slug ?? '',
  canDelete: (section) => !BUILTIN.has(section.kind),
  fields: (draft, set, section) => <SectionFields draft={draft} set={set} isNew={!section} />,
  after: (section) => {
    if (section.kind === 'timeline') return <TimelineItems section={section} />
    if (section.kind === 'gallery') return <GalleryEditor section={section} />
    return null
  },
  create: {
    label: 'Yeni bölüm',
    empty: {
      kind: 'text',
      heading: EMPTY,
      navLabel: EMPTY,
      body: EMPTY,
      visible: true,
      linkLabel: EMPTY,
      linkHref: '',
      startsOn: '',
      endsOn: '',
    },
    suggestId: (draft) => slugify(draft.heading.tr || draft.heading.en),
  },
}

function SectionFields({ draft, set, isNew }: { draft: Draft; set: (next: Draft) => void; isNew: boolean }) {
  return (
    <>
      {isNew ? (
        <Select
          label="Tür"
          value={draft.kind}
          onChange={(kind) => set({ ...draft, kind: kind as SectionKind })}
          options={ADDABLE.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
          hint="Sonradan değişmez."
        />
      ) : (
        <p className="card-meta">{KIND_LABELS[draft.kind]}</p>
      )}
      <LocalizedInput label="Başlık" required value={draft.heading} onChange={(heading) => set({ ...draft, heading })} />
      <LocalizedInput
        label="Menü adı"
        value={draft.navLabel}
        onChange={(navLabel) => set({ ...draft, navLabel })}
        hint="İsteğe bağlı; boşsa menüde başlık yazar."
        warning={navWarning(draft)}
      />
      {draft.kind === 'contact' ? (
        // İletişim dairesi bölüm metni göstermiyor (Oturum 4); alan sunulsa yazılan kaybolurdu.
        <p className="hint">İletişim dairesi bölüm metni göstermiyor — bu yüzden metin alanı yok.</p>
      ) : (
        <LocalizedInput
          label={draft.kind === 'announcement' ? 'Duyuru metni' : 'Bölüm metni'}
          multiline
          rows={4}
          value={draft.body}
          onChange={(body) => set({ ...draft, body })}
          hint="Başlığın altına düşer. Boş satır yeni paragraf."
        />
      )}
      {draft.kind === 'announcement' && (
        <>
          <LocalizedInput
            label="Bağlantı etiketi"
            value={draft.linkLabel}
            onChange={(linkLabel) => set({ ...draft, linkLabel })}
            hint="İsteğe bağlı düğme (ör. Kayıt ol)."
          />
          <TextInput label="Bağlantı adresi" type="url" value={draft.linkHref} onChange={(linkHref) => set({ ...draft, linkHref })} hint="https://… ya da mailto:… — boşsa düğme yok." />
          <div className="row">
            <TextInput label="Yayın başlangıcı" type="date" value={draft.startsOn} onChange={(startsOn) => set({ ...draft, startsOn })} />
            <TextInput label="Yayın bitişi" type="date" value={draft.endsOn} onChange={(endsOn) => set({ ...draft, endsOn })} hint="Gün dahil. Boşsa süresiz." />
          </div>
        </>
      )}
      {draft.kind === 'projects' && <p className="hint">Projeler, Projeler sayfasından yönetilir; burada yalnızca başlık ve giriş metni.</p>}
      {!isNew && <Checkbox label="Sitede göster" checked={draft.visible} onChange={(visible) => set({ ...draft, visible })} />}
    </>
  )
}

// ── Zaman çizelgesi maddeleri ────────────────────────────────────────────────

type ItemDraft = { org: string; role: Loc; period: string; note: Loc }

function itemsConfig(section: RawSection): CollectionConfig<RawMilestone, ItemDraft> {
  return {
    select: (content) => content.sections.find((s) => s.id === section.id)?.items ?? [],
    path: `/sections/${section.id}/items`,
    toDraft: (m) => ({ org: m.org, role: { ...m.role }, period: m.period, note: { ...(m.note ?? EMPTY) } }),
    toBody: (draft) => draft,
    title: (draft) => [draft.role.tr, draft.org].filter(Boolean).join(' · '),
    anchor: () => section.slug,
    fields: (draft, set) => (
      <>
        <LocalizedInput label="Başlık" required value={draft.role} onChange={(role) => set({ ...draft, role })} hint="Ör. Hackathon birinciliği." />
        <TextInput label="Kurum" value={draft.org} onChange={(org) => set({ ...draft, org })} hint="Özel isim — çevrilmez." />
        <TextInput label="Dönem" value={draft.period} onChange={(period) => set({ ...draft, period })} hint="Serbest metin, çevrilmez; boş olabilir." />
        <LocalizedInput label="Not" value={draft.note} onChange={(note) => set({ ...draft, note })} hint="İsteğe bağlı." />
      </>
    ),
    create: {
      label: 'Yeni madde',
      empty: { org: '', role: EMPTY, period: '', note: EMPTY },
      suggestId: (draft) => slugify(`${section.id} ${draft.role.tr}`),
    },
  }
}

function TimelineItems({ section }: { section: RawSection }) {
  const [cfg] = useState(() => itemsConfig(section))
  return (
    <>
      <p className="label">Maddeler</p>
      <Collection config={cfg} />
    </>
  )
}

// ── Galeri ───────────────────────────────────────────────────────────────────

type GalleryItem = { mediaId: string; caption: Loc }

function GalleryEditor({ section }: { section: RawSection }) {
  const { content, reload } = usePanel()
  const library = content.media ?? []
  const initial: GalleryItem[] = (section.media ?? []).map((m) => ({ mediaId: m.id, caption: { ...(m.caption ?? EMPTY) } }))
  const [items, setItems, dirty] = useDraft(initial)
  const [status, run] = useAction()
  const byId = new Map(library.map((m) => [m.id, m]))
  const unused = library.filter((m) => !items.some((i) => i.mediaId === m.id))

  const move = (from: number, to: number) => {
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setItems(next)
  }

  const save = () =>
    run(async () => {
      await api.put(`/sections/${section.id}/media`, { items })
      await reload()
    })

  return (
    <Form dirty={dirty} status={status} onSave={save} anchor={section.slug}>
      <div className="card-head">
        <h2 className="card-title">Galerideki görseller</h2>
        <span className="card-meta">{items.length}</span>
      </div>
      {items.length === 0 && <p className="hint">Henüz görsel yok — aşağıdan ekle.</p>}
      <ol className="gallery-list">
        {items.map((item, i) => {
          const media = byId.get(item.mediaId)
          return (
            <li key={item.mediaId} className="gallery-item">
              {media && <Thumb media={media} />}
              <div className="gallery-fields">
                <LocalizedInput
                  label="Altyazı"
                  value={item.caption}
                  onChange={(caption) => setItems(items.map((it, j) => (j === i ? { ...it, caption } : it)))}
                  hint="İsteğe bağlı (ör. Orion Bulutsusu · M42)."
                />
                <div className="card-tools">
                  <button type="button" className="btn btn-icon" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Yukarı taşı">↑</button>
                  <button type="button" className="btn btn-icon" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} aria-label="Aşağı taşı">↓</button>
                  <button type="button" className="btn btn-danger" onClick={() => setItems(items.filter((_, j) => j !== i))}>Çıkar</button>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      {unused.length > 0 ? (
        <div className="field">
          <span className="label">Ekle</span>
          <div className="media-pick">
            {unused.map((m) => (
              <button key={m.id} type="button" className="media-pick-btn" onClick={() => setItems([...items, { mediaId: m.id, caption: EMPTY }])} aria-label={`Ekle: ${m.alt.tr || m.id}`}>
                <Thumb media={m} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="hint">Eklenecek görsel yok — Medya sayfasından yükle.</p>
      )}
    </Form>
  )
}

export function SectionsPage() {
  return (
    <Page
      title="Bölümler"
      lead="Sitedeki slaytlar, bu sırayla. Hazır bölümler (Hakkımda, Deneyim, İletişim) silinmez ama gizlenebilir; eklediğin bölümler silinebilir."
    >
      <Collection config={config} />
    </Page>
  )
}
