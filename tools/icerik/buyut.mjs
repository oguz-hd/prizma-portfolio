/**
 * Büyüyen içerik senaryoları — düzen, içerik büyüyünce dayanıyor mu?
 *
 *   node tools/icerik/buyut.mjs A|B [api adresi]
 *
 * YALNIZCA ayrı test veritabanında (CALISTIRMA "Büyüyen içerik testi"): tohumlanmış
 * boş veritabanına yönetim API'siyle ekler, geri almaz. Asıl içeriğe uygulanmasın
 * diye varsayılan adres test API'si (8011) ve 8001 reddediliyor.
 *
 *   A — çok kayıt: +6 yetenek grubu, +3 deneyim, +1 eğitim, +2 bağlantı, 3. bio paragrafı
 *   B — uzun metin: +4 grup, 25 harflik isim, uzun unvan/konum/başlıklar, uzun e-posta,
 *       toplam 8 bağlantı
 *   C — yeni bölüm türleri (Faz 9): duyuru (bugünü kapsayan aralık), galeri (6 görsel),
 *       projeler, zaman çizelgesi, serbest metin; bir proje kapaklı
 */
import { deflateSync } from 'node:zlib'
const [senaryo, API = 'http://localhost:8011'] = process.argv.slice(2)
if (!['A', 'B', 'C'].includes(senaryo)) throw new Error('Kullanım: node tools/icerik/buyut.mjs A|B|C [api]')
if (API.includes(':8001')) throw new Error("8001 geliştirme veritabanı — test API'si kullan (8011)")

const t = (tr, en = tr) => ({ tr, en })

async function istek(yontem, yol, govde, token) {
  const r = await fetch(API + yol, {
    method: yontem,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: govde && JSON.stringify(govde),
  })
  if (!r.ok) throw new Error(`${yontem} ${yol} → ${r.status} ${await r.text()}`)
  return r.status === 204 ? null : r.json()
}

const { accessToken: token } = await istek('POST', '/api/auth/login', {
  email: process.env.ADMIN_EMAIL ?? 'admin@localhost',
  password: process.env.ADMIN_PASSWORD ?? 'degistir',
})
const yaz = (yontem, yol, govde) => istek(yontem, yol, govde, token)
const icerik = await istek('GET', '/api/content')
const p = icerik.profile

const GRUPLAR = [
  ['veri', t('Veritabanı', 'Databases'), ['PostgreSQL', 'SQLite', 'Redis', 'MongoDB']],
  ['bulut', t('Bulut', 'Cloud'), ['Docker', 'Cloudflare', 'Fly.io']],
  ['test', t('Test', 'Testing'), ['Vitest', 'Playwright', 'pytest']],
  ['mobil', t('Mobil', 'Mobile'), ['React Native', 'Expo']],
  ['tasarim', t('Tasarım', 'Design'), ['Figma', 'Inkscape', 'Blender']],
  ['araclar', t('Araçlar', 'Tools'), ['Git', 'Vite', 'GSAP', 'Linux']],
]
const grupSayisi = senaryo === 'A' ? 6 : 4
for (const [id, group, items] of GRUPLAR.slice(0, grupSayisi))
  await yaz('POST', '/api/admin/skills', { id, group, items })

if (senaryo === 'A') {
  await yaz('PUT', '/api/admin/profile', {
    name: p.name,
    title: p.title,
    location: p.location,
    tagline: p.tagline,
    bio: {
      tr: [...p.bio.tr, 'Boş zamanlarımda açık kaynak projelere katkı veriyor, küçük araçlar yazıp paylaşıyorum; öğrendiğimi yazıya dökmek en iyi öğrenme yolum.'],
      en: [...p.bio.en, 'In my spare time I contribute to open source and build small tools; writing down what I learn is how I learn best.'],
    },
  })
  const deneyim = [
    ['staj-a', 'Örnek Yazılım A.Ş.', t('Ön yüz stajyeri', 'Front-end intern'), '2024'],
    ['serbest', 'Serbest', t('Web geliştirici', 'Web developer'), '2023 — 2024'],
    ['kulup', 'Kodlama Kulübü', t('Eğitmen', 'Instructor'), '2022 — 2023'],
  ]
  for (const [id, org, role, period] of deneyim)
    await yaz('POST', '/api/admin/milestones', { id, kind: 'experience', org, role, period })
  await yaz('POST', '/api/admin/milestones', {
    id: 'anadolu-lisesi', kind: 'education', org: 'Bergama Anadolu Lisesi', role: t('Sayısal', 'Science track'), period: '2018 — 2022',
  })
  await yaz('POST', '/api/admin/links', { id: 'mastodon', label: t('Mastodon'), href: 'https://mastodon.social/@ornek', icon: '' })
  await yaz('POST', '/api/admin/links', { id: 'blog', label: t('Blog'), href: 'https://ornek.dev', icon: '' })
}

