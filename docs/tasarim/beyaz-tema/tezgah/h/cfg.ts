export type Cfg = { tokens?: any; fx?: { b?: string; c?: string; d?: string }; nf?: boolean; page?: string; hash?: string }
let c: Cfg | null = null
// Ayar: iframe'in adı (seçenek sayfası) ya da ?cfg= (ekran görüntüsü betiği).
export function cfg(): Cfg {
  if (c) return c
  try {
    const q = new URLSearchParams(location.search).get('cfg')
    c = JSON.parse(q || window.name || '{}')
  } catch { c = {} }
  return c!
}
