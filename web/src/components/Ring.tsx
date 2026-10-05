import {
  useLayoutEffect,
  useState,
  type DependencyList,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'

import './ring.css'

/**
 * Prizmayı çevreleyen görünmez daire — Giriş ve İletişim aynı yerleşimde
 * (Oturum 2: giriş; Oturum 4, kullanıcı: "iletişim de intro gibi dairesel olsun").
 *
 * Daire görünmüyor, yalnızca yazıların dizildiği yol. Merkezi ekranın ortası,
 * yani prizmanın kutusunun merkezi (PrismStage aynı noktaya oturtuyor).
 * Üst yayda büyük başlık, iç yaylarda küçük yazılar, alt yayda bağlantılar.
 *
 * Boyutlar ekrandan: yarıçap pencereye, başlık boyu isme göre; sonuç Departure
 * Mono'nun keskin kaldığı 11 px'in katına yuvarlanıyor. İki slaytın dairesi
 * ve başlığı AYNI — ikisi de pencereden ve ismin uzunluğundan hesaplanıyor.
 * Dairenin altındaki öğe (ipucu, altbilgi) daireye yer açtırmaz, kendisi
 * sığarsa altına yerleşir (`placeBelow`). ⚠️ Eskiden İletişim altbilgiye yer
 * açmak için daireyi küçültüyordu: kısa masaüstünde başlığı bir basamak
 * küçülüyor, çok kısa pencerede yarıçap eksiye düşüyordu (kod incelemesi).
 */

export type RingGeo = {
  W: number
  H: number
  r: number
  /** Başlığın yazı boyu (px, 11'in katı). */
  title: number
  /** Departure Mono'nun harf genişliği (em) — font gelince ölçülüyor. */
  adv: number
}

/** 11'in katına aşağı yuvarla, aralıkta tut. */
const snap11 = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.floor(v / 11) * 11))

/** Tahmin ölçülen değere yakın ki ilk karede yay zıplamasın. */
const ADV_GUESS = 0.65
const FONT = '100px "Departure Mono"'
/** Ölçülen harf genişliği — font yüklendikten sonra bir kez; iki daire ortak. */
let advMeasured: number | null = null

/** Departure Mono'nun harf genişliği (em). Font henüz gelmediyse tahmin. */
function measureAdv(): number {
  if (advMeasured) return advMeasured
  if (!document.fonts?.check(FONT)) return ADV_GUESS
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return ADV_GUESS
  ctx.font = FONT
  advMeasured = ctx.measureText('M').width / 100 || ADV_GUESS
  return advMeasured
}
/** Başlığın harf aralığı (em) — ring.css → .ring-title ile aynı. */
const TITLE_TRACKING = 0.06
/**
 * Başlık harfleri yatayda bu kat geniş (Oturum 3: "harflerin genişliği artsın").
 * Departure Mono'nun tek genişliği var; `textLength` + `spacingAndGlyphs` geriyor.
 */
const TITLE_STRETCH = 1.3
/** Yay ile küçük yazıların (iç yaylar) arası (px). */
export const INNER_GAP = 30

/**
 * Masaüstünde daire eskisinin %90'ı (Oturum 5, kullanıcı: önce "çapı %20
 * azalsın", görünce "%10 geri büyüsün"). Başlık boyu yarıçaptan türüyor:
 * %80'de isim her dizüstü boyunda 44 → 33 px'e iniyordu; %90'da 1440×900'de
 * 44 kalıyor, 1366×768'de 33. Telefonda yok: orada daire zaten ekranın eninden
 * sınırlı; küçülünce isim 33 → 22 px'e iniyordu (hesaplandı, 390×844).
 */
const DESKTOP_SCALE = 0.9

