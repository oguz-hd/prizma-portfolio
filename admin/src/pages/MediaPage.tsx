import { useRef, useState, type DragEvent } from 'react'

import type { RawMedia } from '@site/content/types'

import { ApiError, api } from '../api'
import { EMPTY, Form, LocalizedInput, StatusLine, Thumb, type Loc } from '../fields'
import { useAction, useDraft, usePanel } from '../panel'
import { Page } from './Page'

/**
 * Medya kitaplığı (Faz 9). Yüklenen görseli sunucu WebP'lere çevirir ve EXIF'ini
 * (GPS konumu dahil) siler — api/app/media.py. Galeriler ve proje kapakları
 * buradan seçer; kullanılan görsel silinmez, sunucu nerede kullanıldığını söyler.
 */
const ACCEPT = 'image/jpeg,image/png,image/webp'

export function MediaPage() {
  const { content, reload } = usePanel()
  const library = content.media ?? []
  const [status, run] = useAction()
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const upload = (files: FileList | null) =>
    run(async () => {
      if (!files?.length) return
      // Sırayla: sunucu her görseli çevirirken bekletiyor; aynı anda 10 dosya belleği şişirir.
      const errors: string[] = []
      for (const file of Array.from(files)) {
        try {
          await api.upload(file)
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof ApiError ? err.messages.join(' ') : String(err)}`)
        }
      }
      await reload()
      if (input.current) input.current.value = ''
      if (errors.length) throw new ApiError(422, errors)
    })

  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    upload(e.dataTransfer.files)
  }

  return (
    <Page
      title="Medya"
      lead="Galeriler ve proje kapakları için görseller. JPEG, PNG ya da WebP, en fazla 15 MB. Konum (GPS) ve diğer EXIF bilgileri yüklemede silinir."
    >
      <div
        className={over ? 'dropzone is-over' : 'dropzone'}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
      >
        <p>Görselleri buraya sürükle ya da</p>
        <label className="btn btn-primary">
          {status.kind === 'busy' ? 'Yükleniyor…' : 'Dosya seç'}
          <input
            ref={input}
            className="sr-only"
            type="file"
            accept={ACCEPT}
            multiple
            disabled={status.kind === 'busy'}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
        <StatusLine status={status} dirty={false} done="Yüklendi — alt metinlerini yaz." />
      </div>

      {library.length === 0 ? (
        <p className="hint">Henüz görsel yok.</p>
      ) : (
        <div className="media-grid">
          {[...library].reverse().map((m) => (
            <MediaCard key={m.id} media={m} />
          ))}
        </div>
      )}
    </Page>
  )
}

function MediaCard({ media }: { media: RawMedia }) {
  const { reload } = usePanel()
  const [alt, setAlt, dirty] = useDraft<Loc>({ ...EMPTY, ...media.alt })
  const [status, run] = useAction()
  const [confirming, setConfirming] = useState(false)

  const save = () =>
    run(async () => {
      await api.put(`/media/${media.id}`, { alt })
      await reload()
    })

  const remove = () =>
    run(async () => {
      setConfirming(false)
      await api.remove(`/media/${media.id}`)
      await reload()
    })

  const missingAlt = !media.alt.tr.trim() && !dirty
  return (
    <Form className="card media-card" dirty={dirty} status={status} onSave={save} done="Kaydedildi">
      <Thumb media={media} />
      <p className="card-meta">
        {media.width}×{media.height} · {media.widths.join(' / ')} px
      </p>
      <LocalizedInput
        label="Alt metin"
        value={alt}
        onChange={setAlt}
        hint="Görmeyenler için ne gösterdiğini anlat (ör. Teleskopla çekilmiş Orion Bulutsusu)."
        warning={missingAlt ? 'Alt metin boş — ekran okuyucu bu görseli anlatamaz.' : null}
      />
      <div className="card-tools">
        {confirming ? (
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
        )}
      </div>
    </Form>
  )
}
