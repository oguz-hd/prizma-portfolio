/**
 * Yayın öncesi tarayıcı testi — gerçek Chrome (başsız), gerçek tıklama ve tuşlarla.
 *
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… node tools/yayin/tarayici.mjs http://127.0.0.1:8090
 *   (PowerShell'den: Bash'ten başlatılan Chrome hata ayıklama portunu açmıyor.)
 *
 * Site: açılış biter, slaytlar ve dil değişir, konsol hatası ve CSP ihlali yok, 404.
 * Panel: giriş ekranı sitenin paletinde ve korumalı adrese gitmeden açılır, giriş
 * yazarak yapılır, çıkış giriş ekranına döner. 1440×900 (kullanıcının asıl görünümü).
 */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SITE = process.argv[2] ?? 'http://127.0.0.1:8090'
const { ADMIN_EMAIL: EMAIL, ADMIN_PASSWORD: PAROLA } = process.env
if (!EMAIL || !PAROLA) throw new Error('ADMIN_EMAIL ve ADMIN_PASSWORD gerekli')
const PORT = 9395

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'yayin-'))}`,
  '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' })
const bekle = (ms) => new Promise((r) => setTimeout(r, ms))
let hedefler
for (let i = 0; i < 40 && !hedefler; i++) {
  await bekle(250)
  hedefler = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json(), () => null)
}
const ws = new WebSocket(hedefler.find((x) => x.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let sira = 0
const bekleyen = new Map()
const olaylar = { hata: [], ag: [] }
ws.onmessage = (m) => {
  const v = JSON.parse(m.data)
  if (v.method === 'Runtime.exceptionThrown') olaylar.hata.push(v.params.exceptionDetails.exception?.description ?? v.params.exceptionDetails.text)
  if (v.method === 'Log.entryAdded' && v.params.entry.level === 'error') olaylar.hata.push(`${v.params.entry.source}: ${v.params.entry.text}`.slice(0, 200))
  if (v.method === 'Network.responseReceived' && v.params.response.status >= 400) olaylar.ag.push(`${v.params.response.status} ${new URL(v.params.response.url).pathname}`)
  bekleyen.get(v.id)?.(v.result)
  bekleyen.delete(v.id)
}
const cdp = (method, params = {}) => new Promise((r) => { const i = ++sira; bekleyen.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const js = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }))?.result?.value
// Enter metin taşımalı ('\r'): formun örtük gönderimi ancak öyle tetikleniyor (gerçek klavye gibi).
const tus = async (key, vk) => {
  for (const type of ['keyDown', 'keyUp'])
    await cdp('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: vk, ...(key === 'Enter' && type === 'keyDown' && { text: '\r' }) })
}
// Klavyeden yazılmış gibi: odaktaki alana metin girer, input olayını tarayıcı üretir.
const yaz = (metin) => cdp('Input.insertText', { text: metin })
const temizle = () => { olaylar.hata.length = 0; olaylar.ag.length = 0 }

const sonuc = []
const kontrol = (ad, gecti, ayrinti = '') => sonuc.push({ ad, gecti, ayrinti })

await Promise.all(['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable'].map((m) => cdp(m)))
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: "window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI))" })

// ── Site ─────────────────────────────────────────────────────────────────────
await cdp('Page.navigate', { url: SITE + '/' })
await bekle(7000) // açılış (ışığın geçişi) emniyet zamanlayıcısıyla en geç ~6 sn
kontrol('Site: açılış bitti', await js("!document.documentElement.hasAttribute('data-intro')"))
const slaytlar = await js("document.querySelectorAll('[data-slide]').length")
const ilk = await js("document.querySelector('[data-slide][data-state=active]')?.id")
await tus('PageDown', 34)
await bekle(2000)
const ikinci = await js("document.querySelector('[data-slide][data-state=active]')?.id")
kontrol('Site: slayt gezinmesi', ilk !== ikinci && !!ikinci, `${slaytlar} slayt · ${ilk} → ${ikinci}`)
const dil = await js("document.documentElement.lang")
await js("document.querySelector('.locale-btn:not(.is-active)').click()")
await bekle(1500)
kontrol('Site: dil değişimi', (await js("document.documentElement.lang")) !== dil, `${dil} → ${await js('document.documentElement.lang')}`)
kontrol('Site: konsol hatası yok', olaylar.hata.length === 0, olaylar.hata.slice(0, 2).join(' | '))
kontrol('Site: başarısız istek yok', olaylar.ag.length === 0, olaylar.ag.join(', '))
kontrol('Site: CSP ihlali yok', (await js('window.__csp.length')) === 0, (await js("window.__csp.join(', ')")) ?? '')
temizle()
await cdp('Page.navigate', { url: SITE + '/olmayan-sayfa' })
await bekle(3000)
kontrol('404 sayfası', /404/.test((await js('document.body.innerText')) ?? '') && olaylar.hata.length === 0)

// ── Panel ────────────────────────────────────────────────────────────────────
// Giriş ekranı sitenin SEÇİLİ paletini almalı. Site varsayılan palette (Tayf) ise
// yedeğiyle ayırt edilemez: geçici olarak Turbo'ya alınır, sonra geri.
const api = async (v, yol, govde, tok) => fetch(SITE + yol, { method: v, headers: { 'content-type': 'application/json', ...(tok && { authorization: `Bearer ${tok}` }) }, body: govde && JSON.stringify(govde) })
const tok = (await (await api('POST', '/api/auth/login', { email: EMAIL, password: PAROLA })).json()).accessToken
const ayar = (await (await fetch(SITE + '/content.json')).json()).settings
await api('PUT', '/api/admin/settings', { ...ayar, preset: 'turbo' }, tok)
const TURBO_ZEMIN = '#0A0A10'
temizle()
await cdp('Page.navigate', { url: SITE + '/admin/' })
await bekle(4500)
const zemin = await js("getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()")
kontrol('Panel girişi: korumalı adrese gitmiyor', olaylar.ag.length === 0, olaylar.ag.join(', '))
kontrol('Panel girişi: sitenin paletinde', zemin.toUpperCase() === TURBO_ZEMIN, `beklenen Turbo ${TURBO_ZEMIN} · zemin ${zemin}`)
await api('PUT', '/api/admin/settings', ayar, tok)
await js("document.querySelector('input[type=email]').focus()")
await yaz(EMAIL)
await js("document.querySelector('input[type=password]').focus()")
await yaz(PAROLA)
await tus('Enter', 13)
await bekle(4000)
const panel = await js("!!document.querySelector('.shell .side') && document.querySelectorAll('.side a').length")
const durum = panel ? '' : await js("JSON.stringify({ eposta: document.querySelector('input[type=email]')?.value, parolaUzunluk: document.querySelector('input[type=password]')?.value.length, hata: document.querySelector('.login-error')?.textContent, odak: document.activeElement?.type })")
kontrol('Panel: yazarak giriş', !!panel, panel ? `${panel} menü öğesi` : durum)
kontrol('Panel: konsol hatası yok', olaylar.hata.length === 0, olaylar.hata.slice(0, 2).join(' | '))
kontrol('Panel: CSP ihlali yok', (await js('window.__csp.length')) === 0)
await js("[...document.querySelectorAll('.topbar .btn')].find(b => /Çıkış/.test(b.textContent))?.click()")
await bekle(2500)
const cikis = await js("JSON.stringify({ parolaAlani: !!document.querySelector('input[type=password]'), token: !!sessionStorage.getItem('prizma.admin.token'), uyari: document.querySelector('.guard')?.textContent ?? null, dugmeler: [...document.querySelectorAll('.topbar .btn')].map(b => b.textContent) })")
const c = JSON.parse(cikis)
kontrol('Panel: çıkış giriş ekranına döner', c.parolaAlani && !c.token, cikis)

for (const s of sonuc) console.log(`${s.gecti ? 'GEÇTİ' : 'KALDI'}  ${s.ad}${s.ayrinti ? '  — ' + s.ayrinti : ''}`)
const kalan = sonuc.filter((s) => !s.gecti).length
console.log(`\n${sonuc.length - kalan}/${sonuc.length} geçti`)
ws.close()
chrome.kill()
process.exit(kalan)
