/**
 * Test betiklerinin yanlışlıkla CANLI siteye karşı çalışmasını engeller.
 *
 * Port denetimi yetmiyordu: `https://oguzhd.com` portsuz olduğu için geçiyordu, oysa bu
 * betikler hatalı girişle giriş sınırını doldurur (kendi IP'ni 15 dk kilitler), kayıt
 * oluşturup siler, parolayı ve paleti geçici değiştirir.
 *
 *   yalnizYerel(...adresler)  localhost / 127.0.0.1 / ::1 dışı her adresi reddeder (aşılamaz)
 *   canliyaIzinIste(...adresler)  yerel değilse yalnızca CANLI_ONAY=evet ile geçer
 */
const YEREL = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

const yerelMi = (adres) => {
  try {
    return YEREL.has(new URL(adres).hostname)
  } catch {
    return false
  }
}

export function yalnizYerel(...adresler) {
  const yabanci = adresler.filter((a) => !yerelMi(a))
  if (yabanci.length) throw new Error(`Yalnızca yerel test yığını: ${yabanci.join(', ')} yerel değil.`)
}

export function canliyaIzinIste(...adresler) {
  const yabanci = adresler.filter((a) => !yerelMi(a))
  if (yabanci.length && process.env.CANLI_ONAY !== 'evet')
    throw new Error(
      `${yabanci.join(', ')} yerel değil. Canlıya karşı çalıştırmak parolayı/paleti geçici değiştirir; ` +
        'bilerek yapıyorsan CANLI_ONAY=evet ver.',
    )
}