function geometry(W: number, H: number, sizeChars: number, adv: number): RingGeo {
  const mobile = W < 768
  const r = mobile ? Math.min(W * 0.46, H * 0.3) : Math.min(W * 0.3, H * 0.37) * DESKTOP_SCALE
  /*
    Başlığın kapladığı yay ~100° (telefonda ~110°). ⚠️ 110°'de ekranda ~150°
    gibi okunuyordu: harfler yarıçapa göre iri, uçtakiler dikleşiyordu (ölçüldü).
    Geniş harflerle yay biraz açıldı; aynı yayda kalsa harfler kısalırdı.
  */
  const target = mobile ? 1.9 : 1.75
  const limit = mobile ? 2.1 : 1.9
  const perEm = sizeChars * (adv * TITLE_STRETCH + TITLE_TRACKING)
  let title = snap11(Math.round((r * target) / perEm / 11) * 11, 22, 88)
  if ((title * perEm) / r > limit) title = Math.max(22, title - 11)
  return { W, H, r, title, adv }
}

/** Başlığın yaydaki boyu: son harfin ardındaki aralık sayılmıyor. */
function titleLength(geo: RingGeo, chars: number): number {
  return geo.title * (chars * (geo.adv * TITLE_STRETCH + TITLE_TRACKING) - TITLE_TRACKING)
}

/**
 * `sizeChars`: başlık boyunun hesaplandığı harf sayısı (ismin uzunluğu).
 *
 * ⚠️ İlk değer pencereden, HEMEN: yay ilk karede DOM'da olmalı. Açılış
 * (intro.ts) gösterilecek öğeleri App'in ilk etkisinde topluyor; yay bir ölçüm
 * sonrasına kalırsa o listeye girmiyor, açılışın sonunda birden beliriyordu.
 */
export function useRing(box: RefObject<HTMLElement | null>, sizeChars: number): RingGeo {
  const [geo, setGeo] = useState<RingGeo>(() =>
    geometry(window.innerWidth, window.innerHeight, sizeChars, measureAdv()),
  )

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    // Etki yeniden kurulunca eski çalıştırmanın font geri çağrısı yeni ölçünün
    // üstüne eski değerlerle yazmasın (ya da sökülmüş bileşene yazmasın).
    let alive = true
    const update = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      if (!W || !H) return
      setGeo(geometry(W, H, sizeChars, measureAdv()))
    }

    update()
    // Font geldiğinde harf genişliği değişir → yeniden ölç.
    document.fonts?.ready.then(() => {
      if (alive) update()
    })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [box, sizeChars])

  return geo
}

/**
 * Yay yazısının kaplayabileceği en geniş açı (rad, ~130°). Oturum 6, büyüyen içerik
 * testi: 8 bağlantı alt yayda ~200° dolanıp tayfın üstüne çıkıyordu, uzun unvan·konum
 * iç yayın ucundan taşıp kesiliyordu. Bu açıda uçlar yatayın epey içinde kalıyor.
 */
export const MAX_SPAN = 2.3

/** Düz (gerilmemiş) yazının `r` yarıçaplı yayda kapladığı açı (rad). `track`: harf aralığı (em). */
export function arcSpan(geo: RingGeo, chars: number, size: number, track: number, r: number): number {
  return (chars * (geo.adv + track) * size) / r
}

/**
 * Yarım daire yolu, soldan sağa. `sweep` 1 → tepeden (saat yönü), 0 → dipten.
 * İkisi de soldan sağa aktığı için harfler her iki yayda da dik okunuyor.
 */
export function arc(geo: RingGeo, r: number, sweep: 0 | 1): string {
  const cx = geo.W / 2
  const cy = geo.H / 2
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 ${sweep} ${cx + r} ${cy}`
}

/**
 * Üst yaydaki büyük başlık — geniş ve kalın (ring.css → .ring-title).
 *
 * ⚠️ `textAnchor="middle"` KULLANILMIYOR: WebKit (iPhone Safari) ortalamayı
 * `textLength` germesinden ÖNCEKİ genişlikle yapıyor, fazlalık yalnızca sağa
 * taşıyor ve yazı yayda kayıyordu (ölçüldü, 30.09.2026). Başlangıç elle:
 * yarım dairenin boyu πr, başlık tam ortasına.
 */
export function RingTitle({ geo, path, text }: { geo: RingGeo; path: string; text: string }) {
  const len = titleLength(geo, text.length)
  return (
    <text className="ring-title" style={{ fontSize: geo.title }}>
      <textPath
        href={`#${path}`}
        startOffset={(Math.PI * geo.r - len) / 2}
        textLength={len}
        lengthAdjust="spacingAndGlyphs"
      >
        {text}
      </textPath>
    </text>
  )
}

