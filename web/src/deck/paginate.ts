/**
 * Alt sayfalar — ekrana sığmayan slayt birimlerine bölünür (Oturum 4, kullanıcı
 * seçimi A1: https://claude.ai/artifact/H68nPe34Qt5XwJ5ZF8ctao).
 *
 * Neden: taşan slaytın içi kayıyordu; telefonda bir sonraki slayta geçmek için
 * iki kez kaydırmak gerekiyordu. iPhone SE'de (375×553 görünür) Hakkımda 268 px
 * taşıyordu — yazı küçültmekle kapanacak fark değil (ölçüldü, 30.09.2026).
 * Artık her hareket bir adım: önce slaytın sonraki sayfası, sonra sonraki slayt.
 *
 * İçerikten bağımsız. İçerik yazarının işaretleri:
 *   data-page-unit    bölünemez birim (paragraf, zaman çizelgesi maddesi…)
 *   data-page-count   sayfa sayacının yazılacağı öğe (CSS `attr(data-page-label)`)
 * Birimleri olmayan slayt hiç bölünmez.
 *
 * Dağıtım ÖLÇEREK: birimler sırayla eklenir, slayt taşınca yeni sayfa başlar.
 * Sığan slayta (masaüstü) dokunulmaz. Tek birim ekrandan büyükse o sayfa yine
 * kayar — deck'in kaydırma yolu yedek olarak duruyor.
 *
 * Durum öznitelikleri (data-paged, data-page, data-page-off, data-page-label)
 * JSX'te YOK, burada yazılıyor — kural 8.
 */

/** Bu kadar px'lik taşma sığıyor sayılır (deck.ts → SLACK ile aynı gerekçe). */
const SLACK = 8

const pages = new WeakMap<HTMLElement, HTMLElement[][]>()

const unitsOf = (slide: HTMLElement) => [...slide.querySelectorAll<HTMLElement>('[data-page-unit]')]
const scrollerOf = (slide: HTMLElement) => slide.querySelector<HTMLElement>('[data-slide-scroll]')

function overflows(slide: HTMLElement): boolean {
  const sc = scrollerOf(slide)
  return !!sc && sc.scrollHeight - sc.clientHeight > SLACK
}

/** Yalnızca `on` birimleri görünsün; birimlerinin hepsi gizli kalan kap da gizlensin. */
function show(slide: HTMLElement, on: Set<HTMLElement>, page: number, count: number) {
  const units = unitsOf(slide)
  units.forEach((u) => u.toggleAttribute('data-page-off', !on.has(u)))
  // Kaplar: birim taşıyan her ata (ör. "Deneyim" etiketli sütun, bio bloğu).
  const holders = new Set<HTMLElement>()
  units.forEach((u) => {
    for (let p = u.parentElement; p && p !== slide; p = p.parentElement) holders.add(p)
  })
  holders.forEach((h) => {
    if (h.hasAttribute('data-page-unit')) return
    const any = [...h.querySelectorAll('[data-page-unit]')].some((u) => on.has(u as HTMLElement))
    h.toggleAttribute('data-page-off', !any)
  })
  slide.dataset.page = String(page)
  slide.querySelectorAll<HTMLElement>('[data-page-count]').forEach((el) => {
    if (count > 1) el.dataset.pageLabel = `${page + 1}/${count}`
    else delete el.dataset.pageLabel
  })
}

function reset(slide: HTMLElement) {
  slide.querySelectorAll('[data-page-off]').forEach((el) => el.removeAttribute('data-page-off'))
  slide.querySelectorAll<HTMLElement>('[data-page-count]').forEach((el) => delete el.dataset.pageLabel)
  delete slide.dataset.paged
  delete slide.dataset.page
  pages.delete(slide)
}

/** Slaytı yeniden böl. Dönen değer sayfa sayısı. */
export function paginate(slide: HTMLElement): number {
  reset(slide)
  const units = unitsOf(slide)
  if (!units.length || !overflows(slide)) return 1

  // Düzen theme.css → [data-paged]: geniş ekranda iki sütun kalır, sütunu biten
  // sayfada öbürü tam genişliğe yayılır. Ölçüm o CSS'le yapılıyor.
  slide.dataset.paged = ''
  const out: HTMLElement[][] = []
  let cur: HTMLElement[] = []
  for (const u of units) {
    const test = [...cur, u]
    show(slide, new Set(test), out.length, 2)
    if (cur.length && overflows(slide)) {
      out.push(cur)
      cur = [u]
    } else {
      cur = test
    }
  }
  out.push(cur)

  if (out.length === 1) {
    reset(slide)
    return 1
  }
  pages.set(slide, out)
  show(slide, new Set(out[0]), 0, out.length)
  return out.length
}

export function pageCount(slide: HTMLElement | undefined): number {
  return (slide && pages.get(slide)?.length) || 1
}

export function pageOf(slide: HTMLElement | undefined): number {
  return slide ? Number(slide.dataset.page ?? 0) : 0
}

/** Sayfayı göster (sınırlanır). `-1` → son sayfa. */
export function setPage(slide: HTMLElement, page: number): void {
  const list = pages.get(slide)
  if (!list) return
  const p = page < 0 ? list.length - 1 : Math.min(page, list.length - 1)
  show(slide, new Set(list[p]), p, list.length)
}

/** O an görünen ilk birim — yeniden bölünce okuyucu aynı yerde kalsın. */
export function firstVisibleUnit(slide: HTMLElement): HTMLElement | null {
  return unitsOf(slide).find((u) => !u.hasAttribute('data-page-off')) ?? null
}

/** Birimin hangi sayfada olduğu (yoksa 0). */
export function pageOfUnit(slide: HTMLElement, unit: HTMLElement | null): number {
  const list = pages.get(slide)
  if (!list || !unit) return 0
  const i = list.findIndex((p) => p.includes(unit))
  return i < 0 ? 0 : i
}
