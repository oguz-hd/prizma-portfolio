// Seçenek sayfasını kendi başsız Chrome'umuzda 1440×900'de açar, etkileşimi dener, görüntü alır.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const PUB = path.resolve('pub')
const DOCS = 'C:/Users/drn49/Desktop/ozi/projects/prizma-portfolio/docs/tasarim/beyaz-tema'
// Yayındaki iskeletin yerel karşılığı (doctype + charset + viewport).
fs.writeFileSync(PUB + '/_yerel.html', '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + fs.readFileSync(PUB + '/index.html', 'utf8') + '</body></html>')

const scheme = process.argv[2] || 'light'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
try {
  await page.goto(pathToFileURL(PUB + '/_yerel.html').href)
  await page.bringToFront()
  await page.waitForTimeout(5500)
  await page.screenshot({ path: `${DOCS}/secenek-sayfasi-${scheme}-ust.png` })
  // Y2'yi seç, Projeler'e geç, panel girişini aç — mesajlaşma çalışıyor mu
  await page.click('.dir[data-d="Y2"]')
  await page.click('.views button[data-v="projeler"]')
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${DOCS}/secenek-sayfasi-${scheme}-y2-projeler.png` })
  await page.click('.opt[data-o="B3"]')
  await page.waitForTimeout(800)
  const pick = await page.textContent('#pickName')
  const code = await page.textContent('#pickCode')
  console.log('seçim', pick, code)
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r }))))
  console.log('görüntü', await page.evaluate(() => [...document.images].filter((i) => i.naturalWidth).length + '/' + document.images.length))
  await page.screenshot({ path: `${DOCS}/secenek-sayfasi-${scheme}-tam.png`, fullPage: true })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  console.log('yatay taşma', overflow)
} finally {
  await browser.close()
}
console.log(errors.length ? 'HATALAR:\n' + [...new Set(errors)].join('\n') : 'konsol hatası yok')
