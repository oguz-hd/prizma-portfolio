import { useId, type FormEvent, type ReactNode } from 'react'

import type { RawMedia } from '@site/content/types'
import { mediaSrc } from '@site/content/media'
import { LOCALES, type Localized } from '@site/i18n/types'

import type { Status } from './panel'

/**
 * Form parçaları. Panel yalnızca Türkçe: sitenin iki dilliliği içerik için
 * (her alanın TR/EN'i yan yana), panelin kendi yazıları tek dilde.
 */

export type Loc = Localized<string>
export const EMPTY: Loc = { tr: '', en: '' }

/** Paragraf dizisi ↔ textarea metni: boş satır = yeni paragraf (models.py → Translation). */
export const paragraphsText = (value: Localized<string[]>): Loc => ({
  tr: value.tr.join('\n\n'),
  en: value.en.join('\n\n'),
})

/** Metin olduğu gibi gidiyor; boş satırdan bölmeyi sunucu yapıyor (schemas.py → _split). */
export const textParagraphs = (value: Loc): Localized<string[]> => ({
  tr: [value.tr],
  en: [value.en],
})

/** "Sitede gör" bağlantıları. Geliştirmede compose veriyor; yayında panelle aynı kök. */
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? '/'

// ── Alanlar ─────────────────────────────────────────────────────────────────

function Note({ hint, warning }: { hint?: ReactNode; warning?: string | null }) {
  if (warning) return <p className="warn">{warning}</p>
  if (hint) return <p className="hint">{hint}</p>
  return null
}

type TextInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  warning?: string | null
  type?: 'text' | 'email' | 'password' | 'url' | 'date'
  autoComplete?: string
  placeholder?: string
}

export function TextInput({ label, value, onChange, hint, warning, type = 'text', ...rest }: TextInputProps) {
  const id = useId()
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="control">
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      </div>
      <Note hint={hint} warning={warning} />
    </div>
  )
}

export function Checkbox({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  const id = useId()
  return (
    <div className="field">
      <label className="check" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
      <Note hint={hint} />
    </div>
  )
}

type SelectProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  hint?: ReactNode
}

export function Select({ label, value, onChange, options, hint }: SelectProps) {
  const id = useId()
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="control">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <Note hint={hint} />
    </div>
  )
}

/** Görselin küçük hâli: en küçük WebP (640 px). */
export function Thumb({ media, className = 'thumb' }: { media: RawMedia; className?: string }) {
  return (
    <img
      className={className}
      src={mediaSrc({ ...media, alt: media.alt.tr }, media.widths[0])}
      width={media.width}
      height={media.height}
      alt={media.alt.tr}
      loading="lazy"
    />
  )
}

/** Medya kitaplığından tek görsel seç (proje kapağı). */
export function MediaSelect({ label, value, onChange, library, hint }: { label: string; value: string; onChange: (id: string) => void; library: RawMedia[]; hint?: ReactNode }) {
  const chosen = library.find((m) => m.id === value)
  return (
    <div className="media-select">
      <Select
        label={label}
        value={value}
        onChange={onChange}
        options={[
          { value: '', label: '— yok —' },
          ...library.map((m) => ({ value: m.id, label: `${m.alt.tr || 'alt metni yok'} · ${m.width}×${m.height}` })),
        ]}
        hint={hint}
      />
      {chosen && <Thumb media={chosen} />}
    </div>
  )
}

/**
 * Yarım çeviri uyarısı — sunucunun kuralının aynısı (api/app/schemas.py): iki dil
 * birlikte dolu ya da birlikte boş. İkisi de boş zorunlu alanı sunucu söylüyor.
 */
function halfTranslated(value: Loc, required: boolean): string | null {
  const tr = value.tr.trim() !== ''
  const en = value.en.trim() !== ''
  if (tr === en) return null
  return `${tr ? 'EN' : 'TR'} boş — iki dil birlikte dolu olmalı${required ? '' : ' ya da ikisi de boş'}.`
}

