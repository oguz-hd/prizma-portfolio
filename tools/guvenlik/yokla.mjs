/**
 * Güvenlik yoklaması — sitenin dışarıdan görünen yüzüne saldırgan gibi istek atar.
 *
 *   node tools/guvenlik/yokla.mjs [site=http://localhost:5183] [api=http://localhost:8013]
 *
 * YALNIZCA test yığınına (CALISTIRMA "Büyüyen içerik testi" → C): kayıt oluşturup siler,
 * hatalı girişlerle giriş sınırını doldurur. Site adresi Caddy'nin önü (yayın Caddyfile'ı),
 * API adresi doğrudan API (yalnızca token almak ve uç noktaları listelemek için).
 * Her satır: GEÇTİ / KALDI + ne denendi. Çıkış kodu kalan sayısı.
 */
const [SITE = 'http://localhost:5183', API = 'http://localhost:8013'] = process.argv.slice(2)
if (/:(80|443|5174|8001)\b/.test(SITE + API)) throw new Error('Yalnızca test yığını (5183/8013)')

const sonuc = []
const kontrol = (ad, gecti, ayrinti = '') => sonuc.push({ ad, gecti, ayrinti })
// Her istek en fazla 15 sn: yanıtsız kalan bağlantı da bir bulgu (askıda kalma = DoS yolu).
const istek = async (url, opt = {}) => {
  try {
    return await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), ...opt })
  } catch (e) {
    return { ok: false, status: e.name === 'TimeoutError' ? 'ZAMAN AŞIMI' : 'BAĞLANTI HATASI', headers: new Headers(), text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) }
  }
}

// API hazır olana kadar bekle (yeniden başlatılmış olabilir).
for (let i = 0; i < 30; i++) {
  const r = await istek(SITE + '/api/health')
  if (r.status === 200) break
  await new Promise((ok) => setTimeout(ok, 1000))
}

// ── 1. Gizli dosyalar ve yol aşımı (Caddy) ───────────────────────────────────
const gizli = [
  '/data/site.db', '/data/site.db.bak-v0', '/data/backups/', '/data/meta.html',
  '/DATA/site.db', '/data/./site.db', '//data/site.db', '/data%2fsite.db', '/data/%73ite.db',
  '/uploads/../data/site.db', '/uploads/..%2fsite.db', '/uploads/%2e%2e/site.db',
  '/content.json/../data/site.db', '/.env', '/Caddyfile', '/srv/data/site.db', '/.git/config',
]
for (const yol of gizli) {
  const r = await istek(SITE + yol)
  const govde = r.ok ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0)
  const sqlite = govde.subarray(0, 15).toString() === 'SQLite format 3'
  kontrol(`Gizli dosya: ${yol}`, !sqlite && !(r.ok && /JWT_SECRET|\[core\]/.test(govde.toString())), `HTTP ${r.status}${sqlite ? ' — VERİTABANI İNDİ' : ''}`)
}

// ── 2. Güvenlik başlıkları ───────────────────────────────────────────────────
for (const yol of ['/', '/admin/', '/content.json']) {
  const h = (await istek(SITE + yol)).headers
  const eksik = ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy']
    .filter((b) => !h.get(b))
  kontrol(`Başlıklar: ${yol}`, eksik.length === 0 && !h.get('server'), eksik.length ? `eksik: ${eksik.join(', ')}` : `server: ${h.get('server') ?? 'yok'}`)
}
const csp = (await istek(SITE + '/')).headers.get('content-security-policy') ?? ''
kontrol('CSP: betik yalnızca kendi kök', /script-src 'self'(;|$)/.test(csp) && !/unsafe-eval/.test(csp), csp.slice(0, 60))

// ── 3. Yetkisiz erişim: her yönetim uç noktası token'sız / sahte token'la ────
const openapi = await (await fetch(API + '/openapi.json')).json()
const uclar = Object.entries(openapi.paths).flatMap(([yol, m]) =>
  Object.keys(m).filter((v) => yol.startsWith('/api/admin') || yol === '/api/auth/me' || yol === '/api/auth/password')
    .map((v) => [v.toUpperCase(), yol.replace(/\{[^}]+\}/g, 'hakkimda')]))
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const sahte = {
  'token yok': null,
  'bozuk token': 'abc.def.ghi',
  'alg=none': `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'admin@localhost', exp: 9999999999 })}.`,
  'yanlış anahtar': `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'admin@localhost', exp: 9999999999 })}.${'x'.repeat(43)}`,
}
for (const [ad, tok] of Object.entries(sahte)) {
  const sizan = []
  for (const [v, yol] of uclar) {
    const r = await istek(SITE + yol, { method: v, headers: { 'content-type': 'application/json', ...(tok && { authorization: `Bearer ${tok}` }) }, body: v === 'GET' || v === 'DELETE' ? undefined : '{}' })
    if (r.status !== 401) sizan.push(`${v} ${yol} → ${r.status}`)
  }
  kontrol(`Yetki (${ad}): ${uclar.length} uç nokta`, sizan.length === 0, sizan.slice(0, 3).join('; '))
}

