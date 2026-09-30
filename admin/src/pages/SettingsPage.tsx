import type { RawSiteContent } from '@site/content/types'
import { PRESET_LIST } from '@site/theme/presets'

import { api } from '../api'
import { Form, LocalizedInput } from '../fields'
import { useAction, useDraft, usePanel } from '../panel'
import { Page } from './Page'

function toDraft(content: RawSiteContent) {
  const { preset, metaTitle, metaDescription } = content.settings
  return { preset, metaTitle: { ...metaTitle }, metaDescription: { ...metaDescription } }
}

export function SettingsPage() {
  const { content, reload } = usePanel()
  const [draft, setDraft, dirty] = useDraft(toDraft(content))
  const [status, run] = useAction()

  const save = () =>
    run(async () => {
      await api.put('/settings', draft)
      setDraft(toDraft(await reload()))
    })

  return (
    <Page title="Genel" lead="Sitenin paleti, sekme başlığı ve arama sonuçlarındaki açıklaması.">
      <Form dirty={dirty} status={status} onSave={save}>
        <div className="field" role="radiogroup" aria-labelledby="preset-label">
          <span className="label" id="preset-label">
            Palet
          </span>
          <div className="presets">
            {PRESET_LIST.map((preset) => (
              <label key={preset.id} className="preset">
                <input
                  type="radio"
                  name="preset"
                  value={preset.id}
                  checked={draft.preset === preset.id}
                  onChange={() => setDraft({ ...draft, preset: preset.id })}
                />
                {/* Örnek, paletin kendi renkleriyle — veri presets.ts'ten, CSS'te renk yok. */}
                <span className="preset-sample" style={{ background: preset.tokens.ground }} aria-hidden="true">
                  <span
                    className="preset-strip"
                    style={{ background: `linear-gradient(90deg, ${preset.tokens.accents.join(', ')})` }}
                  />
                  <span className="preset-lead" style={{ background: preset.tokens.lead }} />
                </span>
                <span className="preset-name">{preset.name}</span>
                <span className="preset-note">{preset.note}</span>
              </label>
            ))}
          </div>
          <p className="hint">
            Yalnızca hazır paletler: serbest renk seçici okunmaz metne ve bozuk bir tayfa kapı açar
            (ARCHITECTURE § 4). İnce ayar ve kontrast doğrulama sonra (Faz 8). Palet yalnızca
            siteyi boyar; panel hep Tayf'ta kalır.
          </p>
        </div>
        <LocalizedInput
          label="Sekme başlığı"
          required
          value={draft.metaTitle}
          onChange={(metaTitle) => setDraft({ ...draft, metaTitle })}
          hint="Tarayıcı sekmesinde ve paylaşım kartında."
        />
        <LocalizedInput
          label="Açıklama"
          required
          multiline
          rows={3}
          value={draft.metaDescription}
          onChange={(metaDescription) => setDraft({ ...draft, metaDescription })}
          hint="Arama sonuçlarında ve paylaşım kartında; kart İngilizce olanı kullanıyor (site İngilizce açılıyor)."
        />
      </Form>
    </Page>
  )
}
