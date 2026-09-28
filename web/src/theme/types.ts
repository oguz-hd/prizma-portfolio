/**
 * Tema sözleşmesi.
 *
 * Bu tipler bir stil tercihinden fazlası: Faz 8'de admin paneli renkleri
 * buradan düzenleyecek. Yani bu sözleşme aynı zamanda panelin de arayüzü.
 *
 * Ayrıntı: docs/ARCHITECTURE.md § 4
 */

export type PresetId = 'aurora' | 'tayf' | 'yildiz' | 'turbo'

export type ThemeTokens = {
  /** Sayfa zemini. Saf siyah asla — docs/DESIGN.md § F/1 */
  ground: string
  /** Kart ve panel zemini; ground'dan bir kademe açık */
  surface: string
  /** Ayraç çizgileri, kenarlıklar */
  line: string

  /** Birincil metin. Saf beyaz asla — docs/DESIGN.md § F/3 */
  ink: string
  /** İkincil metin: açıklamalar, alt satırlar */
  inkDim: string
  /**
   * Üçüncül metin: küçük etiketler, meta.
   * ⚠️ ground üzerinde 4.5:1 kontrastın altına düşmemeli — docs/DESIGN.md § F/4
   */
  inkFaint: string

  /**
   * Lider aksan: butonlar, linkler, odak halkası.
   * Sayfada baskın olarak görünen tek renk bu.
   * "Gökkuşağını gradyan olarak kullan, palet olarak değil" — docs/DESIGN.md § F/5
   */
  lead: string

  /**
   * Tayfın tonları — KISA dalga boyundan UZUNA sıralı (mor → kırmızı).
   *
   * ⚠️ Sıra anlam taşıyor: prizma bu tonları tayfta dalga boylarına diziyor
   * (`prism/optics.ts` → `accentNm`), slayt rayı da slaytları aynı sıraya
   * yerleştiriyor. Ters sıralanmış bir ön ayar ışığı ters kırmış gibi görünür.
   *
   * Sayfada rozet/küçük vurgu olarak da kullanılır ama asla lead ile eşit ağırlıkta.
   */
  accents: string[]
}

export type Preset = {
  id: PresetId
  /** Panelde görünecek ad */
  name: string
  /** Panelde ön ayarın altında görünecek tek satırlık açıklama */
  note: string
  tokens: ThemeTokens
}
