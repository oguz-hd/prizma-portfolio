/**
 * Prizmanın fiziği — DOM bilmez, yalnızca sayı.
 *
 * trex-portfolio'daki hero prizmasından (`components/Prism.tsx`) çıkarıldı ve
 * tam tayfa genişletildi. Orada tayfın yalnızca soğuk ucu (390–500 nm, Aurora)
 * gösteriliyordu; burada ışık bütünüyle ayrışıyor (390–700 nm, Tayf).
 *
 * Fizik: Snell yasası + BK7 camın Cauchy formülü, 60° tepe açılı eşkenar prizma.
 * Renk yayılımı okunabilsin diye 10× abartılı — gerçek camda tayf ~1.5°'ye sığar,
 * burada ~16°. (Eskisi 25× idi; tam tayfta o değer yelpazeyi 40°'ye açıyordu.)
 *
 * Dünya birimi: prizmanın kenarı 2, ağırlık merkezi orijinde, y YUKARI.
 * Ekrana çevirme (y aşağı, piksel) PrismStage'in işi.
 */

/** Tayfın gösterilen aralığı (nm). */
export const L_MIN = 390
export const L_MAX = 700

/**
 * Soğurma çizgisi — tayfta karanlık bir çizgi ve etiketi (dalga boyu gerçek).
 * Etiket tayfsal simge, arayüz metni değil: her dilde aynı.
 * `label` boşsa çizgi çizilir ama etiketlenmez.
 *
 * Oturum 4 (kullanıcı seçimi, `?lines=0` denemesi): ana sahnede Fraunhofer
 * çizgileri ve etiketleri YOK — yalnızca renk. Tek kullanan 404 ("404 nm").
 */
export type AbsorptionLine = { nm: number; label: string }

/* ── Kırılma ───────────────────────────────────────────────────────────────── */

const APEX = Math.PI / 3
const EXAGGERATION = 10
const CAUCHY_B = 0.0042 * EXAGGERATION

/** Kırılma indisi: n(λ) = A + B/λ², 450 nm'de 1.52'ye sabitlenmiş. */
const nOf = (nm: number) => {
  const um = nm / 1000
  return 1.52 + CAUCHY_B * (1 / (um * um) - 1 / (0.45 * 0.45))
}

/** İkinci yüzden çıkış açısı; tam iç yansımada null. */
function exitAngle(theta1: number, n: number): number | null {
  const t2 = Math.asin(Math.sin(theta1) / n)
  const s4 = n * Math.sin(APEX - t2)
  return s4 >= 1 ? null : Math.asin(s4)
}

/* ── Geometri ──────────────────────────────────────────────────────────────── */

export type Pt = { x: number; y: number }

const H = Math.sqrt(3)
export const BL: Pt = { x: -1, y: -H / 3 }
export const BR: Pt = { x: 1, y: -H / 3 }
export const AP: Pt = { x: 0, y: (2 * H) / 3 }
export const TRIANGLE = [BL, BR, AP]

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** Işığın girdiği (sol yüz) ve çıktığı (sağ yüz) noktalar: yüzlerin ortası. */
export const P = mid(BL, AP)
export const Q = mid(BR, AP)

/** Prizmanın arka yüzü — derinlik hissi için kaydırılmış kopya. */
export const DEPTH: Pt = { x: 0.28, y: 0.2 }

/** Prizmanın dünya birimi cinsinden yüksekliği (yerleşim bunu kullanıyor). */
export const PRISM_HEIGHT = H

/** Gelen ışığın yönü (radyan, x ekseninden): iç normal −30°, gelme açısı kadar yukarı. */
export const beamDir = (theta1: number) => -Math.PI / 6 + theta1

/**
 * λ dalga boylu ışının `x` düşey çizgisini kestiği y. Tam iç yansımada null.
 * Çıkış yönü: dış normal +30°, çıkış açısı kadar aşağı.
 */
export function yAt(theta1: number, nm: number, x: number): number | null {
  const t4 = exitAngle(theta1, nOf(nm))
  if (t4 === null) return null
  return Q.y + (x - Q.x) * Math.tan(Math.PI / 6 - t4)
}

/**
 * Ön ayarın i. tonu tayfın hangi dalga boyunda duruyor. Tonlar mor → kırmızı
 * sıralı (theme/types.ts); 400–680 nm arasına eşit dağılıyorlar. Ön ayar
 * değişirse tonlar değişir, yerleri değişmez — renk veri (kural 1).
 */
export function accentNm(i: number, count: number): number {
  return count < 2 ? 550 : 400 + (i * 280) / (count - 1)
}

/**
 * Slayt → gelme açısı (derece). Her slaytın ışığı prizmaya başka bir açıyla
 * giriyor; geçişte açı döndükçe yelpaze süpürüyor. Aralık 40–62°: bunun dışında
 * mor uç tam iç yansımaya giriyor (10× abartıda ölçüldü).
 * Sıra bilinçli zikzak: ardışık slaytlar zıt yöne süpürsün, hareket okunsun.
 */
const SLIDE_ANGLES = [51, 44, 58, 47, 55]

export function slideAngle(index: number): number {
  return SLIDE_ANGLES[index % SLIDE_ANGLES.length]
}

/**
 * Slayt → vurgulanan ton (1'den başlar, `--accent-N`). Slaytlar tayfa sırayla
 * yayılıyor: ilk slayt mor, son slayt kırmızı. Ray aynı tonu kullanıyor.
 */
export function slideAccent(index: number, total: number, count: number): number {
  if (total < 2) return 1
  return 1 + Math.round((index * (count - 1)) / (total - 1))
}

export const deg = (d: number) => (d * Math.PI) / 180
