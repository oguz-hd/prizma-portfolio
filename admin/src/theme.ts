import { applyTheme } from '@site/theme/applyTheme'
import { applyFavicon } from '@site/theme/favicon'
import { PRESETS } from '@site/theme/presets'
import type { ThemeTokens } from '@site/theme/types'

import { api } from './api'

/**
 * Paneli sitenin paletiyle boyar — sitenin kendi fonksiyonları, aynı token'lar.
 *
 * ⚠️ Çalışma ekranları her zaman Tayf, sitenin SEÇİLİ paleti değil. Panelin anlamlı
 * renkleri her ön ayarda yok: hata metni tayfın kırmızı ucundan (`--danger`),
 * Aurora'da ise sıcak ton hiç yok — panel seçili paleti izlerken hata camgöbeği
 * görünüyordu (Oturum 5). Palet seçimi sitenin; Genel'deki kartlar her paleti
 * kendi renkleriyle gösteriyor.
 *
 * Giriş ekranı ise sitenin bir parçası gibi: seçili paletle boyanıyor
 * (`paintLogin`, kullanıcı: "tema seçimlerine göre düzenlensin"). Orada yanlış
 * parolayı tayftaki "401 nm" çizgisi de söylüyor, hata yalnızca renge kalmıyor.
 */
export function paintPanel(): void {
  paint(PRESETS.tayf.tokens)
}

/** Giriş ekranının sitedeki karşılıkları: palet ve dairedeki başlığın ölçüsü. */
export type LoginLook = {
  tokens: ThemeTokens
  /** Sitedeki ismin harf sayısı — ADMIN dairede ismin boyunda dursun (Ring.tsx). */
  nameChars: number
}

/** İçerik gelmezse: Tayf ve ortalama bir isim boyu. */
const FALLBACK_NAME_CHARS = 14

/**
 * Sitenin seçili paleti — içerik herkese açık (`GET /api/content`), oturum gerekmez.
 * Alınamazsa Tayf: giriş ekranı her durumda açılmalı.
 */
export async function paintLogin(): Promise<LoginLook> {
  let look: LoginLook = { tokens: PRESETS.tayf.tokens, nameChars: FALLBACK_NAME_CHARS }
  try {
    const { settings, profile } = await api.publicContent()
    look = { tokens: PRESETS[settings.preset]?.tokens ?? look.tokens, nameChars: profile.name.length }
  } catch {
    // Sunucuya ulaşılamıyor: giriş ekranı Tayf'ta açılır, hatayı form söyler.
  }
  paint(look.tokens)
  return look
}

function paint(tokens: ThemeTokens): void {
  applyTheme(tokens)
  applyFavicon(tokens)
  // Kırmızı uç: accents mor → kırmızı sıralı (CLAUDE.md kural 2), yani son ton.
  document.documentElement.style.setProperty('--danger', tokens.accents[tokens.accents.length - 1])
}
