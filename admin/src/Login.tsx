import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react'

import { PRESETS } from '@site/theme/presets'

import { ApiError, api } from './api'
import { TextInput } from './fields'

/**
 * Giriş ekranı — Oturum 5, kullanıcı seçimi "B + E + F", ilk etapta İngilizce.
 * Seçenekler canlı: https://claude.ai/artifact/1CCFheJHSJoFp7dJC7kSBb
 *
 *   B · Prizma kapı   formun üstünde prizma kendini çizer, ışık kırılır, ADMIN
 *                     sitedeki gibi harf harf çözülür (Katakana + tayf)
 *   E · Giriş anı     parola doğruysa tayf prizmadan taşar, ekranı doldurur, panel belirir
 *   F · Hata          yanlışsa kart hafifçe sallanır, mesaj çıkar. Kartın tepesindeki
 *                     tayf şeridi kullanıcı isteğiyle kalktı; "401 nm" soğurma
 *                     çizgisi sıradaki adımda gerçek tayfa taşınacak (404 gibi,
 *                     PrismStage `lines` + `mark` — CLAUDE.md "Sırada")
 *
 * Hareket yalnızca burada; panelin çalışma ekranları sakin (kullanıcıyla konuşuldu).
 * Hareket azaltma tercihinde hiçbiri oynamaz: son kare, girişte doğrudan panel.
 */

const ACCENTS = PRESETS.tayf.tokens.accents
const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const BRAND = 'ADMIN'
/** E: tayfın ekranı doldurma süresi; ardından panel. admin.css → .login-flood ile aynı. */
const FLOOD_MS = 1000
/** B: ADMIN'in çözülmeye başladığı an — prizma ve ışık çizildikten sonra. */
const SCRAMBLE_AT = 1500
const SCRAMBLE_MS = 900

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Login({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'busy' | 'entering'>('idle')
  const rootRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLFormElement>(null)
  const prismRef = useRef<SVGSVGElement>(null)
  const brandRef = useRef<HTMLParagraphElement>(null)
  // Çift gönderim kilidi: `phase` bir sonraki render'a kadar eski kalıyor, aynı
  // anda gelen iki Enter/tıklama ikisi de geçerdi.
  const inFlight = useRef(false)

  useEffect(() => {
    document.title = 'Sign in · Admin'
    const brand = brandRef.current
    if (!brand || reducedMotion()) return
    const timer = window.setTimeout(() => scramble(brand, BRAND), SCRAMBLE_AT)
    return () => window.clearTimeout(timer)
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    inFlight.current = true
    setPhase('busy')
    setError(null)
    try {
      const { accessToken } = await api.login(email.trim(), password)
      if (reducedMotion()) return onSignedIn(accessToken)
      // E: tayf prizmanın çıkışından taşsın — daire oradan açılıyor.
      const box = prismRef.current?.getBoundingClientRect()
      if (box) {
        rootRef.current?.style.setProperty('--flood-x', `${box.left + box.width * 0.68}px`)
        rootRef.current?.style.setProperty('--flood-y', `${box.top + box.height * 0.4}px`)
      }
      setPhase('entering')
      window.setTimeout(() => onSignedIn(accessToken), FLOOD_MS)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Wrong email or password.'
          : err instanceof ApiError && err.status === 0
            ? 'Can’t reach the server. Is the API running?'
            : `Sign-in failed${err instanceof ApiError ? ` (HTTP ${err.status})` : ''}.`,
      )
      inFlight.current = false
      setPhase('idle')
      // F: her yanlış denemede yeniden sallanır (CSS sınıfı ikinci kez tetiklenmezdi).
      if (!reducedMotion()) {
        cardRef.current?.animate(
          [{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '-4px' }, { translate: '2px' }, { translate: '0' }],
          { duration: 450, easing: 'ease-out' },
        )
      }
    }
  }

  const className = ['login', error && 'is-error', phase === 'entering' && 'is-entering'].filter(Boolean).join(' ')

  return (
    <main className={className} ref={rootRef} lang="en">
      <Stars />
      <div className="login-stack">
        <PrismScene svgRef={prismRef} />
        <form className="login-card" ref={cardRef} onSubmit={submit} noValidate>
          <p className="brand" ref={brandRef}>
            {BRAND}
          </p>
          <TextInput label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} />
          <TextInput
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
          <p className="login-error" role="alert">
            {error}
          </p>
          <button type="submit" className="btn btn-primary" disabled={phase !== 'idle' || !email || !password}>
            {phase === 'idle' ? 'Sign in' : 'Signing in…'}
          </button>
        </form>
      </div>
      {/* E: panel açılmadan önce ekranı dolduran tayf. */}
      <div className="login-flood" aria-hidden="true" />
    </main>
  )
}

