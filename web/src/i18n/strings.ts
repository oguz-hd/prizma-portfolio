import type { Locale } from './types'
import { useLocale } from './useLocale'

/**
 * ARAYÜZ METİNLERİ — içerikten ayrı tutuluyor.
 *
 * Ayrımın sebebi: `/content.json` (veritabanı) panelden düzenlenen İÇERİK.
 * Buradakiler ise arayüzün kendi dili — "Deneyim", "Bana yaz" gibi etiketler.
 * Bunlar tasarımın parçası, kullanıcının düzenleyeceği veri değil.
 *
 * Aynı ayrım theme.css ↔ presets.ts'te de var:
 *   düzenlenebilir veri  ↔  sabit sistem
 *
 * ⚠️ Bileşenlerde sabit metin yazılmayacak. Yeni bir etiket lazımsa buraya eklenir.
 * (trex-portfolio'da bu kural iki kez çiğnendi, ikisinde de İngilizce'de Türkçe kaldı.
 *  Üçüncüsü oradaki Nav'ın aria-label'ıydı — "Bölümler" — burada düzeltildi.)
 */

const STRINGS = {
  experience: { tr: 'Deneyim', en: 'Experience' },
  education: { tr: 'Eğitim', en: 'Education' },
  emailMe: { tr: 'Bana yaz', en: 'Email me' },
  elsewhere: { tr: 'Başka yerlerde', en: 'Elsewhere' },
  backToTop: { tr: 'Başa dön', en: 'Back to top' },

  // Slayt gösterisi
  navLabel: { tr: 'Bölümler', en: 'Sections' },
  slidesLabel: { tr: 'Slaytlar', en: 'Slides' },
  slideIntro: { tr: 'Giriş', en: 'Intro' },
  scrollHint: { tr: 'Kaydır', en: 'Scroll' },

  // 404 — "404 nm": prizmanın tayfında o dalga boyunda karanlık bir çizgi.
  notFoundTitle: {
    tr: 'Bu dalga boyunda bir sayfa yok',
    en: 'There’s no page at this wavelength',
  },
  notFoundBody: {
    tr: 'Işık prizmadan geçti, tayfına ayrıldı — ama 404 nm’de karanlık bir çizgi var. Aradığın sayfa orada soğurulmuş.',
    en: 'The light passed through the prism and split into its spectrum — but there’s a dark line at 404 nm. The page you were looking for was absorbed there.',
  },
  notFoundHome: { tr: 'Ana sayfaya dön', en: 'Back to the homepage' },

  // İçerik gelmedi (main.tsx → components/LoadError.tsx)
  loadError: { tr: 'İçerik yüklenemedi.', en: 'The content couldn’t be loaded.' },
  retry: { tr: 'Yeniden dene', en: 'Try again' },
} as const satisfies Record<string, Record<Locale, string>>

type StringKey = keyof typeof STRINGS

export function useStrings(): (key: StringKey) => string {
  const locale = useLocale()
  return (key) => STRINGS[key][locale]
}
