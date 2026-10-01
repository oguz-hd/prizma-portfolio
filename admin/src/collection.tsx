import { useState, type ReactNode } from 'react'

import type { RawSiteContent } from '@site/content/types'

import { api } from './api'
import { Form, SLUG, StatusLine, TextInput } from './fields'
import { useAction, useDraft, usePanel } from './panel'

/**
 * Sıralı kayıt listesi — yetenekler, deneyim/eğitim, bağlantılar, bölümler,
 * projeler, zaman çizelgesi bölümünün maddeleri.
 *
 * Her kayıt kendi kartında, kendi taslağıyla: bir kart kaydedilince içerik
 * yeniden çekilir ama öteki kartların kaydedilmemiş yazıları kaybolmaz (kart
 * kimliğe bağlı, taslağı kendi içinde).
 *
 * Uç noktalar api/app/admin.py'nin düzeni: POST {path} · PUT {path}/order ·
 * PUT {path}/{id} · DELETE {path}/{id}.
 */
export type CollectionConfig<Item extends { id: string }, Draft> = {
  /** İçerikten bu listenin kayıtları (sunucu sırasıyla). */
  select: (content: RawSiteContent) => Item[]
  path: string
  /** Oluşturma ve sıralama gövdesine eklenenler (deneyim/eğitim: `kind`). */
  extra?: Record<string, string>
  toDraft: (item: Item) => Draft
  toBody: (draft: Draft) => unknown
  /** Kartın başlığı. */
  title: (draft: Draft) => string
  fields: (draft: Draft, set: (next: Draft) => void, item: Item | null) => ReactNode
  /** Kayıttan sonra "sitede gör" hangi slayta gitsin. */
  anchor?: (item: Item | null) => string
  /** Yoksa liste yalnızca düzenlenir (bölümler). */
  create?: { label: string; empty: Draft; suggestId: (draft: Draft) => string }
  /** Varsayılan: hepsi silinir. Bölümlerde yalnızca panelden eklenenler. */
  canDelete?: boolean | ((item: Item) => boolean)
  /**
   * Kartın ALTINDA, kendi formuyla duran düzenleyici (zaman çizelgesi maddeleri,
   * galeri). Kartın formunun içine konamaz: form içinde form geçersiz HTML.
   */
  after?: (item: Item) => ReactNode
}

export function Collection<Item extends { id: string }, Draft>({ config }: { config: CollectionConfig<Item, Draft> }) {
  const { content, reload } = usePanel()
  const items = config.select(content)
  const [orderStatus, runOrder] = useAction()

  const move = (from: number, to: number) =>
    runOrder(async () => {
      const ids = items.map((item) => item.id)
      const [moved] = ids.splice(from, 1)
      ids.splice(to, 0, moved)
      await api.put(`${config.path}/order`, { ...config.extra, ids })
      await reload()
    })

  return (
    <div className="stack">
      {orderStatus.kind === 'error' && <StatusLine status={orderStatus} dirty={false} />}
      {items.map((item, index) => (
        <ItemCard
          key={item.id}
          config={config}
          item={item}
          moveUp={index > 0 ? () => move(index, index - 1) : undefined}
          moveDown={index < items.length - 1 ? () => move(index, index + 1) : undefined}
          moving={orderStatus.kind === 'busy'}
        />
      ))}
      {config.create && <NewItem config={config} create={config.create} />}
    </div>
  )
}

type ItemCardProps<Item extends { id: string }, Draft> = {
  config: CollectionConfig<Item, Draft>
  item: Item
  moveUp?: () => void
  moveDown?: () => void
  moving: boolean
}

