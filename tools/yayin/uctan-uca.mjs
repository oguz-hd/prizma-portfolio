/**
 * Yayın öncesi uçtan uca test — yayın yığınının (Caddy + API + yedek) kendisine karşı.
 *
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… node tools/yayin/uctan-uca.mjs http://127.0.0.1:8090
 *
 * Ziyaretçinin ve yöneticinin yolunu baştan sona yürür: site, içerik, meta, başlıklar,
 * gizli yollar, giriş, bölüm + görsel + galeri, yayına yansıma, parola değişimi, temizlik.
 * Oluşturduğunu siler; parolayı değiştirip GERİ alır. Yalnızca test yığınında ya da
 * ilk yayından hemen sonra, içerik girilmeden çalıştır (CALISTIRMA "Yayın öncesi testler").
 */
import { deflateSync } from 'node:zlib'

const SITE = process.argv[2] ?? 'http://127.0.0.1:8090'
const EMAIL = process.env.ADMIN_EMAIL
const PAROLA = process.env.ADMIN_PASSWORD
if (!EMAIL || !PAROLA) throw new Error('ADMIN_EMAIL ve ADMIN_PASSWORD gerekli')

const sonuc = []
const kontrol = (ad, gecti, ayrinti = '') => sonuc.push({ ad, gecti, ayrinti })
const istek = async (yol, opt = {}) => {
  try {
    return await fetch(SITE + yol, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...opt })
  } catch (e) {
    return { ok: false, status: e.name === 'TimeoutError' ? 'ZAMAN AŞIMI' : 'BAĞLANTI', headers: new Headers(), json: async () => ({}), text: async () => '' }
  }
}
const json = (v, yol, govde, tok) => istek(yol, {
  method: v,
  headers: { 'content-type': 'application/json', ...(tok && { authorization: `Bearer ${tok}` }) },
  body: govde && JSON.stringify(govde),
})
const t = (x) => ({ tr: x, en: x })

