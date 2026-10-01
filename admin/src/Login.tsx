import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import gsap from 'gsap'

import { RingTitle, arc, useRing } from '@site/components/Ring'
import { Starfield } from '@site/components/Starfield'
import { PrismStage } from '@site/prism/PrismStage'
import { darkenScene, scene } from '@site/prism/scene'
import type { AbsorptionLine } from '@site/prism/optics'

import { ApiError, api } from './api'
import { TextInput } from './fields'
import { paintLogin, type LoginLook } from './theme'

/**
 * Giriş ekranı — sitenin GERÇEK prizması (Oturum 5 sonu, kullanıcı: "kalite intro
 * sayfamızdaki gibi", "404'te zaten bu prizma var, oradan uydur").
 *
 *   Düzen   ortada prizma (`PrismStage` + `Starfield`), ADMIN onu çevreleyen
 *           dairenin üst yayında — Giriş slaytındaki isim gibi, aynı `Ring` ve
 *           aynı boyda (sitedeki ismin uzunluğundan; kullanıcı: "genel bir uyum").
 *           Altta form, alanlar alt alta. Prizma ve daire ortanın biraz üstünde (--lift).
 *   Açılış  sitenin intro.ts zamanlamaları, `scene` üzerinde: kenarlar çizilir,
 *           ışık gelir, tayf açılır; ADMIN harf harf çözülür (Katakana + tayf).
 *   Hata    yanlış parolada tayfta "401 nm" soğurma çizgisi (404'ün şakası) ve
 *           form sallanır. Çizgiler PrismStage'in efekt bağımlılığı değil →
 *           `key` ile yeniden kuruluyor.
 *   Giriş   tayf dalgalanıp büyür (`scene.surge`), sahne tayfın içindeki bir
 *           noktaya yakınlaşır, tayf ekranı sarar; panelin üstündeki örtü (App,
 *           `.veil`) aynı renklerle başlayıp söner.
 *
 * Renkler sitenin panelde seçili paletinden (theme.ts → paintLogin); panelin
 * çalışma ekranları Tayf'ta kalıyor.
 *
 * Hareket azaltma tercihinde hiçbiri oynamaz: sahne tam, girişte doğrudan panel.
 */

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const BRAND = 'ADMIN'
const SCRAMBLE_MS = 900
/** 401 Unauthorized → 401 nm. Uydurma bir çizgi, ama 404'ünkü gibi tayfın mor ucunda. */
const ERROR_LINES: AbsorptionLine[] = [{ nm: 401, label: '401 nm' }]
/** Giriş anı: yakınlaşmanın süresi (sn). Örtü son ~üçte birinde gelir. */
const ENTER_S = 1.1

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

type SignedIn = (token: string, accents: string[]) => void

/** Önce sitenin paleti, sonra ekran — açılış yanlış renklerle başlamasın. */
export function Login({ onSignedIn }: { onSignedIn: SignedIn }) {
  const [look, setLook] = useState<LoginLook | null>(null)
  useEffect(() => {
    let live = true
    paintLogin().then((next) => live && setLook(next))
    return () => {
      live = false
    }
  }, [])
  return look && <LoginScreen accents={look.tokens.accents} nameChars={look.nameChars} onSignedIn={onSignedIn} />
}

type ScreenProps = { accents: string[]; nameChars: number; onSignedIn: SignedIn }

