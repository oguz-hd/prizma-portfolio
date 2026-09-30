import { createContext, useCallback, useContext, useEffect, useId, useState } from 'react'

import type { RawSiteContent } from '@site/content/types'

import { ApiError } from './api'

/**
 * Panelin ortak durumu: içerik + yeniden çekme, kaydedilmemiş değişiklikler,
 * kaydetme durumu. Sayfalar bunlarla konuşuyor, birbirleriyle değil.
 */

// ── İçerik ──────────────────────────────────────────────────────────────────

type Panel = {
  content: RawSiteContent
  /** Kayıttan sonra: sunucudaki güncel hâli çeker, döndürür. */
  reload: () => Promise<RawSiteContent>
}

const PanelContext = createContext<Panel | null>(null)
export const PanelProvider = PanelContext.Provider

export function usePanel(): Panel {
  const panel = useContext(PanelContext)
  if (!panel) throw new Error('usePanel: PanelProvider dışında')
  return panel
}

// ── Kaydedilmemiş değişiklikler ─────────────────────────────────────────────

type DirtyMark = (id: string, dirty: boolean) => void

const DirtyContext = createContext<DirtyMark>(() => {})
export const DirtyProvider = DirtyContext.Provider

/**
 * Formun kaydedilmemiş değişikliği var mı — App bunları toplayıp sayfa
 * değişiminde ve sekme kapanırken uyarıyor. Form kalkınca işareti de kalkar.
 */
export function useDirty(dirty: boolean): void {
  const id = useId()
  const mark = useContext(DirtyContext)
  useEffect(() => {
    mark(id, dirty)
    return () => mark(id, false)
  }, [id, dirty, mark])
}

/** Taslak + "değişti mi". Taslak düz nesne; karşılaştırma değer üzerinden. */
export function useDraft<D>(initial: D): [D, (next: D) => void, boolean] {
  const [draft, setDraft] = useState(initial)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  useDirty(dirty)
  return [draft, setDraft, dirty]
}

// ── Kaydetme durumu ─────────────────────────────────────────────────────────

export type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done' }
  | { kind: 'error'; messages: string[] }

export function useAction(): [Status, (task: () => Promise<void>) => Promise<void>] {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const run = useCallback(async (task: () => Promise<void>) => {
    setStatus({ kind: 'busy' })
    try {
      await task()
      setStatus({ kind: 'done' })
    } catch (err) {
      setStatus({
        kind: 'error',
        messages: err instanceof ApiError ? err.messages : [String(err)],
      })
    }
  }, [])
  return [status, run]
}
