import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { applyTheme } from '../theme/applyTheme'
import { PRESETS, PRESET_LIST } from '../theme/presets'
import type { PresetId } from '../theme/types'
import { useContent } from '../content/useContent'

/**
 * TOKEN LABORATUVARI — ?lab adresinden erişilir.
 *
 * Faz 1'de yerini gerçek Hero alacak. Ama atılacak kod değil, üç işi birden görüyor:
 *
 *   1. "Renkler veri" iddiasını GÖZLE GÖRÜLÜR kılıyor. presets.ts'te bir değer
 *      değiştir → buradaki her şey değişir. Faz 0'ın çıkış testi bu.
 *   2. Kontrast sorunlarını daha ilk günde açığa çıkarıyor (docs/DESIGN.md § F/4).
 *   3. Faz 8'deki panel tema editörünün tohumu — ön ayar geçişi orada da böyle çalışacak.
 *
 * ⚠️ Bu dosyada TEK BİR HEX YOK. Tüm renkler var(--token). Kural: docs/ARCHITECTURE.md § 4
 */

/** Token'ın CSS değişken adı ve ne işe yaradığı. Renk DEĞERİ burada yok — bilerek. */
const COLOR_TOKENS: Array<{ varName: string; label: string; note: string }> = [
  { varName: '--ground', label: 'ground', note: 'Sayfa zemini' },
  { varName: '--surface', label: 'surface', note: 'Kart ve panel zemini' },
  { varName: '--line', label: 'line', note: 'Ayraç, kenarlık' },
  { varName: '--ink', label: 'ink', note: 'Birincil metin' },
  { varName: '--ink-dim', label: 'inkDim', note: 'İkincil metin' },
  { varName: '--ink-faint', label: 'inkFaint', note: 'Etiket, meta' },
  { varName: '--lead', label: 'lead', note: '★ Lider aksan' },
]

const page: CSSProperties = {
  maxWidth: 'var(--max-width)',
  margin: '0 auto',
  padding: 'var(--space-12) var(--space-6)',
}

const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius)',
  padding: 'var(--space-6)',
}

