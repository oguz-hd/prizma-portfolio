import { useSyncExternalStore } from 'react'

import { applyTheme } from './applyTheme'
import { applyFavicon } from './favicon'
import { LIGHT_TOKENS, PRESETS } from './presets'
import type { PresetId, ThemeTokens } from './types'

/**
 * Ziyaretçinin açık/koyu seçimi (dil seçicisiyle aynı kalıp: i18n/useLocale.ts).
 *
 * Varsayılan HEP koyu: `prefers-color-scheme` bilerek okunmuyor (Oğuz, 05.11.2026) —
 * site koyu bir gökte tasarlandı, açık tema ziyaretçinin bilerek seçtiği ikinci hâl.
 * Koyu tarafta içeriğin seçtiği ön ayar (panelden), açık tarafta LIGHT_TOKENS.
 */
export type Scheme = 'dark' | 'light'

const STORAGE_KEY = 'prizma.scheme'

let current: Scheme = 'dark'
let darkPreset: PresetId = 'tayf'
const listeners = new Set<() => void>()

function readStored(): Scheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark' // gizli sekme / site verisi kapalı
  }
}

function tokensFor(scheme: Scheme): ThemeTokens {
  return scheme === 'light' ? LIGHT_TOKENS : PRESETS[darkPreset].tokens
}

function paint(): void {
  const tokens = tokensFor(current)
  applyTheme(tokens)
  applyFavicon(tokens)
}

/** main.tsx: içerik yüklendikten sonra, mount'tan önce. */
export function initScheme(preset: PresetId): Scheme {
  darkPreset = preset
  current = readStored()
  paint()
  return current
}

export function getScheme(): Scheme {
  return current
}

/** Rengi hemen değiştirir. Animasyon çağıranın işi (components/SchemeSwitch.tsx). */
export function setScheme(next: Scheme): void {
  if (next === current) return
  current = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Kaydedilemezse bu oturumda seçim yine de geçerli.
  }
  paint()
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useScheme(): Scheme {
  return useSyncExternalStore(subscribe, getScheme, () => 'dark')
}
