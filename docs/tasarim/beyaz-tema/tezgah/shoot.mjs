// Kendi başsız Chrome'umuzu açar (playwright-core, kurulu Chrome), 1440×900'de her yönün
// gerçek site/panel görüntüsünü alır. Kullanıcının tarayıcısına dokunmaz; kapanış browser.close().
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const L = JSON.parse(fs.readFileSync('looks.json', 'utf8'))
const DOCS = 'C:/Users/drn49/Desktop/ozi/projects/prizma-portfolio/docs/tasarim/beyaz-tema'
const PUB = path.resolve('pub')
fs.mkdirSync(DOCS, { recursive: true })
fs.mkdirSync(PUB + '/shots', { recursive: true })

const only = process.argv[2] // örn. Y2 — tek yön
const tokensOf = (code) => ({ ...L.axes.A.opts[code.A].t, ...L.axes.E.opts[code.E].t, scheme: 'light' })
const looks = [
  ...L.dirs.map((d) => ({ id: d.id, cfg: { tokens: tokensOf(d.code), fx: { b: d.code.B, c: d.code.C, d: d.code.D } } })),
  { id: 'K0', cfg: { tokens: L.dark.t, fx: {} } },
].filter((l) => !only || only.split(',').includes(l.id))

const site = pathToFileURL(PUB + '/site.html').href
const panel = pathToFileURL(PUB + '/panel.html').href
const url = (base, cfg) => `${base}?cfg=${encodeURIComponent(JSON.stringify(cfg))}`

const browser = await chromium.launch({ channel: 'chrome', headless: true })
console.log('chrome pid', browser.process?.()?.pid ?? '(bilinmiyor)')
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

async function snap(name) {
  await page.screenshot({ path: `${DOCS}/${name}.png` })
  await page.screenshot({ path: `${PUB}/shots/${name}.jpg`, type: 'jpeg', quality: 82 })
  console.log('  ', name)
}
const go = (slug) =>
  page.evaluate((s) => {
    const a = document.createElement('a')
    a.href = '#' + s
    document.body.append(a)
    a.click()
    a.remove()
  }, slug)

try {
  for (const l of looks) {
    console.log(l.id)
    await page.goto(url(site, l.cfg))
    await page.bringToFront()
    await page.waitForTimeout(4600) // açılış ~3.4 sn + pay
    await snap(`${l.id}-giris`)
    await go('hakkimda')
    await page.waitForTimeout(1900)
    await snap(`${l.id}-hakkimda`)
    await go('projeler')
    await page.waitForTimeout(1900)
    await snap(`${l.id}-projeler`)
    await page.goto(url(panel, { ...l.cfg, page: 'login' }))
    await page.waitForTimeout(4200)
    await snap(`${l.id}-panel-giris`)
    await page.goto(url(panel, { ...l.cfg, page: 'panel', hash: 'profil' }))
    await page.waitForTimeout(1500)
    await snap(`${l.id}-panel`)
  }
} finally {
  await browser.close()
}
console.log(errors.length ? 'HATALAR:\n' + [...new Set(errors)].join('\n') : 'konsol hatası yok')
