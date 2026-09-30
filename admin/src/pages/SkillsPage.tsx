import type { RawSkillGroup } from '@site/content/types'

import { Collection, type CollectionConfig } from '../collection'
import { EMPTY, LocalizedInput, TextInput, slugify, type Loc } from '../fields'
import { Page } from './Page'

type Draft = { group: Loc; items: string; note: Loc }

const config: CollectionConfig<RawSkillGroup, Draft> = {
  select: (content) => content.profile.skills,
  path: '/skills',
  toDraft: (skill) => ({
    group: { ...skill.group },
    items: skill.items.join(', '),
    note: { ...(skill.note ?? EMPTY) },
  }),
  toBody: (draft) => ({
    group: draft.group,
    items: draft.items.split(',').map((item) => item.trim()).filter(Boolean),
    note: draft.note,
  }),
  title: (draft) => draft.group.tr,
  anchor: () => 'hakkimda',
  fields: (draft, set) => (
    <>
      <LocalizedInput label="Grup adı" required value={draft.group} onChange={(group) => set({ ...draft, group })} />
      <TextInput
        label="Teknolojiler"
        value={draft.items}
        onChange={(items) => set({ ...draft, items })}
        hint="Virgülle ayır. Çevrilmez — React her dilde React; açıklama nota."
      />
      <LocalizedInput
        label="Not"
        value={draft.note}
        onChange={(note) => set({ ...draft, note })}
        hint="İsteğe bağlı: grubu açan kısa açıklama (ör. Zaman serisi analizi)."
      />
    </>
  ),
  create: {
    label: 'Yeni grup',
    empty: { group: EMPTY, items: '', note: EMPTY },
    suggestId: (draft) => slugify(draft.group.en || draft.group.tr),
  },
}

export function SkillsPage() {
  return (
    <Page title="Yetenekler" lead="Hakkımda slaytındaki gruplar, sitedeki sırayla.">
      <Collection config={config} />
    </Page>
  )
}