/**
 * B: prizma, ışık ve tayf yelpazesi — sitenin sahnesinin sadeleşmişi.
 *
 * Kutu 240×200; ışık soldan, tayf sağa kutunun DIŞINA taşıyor (overflow: visible)
 * ve ekranın kenarında kırpılıyor. Böylece prizma her ekran oranında formun hemen
 * üstünde; tüm sahneyi tek bir tuvale çizmek dar ve geniş ekranda kaydırıyordu.
 */
function PrismScene({ svgRef }: { svgRef: RefObject<SVGSVGElement | null> }) {
  const id = useId().replace(/:/g, '')
  const s = 196
  const h = s * 0.866
  const A: Pt = [120, 12]
  const L: Pt = [A[0] - s / 2, A[1] + h]
  const R: Pt = [A[0] + s / 2, A[1] + h]
  const entry = lerp(A, L, 0.55)
  const exit = lerp(A, R, 0.45)
  // Işık ~11° yükselerek gelir (ekranın kenarından); yelpaze -9°…+19° açılır ve
  // FAN px'te söner. ⚠️ Ekranın kenarına kadar uzasaydı renk geçişinin yalnızca
  // ortası görünürdü: gradyan yelpazenin tamamına yayılıyor, uçları ekran dışında kalırdı.
  const FAN = 620
  const from: Pt = [entry[0] - 1800, entry[1] + 360]
  const fanTop: Pt = [exit[0] + FAN, exit[1] - FAN * 0.16]
  const fanBottom: Pt = [exit[0] + FAN, exit[1] + FAN * 0.34]
  const back = [A, L, R].map(([x, y]): Pt => [x + s * 0.14, y - s * 0.1])

  return (
    <svg className="login-prism" ref={svgRef} viewBox="0 0 240 200" aria-hidden="true">
      <defs>
        {/* Yelpaze: tepede kırmızı, dipte mor — prizma kısa dalga boyunu daha çok kırar. */}
        <linearGradient id={`${id}fan`} x1="0" y1="0" x2="0" y2="1">
          {ACCENTS.map((_, i) => (
            <stop key={i} offset={i / (ACCENTS.length - 1)} style={{ stopColor: `var(--accent-${ACCENTS.length - i})` }} />
          ))}
        </linearGradient>
        <linearGradient id={`${id}beam`} gradientUnits="userSpaceOnUse" x1={from[0]} y1={from[1]} x2={entry[0]} y2={entry[1]}>
          <stop offset="0" style={{ stopColor: 'var(--ink)', stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: 'var(--ink)', stopOpacity: 0.95 }} />
        </linearGradient>
        <linearGradient id={`${id}glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--lead)', stopOpacity: 0.1 }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-1)', stopOpacity: 0.16 }} />
        </linearGradient>
        <filter id={`${id}blur`} x="-10%" y="-60%" width="120%" height="220%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        {/* Yelpaze ucunda söner: ışık dağılıyor, sert bir kenar yok. */}
        <linearGradient id={`${id}fade`} gradientUnits="userSpaceOnUse" x1={exit[0]} y1="0" x2={exit[0] + FAN} y2="0">
          <stop offset="0.45" style={{ stopColor: 'var(--ink)', stopOpacity: 1 }} />
          <stop offset="1" style={{ stopColor: 'var(--ink)', stopOpacity: 0 }} />
        </linearGradient>
        <mask id={`${id}mask`} maskUnits="userSpaceOnUse" x={exit[0]} y={exit[1] - FAN} width={FAN + 40} height={FAN * 2}>
          <rect x={exit[0]} y={exit[1] - FAN} width={FAN + 40} height={FAN * 2} fill={`url(#${id}fade)`} />
        </mask>
      </defs>
      <g className="login-fan" mask={`url(#${id}mask)`}>
        <polygon points={points(exit, fanTop, fanBottom)} fill={`url(#${id}fan)`} filter={`url(#${id}blur)`} opacity={0.5} />
        <polygon points={points(exit, fanTop, fanBottom)} fill={`url(#${id}fan)`} opacity={0.85} />
      </g>
      <line className="login-beam" pathLength={1} x1={from[0]} y1={from[1]} x2={entry[0]} y2={entry[1]} stroke={`url(#${id}beam)`} strokeWidth={3} />
      <line className="login-pulse" pathLength={1} x1={from[0]} y1={from[1]} x2={entry[0]} y2={entry[1]} strokeWidth={4} strokeLinecap="round" />
      <polygon className="login-back" points={points(...back)} />
      <polygon className="login-body" pathLength={1} points={points(A, L, R)} fill={`url(#${id}glass)`} strokeLinejoin="round" />
      <line className="login-inner" x1={entry[0]} y1={entry[1]} x2={exit[0]} y2={exit[1]} />
    </svg>
  )
}

type Pt = [number, number]
const lerp = (p: Pt, q: Pt, t: number): Pt => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
const points = (...pts: Pt[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/** Gece göğü — sitenin Starfield'ının küçüğü; konumlar bir kez, rastgele. */
function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, () => ({
        left: `${(Math.random() * 100).toFixed(2)}%`,
        top: `${(Math.random() * 100).toFixed(2)}%`,
        size: Math.random() < 0.85 ? 1 : 2,
        opacity: 0.25 + Math.random() * 0.5,
        duration: `${(3 + Math.random() * 4).toFixed(1)}s`,
        delay: `${(-Math.random() * 6).toFixed(1)}s`,
      })),
    [],
  )
  return (
    <div className="login-stars" aria-hidden="true">
      {stars.map((st, i) => (
        <i
          key={i}
          style={{
            left: st.left,
            top: st.top,
            width: st.size,
            height: st.size,
            opacity: st.opacity,
            animationDuration: st.duration,
            animationDelay: st.delay,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Harf çözülmesi — sitenin scramble.ts'inin kısası (Katakana + tayf, soldan sağa
 * yerleşir). Sitenin modülü doğrudan alınamıyor: sahnenin durumuna ve içeriğe bağlı.
 */
function scramble(el: HTMLElement, text: string): void {
  const chars = [...text]
  el.textContent = ''
  const spans = chars.map((c) => {
    const span = document.createElement('span')
    span.textContent = c
    el.append(span)
    return span
  })
  const start = performance.now()
  const tick = (now: number) => {
    const t = (now - start) / SCRAMBLE_MS
    let done = true
    spans.forEach((span, i) => {
      if (t >= (i + 1) / chars.length) {
        span.textContent = chars[i]
        span.style.removeProperty('color')
        span.style.removeProperty('-webkit-text-fill-color')
      } else {
        done = false
        span.textContent = KATAKANA[Math.floor(Math.random() * KATAKANA.length)]
        const color = ACCENTS[(i + Math.floor(now / 70)) % ACCENTS.length]
        span.style.color = color
        span.style.setProperty('-webkit-text-fill-color', color)
      }
    })
    if (done) el.textContent = text
    else requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