// ── Ziyaretçi ───────────────────────────────────────────────────────────────
const ana = await istek('/')
const html = await ana.text()
kontrol('Ana sayfa', ana.status === 200, `HTTP ${ana.status}`)
kontrol('Meta etiketleri sunucuda gömülü', /<title>[^<{]+<\/title>/.test(html) && /og:title/.test(html), html.match(/<title>[^<]*<\/title>/)?.[0] ?? 'yok')
kontrol('index.html önbelleklenmiyor', /no-cache/.test(ana.headers.get('cache-control') ?? ''), ana.headers.get('cache-control') ?? '')
const varlik = html.match(/\/assets\/[^"]+\.js/)?.[0]
const js = varlik ? await istek(varlik) : null
kontrol('Paket uzun süre önbellekli', /immutable/.test(js?.headers.get('cache-control') ?? ''), varlik ?? 'paket bulunamadı')
const icerik = await istek('/content.json')
const c = await icerik.json()
kontrol('content.json', icerik.status === 200 && Array.isArray(c.sections), `${c.sections?.length} bölüm`)
for (const yol of ['/data/site.db', '/data/backups/', '/docs', '/api/docs', '/api/openapi.json', '/openapi.json']) {
  const r = await istek(yol)
  const metin = r.status === 200 ? await r.text() : ''
  kontrol(`Kapalı: ${yol}`, r.status === 404 || (r.status === 200 && metin.includes('<!doctype html>') && !metin.includes('swagger')), `HTTP ${r.status}`)
}
kontrol('404 sayfası (SPA)', (await istek('/olmayan-sayfa')).status === 200)
const h = ana.headers
kontrol('Güvenlik başlıkları', ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'strict-transport-security'].every((b) => h.get(b)) && !h.get('server'))
kontrol('Sıkıştırma', /zstd|gzip/.test((await istek('/content.json', { headers: { 'accept-encoding': 'gzip, zstd' } })).headers.get('content-encoding') ?? ''))

// ── Yönetici ────────────────────────────────────────────────────────────────
const yanlis = await json('POST', '/api/auth/login', { email: EMAIL, password: 'yanlis' })
kontrol('Yanlış parola reddedilir', yanlis.status === 401, `HTTP ${yanlis.status}`)
const giris = await json('POST', '/api/auth/login', { email: EMAIL, password: PAROLA })
const tok = (await giris.json()).accessToken
kontrol('Giriş', giris.status === 200 && !!tok, `HTTP ${giris.status}`)
kontrol('Panel açılıyor', (await istek('/admin/')).status === 200)

// Bölüm + görsel + galeri
await json('POST', '/api/admin/sections', { id: 'yayin-testi', kind: 'gallery', heading: t('Yayın testi') }, tok)
const form = new FormData()
form.append('file', new Blob([png(1600, 1000)], { type: 'image/png' }), 'test.png')
const yukle = await istek('/api/admin/media', { method: 'POST', headers: { authorization: `Bearer ${tok}` }, body: form })
const medya = await yukle.json()
kontrol('Görsel yükleme', yukle.status === 201 && medya.widths?.length > 0, `HTTP ${yukle.status} · ${medya.widths?.join('/')}`)
await json('PUT', `/api/admin/media/${medya.id}`, { alt: t('Test görseli') }, tok)
await json('PUT', '/api/admin/sections/yayin-testi/media', { items: [{ mediaId: medya.id }] }, tok)
const c2 = await (await istek('/content.json')).json()
const b = c2.sections.find((s) => s.id === 'yayin-testi')
kontrol('Değişiklik yayına yansıyor', b?.media?.[0]?.id === medya.id)
kontrol('Yeni bölüm kapanıştan önce', c2.sections.at(-1)?.kind === 'contact', c2.sections.map((s) => s.id).join(' → '))
const gorsel = await istek(`/uploads/${medya.id}-${medya.widths[0]}.webp`)
kontrol('Görsel sunuluyor (webp, değişmez önbellek)', gorsel.status === 200 && gorsel.headers.get('content-type') === 'image/webp' && /immutable/.test(gorsel.headers.get('cache-control') ?? ''), `HTTP ${gorsel.status} ${gorsel.headers.get('content-type')}`)
const gizle = await json('PUT', '/api/admin/sections/yayin-testi', { heading: t('Yayın testi'), visible: false }, tok)
const c3 = await (await istek('/content.json')).json()
kontrol('Gizlenen bölüm yayından düşüyor', gizle.status === 204 && !c3.sections.some((s) => s.id === 'yayin-testi'))
kontrol('Kullanılan görsel silinmiyor', (await json('DELETE', `/api/admin/media/${medya.id}`, null, tok)).status === 409)
await json('DELETE', '/api/admin/sections/yayin-testi', null, tok)
kontrol('Görsel ve bölüm silindi', (await json('DELETE', `/api/admin/media/${medya.id}`, null, tok)).status === 204 && (await istek(`/uploads/${medya.id}-${medya.widths[0]}.webp`)).status === 404)

// Parola değişimi: eski oturum düşer; sonra geri alınır.
const yeni = `${PAROLA}-gecici`
const deg = await json('PUT', '/api/auth/password', { currentPassword: PAROLA, newPassword: yeni }, tok)
const tok2 = (await deg.json()).accessToken
kontrol('Parola değişince eski oturum düşüyor', deg.status === 200 && (await json('GET', '/api/auth/me', null, tok)).status === 401)
const geri = await json('PUT', '/api/auth/password', { currentPassword: yeni, newPassword: PAROLA }, tok2)
kontrol('Parola geri alındı', geri.status === 200, `HTTP ${geri.status}`)

// ── Rapor ───────────────────────────────────────────────────────────────────
for (const s of sonuc) console.log(`${s.gecti ? 'GEÇTİ' : 'KALDI'}  ${s.ad}${s.ayrinti ? '  — ' + s.ayrinti : ''}`)
const kalan = sonuc.filter((s) => !s.gecti).length
console.log(`\n${sonuc.length - kalan}/${sonuc.length} geçti`)
process.exit(kalan)

/** Örnek PNG (yalnızca yükleme yolu için). */
function png(w, hh) {
  const satir = Buffer.alloc(1 + w * 3, 90)
  satir[0] = 0
  const ham = Buffer.concat(Array.from({ length: hh }, () => satir))
  const crc = (buf) => { let x = ~0; for (const v of buf) { x ^= v; for (let k = 0; k < 8; k++) x = (x >>> 1) ^ (0xedb88320 & -(x & 1)) } return ~x >>> 0 }
  const parca = (tur, veri) => { const out = Buffer.alloc(12 + veri.length); out.writeUInt32BE(veri.length, 0); out.write(tur, 4); veri.copy(out, 8); out.writeUInt32BE(crc(Buffer.concat([Buffer.from(tur), veri])), 8 + veri.length); return out }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(hh, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), parca('IHDR', ihdr), parca('IDAT', deflateSync(ham)), parca('IEND', Buffer.alloc(0))])
}
