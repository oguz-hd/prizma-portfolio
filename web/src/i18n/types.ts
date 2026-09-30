/**
 * İki dillilik sözleşmesi.
 *
 * Karar (Oturum 7): site TR + EN. Şimdi verilmek zorundaydı — Faz 5'te SQLite
 * şeması, Faz 7'de panel yazıldıktan sonra dil boyutu eklemek çok pahalı olurdu.
 *
 * ⚠️ Yalnızca DÜZYAZI çevrilir. id, slug, href, tech[], order gibi yapısal veri
 * tek kaynakta kalır — proje URL'si iki yerde durmamalı, kayar.
 */

export const LOCALES = ['tr', 'en'] as const

export type Locale = (typeof LOCALES)[number]

/**
 * Oturum 3 (kullanıcı kararı): site İngilizce açılır — tarayıcı dili Türkçe olsa
 * bile. Ziyaretçi TR'ye geçince harf çözülmesini görüyor; seçimi hatırlanıyor.
 */
export const DEFAULT_LOCALE: Locale = 'en'

/** Bir alanın her dildeki karşılığı. Faz 5'te SQLite'ta `translations` tablosu olacak. */
export type Localized<T> = Record<Locale, T>

export const LOCALE_LABELS: Record<Locale, string> = {
  tr: 'TR',
  en: 'EN',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
