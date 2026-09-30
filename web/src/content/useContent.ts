import type { Locale } from '../i18n/types'
import { useLocale } from '../i18n/useLocale'
import { SITE } from './site'
import type { Milestone, RawMilestone, RawSiteContent, SiteContent } from './types'

/**
 * ★ İÇERİĞİN OKUNDUĞU TEK NOKTA.
 *
 * Kural: hiçbir bileşen site.ts'i doğrudan import etmeyecek. Hepsi buradan okuyacak.
 * Sebebi Faz 6: içerik content.json'a taşınınca değişecek tek dosya bu olsun,
 * bileşenlere hiç dokunulmasın (docs/ROADMAP.md).
 *
 * Bileşenler ÇÖZÜLMÜŞ içerik alıyor — düz string, dil bilgisi yok. Yani dil
 * eklenmesi bileşen imzalarını hiç değiştirmedi.
 *
 * ⚠️ Senkron — loading/error durumu yok. Faz 6'da content.json React mount'tan
 * ÖNCE yüklenip setContent() ile verilecek, bu imza değişmeyecek.
 * Gerekçe: docs/ARCHITECTURE.md § 3 (ziyaretçi tarafı statik site hızında kalmalı).
 */

let raw: RawSiteContent = SITE

/** Faz 6'da main.tsx content.json'ı çekip bunu çağıracak. */
export function setContent(next: RawSiteContent): void {
  raw = next
}

function resolveMilestones(list: RawMilestone[], locale: Locale): Milestone[] {
  return list
    .map((m) => ({ ...m, role: m.role[locale], note: m.note?.[locale] }))
    .sort((a, b) => a.order - b.order)
}

function resolveContent(source: RawSiteContent, locale: Locale): SiteContent {
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
      }))
      .sort((a, b) => a.order - b.order),
    sections: source.sections
      .map((s) => ({
        ...s,
        heading: s.heading[locale],
        navLabel: (s.navLabel ?? s.heading)[locale],
        body: s.body[locale],
      }))
      .sort((a, b) => a.order - b.order),
  }
}

export function useContent(): SiteContent {
  const locale = useLocale()
  return resolveContent(raw, locale)
}

/** Tema ön ayarı dile bağlı değil — main.tsx mount öncesi buna ihtiyaç duyuyor. */
export function getPreset(): RawSiteContent['settings']['preset'] {
  return raw.settings.preset
}
