import type { Localized } from '../i18n/types'
import type { PresetId } from '../theme/types'

/**
 * İçerik sözleşmesi.
 *
 * Bu tipler Faz 5'teki SQLite şemasının taslağı (docs/ARCHITECTURE.md § 5).
 * Şimdi doğru tasarlanırsa sonra göç olmaz.
 *
 * ── İKİ ŞEKİL ───────────────────────────────────────────────────────────────
 *
 *   Raw*      → DEPOLAMA şekli. site.ts ve Faz 6'daki content.json bunu tutar.
 *               Düzyazı alanlar Localized<T>, yani her dilin karşılığı yan yana.
 *   (Raw'sız) → ÇÖZÜLMÜŞ şekil. Bileşenlerin gördüğü. Düz string.
 *
 * Bileşenler yalnızca çözülmüş şekli görüyor → dili hiç bilmiyorlar.
 * useContent() aradaki çeviriyi yapıyor.
 *
 * ⚠️ Yalnızca düzyazı çevriliyor. id / slug / href / icon / order / tech[] /
 * published / preset tek kaynakta kalıyor — aynı veriyi iki dilde tutmak
 * kaymaya davetiye çıkarır (proje URL'si iki yerde durmamalı).
 */

// ── Çözülmüş (bileşenlerin gördüğü) ────────────────────────────────────────

export type SiteSettings = {
  preset: PresetId
  metaTitle: string
  metaDescription: string
}

/**
 * Gruplu yetenek listesi. Grup adı çevrilir ("Veri ve Altyapı" / "Data & Infra"),
 * teknoloji adları çevrilmez — React her dilde React.
 */
export type SkillGroup = {
  id: string
  group: string
  items: string[]
  /**
   * Grubu açan kısa not. ÇEVRİLİR.
   *
   * Gerekli çünkü `items` yalnızca dilden bağımsız teknoloji adlarını taşır
   * (React her dilde React). "Zaman serisi analizi" gibi açıklayıcı ifadeler
   * oraya konursa İngilizce'ye geçince Türkçe kalır — bir kez oldu, bu alan o yüzden var.
   */
  note?: string
}

/**
 * Deneyim ve eğitim aynı şekle sahip: kurum + rol + dönem.
 * Kurum adı ve dönem çevrilmez (özel isim / tarih), rol ve not çevrilir.
 */
export type Milestone = {
  id: string
  org: string
  role: string
  period: string
  note?: string
  order: number
}

export type Profile = {
  /** Çevrilmez — özel isim. */
  name: string
  title: string
  location: string
  tagline: string
  bio: string[]
  skills: SkillGroup[]
  experience: Milestone[]
  education: Milestone[]
}

export type Link = {
  id: string
  label: string
  href: string
  icon: string
  order: number
}

export type Project = {
  id: string
  slug: string
  title: string
  summary: string
  description: string[]
  /** Çevrilmez — teknoloji adları her dilde aynı. */
  tech: string[]
  /**
   * Kaynak kod ve canlı demo. ÇEVRİLMEZ — URL yapısal veri, tek kaynakta kalır
   * (aynı adresi iki dilde tutmak kaymaya davetiye çıkarır, § 5).
   * Adlar veritabanı sütunlarıyla aynı: models.py → Project.repo_url / live_url.
   * Boş bırakılan bağlantı kartta hiç görünmez — her projenin ikisi de olmayabilir.
   */
  repoUrl?: string
  liveUrl?: string
  order: number
  published: boolean
}

export type Section = {
  id: string
  slug: string
  heading: string
  /** Üst menüdeki ad. İçerikte yoksa `heading` (telefonda uzun başlık sığmıyor). */
  navLabel: string
  body: string[]
  order: number
}

export type SiteContent = {
  settings: SiteSettings
  profile: Profile
  links: Link[]
  projects: Project[]
  sections: Section[]
}

// ── Depolama (site.ts / content.json) ──────────────────────────────────────

export type RawSiteSettings = {
  preset: PresetId
  metaTitle: Localized<string>
  metaDescription: Localized<string>
}

export type RawSkillGroup = {
  id: string
  group: Localized<string>
  items: string[]
  note?: Localized<string>
}

export type RawMilestone = {
  id: string
  org: string
  role: Localized<string>
  period: string
  note?: Localized<string>
  order: number
}

export type RawProfile = {
  name: string
  title: Localized<string>
  location: Localized<string>
  tagline: Localized<string>
  bio: Localized<string[]>
  skills: RawSkillGroup[]
  experience: RawMilestone[]
  education: RawMilestone[]
}

export type RawLink = {
  id: string
  label: Localized<string>
  href: string
  icon: string
  order: number
}

export type RawProject = {
  id: string
  slug: string
  title: Localized<string>
  summary: Localized<string>
  description: Localized<string[]>
  tech: string[]
  /**
   * Kaynak kod ve canlı demo. ÇEVRİLMEZ — URL yapısal veri, tek kaynakta kalır
   * (aynı adresi iki dilde tutmak kaymaya davetiye çıkarır, § 5).
   * Adlar veritabanı sütunlarıyla aynı: models.py → Project.repo_url / live_url.
   * Boş bırakılan bağlantı kartta hiç görünmez — her projenin ikisi de olmayabilir.
   */
  repoUrl?: string
  liveUrl?: string
  order: number
  published: boolean
}

export type RawSection = {
  id: string
  slug: string
  heading: Localized<string>
  navLabel?: Localized<string>
  body: Localized<string[]>
  order: number
}

export type RawSiteContent = {
  settings: RawSiteSettings
  profile: RawProfile
  links: RawLink[]
  projects: RawProject[]
  sections: RawSection[]
}