if (senaryo === 'B') {
  await yaz('PUT', '/api/admin/profile', {
    name: 'Abdurrahmangazi Karaosmanoğulları'.slice(0, 25),
    title: t('Kıdemli tam yığın yazılım geliştirici ve teknik ekip lideri', 'Senior full-stack software engineer and technical team lead'),
    location: t('Kahramanmaraş, Afşin — uzaktan çalışmaya açık', 'Kahramanmaraş, Afşin, Türkiye — open to remote'),
    tagline: p.tagline,
    bio: p.bio,
  })
  for (const s of icerik.sections)
    await yaz('PUT', `/api/admin/sections/${s.id}`, {
      heading: t(`${s.heading.tr} ve diğer ayrıntılar`, `${s.heading.en} and other details`),
      navLabel: s.navLabel,
      body: s.body,
    })
  const eposta = icerik.links.find((l) => l.href.startsWith('mailto:'))
  if (eposta)
    await yaz('PUT', `/api/admin/links/${eposta.id}`, {
      label: eposta.label, icon: eposta.icon,
      href: 'mailto:abdurrahmangazi.karaosmanogullari@ornek-sirket.com.tr',
    })
  const ek = [['youtube', 'YouTube'], ['mastodon', 'Mastodon'], ['blog', 'Blog'], ['twitch', 'Twitch'], ['codepen', 'CodePen']]
  for (const [id, ad] of ek.slice(0, Math.max(0, 8 - icerik.links.length)))
    await yaz('POST', '/api/admin/links', { id, label: t(ad), href: `https://ornek.dev/${id}`, icon: '' })
}

if (senaryo === 'C') {
  // Örnek görseller: düz renk geçişli PNG (yalnızca düzen için) — farklı en-boy oranları.
  const BOYUTLAR = [[1600, 1200], [1920, 1080], [1200, 1600], [2400, 1600], [1000, 1000], [1800, 900]]
  const medya = []
  for (const [i, [w, h]] of BOYUTLAR.entries()) {
    const form = new FormData()
    form.append('file', new Blob([png(w, h, i)], { type: 'image/png' }), `ornek-${i}.png`)
    const r = await fetch(`${API}/api/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form })
    if (!r.ok) throw new Error(`yükleme → ${r.status} ${await r.text()}`)
    const m = await r.json()
    medya.push(m.id)
    await yaz('PUT', `/api/admin/media/${m.id}`, { alt: t(`Örnek gözlem ${i + 1}`, `Sample observation ${i + 1}`) })
  }
  const gun = (fark) => new Date(Date.now() + fark * 864e5).toISOString().slice(0, 10)
  await yaz('POST', '/api/admin/sections', {
    id: 'duyuru', kind: 'announcement', heading: t('React atölyesi', 'React workshop'), navLabel: t('Duyuru', 'News'),
    body: { tr: ["Ekim boyunca Bergama MYO'da haftada bir akşam React ve TypeScript atölyesi veriyorum. Başlangıç seviyesine uygun, ücretsiz."],
            en: ['Throughout October I run a weekly evening React and TypeScript workshop at Bergama. Beginner friendly, free.'] },
    link: { label: t('Kayıt ol', 'Sign up'), href: 'https://ornek.dev/atolye' }, startsOn: gun(-1), endsOn: gun(30),
  })
  await yaz('POST', '/api/admin/sections', { id: 'gozlemler', kind: 'gallery', heading: t('Gözlemler', 'Observations') })
  await yaz('PUT', '/api/admin/sections/gozlemler/media', {
    items: medya.map((mediaId, i) => ({ mediaId, ...(i % 2 === 0 && { caption: t(`Gece ${i + 1}`, `Night ${i + 1}`) }) })),
  })
  await yaz('POST', '/api/admin/sections', { id: 'projeler', kind: 'projects', heading: t('Projeler', 'Projects') })
  const proje = icerik.projects[0]
  await yaz('PUT', `/api/admin/projects/${proje.id}`, {
    title: proje.title, summary: proje.summary, description: proje.description, tech: proje.tech,
    repoUrl: proje.repoUrl, liveUrl: proje.liveUrl, published: true, coverMediaId: medya[1],
  })
  await yaz('POST', '/api/admin/sections', { id: 'oduller', kind: 'timeline', heading: t('Ödüller', 'Awards') })
  for (const [i, [rol, kurum, donem]] of [
    [t('Hackathon birinciliği', 'Hackathon winner'), 'Ege Üniversitesi', '2025'],
    [t('Bölüm birinciliği', 'Top of department'), 'Bergama MYO', '2026'],
    [t('Proje yarışması finalisti', 'Project contest finalist'), 'TÜBİTAK', '2024'],
  ].entries()) await yaz('POST', '/api/admin/sections/oduller/items', { id: `odul-${i + 1}`, org: kurum, role: rol, period: donem })
  await yaz('POST', '/api/admin/sections', {
    id: 'hobiler', kind: 'text', heading: t('Hobiler', 'Hobbies'),
    body: { tr: ['Teleskopla gözlem yapıyorum; bu sitenin renkleri oradan.', 'Koşuyorum, müzik dinliyorum.'],
            en: ['I observe with a telescope; this site takes its colours from that.', 'I run and listen to music.'] },
  })
}

console.log(`Senaryo ${senaryo} uygulandı → ${API}`)

/** En küçük geçerli PNG: yatay renk geçişi (her örnek farklı ton). */
function png(w, h, seed) {
  const satir = Buffer.alloc(1 + w * 3)
  for (let x = 0; x < w; x++) {
    const k = x / w
    satir[1 + x * 3] = 20 + 120 * k * ((seed % 3) / 2)
    satir[2 + x * 3] = 30 + 100 * (1 - k)
    satir[3 + x * 3] = 60 + 150 * k
  }
  const ham = Buffer.concat(Array.from({ length: h }, () => satir))
  const parca = (tur, veri) => {
    const b = Buffer.alloc(8 + veri.length + 4)
    b.writeUInt32BE(veri.length, 0)
    b.write(tur, 4)
    veri.copy(b, 8)
    b.writeUInt32BE(crc(Buffer.concat([Buffer.from(tur), veri])), 8 + veri.length)
    return b
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    parca('IHDR', ihdr), parca('IDAT', deflateSync(ham)), parca('IEND', Buffer.alloc(0)),
  ])
}

function crc(b) {
  let c = ~0
  for (const x of b) {
    c ^= x
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
