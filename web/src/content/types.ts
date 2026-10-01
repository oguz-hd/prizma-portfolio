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
 *   Raw*      → DEPOLAMA şekli. content.json bunu tutar (api/app/schemas.py ile aynı).
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

/**
 * Yüklenen görsel (Faz 9). Dosyalar `/uploads/{id}-{w}.webp`, `widths`'teki her
 * genişlik için — `content/media.ts` srcset'i buradan kuruyor. Orijinal saklanmıyor.
 */
export type Media = {
  id: string
  width: number
  height: number
  widths: number[]
  alt: string
}

export type SectionMedia = Media & { caption?: string }

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
  cover?: Media
}

/**
 * Bölüm türü = hangi bileşen çizer (Faz 9, App.tsx). Hazırlar (about, experience,
 * contact) silinmez; diğerleri panelden eklenir. api/app/schemas.py → SectionKind.
 */
export type SectionKind =
  | 'about'
  | 'experience'
  | 'contact'
  | 'text'
  | 'timeline'
  | 'projects'
  | 'announcement'
  | 'gallery'

export type Section = {
  id: string
  slug: string
  kind: SectionKind
  heading: string
  /** Üst menüdeki ad. İçerikte yoksa `heading` (telefonda uzun başlık sığmıyor). */
  navLabel: string
  body: string[]
  order: number
  /** timeline */
  items?: Milestone[]
  /** gallery */
  media?: SectionMedia[]
  /** announcement — bağlantı ve yayın aralığı (aralık dışındaysa bölüm hiç gelmez). */
  link?: { label: string; href: string }
  startsOn?: string
  endsOn?: string
}

export type SiteContent = {
  settings: SiteSettings
  profile: Profile
  links: Link[]
  projects: Project[]
  sections: Section[]
}

// ── Depolama (content.json) ─────────────────────────────────────────────────

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
  cover?: RawMedia
}

export type RawMedia = {
  id: string
  width: number
  height: number
  widths: number[]
  alt: Localized<string>
}

export type RawSectionMedia = RawMedia & { caption?: Localized<string> }

export type RawSection = {
  id: string
  slug: string
  kind: SectionKind
  heading: Localized<string>
  navLabel?: Localized<string>
  body: Localized<string[]>
  order: number
  /** Yalnızca panelin içeriğinde (GET /api/admin/content); gizliler content.json'da yok. */
  visible?: boolean
  items?: RawMilestone[]
  media?: RawSectionMedia[]
  link?: { label: Localized<string>; href: string }
  /** ISO tarih (YYYY-MM-DD), gün dahil. */
  startsOn?: string
  endsOn?: string
}

export type RawSiteContent = {
  settings: RawSiteSettings
  profile: RawProfile
  links: RawLink[]
  projects: RawProject[]
  sections: RawSection[]
  /** Yalnızca panelin içeriğinde: medya kitaplığı. */
  media?: RawMedia[]
}