type LocalizedInputProps = {
  label: string
  value: Loc
  onChange: (value: Loc) => void
  required?: boolean
  /** Paragraflı alan (bio, bölüm metni): boş satır = yeni paragraf. */
  multiline?: boolean
  rows?: number
  hint?: ReactNode
  /** Yarım çeviriden başka bir uyarı (ör. menü adı telefonda uzun). */
  warning?: string | null
}

/** ★ Aynı kaydın iki dili yan yana (docs/ARCHITECTURE.md § 5). */
export function LocalizedInput({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  rows = 4,
  hint,
  warning,
}: LocalizedInputProps) {
  const id = useId()
  return (
    <div className="field" role="group" aria-labelledby={id}>
      <span className="label" id={id}>
        {label}
      </span>
      <div className="loc">
        {LOCALES.map((loc) => {
          const common = {
            // lang: yazım denetimi ve büyük harf dönüşümü o dilde (i → İ).
            lang: loc,
            'aria-label': `${label} (${loc.toUpperCase()})`,
            value: value[loc],
            onChange: (e: { target: { value: string } }) =>
              onChange({ ...value, [loc]: e.target.value }),
          }
          return (
            <div className={multiline ? 'control control-multi' : 'control'} key={loc}>
              <span className="control-tag" aria-hidden="true">
                {loc.toUpperCase()}
              </span>
              {multiline ? <textarea rows={rows} {...common} /> : <input type="text" {...common} />}
            </div>
          )
        })}
      </div>
      <Note hint={hint} warning={warning ?? halfTranslated(value, required)} />
    </div>
  )
}

// ── Kaydetme ────────────────────────────────────────────────────────────────

type StatusLineProps = {
  status: Status
  dirty: boolean
  anchor?: string
  /** Başarı mesajı; yoksa "Kaydedildi · sitede gör". */
  done?: ReactNode
}

export function StatusLine({ status, dirty, anchor, done }: StatusLineProps) {
  if (status.kind === 'error') {
    return (
      <div className="status status-error" role="alert">
        {status.messages.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
      </div>
    )
  }
  if (dirty) return <p className="status status-dirty">Kaydedilmemiş değişiklik</p>
  if (status.kind === 'done') {
    return (
      <p className="status status-done" role="status">
        {done ?? (
          <>
            Kaydedildi ·{' '}
            <a href={anchor ? `${SITE_URL}#${anchor}` : SITE_URL} target="_blank" rel="noreferrer">
              sitede gör ↗
            </a>
          </>
        )}
      </p>
    )
  }
  return null
}

type FormProps = {
  dirty: boolean
  status: Status
  onSave: () => void
  /** Kayıttan sonra "sitede gör" hangi slayta gitsin. */
  anchor?: string
  done?: ReactNode
  submitLabel?: string
  /** Kaydet düğmesinin yanına (Vazgeç gibi). */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/** Bir kayıt, bir form: Enter da kaydeder, değişiklik yoksa düğme kapalı. */
export function Form({
  dirty,
  status,
  onSave,
  anchor,
  done,
  submitLabel = 'Kaydet',
  actions,
  className,
  children,
}: FormProps) {
  const busy = status.kind === 'busy'
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (dirty && !busy) onSave()
  }
  return (
    <form className={className ?? 'card'} onSubmit={submit} noValidate>
      {children}
      <div className="savebar">
        <button type="submit" className="btn btn-primary" disabled={!dirty || busy}>
          {busy ? 'Kaydediliyor…' : submitLabel}
        </button>
        {actions}
        <StatusLine status={status} dirty={dirty} anchor={anchor} done={done} />
      </div>
    </form>
  )
}

// ── Kimlik ──────────────────────────────────────────────────────────────────

/** Sunucunun kuralı (schemas.py → Slug): küçük harf, rakam, tire. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const ASCII: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }

/** "Lion Bilişim — Stajyer" → "lion-bilisim-stajyer" */
export function slugify(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (c) => ASCII[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 64)
    .replace(/^-+|-+$/g, '')
}
