import type { Locale } from '../i18n/types'
import { useLocale } from '../i18n/useLocale'
import type {
  Media,
  Milestone,
  RawMedia,
  RawMilestone,
  RawSection,
  RawSiteContent,
  SiteContent,
} from './types'

/**
 * ★ İÇERİĞİN OKUNDUĞU TEK NOKTA.
 *
 * Kaynak `/content.json` (Faz 6): API veritabanından yazıyor, Caddy sunuyor —
 * ziyaretçi tarafı veritabanını hiç görmüyor (docs/ARCHITECTURE.md § 3).
 * Geliştirmede Vite aynı adresi API'ye yönlendiriyor (vite.config.ts).
 *
 * Bileşenler ÇÖZÜLMÜŞ içerik alıyor — düz string, dil bilgisi yok. Yani dil
 * eklenmesi bileşen imzalarını hiç değiştirmedi.
 *
 * ⚠️ Senkron — loading/error durumu yok. main.tsx içeriği React mount'tan ÖNCE
 * bekliyor (`loadContent`); gelmezse site hiç mount edilmiyor, yerine hata ekranı.
 * Yedek içerik bilerek yok (kullanıcı kararı, Faz 6): tek kaynak veritabanı.
 */

let raw: RawSiteContent | null = null

/**
 * main.tsx mount'tan önce bekliyor. index.html aynı adresi önden çekiyor
 * (`<link rel="preload">`) — JS inerken içerik de iniyor.
 *
 * ⚠️ `fetch`'e önbellek seçeneği verilmiyor: preload'la eşleşmesi için istek
 * birebir aynı olmalı. Tazelik sunucudan: Caddy `Cache-Control: no-cache`
 * gönderiyor, her açılışta ETag ile doğrulanıyor (değişmediyse 304).
 */
export async function loadContent(): Promise<void> {
  const res = await fetch('/content.json')
  if (!res.ok) throw new Error(`/content.json yüklenemedi: HTTP ${res.status}`)
  raw = (await res.json()) as RawSiteContent
}

function source(): RawSiteContent {
  if (!raw) throw new Error('İçerik yüklenmeden okundu — main.tsx loadContent()’i beklemeli.')
  return raw
}

function resolveMilestones(list: RawMilestone[], locale: Locale): Milestone[] {
  return list
    .map((m) => ({ ...m, role: m.role[locale], note: m.note?.[locale] }))
    .sort((a, b) => a.order - b.order)
}

function resolveMedia<M extends RawMedia>(m: M, locale: Locale): Media {
  return { id: m.id, width: m.width, height: m.height, widths: m.widths, alt: m.alt[locale] }
}

/** Bugün (ziyaretçinin yerel günü) ISO biçiminde — duyurunun aralığıyla karşılaştırılır. */
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Duyurunun yayın aralığı SİTEDE değerlendiriliyor: yayın (content.json) her gün
 * yeniden yazılmıyor, tarih geçince duyuru kendiliğinden düşmeli. ISO tarihler
 * metin olarak doğru sıralanıyor.
 */
function inWindow(s: RawSection, day: string): boolean {
  return (!s.startsOn || s.startsOn <= day) && (!s.endsOn || day <= s.endsOn)
}

function resolveContent(source: RawSiteContent, locale: Locale): SiteContent {
  const day = today()
  return {
    settings: {
      preset: source.settings.preset,
      metaTitle: source.settings.metaTitle[locale],
      metaDescription: source.settings.metaDescription[locale],
    },
    profile: {
      name: source.profile.name,
      title: source.profile.title[locale],
      location: source.profile.location[locale],
      tagline: source.profile.tagline[locale],
      bio: source.profile.bio[locale],
      skills: source.profile.skills.map((g) => ({
        ...g,
        group: g.group[locale],
        note: g.note?.[locale],
      })),
      experience: resolveMilestones(source.profile.experience, locale),
      education: resolveMilestones(source.profile.education, locale),
    },
    links: source.links
      .map((l) => ({ ...l, label: l.label[locale] }))
      .sort((a, b) => a.order - b.order),
    projects: source.projects
      .filter((p) => p.published)
      .map((p) => ({
        ...p,
        title: p.title[locale],
        summary: p.summary[locale],
        description: p.description[locale],
        cover: p.cover && resolveMedia(p.cover, locale),
      }))
      .sort((a, b) => a.order - b.order),
    sections: source.sections
      .filter((s) => s.kind !== 'announcement' || inWindow(s, day))
      .map((s) => ({
        ...s,
        heading: s.heading[locale],
        navLabel: (s.navLabel ?? s.heading)[locale],
        body: s.body[locale],
        items: s.items && resolveMilestones(s.items, locale),
        media: s.media?.map((m) => ({ ...resolveMedia(m, locale), caption: m.caption?.[locale] })),
        link: s.link && { label: s.link.label[locale], href: s.link.href },
      }))
      .sort((a, b) => a.order - b.order),
  }
}

export function useContent(): SiteContent {
  const locale = useLocale()
  return resolveContent(source(), locale)
}

/** Tema ön ayarı dile bağlı değil — main.tsx mount öncesi buna ihtiyaç duyuyor. */
export function getPreset(): RawSiteContent['settings']['preset'] {
  return source().settings.preset
}
