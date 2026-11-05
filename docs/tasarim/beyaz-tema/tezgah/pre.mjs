// Bu makinede node'un OpenSSL entropisi hata veriyor (ERR_OSSL_ENTROPY_SOURCE_STRENGTH_TOO_WEAK);
// esbuild-wasm yalnızca Go çalışma zamanı için rastgele bayt istiyor — güvenlik amaçlı değil.
Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: (a) => { for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 256) | 0; return a } }, configurable: true })
