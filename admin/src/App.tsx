import { useCallback, useEffect, useState, useSyncExternalStore, type MouseEvent } from 'react'

import type { RawSiteContent } from '@site/content/types'

import { ApiError, api, getToken, setToken, subscribeToken } from './api'
import { SITE_URL } from './fields'
import { Login } from './Login'
import { paintPanel } from './theme'
import { DirtyProvider, PanelProvider } from './panel'
import { AccountPage } from './pages/AccountPage'
import { LinksPage } from './pages/LinksPage'
import { MediaPage } from './pages/MediaPage'
import { MilestonesPage } from './pages/MilestonesPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SectionsPage } from './pages/SectionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SkillsPage } from './pages/SkillsPage'

/**
 * Yönetim paneli (Faz 7b). Ayrı build — ziyaretçi bu kodu hiç indirmiyor.
 * Router yok: sayfa adresin #'inde (/admin/#profil), yenileyince yerinde kalır.
 */

const PAGES = [
  { id: 'genel', label: 'Genel' },
  { id: 'profil', label: 'Profil' },
  { id: 'yetenekler', label: 'Yetenekler' },
  { id: 'deneyim', label: 'Deneyim' },
  { id: 'egitim', label: 'Eğitim' },
  { id: 'baglantilar', label: 'Bağlantılar' },
  { id: 'bolumler', label: 'Bölümler' },
  { id: 'projeler', label: 'Projeler' },
  { id: 'medya', label: 'Medya' },
  { id: 'hesap', label: 'Hesap' },
] as const

type PageId = (typeof PAGES)[number]['id']

function readPage(): PageId {
  const hash = window.location.hash.slice(1)
  return PAGES.find((p) => p.id === hash)?.id ?? 'genel'
}

function subscribePage(fn: () => void): () => void {
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.messages.join(' ') : String(err)
}

export function App() {
  const token = useSyncExternalStore(subscribeToken, getToken)
  // Girişten gelindiyse tayf örtüsü panelin üstünde söner; sayfa yenilenince yok.
  // Örtü giriş ekranının renkleriyle söner: panel Tayf'a geçse de (theme.ts) ilk
  // karesi girişin son karesiyle aynı.
  const [veil, setVeil] = useState<string[] | null>(null)
  const signedIn = (next: string, accents: string[]) => {
    setVeil(accents)
    setToken(next)
  }
  if (!token) return <Login onSignedIn={signedIn} />
  return (
    <>
      <Panel />
      {veil && (
        <div
          className="veil is-leaving"
          aria-hidden="true"
          style={{ background: `linear-gradient(0deg, ${veil.join(', ')})` }}
          onAnimationEnd={() => setVeil(null)}
        />
      )}
    </>
  )
}

// ── Panel ───────────────────────────────────────────────────────────────────

function Panel() {
  const page = useSyncExternalStore(subscribePage, readPage)
  const [content, setContent] = useState<RawSiteContent | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const next = await api.content()
    setContent(next)
    return next
  }, [])

  const load = useCallback(() => {
    setLoadError(null)
    reload().catch((err) => setLoadError(messageOf(err)))
  }, [reload])

  // Giriş ekranı sitenin paletindeydi; çalışma ekranları hep Tayf (theme.ts).
  useEffect(paintPanel, [])

  useEffect(() => {
    load()
    // Token'ı da doğruluyor: geçersizse 401 → giriş ekranı (api.ts).
    api.me().then((me) => setEmail(me.email), () => {})
  }, [load])

  useEffect(() => {
    document.title = `${PAGES.find((p) => p.id === page)?.label} · Yönetim paneli`
  }, [page])

  // ── Kaydedilmemiş değişiklikler: sayfa değişiminde ve sekme kapanırken uyar ──
  const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set())
  const [leaving, setLeaving] = useState<PageId | 'logout' | null>(null)

  const mark = useCallback((id: string, isDirty: boolean) => {
    setDirty((prev) => {
      if (prev.has(id) === isDirty) return prev
      const next = new Set(prev)
      if (isDirty) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  useEffect(() => {
    if (dirty.size === 0) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty.size])

  const leave = (target: PageId | 'logout') => {
    setLeaving(null)
    if (target === 'logout') setToken(null)
    else window.location.hash = target
  }

  const navigate = (e: MouseEvent, target: PageId) => {
    if (dirty.size > 0 && target !== page) {
      e.preventDefault()
      setLeaving(target)
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Yönetim</span>
        <div className="topbar-tools">
          {email && <span className="topbar-user">{email}</span>}
          <a className="btn" href={SITE_URL} target="_blank" rel="noreferrer">
            Siteyi aç ↗
          </a>
          <button type="button" className="btn" onClick={() => (dirty.size > 0 ? setLeaving('logout') : leave('logout'))}>
            Çıkış
          </button>
        </div>
      </header>

      <nav className="side" aria-label="Sayfalar">
        {PAGES.map((p) => (
          <a
            key={p.id}
            href={`#${p.id}`}
            aria-current={p.id === page ? 'page' : undefined}
            onClick={(e) => navigate(e, p.id)}
          >
            {p.label}
          </a>
        ))}
      </nav>

      <main className="main">
        {leaving && (
          <div className="guard" role="alert">
            <p>Kaydedilmemiş değişiklikler var.</p>
            <button type="button" className="btn btn-danger" onClick={() => leave(leaving)}>
              Kaydetmeden {leaving === 'logout' ? 'çık' : 'geç'}
            </button>
            <button type="button" className="btn" onClick={() => setLeaving(null)}>
              Kal
            </button>
          </div>
        )}

        {loadError ? (
          <div className="card">
            <p className="status status-error" role="alert">
              İçerik yüklenemedi: {loadError}
            </p>
            <button type="button" className="btn" onClick={load}>
              Yeniden dene
            </button>
          </div>
        ) : !content ? (
          <p className="hint">Yükleniyor…</p>
        ) : (
          <PanelProvider value={{ content, reload }}>
            <DirtyProvider value={mark}>
              <CurrentPage key={page} page={page} email={email} />
            </DirtyProvider>
          </PanelProvider>
        )}
      </main>
    </div>
  )
}

function CurrentPage({ page, email }: { page: PageId; email: string | null }) {
  switch (page) {
    case 'genel':
      return <SettingsPage />
    case 'profil':
      return <ProfilePage />
    case 'yetenekler':
      return <SkillsPage />
    case 'deneyim':
      return <MilestonesPage kind="experience" />
    case 'egitim':
      return <MilestonesPage kind="education" />
    case 'baglantilar':
      return <LinksPage />
    case 'bolumler':
      return <SectionsPage />
    case 'projeler':
      return <ProjectsPage />
    case 'medya':
      return <MediaPage />
    case 'hesap':
      return <AccountPage email={email} />
  }
}
