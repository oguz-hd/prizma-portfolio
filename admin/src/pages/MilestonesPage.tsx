import type { RawMilestone } from '@site/content/types'

import { Collection, type CollectionConfig } from '../collection'
import { EMPTY, LocalizedInput, TextInput, slugify, type Loc } from '../fields'
import { Page } from './Page'

/**
 * Deneyim ve eğitim aynı şekil, aynı tablo (api → /milestones, `kind`), aynı
 * bileşen sitede de (Experience.tsx). Tür sonradan değişmez: taşımak = sil + oluştur.
 */
type Kind = 'experience' | 'education'
type Draft = { org: string; role: Loc; period: string; note: Loc }

function configFor(kind: Kind): CollectionConfig<RawMilestone, Draft> {
  return {
    select: (content) => content.profile[kind],
    path: '/milestones',
    extra: { kind },
    toDraft: (m) => ({ org: m.org, role: { ...m.role }, period: m.period, note: { ...(m.note ?? EMPTY) } }),
    toBody: (draft) => draft,
    title: (draft) => [draft.role.tr, draft.org].filter(Boolean).join(' · '),
    anchor: () => 'deneyim',
    fields: (draft, set) => (
      <>
        <TextInput
          label="Kurum"
          value={draft.org}
          onChange={(org) => set({ ...draft, org })}
          hint="Özel isim — çevrilmez."
        />
        <LocalizedInput label="Rol" required value={draft.role} onChange={(role) => set({ ...draft, role })} />
        <TextInput
          label="Dönem"
          value={draft.period}
          onChange={(period) => set({ ...draft, period })}
          hint="Serbest metin, çevrilmez: 2025 — 2026, 05.2026; boş olabilir."
        />
        <LocalizedInput
          label="Not"
          value={draft.note}
          onChange={(note) => set({ ...draft, note })}
          hint="İsteğe bağlı (ör. GNO 3.85/4 · Bölüm birincisi)."
        />
      </>
    ),
    create: {
      label: kind === 'experience' ? 'Yeni deneyim' : 'Yeni eğitim',
      empty: { org: '', role: EMPTY, period: '', note: EMPTY },
      suggestId: (draft) => slugify(`${draft.org} ${draft.role.tr}`),
    },
  }
}

const CONFIGS: Record<Kind, CollectionConfig<RawMilestone, Draft>> = {
  experience: configFor('experience'),
  education: configFor('education'),
}

export function MilestonesPage({ kind }: { kind: Kind }) {
  return (
    <Page
      title={kind === 'experience' ? 'Deneyim' : 'Eğitim'}
      lead="Deneyim ve Eğitim slaytında, sitedeki sırayla."
    >
      <Collection config={CONFIGS[kind]} />
    </Page>
  )
}
