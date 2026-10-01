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
 */
const [senaryo, API = 'http://localhost:8011'] = process.argv.slice(2)
if (!['A', 'B'].includes(senaryo)) throw new Error('Kullanım: node tools/icerik/buyut.mjs A|B [api]')
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

console.log(`Senaryo ${senaryo} uygulandı → ${API}`)