function ItemCard<Item extends { id: string }, Draft>({ config, item, moveUp, moveDown, moving }: ItemCardProps<Item, Draft>) {
  const { reload } = usePanel()
  const [draft, setDraft, dirty] = useDraft(config.toDraft(item))
  const [status, run] = useAction()
  const [confirming, setConfirming] = useState(false)

  const save = () =>
    run(async () => {
      await api.put(`${config.path}/${item.id}`, config.toBody(draft))
      const fresh = config.select(await reload()).find((i) => i.id === item.id)
      // Sunucunun kırptığı/böldüğü hâli: kart "kaydedildi"de temiz görünsün.
      if (fresh) setDraft(config.toDraft(fresh))
    })

  const remove = () =>
    run(async () => {
      await api.remove(`${config.path}/${item.id}`)
      await reload()
    })

  const tools = (
    <div className="card-tools">
      <button type="button" className="btn btn-icon" onClick={moveUp} disabled={!moveUp || moving} aria-label="Yukarı taşı">
        ↑
      </button>
      <button type="button" className="btn btn-icon" onClick={moveDown} disabled={!moveDown || moving} aria-label="Aşağı taşı">
        ↓
      </button>
      {(typeof config.canDelete === 'function' ? config.canDelete(item) : config.canDelete !== false) &&
        (confirming ? (
          <span className="confirm">
            <span>Silinsin mi?</span>
            <button type="button" className="btn btn-danger" onClick={remove}>
              Evet, sil
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Vazgeç
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
            Sil
          </button>
        ))}
    </div>
  )

  const form = (
    <Form dirty={dirty} status={status} onSave={save} anchor={config.anchor?.(item)}>
      <div className="card-head">
        <h2 className="card-title">{config.title(draft) || item.id}</h2>
        <span className="card-meta">{item.id}</span>
        {tools}
      </div>
      {config.fields(draft, setDraft, item)}
    </Form>
  )
  const after = config.after?.(item)
  if (!after) return form
  return (
    <div className="card-group">
      {form}
      <div className="card-sub">{after}</div>
    </div>
  )
}

type NewItemProps<Item extends { id: string }, Draft> = {
  config: CollectionConfig<Item, Draft>
  create: NonNullable<CollectionConfig<Item, Draft>['create']>
}

/**
 * Yeni kayıt. Kimlik adından önerilir (kullanıcı değiştirmediği sürece izler);
 * sonradan değişmez — ön yüzde anahtar, bölümlerde adres.
 */
function NewItem<Item extends { id: string }, Draft>({ config, create }: NewItemProps<Item, Draft>) {
  const { reload } = usePanel()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useDraft(create.empty)
  const [customId, setCustomId] = useState<string | null>(null)
  const [status, run] = useAction()

  const id = customId ?? create.suggestId(draft)
  const idWarning = id === '' ? null : !SLUG.test(id) || id === 'order' ? 'Yalnızca küçük harf, rakam ve tire; "order" olamaz.' : null

  const close = () => {
    setOpen(false)
    setDraft(create.empty)
    setCustomId(null)
  }

  const submit = () =>
    run(async () => {
      await api.post(config.path, { ...config.extra, id, ...(config.toBody(draft) as object) })
      await reload()
      close()
    })

  if (!open) {
    return (
      <button type="button" className="btn btn-add" onClick={() => setOpen(true)}>
        + {create.label}
      </button>
    )
  }

  return (
    <Form
      className="card card-new"
      // Taslak boşken de kimlik elle yazıldıysa gönderilebilir; sunucu eksiği söyler.
      dirty={id !== ''}
      status={status}
      onSave={submit}
      submitLabel="Oluştur"
      actions={
        <button type="button" className="btn" onClick={close}>
          Vazgeç
        </button>
      }
    >
      <div className="card-head">
        <h2 className="card-title">{create.label}</h2>
      </div>
      {config.fields(draft, setDraft, null)}
      <TextInput
        label="Kimlik"
        value={id}
        onChange={(value) => setCustomId(value)}
        hint="Addan öneriliyor; sonradan değişmez. Küçük harf, rakam ve tire."
        warning={idWarning}
      />
    </Form>
  )
}
