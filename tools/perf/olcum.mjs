/**
 * Performans ölçümü — CPU, GPU, bellek; dört cihaz profili.
 *
 *   node tools/perf/olcum.mjs [adres] [profil,profil...]
 *   (PowerShell'den çalıştır; Bash'ten başlatılan Chrome port açmıyor.)
 *
 * Yayın derlemesini ölçer (dev'de React geliştirme kipi her şeyi şişirir):
 * docs/CALISTIRMA.md "Performans ölçümü".
 *
 * Bağımlılık yok: Chrome'u kendisi başlatır, CDP'ye Node'un yerleşik WebSocket'iyle
 * bağlanır. GPU kullanımı Windows sayaçlarından (GPU Engine / GPU Process Memory).
 *
 * Kısıtlı profillerde süreç CPU'su anlamsız (Chrome yavaşlatmayı iş parçacığını
 * bekleterek yapıyor); oralarda asıl ölçü "ana iş parçacığı meşgul %".
 */
import { spawn, execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ADRES = process.argv[2] ?? 'http://localhost:5180/'
const PORT = 9333

const PROFILLER = [
  { id: 'dizustu', ad: 'Bu dizüstü — 1440×900, kısıtsız', w: 1440, h: 900, dpr: 1, mobil: false, cpu: 1, gpu: true },
  { id: 'orta', ad: 'Orta sınıf dizüstü — 1366×768, CPU 4× yavaş', w: 1366, h: 768, dpr: 1, mobil: false, cpu: 4, gpu: true },
  { id: 'telefon', ad: 'Ucuz Android — 412×915 @2.625x, CPU 6× yavaş', w: 412, h: 915, dpr: 2.625, mobil: true, cpu: 6, gpu: true },
  { id: 'gpusuz', ad: 'GPU hızlandırması yok — 1366×768, yazılımla çizim', w: 1366, h: 768, dpr: 1, mobil: false, cpu: 1, gpu: false },
]
const SECILEN = process.argv[3]?.split(',')

const bekle = (ms) => new Promise((r) => setTimeout(r, ms))

/* --- CDP ------------------------------------------------------------------ */

async function baglan(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((ok, hata) => {
    ws.onopen = ok
    ws.onerror = hata
  })
  let sira = 0
  const bekleyen = new Map()
  ws.onmessage = (m) => {
    const v = JSON.parse(m.data)
    const b = v.id && bekleyen.get(v.id)
    if (!b) return
    bekleyen.delete(v.id)
    v.error ? b.hata(new Error(`${b.yontem}: ${v.error.message}`)) : b.ok(v.result)
  }
  return {
    gonder: (yontem, params = {}) =>
      new Promise((ok, hata) => {
        const id = ++sira
        bekleyen.set(id, { ok, hata, yontem })
        ws.send(JSON.stringify({ id, method: yontem, params }))
      }),
    kapat: () => ws.close(),
  }
}

/* --- Windows sayaçları ---------------------------------------------------- */

function ps(komut) {
  return new Promise((ok) =>
    execFile('powershell.exe', ['-NoProfile', '-Command', komut], { maxBuffer: 1 << 22 }, (_, out) =>
      ok(out.trim()),
    ),
  )
}

/** GPU süreci 3B motor kullanımı, saniyelik örnekler (% toplam). */
function gpuOrnekle(pid, saniye) {
  if (!pid) return Promise.resolve([])
  // Türkçe Windows ondalığı virgülle yazar; Number() okuyamaz → kültürsüz yazdır.
  return ps(
    `$inv = [cultureinfo]::InvariantCulture; try { Get-Counter -Counter '\\GPU Engine(pid_${pid}_*engtype_3D)\\Utilization Percentage' ` +
      `-SampleInterval 1 -MaxSamples ${saniye} -ErrorAction Stop | ForEach-Object { ` +
      `([math]::Round(($_.CounterSamples | Measure-Object CookedValue -Sum).Sum, 1)).ToString($inv) } } catch {}`,
  ).then((s) => s.split(/\r?\n/).filter(Boolean).map(Number))
}

async function surecBellegi(pidler) {
  const out = await ps(
    `Get-Process -Id ${pidler.join(',')} -ErrorAction SilentlyContinue | ` +
      `ForEach-Object { "$($_.Id) $($_.WorkingSet64) $($_.PrivateMemorySize64)" }`,
  )
  const m = {}
  for (const satir of out.split(/\r?\n/).filter(Boolean)) {
    const [id, ws, priv] = satir.split(' ').map(Number)
    m[id] = { ws, priv }
  }
  return m
}

async function gpuBellegi(pid) {
  if (!pid) return null
  const out = await ps(
    `try { ((Get-Counter '\\GPU Process Memory(pid_${pid}_*)\\Dedicated Usage','\\GPU Process Memory(pid_${pid}_*)\\Shared Usage' -ErrorAction Stop).CounterSamples | Measure-Object CookedValue -Sum).Sum.ToString([cultureinfo]::InvariantCulture) } catch { 0 }`,
  )
  return Number(out) || 0
}

/* --- Sayfa içi kayıt -------------------------------------------------------- */

// Her belgede baştan çalışır: kare zamanları + uzun görevler.
const KAYITCI = `
  window.__olcum = { kareler: [], uzun: [] };
  (function kare(t) { window.__olcum.kareler.push(t); requestAnimationFrame(kare) })(performance.now());
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__olcum.uzun.push([e.startTime, e.duration]) })
      .observe({ type: 'longtask', buffered: true });
  } catch {}
`

const MB = (b) => Math.round((b / 1048576) * 10) / 10
const yuzde = (x) => Math.round(x * 1000) / 10

function kareOzeti(t) {
  const d = []
  for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1])
  if (!d.length) return null
  const s = [...d].sort((a, b) => a - b)
  const q = (p) => Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 10) / 10
  const sure = t.at(-1) - t[0]
  return {
    fps: Math.round((d.length / sure) * 1000),
    p50: q(0.5),
    p95: q(0.95),
    enUzun: Math.round(s.at(-1)),
    // 60 Hz'lik ekranda kaçacak kare: 16.7 ms'yi aşan aralıkların payı
    kacan60: yuzde(d.filter((x) => x > 17.5).length / d.length),
  }
}