export type RingLink = { id: string; href: string; label: string }

/**
 * Yaydaki bağlantılar (alt yaylar) — her bağlantı KENDİ `<a><text>`'i.
 *
 * ⚠️ Eskiden tek `<text>` → `<textPath>` → `<a>` → `<tspan>` idi. WebKit (Safari,
 * iPhone) isabeti `<text>`'te bırakıp içteki `<a>`'ya hiç indirmiyor: Safari'de
 * bağlantıların hiçbiri tıklanmıyordu (canlıda 0/6, `tools/safari/tikla.mjs`,
 * 05.10.2026). `<text>`'e pointer-events vermek yetmedi — isabet `<text>`'te kaldı.
 * `<a>` dışta olunca her tarayıcı aynı.
 *
 * Yer elle: Departure Mono eş aralıklı, her harf `(adv + track) × size` px. Satır
 * yarım dairenin (boyu πr) ortasına; ayraç " · " üç harflik yer, nokta ortada.
 * `track`, CSS'teki harf aralığıyla aynı olmalı (theme.css → .ring-links text).
 */
export function RingLinks({
  geo,
  path,
  r,
  size,
  track,
  links,
  ref,
}: {
  geo: RingGeo
  /** Yayın <path> kimliği (# olmadan). */
  path: string
  /** O yayın yarıçapı. */
  r: number
  size: number
  track: number
  links: RingLink[]
  /** Satırın kabı — usePlaceBelow ölçüyor. */
  ref?: Ref<SVGGElement>
}) {
  const charW = (geo.adv + track) * size
  const chars = links.reduce((n, l) => n + l.label.length, 0) + 3 * (links.length - 1)
  // Son harfin ardındaki aralık görünmüyor — ortalamada sayılmasın.
  let at = (Math.PI * r - chars * charW + track * size) / 2
  const parts: ReactNode[] = []
  links.forEach((l, i) => {
    if (i > 0) {
      parts.push(
        <text key={`${l.id}-sep`} className="ring-sep" aria-hidden="true" style={{ fontSize: size }}>
          <textPath href={`#${path}`} startOffset={at + charW}>
            ·
          </textPath>
        </text>,
      )
      at += 3 * charW
    }
    parts.push(
      <a
        key={l.id}
        href={l.href}
        {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        <text style={{ fontSize: size }}>
          <textPath href={`#${path}`} startOffset={at}>
            {l.label}
          </textPath>
        </text>
      </a>,
    )
    at += l.label.length * charW
  })
  return <g ref={ref}>{parts}</g>
}

/** Dairenin altındaki öğenin yaydan ve ekranın dibinden uzaklığı (px). */
const BELOW_GAP = 16

/**
 * Öğeyi (ipucu, altbilgi) alt yaydaki yazının hemen altına koy. Sığmazsa önce
 * `compact` sınıfıyla kısalt (varsa), o da sığmazsa gizle — daireyi küçültme.
 * Yer ölçülüyor: yazılar panelden değişse de doğru kalsın.
 * getBBox: açılışın kaydırması (üst <g>'deki transform) ölçüme girmiyor.
 */
export function usePlaceBelow(
  text: RefObject<SVGGraphicsElement | null>,
  el: RefObject<HTMLElement | null>,
  geo: RingGeo,
  compact: string | null,
  deps: DependencyList,
): void {
  useLayoutEffect(() => {
    const t = text.current
    const e = el.current
    if (!t || !e) return
    const bb = t.getBBox()
    const top = bb.y + bb.height + BELOW_GAP
    e.style.bottom = 'auto'
    e.style.top = `${top}px`
    const fits = () => top + e.offsetHeight <= geo.H - BELOW_GAP
    if (compact) {
      e.classList.remove(compact)
      if (!fits()) e.classList.add(compact)
    }
    e.style.visibility = fits() ? '' : 'hidden'
  }, [geo, ...deps])
}

