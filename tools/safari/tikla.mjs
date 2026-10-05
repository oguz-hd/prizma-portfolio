// Safari (WebKit) bağlantı testi: dairedeki bağlantıların ortasına gerçek fare tıklaması
// ve iPhone dokunuşu. Yalnızca WebKit'li küçük imaj (Dockerfile):
//   docker build -t prizma-portfolio-safari tools/safari
//   docker run --rm -v "$PWD/tools/safari:/t" -w /pw prizma-portfolio-safari \
//     sh -c "cp /t/tikla.mjs . && node tikla.mjs https://oguzhd.com"
// Yerel yayın kopyası: --add-host=host.docker.internal:host-gateway, adres
// http://host.docker.internal:8090 (Vite dev sunucusu yabancı ana makine adını reddediyor).
import { webkit, devices } from 'playwright'

const base = (process.argv[2] ?? 'https://oguzhd.com').replace(/\/$/, '')
// Giriş ve İletişim (kapanış karesi) — ikisinin de dairesinde bağlantı var. Yalnızca
// ETKİN slayttakiler denenir: diğerleri inert, tıklanmamaları doğru.
const pages = [base + '/', base + '/#iletisim']
const profiles = [
  ['masaüstü Safari 1440x900', { viewport: { width: 1440, height: 900 } }],
  ['iPhone 13', devices['iPhone 13']],
]
let fail = 0
for (const [name, opts] of profiles) for (const url of pages) {
  const browser = await webkit.launch()
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(6000) // açılış
  const links = await page.$$eval('[data-state="active"] .ring-links a', (as) =>
    as.map((a) => {
      const r = a.getBoundingClientRect()
      const x = r.x + r.width / 2, y = r.y + r.height / 2
      const hit = document.elementFromPoint(x, y)
      return { href: a.getAttribute('href'), x, y, w: r.width, hit: hit ? hit.tagName + (hit.closest('a') === a ? ' (bağlantı)' : '') : null }
    }),
  )
  console.log(`\n== ${name} ${url}: ${links.length} bağlantı`)
  if (!links.length) fail++
  for (const l of links) {
    if (!l.w) { console.log('  görünmüyor', l.href); continue }
    let got = null
    // Yeni sekme WebKit'te 1 sn'yi bulabiliyor — sabit bekleme bir sonraki
    // bağlantıya kayıyordu (05.10.2026). Sekme bekleniyor; mailto'da sekme yok.
    const popup = l.href.startsWith('http')
      ? ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null)
      : Promise.resolve(null)
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) got ??= 'gezinme ' + f.url() })
    await page.evaluate(() => { window.__clicked = null; document.addEventListener('click', (e) => { window.__clicked = e.target.closest('a')?.getAttribute('href') ?? e.target.tagName }, { once: true, capture: true }) })
    if (name.startsWith('iPhone')) await page.touchscreen.tap(l.x, l.y)
    else await page.mouse.click(l.x, l.y)
    const opened = await popup
    if (opened) got = 'yeni sekme ' + opened.url()
    await page.waitForTimeout(300)
    const clicked = await page.evaluate(() => window.__clicked).catch(() => '(sayfa değişti)')
    const ok = !!got || (l.href.startsWith('mailto') && clicked === l.href)
    if (!ok) fail++
    console.log(`  ${ok ? 'OK ' : 'YOK'} ${l.href}  isabet=${l.hit}  tıklanan=${clicked}  ${got ?? ''}`)
    if (got?.startsWith('gezinme')) { await page.goto(url, { waitUntil: 'networkidle' }); await page.waitForTimeout(6000) }
    for (const p of ctx.pages()) if (p !== page) await p.close()
  }
  await browser.close()
}
console.log(fail ? `\n${fail} bağlantı tıklanmadı` : '\nhepsi tıklandı')
process.exit(fail ? 1 : 0)
