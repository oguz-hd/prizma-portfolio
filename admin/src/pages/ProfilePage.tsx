import type { RawSiteContent } from '@site/content/types'

import { api } from '../api'
import { Form, LocalizedInput, TextInput, paragraphsText, textParagraphs } from '../fields'
import { useAction, useDraft, usePanel } from '../panel'
import { Page } from './Page'

function toDraft(content: RawSiteContent) {
  const p = content.profile
  return {
    name: p.name,
    title: { ...p.title },
    location: { ...p.location },
    // Sitede gösterilmiyor (Oturum 2) ama sözleşmede — formda yok, olduğu gibi geri gider.
    tagline: { ...p.tagline },
    bio: paragraphsText(p.bio),
  }
}

export function ProfilePage() {
  const { content, reload } = usePanel()
  const [draft, setDraft, dirty] = useDraft(toDraft(content))
  const [status, run] = useAction()

  const save = () =>
    run(async () => {
      await api.put('/profile', { ...draft, bio: textParagraphs(draft.bio) })
      setDraft(toDraft(await reload()))
    })

  return (
    <Page title="Profil" lead="Girişteki daire (ad, unvan, konum) ve Hakkımda slaytının metni.">
      <Form dirty={dirty} status={status} onSave={save}>
        <TextInput
          label="Ad"
          value={draft.name}
          onChange={(name) => setDraft({ ...draft, name })}
          hint="Özel isim — çevrilmez. Girişte büyük harfle, daire boyunca yazılır."
        />
        <LocalizedInput
          label="Unvan"
          required
          value={draft.title}
          onChange={(title) => setDraft({ ...draft, title })}
        />
        <LocalizedInput
          label="Konum"
          required
          value={draft.location}
          onChange={(location) => setDraft({ ...draft, location })}
        />
        <LocalizedInput
          label="Hakkımda metni"
          required
          multiline
          rows={9}
          value={draft.bio}
          onChange={(bio) => setDraft({ ...draft, bio })}
          hint="Boş satır yeni paragraf."
        />
      </Form>
    </Page>
  )
}
