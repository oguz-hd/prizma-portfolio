import type { RawSiteContent } from '@site/content/types'

/**
 * API istemcisi — panelin sunucuyla konuştuğu TEK yer.
 *
 * Adresler göreli (`/api/…`): yayında panel sitenin altında, Caddy API'yi de aynı
 * kökte sunuyor; geliştirmede Vite yönlendiriyor (vite.config.ts). CORS yok.
 *
 * Yazmalar gövdesiz 204 döner (api/app/admin.py); panel kaydettikten sonra
 * içeriği `GET /api/content`'ten yeniden çeker — tek doğruluk kaynağı sunucu.
 */

// ── Oturum ──────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'prizma.admin.token'

/** sessionStorage gizli sekmede / site verisi kapalıyken erişimde HATA fırlatabilir. */
function readStored(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Oturum sekmeyle sınırlı (sessionStorage): sekme kapanınca biter. Token 12 saat
 * geçerli; parola değişince sunucu eskilerini reddediyor (api/app/auth.py).
 */
let token: string | null = readStored()
const listeners = new Set<() => void>()

export function getToken(): string | null {
  return token
}

export function setToken(next: string | null): void {
  token = next
  try {
    if (next) sessionStorage.setItem(TOKEN_KEY, next)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Saklanamazsa oturum yalnızca bu sayfada, bellekte sürer.
  }
  listeners.forEach((fn) => fn())
}

export function subscribeToken(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ── Hatalar ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages.join(' · '))
    this.status = status
    this.messages = messages
  }
}

type Issue = { loc: (string | number)[]; msg: string; type: string; ctx?: { min_length?: number } }

/** Sunucunun alan adları (camelCase, schemas.py) → formdaki etiketler. */
const FIELD_LABELS: Record<string, string> = {
  tr: 'TR',
  en: 'EN',
  preset: 'Palet',
  metaTitle: 'Sekme başlığı',
  metaDescription: 'Açıklama',
  name: 'Ad',
  title: 'Unvan',
  location: 'Konum',
  bio: 'Hakkımda metni',
  id: 'Kimlik',
  group: 'Grup adı',
  items: 'Teknolojiler',
  note: 'Not',
  org: 'Kurum',
  role: 'Rol',
  period: 'Dönem',
  label: 'Etiket',
  href: 'Adres',
  heading: 'Başlık',
  navLabel: 'Menü adı',
  body: 'Bölüm metni',
  ids: 'Sıra',
  currentPassword: 'Mevcut parola',
  newPassword: 'Yeni parola',
}

/**
 * Pydantic'in hata kodları İngilizce mesaj taşıyor; sık olanlar Türkçe.
 * Kendi kurallarımızın (`value_error`) mesajı zaten Türkçe (schemas.py).
 */
function describe(issue: Issue): string {
  const where = issue.loc
    .filter((part): part is string => typeof part === 'string' && part !== 'body')
    .map((part) => FIELD_LABELS[part] ?? part)
  let text: string
  switch (issue.type) {
    case 'value_error':
      text = issue.msg.replace(/^Value error, /, '')
      break
    case 'missing':
      text = 'eksik'
      break
    case 'string_too_short':
      text = issue.ctx?.min_length === 1 ? 'boş olamaz' : `en az ${issue.ctx?.min_length} karakter`
      break
    case 'too_short':
      text = 'en az bir öğe olmalı'
      break
    case 'string_pattern_mismatch':
      text = 'yalnızca küçük harf, rakam ve tire (ör. lion-staj)'
      break
    case 'literal_error':
      text = 'listede olmayan bir seçim'
      break
    default:
      text = issue.msg
  }
  return where.length > 0 ? `${where.join(' › ')}: ${text}` : text
}

async function readErrors(res: Response): Promise<string[]> {
  try {
    const data: { detail?: unknown } = await res.json()
    if (typeof data.detail === 'string') return [data.detail]
    if (Array.isArray(data.detail)) return (data.detail as Issue[]).map(describe)
  } catch {
    // Gövde JSON değil — aşağıdaki genel mesaj.
  }
  return [`Beklenmeyen hata (HTTP ${res.status})`]
}

// ── İstek ───────────────────────────────────────────────────────────────────

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(0, ['Sunucuya ulaşılamadı — API çalışıyor mu?'])
  }

  // Oturum düştü (süre doldu, parola başka yerde değişti) → giriş ekranına.
  // Giriş isteğinin kendi 401'i ("parola hatalı") bu değil: o sırada token yok.
  if (res.status === 401 && token) {
    setToken(null)
    throw new ApiError(401, ['Oturum sona erdi — yeniden giriş yap.'])
  }
  if (!res.ok) throw new ApiError(res.status, await readErrors(res))
  return (res.status === 204 ? undefined : await res.json()) as T
}

type TokenOut = { accessToken: string }

export const api = {
  login: (email: string, password: string) =>
    request<TokenOut>('POST', '/auth/login', { email, password }),
  me: () => request<{ id: number; email: string }>('GET', '/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<TokenOut>('PUT', '/auth/password', { currentPassword, newPassword }),

  /** Sitenin içeriği — ziyaretçinin gördüğüyle aynı şekil (content/types.ts). */
  content: () => request<RawSiteContent>('GET', '/content'),

  post: (path: string, body: unknown) => request<void>('POST', `/admin${path}`, body),
  put: (path: string, body: unknown) => request<void>('PUT', `/admin${path}`, body),
  remove: (path: string) => request<void>('DELETE', `/admin${path}`),
}
