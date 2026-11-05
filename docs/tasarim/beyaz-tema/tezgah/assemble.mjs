// Paketleri iki bağımsız sayfaya gömer: site.html (gerçek site) ve panel.html (gerçek yönetim paneli).
// İçerik: oguzhd.com/content.json (herkese açık, 05.11.2026). API çağrıları sayfa içinde taklit.
import fs from 'node:fs'

const OUT = process.argv[2] || 'pub'
fs.mkdirSync(OUT, { recursive: true })
const content = fs.readFileSync('content.json', 'utf8')

const pre = (admin) => `
(function () {
  var cfg = {};
  try { cfg = JSON.parse(new URLSearchParams(location.search).get('cfg') || window.name || '{}') } catch (e) {}
  if (cfg.tokens) document.documentElement.style.background = cfg.tokens.ground;
  var C = ${content};
  var json = function (d, s) { return new Response(JSON.stringify(d), { status: s || 200, headers: { 'Content-Type': 'application/json' } }) };
  window.fetch = function (u, o) {
    o = o || {};
    var url = typeof u === 'string' ? u : u.url;
    var path = url.replace(/^https?:\\/\\/[^/]+/, '');
    var m = (o.method || 'GET').toUpperCase();
    if (path === '/content.json' || path === '/api/content') return Promise.resolve(json(C));
    if (path === '/api/admin/content') return Promise.resolve(json(Object.assign({}, C, { media: [] })));
    if (path === '/api/auth/me') return Promise.resolve(json({ id: 1, email: 'admin@localhost' }));
    if (path === '/api/auth/login') {
      var b = {}; try { b = JSON.parse(o.body || '{}') } catch (e) {}
      // Örnek: parola "401" → hatalı parola ekranı (tayfta 401 nm çizgisi).
      return new Promise(function (r) { setTimeout(function () {
        r(b.password === '401' ? json({ detail: 'E-posta ya da parola hatalı.' }, 401) : json({ accessToken: 'ornek' }))
      }, 350) });
    }
    if (m !== 'GET') return Promise.resolve(new Response(null, { status: 204 }));
    return Promise.resolve(json({ detail: 'Örnek sayfada yok' }, 404));
  };
  ${admin ? `
  try {
    if (cfg.page === 'panel') sessionStorage.setItem('prizma.admin.token', 'ornek');
    else sessionStorage.removeItem('prizma.admin.token');
  } catch (e) {}
  if (cfg.hash) history.replaceState(null, '', '#' + cfg.hash);` : ''}
})();`

function page(name, admin) {
  const css = fs.readFileSync(`out/${name}.css`, 'utf8')
  const js = fs.readFileSync(`out/${name}.js`, 'utf8').replace(/<\/script/gi, '<\\/script')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#070A12">
<title>${admin ? 'Panel' : 'Site'}</title>
<style>html{background:#070A12}</style>
<script>${pre(admin)}</script>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>`
}

fs.writeFileSync(`${OUT}/site.html`, page('site', false))
fs.writeFileSync(`${OUT}/panel.html`, page('admin', true))
console.log('ok', fs.statSync(`${OUT}/site.html`).size, fs.statSync(`${OUT}/panel.html`).size)

// Seçenek sayfası: yönler, etki kuralları ve sitenin fontları gömülü.
const F = 'C:/Users/drn49/Desktop/ozi/projects/prizma-portfolio/web/public/fonts/'
const b64 = (f) => fs.readFileSync(F + f).toString('base64')
let idx = fs.readFileSync('index.src.html', 'utf8')
idx = idx
  .replace('/*FONT_DM*/', b64('DepartureMono-Regular.woff2'))
  .replace('/*FONT_AT*/', b64('AtkinsonHyperlegibleNext-Regular-latin.woff2'))
  .replace('/*FONT_ATX*/', b64('AtkinsonHyperlegibleNext-Regular-latin-ext.woff2'))
  .replace('/*LOOKS*/', () => fs.readFileSync('looks.json', 'utf8'))
  .replace('/*FXCSS*/', () => fs.readFileSync('h/fx.css', 'utf8'))
fs.writeFileSync(`${OUT}/index.html`, idx)
console.log('index', fs.statSync(`${OUT}/index.html`).size)
