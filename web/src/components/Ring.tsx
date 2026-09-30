import { useLayoutEffect, useState, type RefObject } from 'react'

/**
 * Prizmayı çevreleyen görünmez daire — Giriş ve İletişim aynı yerleşimde
 * (Oturum 2: giriş; Oturum 4, kullanıcı: "iletişim de intro gibi dairesel olsun").
 *
 * Daire görünmüyor, yalnızca yazıların dizildiği yol. Merkezi ekranın ortası,
 * yani prizmanın kutusunun merkezi (PrismStage aynı noktaya oturtuyor).
 * Üst yayda büyük başlık, iç yaylarda küçük yazılar, alt yayda bağlantılar.
 *
 * Boyutlar ekrandan: yarıçap pencereye, başlık boyu isme göre; sonuç Departure
 * Mono'nun keskin kaldığı 11 px'in katına yuvarlanıyor. İki slaytın başlığı
 * AYNI boyda — ikisi de ismin uzunluğundan hesaplanıyor.
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
/** Başlığın harf aralığı (em) — theme.css → .ring-title ile aynı. */
export const TITLE_TRACKING = 0.06
/**
 * Başlık harfleri yatayda bu kat geniş (Oturum 3: "harflerin genişliği artsın").
 * Departure Mono'nun tek genişliği var; `textLength` + `spacingAndGlyphs` geriyor.
 */
const TITLE_STRETCH = 1.3
/** Yay ile küçük yazıların (iç yaylar) arası (px). */
export const INNER_GAP = 30

function geometry(W: number, H: number, sizeChars: number, adv: number, reserve: number): RingGeo {
  const mobile = W < 768
  let r = mobile ? Math.min(W * 0.46, H * 0.3) : Math.min(W * 0.3, H * 0.37)
  // Altta başka bir şey duruyorsa (İletişim'in altbilgisi) daire ona çarpmasın.
  if (reserve) r = Math.min(r, H / 2 - reserve)
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
export function titleLength(geo: RingGeo, chars: number): number {
  return geo.title * (chars * (geo.adv * TITLE_STRETCH + TITLE_TRACKING) - TITLE_TRACKING)
}

/**
 * `sizeChars`: başlık boyunun hesaplandığı harf sayısı (ismin uzunluğu).
 * `reserve`: dairenin altında boş kalması gereken yer (px), geo'dan.
 *
 * ⚠️ İlk değer pencereden, HEMEN: yay ilk karede DOM'da olmalı. Açılış
 * (intro.ts) gösterilecek öğeleri App'in ilk etkisinde topluyor; yay bir ölçüm
 * sonrasına kalırsa o listeye girmiyor, açılışın sonunda birden beliriyordu.
 */
export function useRing(box: RefObject<HTMLElement | null>, sizeChars: number, reserve = 0): RingGeo {
  const [geo, setGeo] = useState<RingGeo>(() =>
    geometry(window.innerWidth, window.innerHeight, sizeChars, ADV_GUESS, reserve),
  )

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    let adv = ADV_GUESS

    const measure = () => {
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx) return
      ctx.font = '100px "Departure Mono"'
      adv = ctx.measureText('M').width / 100 || adv
    }
    const update = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      if (!W || !H) return
      setGeo(geometry(W, H, sizeChars, adv, reserve))
    }

    measure()
    update()
    // Font geldiğinde harf genişliği değişir → yeniden ölç.
    document.fonts?.ready.then(() => {
      measure()
      update()
    })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [box, sizeChars, reserve])

  return geo
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
 * Üst yaydaki büyük başlık — geniş ve kalın (theme.css → .ring-title).
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
