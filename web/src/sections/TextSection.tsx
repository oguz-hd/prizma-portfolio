import { Section, type SectionProps } from './Section'

/**
 * Serbest metin bölümü (Faz 9) — panelden eklenen başlık + paragraflar.
 * Gövdeyi Section zaten basıyor (`.section-intro`, paragraf başına bir sayfa birimi).
 */
export function TextSection(props: SectionProps) {
  return <Section {...props} />
}