const grid = (min: string): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}, 1fr))`,
  gap: 'var(--space-4)',
})

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 'var(--space-16)' }}>
      <p className="label" style={{ marginBottom: 'var(--space-4)' }}>
        {title}
      </p>
      {children}
    </section>
  )
}

/**
 * Renk kutucuğu.
 *
 * ★ Dikkat: rengi `PRESETS[...]` nesnesinden OKUMUYOR, `var(--token)` ile alıyor.
 * Yani kutucuk "presets.ts ne diyor"u değil, "CSS'e gerçekten ne ulaştı"yı gösteriyor.
 * Mimari testinin anlamlı olması buna bağlı.
 */
function Swatch({ varName, label, note }: { varName: string; label: string; note: string }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
      <div style={{ background: `var(${varName})`, height: 64 }} />
      <div style={{ padding: 'var(--space-3)', background: 'var(--surface)' }}>
        <p className="label" style={{ color: 'var(--ink)' }}>
          {label}
        </p>
        <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{note}</p>
      </div>
    </div>
  )
}

export function TokenLab() {
  const content = useContent()
  const [presetId, setPresetId] = useState<PresetId>(content.settings.preset)

  const preset = PRESETS[presetId]

  function choose(id: PresetId) {
    setPresetId(id)
    // Faz 8'de panel de tam olarak bunu yapacak: token'ları uygula, başka hiçbir şey.
    applyTheme(PRESETS[id].tokens)
  }

  return (
    <main style={page}>
      <header>
        <p className="label">Faz 0 · Token laboratuvarı</p>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 64px)', marginTop: 'var(--space-2)' }}>
          {content.profile.name}
        </h1>
        <p style={{ color: 'var(--ink-dim)', marginTop: 'var(--space-2)' }}>
          {content.profile.title} · {content.profile.location}
        </p>
      </header>

      {/* Tayf şeridi — "gökkuşağını gradyan olarak kullan, palet olarak değil"
          (docs/DESIGN.md § F/5). Tüm accent'lerden tek bir geçiş. */}
      <div
        style={{
          height: 3,
          marginTop: 'var(--space-8)',
          background: 'var(--spectrum)',
        }}
      />

      <Block title="Ön ayar — tıkla, tüm sayfa değişsin">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {PRESET_LIST.map((p) => {
            const active = p.id === presetId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => choose(p.id)}
                aria-pressed={active}
                style={{
                  cursor: 'pointer',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${active ? 'var(--lead)' : 'var(--line)'}`,
                  background: active ? 'var(--lead)' : 'var(--surface)',
                  color: active ? 'var(--ground)' : 'var(--ink-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--label-size)',
                  letterSpacing: 'var(--label-tracking)',
                  textTransform: 'uppercase',
                }}
              >
                {p.name}
              </button>
            )
          })}
        </div>
        <p style={{ color: 'var(--ink-dim)', marginTop: 'var(--space-4)' }}>{preset.note}</p>
      </Block>

      <Block title="Renk token'ları">
        <div style={grid('160px')}>
          {COLOR_TOKENS.map((t) => (
            <Swatch key={t.varName} {...t} />
          ))}
        </div>
      </Block>

      <Block title={`Destek tonları — accents (${preset.tokens.accents.length})`}>
        <div style={grid('120px')}>
          {/* Sayı ön ayardan geliyor (Aurora 5, Tayf 6), renk yine CSS değişkeninden. */}
          {preset.tokens.accents.map((_, i) => (
            <Swatch
              key={i}
              varName={`--accent-${i + 1}`}
              label={`accent-${i + 1}`}
              note="Rozet, küçük vurgu"
            />
          ))}
        </div>
      </Block>

      <Block title="Tipografi">
        <div style={card}>
          <h2 style={{ fontSize: 32 }}>Cabinet Grotesk · başlık</h2>
          <p style={{ marginTop: 'var(--space-3)', color: 'var(--ink-dim)' }}>
            Satoshi · gövde metni. {content.profile.tagline}
          </p>
          <p className="label" style={{ marginTop: 'var(--space-3)' }}>
            Departure Mono · etiket 11px
          </p>
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--ink-faint)', fontSize: 13 }}>
            Font dosyaları Faz 1'de gelecek; şu an sistem fontuna düşüyor.
          </p>
        </div>
      </Block>

      {/* İçerik katmanının uçtan uca çalıştığının kanıtı: bu bölümdeki her şey
          useContent()'ten geliyor, hiçbiri buraya yazılmadı. */}
      <Block title="İçerik katmanı — useContent()">
        <div style={grid('280px')}>
          {content.projects.map((project) => (
            <article key={project.id} style={card}>
              <h3 style={{ fontSize: 20 }}>{project.title}</h3>
              <p style={{ color: 'var(--ink-dim)', marginTop: 'var(--space-2)', fontSize: 15 }}>
                {project.summary}
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-4)',
                }}
              >
                {project.tech.map((tech) => (
                  <span
                    key={tech}
                    className="label"
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius)',
                      padding: '2px var(--space-2)',
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <nav style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
          {content.links.map((link) => (
            <a key={link.id} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </Block>

      <Block title="Faz 0 çıkış testi">
        <div style={card}>
          <p style={{ color: 'var(--ink-dim)' }}>
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--lead)' }}>
              theme/presets.ts
            </code>{' '}
            içinde Aurora'nın <strong style={{ color: 'var(--ink)' }}>lead</strong> değerini
            değiştir. Bu sayfadaki o rengi kullanan her şey — butonlar, linkler, kod metni,
            kutucuk — aynı anda değişmeli. Değişmiyorsa token sistemi kopuk demektir;
            Faz 1'e geçilmez.
          </p>
        </div>
      </Block>
    </main>
  )
}
