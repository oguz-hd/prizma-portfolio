import './pre.mjs'
// Sitenin ve panelin GERÇEK kaynağını (web/src, admin/src) seçenek sayfası için paketler.
// Değişen yalnızca: presets (seçenek token'ı Tayf'ın yerine), route (404 bayrağı window.name'den).
import * as esbuild from 'esbuild-wasm'
import path from 'node:path'
import fs from 'node:fs'

const ROOT = 'C:/Users/drn49/Desktop/ozi/projects/prizma-portfolio'
const WEB = ROOT + '/web/src'
const ADMIN = ROOT + '/admin/src'
const PUB = ROOT + '/web/public'
const H = path.resolve('h').replace(/\\/g, '/')
const norm = (p) => p.replace(/\\/g, '/').replace(/\.(tsx|ts|css)$/, '')
const tryExt = (p) => {
  for (const e of ['', '.ts', '.tsx', '.css', '/index.ts'])
    if (fs.existsSync(p + e) && fs.statSync(p + e).isFile()) return p + e
  return null
}
function swap(p) {
  const n = norm(p)
  if (n === WEB + '/theme/presets') return H + '/presets.ts'
  if (n === WEB + '/route') return H + '/route.ts'
  return p
}
const plugin = {
  name: 'harness',
  setup(b) {
    b.onResolve({ filter: /^\/fonts\// }, (a) => ({ path: PUB + a.path }))
    b.onResolve({ filter: /^real:presets$/ }, () => ({ path: WEB + '/theme/presets.ts' }))
    b.onResolve({ filter: /^(site:|admin:|@site\/)/ }, (a) => {
      let base, rest
      if (a.path.startsWith('@site/')) [base, rest] = [WEB, a.path.slice(6)]
      else if (a.path.startsWith('site:')) [base, rest] = [WEB, a.path.slice(5)]
      else [base, rest] = [ADMIN, a.path.slice(6)]
      const p = tryExt(base + '/' + rest)
      if (!p) return { errors: [{ text: 'bulunamadı: ' + a.path }] }
      return { path: swap(p) }
    })
    b.onResolve({ filter: /^\.\.?\// }, (a) => {
      const p = tryExt(path.resolve(a.resolveDir, a.path).replace(/\\/g, '/'))
      if (!p) return
      return { path: swap(p) }
    })
  },
}
await esbuild.build({
  entryPoints: { site: 'h/site-entry.tsx', admin: 'h/admin-entry.tsx' },
  outdir: 'out',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2022',
  jsx: 'automatic',
  loader: { '.woff2': 'dataurl' },
  nodePaths: [path.resolve('node_modules')],
  plugins: [plugin],
  define: {
    'import.meta.env.VITE_SITE_URL': '"#"',
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'warning',
})
console.log(fs.readdirSync('out').map((f) => f + ' ' + fs.statSync('out/' + f).size).join('\n'))
