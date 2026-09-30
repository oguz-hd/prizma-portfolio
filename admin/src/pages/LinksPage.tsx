import type { RawLink } from '@site/content/types'

import { Collection, type CollectionConfig } from '../collection'
import { EMPTY, LocalizedInput, TextInput, slugify, type Loc } from '../fields'
import { Page } from './Page'

// `icon` sitede kullanılmıyor; formda yok, olduğu gibi geri gider.
type Draft = { label: Loc; href: string; icon: string }

const config: CollectionConfig<RawLink, Draft> = {
  select: (content) => content.links,
  path: '/links',
  toDraft: (link) => ({ label: { ...link.label }, href: link.href, icon: link.icon }),
  toBody: (draft) => draft,
  title: (draft) => draft.label.tr,
  anchor: () => 'iletisim',
  fields: (draft, set) => (
    <>
      <LocalizedInput
        label="Etiket"
        required
        value={draft.label}
        onChange={(label) => set({ ...draft, label })}
        hint="Girişin ve İletişim'in dairesinde görünen ad."
      />
      <TextInput
        label="Adres"
        type="url"
        value={draft.href}
        onChange={(href) => set({ ...draft, href })}
        hint="https://… ya da mailto:… — ilk mailto: bağlantısı İletişim'de e-posta adresi olarak yazılır."
      />
    </>
  ),
  create: {
    label: 'Yeni bağlantı',
    empty: { label: EMPTY, href: '', icon: '' },
    suggestId: (draft) => slugify(draft.label.en || draft.label.tr),
  },
}

export function LinksPage() {
  return (
    <Page title="Bağlantılar" lead="Giriş ve İletişim dairesindeki bağlantılar, sitedeki sırayla.">
      <Collection config={config} />
    </Page>
  )
}