/* --- Bir profil ------------------------------------------------------------ */

async function profilOlc(p) {
  const veri = mkdtempSync(join(tmpdir(), 'prizma-olcum-'))
  const bayraklar = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${veri}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-sync',
    '--window-size=1500,1000',
    '--window-position=40,40',
    // Pencere örtülse de çizmeye devam etsin (yoksa rAF durur, ölçüm boşa gider).
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--enable-precise-memory-info',
    '--js-flags=--expose-gc',
    ...(p.gpu ? [] : ['--disable-gpu', '--disable-gpu-compositing']),
    'about:blank',
  ]
  const chrome = spawn(CHROME, bayraklar, { stdio: 'ignore' })
  try {
    let surum
    for (let i = 0; i < 50 && !surum; i++) {
      await bekle(200)
      surum = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json(), () => null)
    }
    if (!surum) throw new Error('Chrome hata ayıklama portu açılmadı')
    const tarayici = await baglan(surum.webSocketDebuggerUrl)
    const sayfaHedef = (await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())).find(
      (t) => t.type === 'page',
    )
    const s = await baglan(sayfaHedef.webSocketDebuggerUrl)

    const gpuBilgi = await tarayici.gonder('SystemInfo.getInfo')
    const etkinGpu = gpuBilgi.gpu.devices.find((d) => d.active) ?? gpuBilgi.gpu.devices[0]
    const surecler = async () => (await tarayici.gonder('SystemInfo.getProcessInfo')).processInfo
    const ilk = await surecler()
    const rendererPid = ilk.find((x) => x.type === 'renderer')?.id
    const gpuPid = ilk.find((x) => x.type === 'GPU')?.id

    await s.gonder('Page.enable')
    await s.gonder('Runtime.enable')
    await s.gonder('Performance.enable', { timeDomain: 'timeTicks' })
    await s.gonder('Page.bringToFront')
    await s.gonder('Emulation.setDeviceMetricsOverride', {
      width: p.w,
      height: p.h,
      deviceScaleFactor: p.dpr,
      mobile: p.mobil,
    })
    if (p.mobil) await s.gonder('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await s.gonder('Emulation.setCPUThrottlingRate', { rate: p.cpu })
    await s.gonder('Page.addScriptToEvaluateOnNewDocument', { source: KAYITCI })

    const degerlendir = async (ifade) =>
      (await s.gonder('Runtime.evaluate', { expression: ifade, returnByValue: true, awaitPromise: true })).result
        .value
    const metrikler = async () =>
      Object.fromEntries((await s.gonder('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))
    const tus = async (key, code, vk) => {
      for (const type of ['keyDown', 'keyUp'])
        await s.gonder('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: vk })
    }

    /** Bir pencere boyunca ölç: kareler, ana iş parçacığı, süreç CPU'su, GPU. */
    async function pencere(saniye, eylem) {
      const m0 = await metrikler()
      const c0 = await surecler()
      const t0 = await degerlendir('performance.now()')
      const gpuSoz = gpuOrnekle(gpuPid, saniye)
      const bas = Date.now()
      if (eylem) await eylem()
      const kalan = saniye * 1000 - (Date.now() - bas)
      if (kalan > 0) await bekle(kalan)
      const m1 = await metrikler()
      const c1 = await surecler()
      const { kareler, uzun } = await degerlendir(
        `({ kareler: __olcum.kareler.filter(t => t >= ${t0}), uzun: __olcum.uzun.filter(u => u[0] >= ${t0}) })`,
      )
      const duvar = m1.Timestamp - m0.Timestamp
      const cpu = (tip) => {
        const f = (l) => l.filter((x) => x.type === tip).reduce((a, x) => a + x.cpuTime, 0)
        return yuzde((f(c1) - f(c0)) / duvar)
      }
      const gpu = await gpuSoz
      const kare = kareOzeti(kareler)
      return {
        kare,
        anaIsParcacigi: yuzde((m1.TaskDuration - m0.TaskDuration) / duvar),
        script: yuzde((m1.ScriptDuration - m0.ScriptDuration) / duvar),
        stilYerlesim: yuzde(
          (m1.RecalcStyleDuration - m0.RecalcStyleDuration + m1.LayoutDuration - m0.LayoutDuration) / duvar,
        ),
        kareBasinaMs: kare ? Math.round(((m1.TaskDuration - m0.TaskDuration) * 1000) / (kareler.length || 1) * 100) / 100 : null,
        rendererCpu: cpu('renderer'),
        gpuSurecCpu: cpu('GPU'),
        gpu3B: gpu.length ? Math.round((gpu.reduce((a, b) => a + b, 0) / gpu.length) * 10) / 10 : null,
        gpu3BEnYuksek: gpu.length ? Math.max(...gpu) : null,
        uzunGorev: { adet: uzun.length, enUzun: Math.round(Math.max(0, ...uzun.map((u) => u[1]))) },
      }
    }

    const sonuc = { profil: p, gpu: `${etkinGpu.vendorString || ''} ${etkinGpu.deviceString || ''}`.trim(), senaryo: {} }

    // 1) Açılış: ilk 7 saniye (yükleme + ışığın geçişi)
    const acilisPencere = pencere(7, async () => {
      await s.gonder('Page.navigate', { url: ADRES })
    })
    sonuc.senaryo.acilis = await acilisPencere
    const durum = await degerlendir(
      `({ gorunur: document.visibilityState, intro: document.documentElement.dataset.intro ?? null })`,
    )
    if (durum.gorunur !== 'visible') throw new Error('Sekme görünür değil — rAF durur, ölçüm geçersiz')
    sonuc.senaryo.acilis.introBitti = durum.intro === null
    const yukleme = await degerlendir(
      `(() => { const n = performance.getEntriesByType('navigation')[0];
                const fcp = performance.getEntriesByName('first-contentful-paint')[0];
                return { dcl: Math.round(n.domContentLoadedEventEnd), yuk: Math.round(n.loadEventEnd),
                         fcp: fcp ? Math.round(fcp.startTime) : null } })()`,
    )
    sonuc.senaryo.acilis.yukleme = yukleme

    // 2) Giriş slaytında boşta (prizma kendi hâlinde salınıyor)
    sonuc.senaryo.girisBosta = await pencere(10)

    // 3) Slayt geçişleri: sona kadar PageDown, sonra Home
    sonuc.senaryo.gecisler = await pencere(12, async () => {
      for (let i = 0; i < 5; i++) {
        await tus('PageDown', 'PageDown', 34)
        await bekle(1700)
      }
      await tus('Home', 'Home', 36)
    })
    await bekle(2000)

    // 4) İçerik slaytında boşta (cam panel, backdrop-filter)
    await tus('PageDown', 'PageDown', 34)
    await bekle(2000)
    sonuc.senaryo.icerikBosta = await pencere(8)

    // 4b) Teşhis: aynı slayt, pahalı süzgeçlerden biri kapalı — farkı kim yaratıyor?
    const kapat = (css) =>
      degerlendir(`(() => { let s = document.getElementById('__olcum-css');
        if (!s) { s = document.createElement('style'); s.id = '__olcum-css'; document.head.append(s) }
        s.textContent = ${JSON.stringify(css)} })()`)
    await kapat('.panel { backdrop-filter: none !important; -webkit-backdrop-filter: none !important }')
    sonuc.senaryo.icerikCamsiz = await pencere(6)
    await kapat('.prism-glow { filter: none !important }')
    sonuc.senaryo.icerikHalesiz = await pencere(6)
    await kapat('')

    // 5) Dil değişimi (harf çözülmesi)
    sonuc.senaryo.dil = await pencere(8, async () => {
      for (let i = 0; i < 4; i++) {
        await degerlendir(`document.querySelector('.locale-btn:not(.is-active)')?.click()`)
        await bekle(1800)
      }
    })

    // 6) Sızıntı: 2 tur ölçmeden ısın, GC, sonra 15 tur daha; GC; farka bak
    const tur = async () => {
      await tus('PageDown', 'PageDown', 34)
      await bekle(1300)
      await tus('PageDown', 'PageDown', 34)
      await bekle(1300)
      await degerlendir(`document.querySelector('.locale-btn:not(.is-active)')?.click()`)
      await bekle(1300)
      await tus('Home', 'Home', 36)
      await bekle(1300)
    }
    const gcSonra = async () => {
      await s.gonder('HeapProfiler.collectGarbage')
      await bekle(500)
      await s.gonder('HeapProfiler.collectGarbage')
      const m = await metrikler()
      // Kayıtçının kare dizisi büyüyor; ölçüme karışmasın diye boşalt.
      await degerlendir('__olcum.kareler.length = 0')
      return { heap: MB(m.JSHeapUsedSize), dugum: m.Nodes, dinleyici: m.JSEventListeners, belge: m.Documents }
    }
    await tur()
    await tur()
    const once = await gcSonra()
    for (let i = 0; i < 15; i++) await tur()
    const sonra = await gcSonra()
    sonuc.sizinti = { turlar: 15, once, sonra, heapFarkMB: Math.round((sonra.heap - once.heap) * 10) / 10 }

    // 7) Bellek: süreçler + GPU belleği (sızıntı turlarından sonra, yerleşik durum)
    const pidler = (await surecler()).map((x) => x.id)
    const bellek = await surecBellegi(pidler)
    const sTip = Object.fromEntries((await surecler()).map((x) => [x.id, x.type]))
    const topla = (tip, alan) =>
      MB(Object.entries(bellek).filter(([id]) => sTip[id] === tip).reduce((a, [, v]) => a + v[alan], 0))
    sonuc.bellek = {
      jsHeapMB: sonra.heap,
      rendererCalismaMB: topla('renderer', 'ws'),
      rendererOzelMB: topla('renderer', 'priv'),
      gpuSurecCalismaMB: topla('GPU', 'ws'),
      tumChromeOzelMB: MB(Object.values(bellek).reduce((a, v) => a + v.priv, 0)),
      gpuBellegiMB: MB(await gpuBellegi(gpuPid)),
    }

    // 8) Arka planda: sekme gizliyken (başka sekme önde) ne harcıyor
    if (p.id === 'dizustu') {
      await tarayici.gonder('Target.createTarget', { url: 'about:blank' })
      await bekle(1500)
      const gizli = await degerlendir('document.visibilityState')
      const c0 = await surecler()
      await bekle(6000)
      const c1 = await surecler()
      const f = (l) => l.find((x) => x.id === rendererPid)?.cpuTime ?? 0
      sonuc.arkaPlan = { durum: gizli, rendererCpu: yuzde((f(c1) - f(c0)) / 6) }
    }

    s.kapat()
    await tarayici.gonder('Browser.close').catch(() => {})
    tarayici.kapat()
    return sonuc
  } finally {
    await bekle(800)
    chrome.kill()
  }
}

/* --- Ana ------------------------------------------------------------------- */

const sonuclar = []
for (const p of PROFILLER.filter((x) => !SECILEN || SECILEN.includes(x.id))) {
  process.stdout.write(`▶ ${p.ad} … `)
  try {
    const r = await profilOlc(p)
    sonuclar.push(r)
    console.log(`bitti (${r.gpu})`)
  } catch (e) {
    console.log(`HATA: ${e.message}`)
    sonuclar.push({ profil: p, hata: e.message })
  }
}

const klasor = join(dirname(fileURLToPath(import.meta.url)), 'sonuclar')
mkdirSync(klasor, { recursive: true })
const dosya = join(klasor, `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`)
writeFileSync(dosya, JSON.stringify({ adres: ADRES, tarih: new Date().toISOString(), sonuclar }, null, 2))
console.log(`\nSonuç: ${dosya}`)
console.log(JSON.stringify(sonuclar, null, 1))