// ── 4. Giriş sınırı Caddy'nin arkasında: X-Forwarded-For taklidiyle atlatılabiliyor mu? ──
const yanlis = { email: 'admin@localhost', password: 'yanlis-parola' }
let son = 0
for (let i = 0; i < 7; i++) {
  const r = await istek(SITE + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${i}` }, body: JSON.stringify(yanlis) })
  son = r.status
}
kontrol('Giriş sınırı: sahte X-Forwarded-For ile atlatma', son === 429, `7. deneme HTTP ${son}`)

// Token'ı doğrudan API'den al (giriş sınırı Caddy'nin IP'sine düştü; API'de ayrı IP).
const tok = (await (await fetch(API + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL ?? 'admin@localhost', password: process.env.ADMIN_PASSWORD ?? 'degistir' }) })).json()).accessToken
const yaz = (v, yol, govde) => istek(SITE + '/api/admin' + yol, { method: v, headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}`, 'x-forwarded-for': '198.51.100.250' }, body: govde && JSON.stringify(govde) })

// ── 5. Tehlikeli bağlantılar (kayıtlı XSS) ──────────────────────────────────
const t = (x) => ({ tr: x, en: x })
const kotu = ['javascript:alert(1)', 'JavaScript:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', '//evil.example', 'https://ok.example/" onmouseover="x']
const gecen = []
for (const href of kotu) {
  const r = await yaz('POST', '/links', { id: 'kotu-baglanti', label: t('X'), href })
  if (r.status === 204) { gecen.push(href); await yaz('DELETE', '/links/kotu-baglanti') }
}
kontrol(`Bağlantı şeması: ${kotu.length} kötü adres`, gecen.length === 0, gecen.join(' | '))

// ── 6. Kimlik/slug enjeksiyonu ve SQL ────────────────────────────────────────
const kimlikler = ['../etc', 'a/b', "x' OR '1'='1", 'ORDER', 'order', 'ust', 'Büyük', 'a'.repeat(65), '']
const kabul = []
for (const id of kimlikler) {
  const r = await yaz('POST', '/sections', { id, kind: 'text', heading: t('X') })
  if (r.status === 204) { kabul.push(id); await yaz('DELETE', `/sections/${encodeURIComponent(id)}`) }
}
kontrol('Kimlik doğrulaması (yol, SQL, ayrılmış)', kabul.length === 0, kabul.join(' | '))
const sql = await yaz('PUT', "/sections/hakkimda' OR '1'='1", { heading: t('X') })
kontrol('SQL enjeksiyonu yol parametresinde', sql.status === 404, `HTTP ${sql.status}`)

// ── 7. Tür değiştirme (mass assignment): hazır bölüm türü güncellemeyle değişmemeli ──
const once = (await (await fetch(API + '/api/admin/content', { headers: { authorization: `Bearer ${tok}` } })).json()).sections.find((s) => s.id === 'hakkimda')
await yaz('PUT', '/sections/hakkimda', { kind: 'text', heading: once.heading, navLabel: once.navLabel, body: once.body })
const sonra = (await (await fetch(API + '/api/admin/content', { headers: { authorization: `Bearer ${tok}` } })).json()).sections.find((s) => s.id === 'hakkimda')
kontrol('Tür güncellemeyle değişmiyor', sonra.kind === 'about', `kind: ${sonra.kind}`)
const sil = await yaz('DELETE', '/sections/hakkimda')
kontrol('Hazır bölüm silinmiyor', sil.status === 409, `HTTP ${sil.status}`)

// ── 8. Yükleme: tür, boyut ───────────────────────────────────────────────────
const yukle = async (veri, ad, tip) => {
  const f = new FormData(); f.append('file', new Blob([veri], { type: tip }), ad)
  return istek(SITE + '/api/admin/media', { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'x-forwarded-for': '198.51.100.250' }, body: f })
}
const svg = await yukle('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', 'a.png', 'image/png')
kontrol('Yükleme: PNG adıyla SVG', svg.status === 422, `HTTP ${svg.status}`)
const html = await yukle('<html><script>alert(1)</script></html>', 'a.jpg', 'image/jpeg')
kontrol('Yükleme: JPEG adıyla HTML', html.status === 422, `HTTP ${html.status}`)
const buyuk = await yukle(Buffer.alloc(17 * 1024 * 1024, 1), 'a.jpg', 'image/jpeg')
kontrol('Yükleme: 17 MB gövde → hemen 413', buyuk.status === 413, `HTTP ${buyuk.status}`)
const izinsiz = await istek(SITE + '/api/admin/media', { method: 'POST', body: (() => { const f = new FormData(); f.append('file', new Blob([Buffer.alloc(17 * 1024 * 1024)]), 'a.jpg'); return f })() })
kontrol("Yükleme: token'sız büyük gövde → hemen 401", izinsiz.status === 401, `HTTP ${izinsiz.status}`)

// ── 9. Hata sızıntısı ─────────────────────────────────────────────────────────
const bozuk = await istek(SITE + '/api/admin/sections', { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.250' }, body: '{bozuk' })
const metin = await bozuk.text()
kontrol('Hata yanıtında iz yok (traceback, yol)', !/Traceback|\/app\/|File "/.test(metin), `HTTP ${bozuk.status}`)

// ── 10. CORS: başka siteden okuma ────────────────────────────────────────────
const cors = await istek(SITE + '/api/admin/content', { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } })
kontrol('CORS: yabancı köke izin yok', !cors.headers.get('access-control-allow-origin'), `ACAO: ${cors.headers.get('access-control-allow-origin') ?? 'yok'}`)

// ── Rapor ────────────────────────────────────────────────────────────────────
for (const s of sonuc) console.log(`${s.gecti ? 'GEÇTİ' : 'KALDI'}  ${s.ad}${s.ayrinti ? '  — ' + s.ayrinti : ''}`)
const kalan = sonuc.filter((s) => !s.gecti).length
console.log(`\n${sonuc.length - kalan}/${sonuc.length} geçti`)
process.exit(kalan)
