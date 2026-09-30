import { useSyncExternalStore } from 'react'

import { DEFAULT_LOCALE, isLocale, type Locale } from './types'

/**
 * Dil durumu. React ağacının dışında yaşıyor çünkü:
 *   - main.tsx mount'tan ÖNCE okuması gerek (<html lang> ilk kareden doğru olsun)
 *   - Faz 6'da content.json yüklemesi de mount öncesi olacak, aynı yerde
 *
 * useSyncExternalStore ile bağlanıyor — Context sarmalayıcısı gerekmiyor.
 */

const STORAGE_KEY = 'prizma.locale'

let current: Locale = DEFAULT_LOCALE
const listeners = new Set<() => void>()

/** localStorage gizli sekmede / site verisi kapalıyken erişimde HATA fırlatabilir. */
function readStored(): Locale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isLocale(raw) ? raw : null
  } catch {
    return null
  }
}

/** Kayıtlı seçim, yoksa varsayılan (EN). Tarayıcı dili bilerek okunmuyor — types.ts. */
function detect(): Locale {
  return readStored() ?? DEFAULT_LOCALE
}

/** main.tsx'te, mount'tan önce çağrılır. */
export function initLocale(): Locale {
  current = detect()
  syncDocument()
  return current
}

function syncDocument(): void {
  // SEO ve ekran okuyucu için kritik: yanlış lang, ekran okuyucunun metni
  // yanlış telaffuz etmesine yol açar.
  document.documentElement.lang = current
}

export function setLocale(next: Locale): void {
  if (next === current) return
  current = next
  syncDocument()
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Kaydedilemezse sorun değil — bu oturumda seçim yine de geçerli.
  }
  listeners.forEach((fn) => fn())
}

export function getLocale(): Locale {
  return current
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, () => DEFAULT_LOCALE)
}
