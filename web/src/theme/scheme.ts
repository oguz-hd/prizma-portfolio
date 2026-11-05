import { useSyncExternalStore } from 'react'

import { applyTheme } from './applyTheme'
import { applyFavicon } from './favicon'
import { LIGHT_TOKENS, PRESETS } from './presets'
import { resample } from './mix'
import type { PresetId, ThemeTokens } from './types'

/**
 * Ziyaretçinin açık/koyu seçimi (dil seçicisiyle aynı kalıp: i18n/useLocale.ts).
 *
 * Varsayılan HEP koyu: `prefers-color-scheme` bilerek okunmuyor. Site koyu bir gökte tasarlandı,
 * açık tema ziyaretçinin bilerek seçtiği ikinci hâl. Koyu tarafta içeriğin seçtiği ön ayar
 * (panelden), açık tarafta LIGHT_TOKENS.
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
  if (scheme === 'dark') return PRESETS[darkPreset].tokens
  // Açık palet, koyu ön ayarla aynı sayıda ton taşır (mix.ts → resample).
  return { ...LIGHT_TOKENS, accents: resample(LIGHT_TOKENS.accents, PRESETS[darkPreset].tokens.accents.length) }
}

function paint(): void {
  const tokens = tokensFor(current)
  applyTheme(tokens)
  applyFavicon(tokens)
}

/** main.tsx: içerik yüklendikten sonra, mount'tan önce. */
export function initScheme(preset: PresetId): Scheme {
  darkPreset = preset in PRESETS ? preset : 'tayf' // içerik bilinmeyen bir ön ayar getirirse boş sayfa yerine varsayılan
  current = readStored()
  paint()
  return current
}

export function getScheme(): Scheme {
  return current
}

export function tokensOf(scheme: Scheme): ThemeTokens {
  return tokensFor(scheme)
}

/** Süpürme bitince: ara karışımı bırakıp tam token'ları yaz (sweep.ts). */
export function repaint(): void {
  paint()
}

/**
 * Seçimi değiştirir. `paintNow: false` yalnızca durumu (kayıt, düğme simgesi) çevirir;
 * boyamayı süpürme kendisi yapar (sweep.ts), bitişte `repaint()`.
 */
export function setScheme(next: Scheme, paintNow = true): void {
  if (next === current) return
  current = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Kaydedilemezse bu oturumda seçim yine de geçerli.
  }
  if (paintNow) paint()
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useScheme(): Scheme {
  return useSyncExternalStore(subscribe, getScheme, () => 'dark')
}