function LoginScreen({ accents, nameChars, onSignedIn }: ScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const ringRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<SVGGElement>(null)
  const arcId = `login-ring-${useId().replace(/:/g, '')}`
  const geo = useRing(ringRef, nameChars)
  const formRef = useRef<HTMLFormElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  // Çift gönderim kilidi: `busy` bir sonraki render'a kadar eski kalıyor.
  const inFlight = useRef(false)

  // ── Açılış ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.title = 'Sign in · Admin'
    const brand = brandRef.current
    const form = formRef.current
    if (reducedMotion() || !brand || !form) {
      Object.assign(scene, { frame: 1, beam: 1, fan: 1, labels: 1, surge: 0, dirty: true })
      return
    }
    darkenScene()
    const stars = document.querySelector<HTMLElement>('.starfield')
    const t = gsap.timeline()
    if (stars) t.fromTo(stars, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power1.out' }, 0)
    t.to(scene, { frame: 1, duration: 0.9, ease: 'power2.inOut' }, 0.3)
      .to(scene, { beam: 1, duration: 0.7, ease: 'power2.in' }, 1.0)
      .to(scene, { fan: 1, duration: 0.8, ease: 'power3.out' }, 1.7)
      .to(scene, { labels: 1, duration: 0.6, ease: 'power1.out' }, 2.3)
      .fromTo([brand, form], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1 }, 2.3)
      .call(() => scramble(brand.querySelector('textPath'), BRAND, accents), undefined, 2.3)

    // Sitedeki gibi: her girdi atlatır; rAF durursa (gizli sekme) emniyet sarar —
    // form kalıcı gizli kalamaz.
    const events = ['keydown', 'pointerdown'] as const
    const skip = () => t.progress(1)
    events.forEach((ev) => window.addEventListener(ev, skip, { capture: true, passive: true }))
    const safety = window.setTimeout(skip, t.duration() * 1000 + 1500)
    return () => {
      window.clearTimeout(safety)
      events.forEach((ev) => window.removeEventListener(ev, skip, true))
      t.kill()
      // StrictMode'da efekt iki kez kuruluyor: yarıda kalan sahne karanlık kalmasın.
      Object.assign(scene, { frame: 1, beam: 1, fan: 1, labels: 1, surge: 0, dirty: true })
    }
  }, [accents])

  // ── Giriş anı ──────────────────────────────────────────────────────────────
  const enter = (token: string) => {
    const stage = document.querySelector<HTMLElement>('.prism-stage')
    const fan = stage?.querySelector('.prism-main .prism-fan')?.getBoundingClientRect()
    if (reducedMotion() || !stage || !fan || fan.height === 0) return onSignedIn(token, accents)

    // Yakınlaşma tayfın içindeki bir noktadan: yelpazenin ortası, prizmadan biraz uzakta.
    // transform-origin sahnenin kendi kutusuna göre (sahne CSS'te yukarı kaymış).
    const box = stage.getBoundingClientRect()
    const ox = fan.left + fan.width * 0.6 - box.left
    const oy = fan.top + fan.height * 0.5 - box.top
    const zoom = Math.min(40, Math.max(8, (2.4 * window.innerHeight) / fan.height))
    // Ayrı katman: sahne bir kez çizilip doku olarak büyüsün. Yoksa tarayıcı her karede
    // 8-40× ölçekte yeniden çiziyordu (hale blur(22px) dahil) — ölçüldü: 113-267 ms'lik
    // takılmalar (Oturum 6, kullanıcı: "giriş animasyonu kasıyor").
    stage.style.willChange = 'transform'
    gsap
      .timeline({ onComplete: () => onSignedIn(token, accents) })
      .to([brandRef.current, formRef.current], { opacity: 0, y: -12, duration: 0.35, ease: 'power2.in' }, 0)
      .to('.starfield', { opacity: 0, duration: 0.6 }, 0)
      .to(scene, { surge: 1, duration: 0.5, ease: 'power2.out' }, 0)
      .fromTo(
        stage,
        { transformOrigin: `${ox}px ${oy}px`, scale: 1 },
        { scale: zoom, duration: ENTER_S, ease: 'power3.in' },
        0.1,
      )
      .to(veilRef.current, { opacity: 1, duration: 0.4, ease: 'power1.in' }, 0.1 + ENTER_S - 0.4)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try {
      const { accessToken } = await api.login(email.trim(), password)
      enter(accessToken)
    } catch (err) {
      const unauthorized = err instanceof ApiError && err.status === 401
      setWrong(unauthorized)
      setError(
        unauthorized
          ? 'Wrong email or password.'
          : err instanceof ApiError && err.status === 0
            ? 'Can’t reach the server. Is the API running?'
            : `Sign-in failed${err instanceof ApiError ? ` (HTTP ${err.status})` : ''}.`,
      )
      inFlight.current = false
      setBusy(false)
      // Her yanlış denemede yeniden sallanır (CSS sınıfı ikinci kez tetiklenmezdi).
      if (!reducedMotion()) {
        formRef.current?.animate(
          [{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '-4px' }, { translate: '2px' }, { translate: '0' }],
          { duration: 450, easing: 'ease-out' },
        )
      }
    }
  }

  return (
    <main className="login" lang="en">
      <Starfield />
      <PrismStage key={wrong ? 'wrong' : 'clear'} lines={wrong ? ERROR_LINES : undefined} mark={wrong} />
      <div className="login-ring" ref={ringRef}>
        <svg className="ring" viewBox={`0 0 ${geo.W} ${geo.H}`} width={geo.W} height={geo.H} aria-hidden="true">
          <defs>
            <path id={arcId} d={arc(geo, geo.r, 1)} />
          </defs>
          <g ref={brandRef}>
            <RingTitle geo={geo} path={arcId} text={BRAND} />
          </g>
        </svg>
      </div>
      <div className="login-frame">
        <h1 className="sr-only">Admin</h1>
        <div className="login-bottom">
          <form className="login-form" ref={formRef} onSubmit={submit} noValidate>
            <TextInput label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} />
            <TextInput
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !email || !password}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="login-error" role="alert">
            {error}
          </p>
        </div>
      </div>
      {/* Giriş anının son karesi — App'teki örtünün ilk karesiyle aynı. */}
      <div className="veil" ref={veilRef} aria-hidden="true" style={{ opacity: 0 }} />
    </main>
  )
}

/**
 * Harf çözülmesi — sitenin scramble.ts'inin kısası (Katakana + tayf, soldan sağa
 * yerleşir). Sitenin modülü doğrudan alınamıyor: sahnenin durumuna ve içeriğe bağlı.
 * Hedef dairedeki <textPath>: harfler <tspan>, renk dolgu ve konturda (başlığın
 * kalınlığı kontur, .ring-title). `textLength` yayda boyu sabit tutuyor.
 */
function scramble(el: Element | null, text: string, accents: string[]): void {
  if (!el) return
  const chars = [...text]
  el.textContent = ''
  const spans = chars.map((c) => {
    const span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
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
        span.style.removeProperty('fill')
        span.style.removeProperty('stroke')
      } else {
        done = false
        span.textContent = KATAKANA[Math.floor(Math.random() * KATAKANA.length)]
        const color = accents[(i + Math.floor(now / 70)) % accents.length]
        span.style.fill = color
        span.style.stroke = color
      }
    })
    if (done) el.textContent = text
    else requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
