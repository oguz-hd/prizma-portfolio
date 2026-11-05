/*
 * Sayfa boyanmadan önce ziyaretçinin açık tema seçimini işaretler: JS paketi inip tema uygulanana kadar
 * index.html koyu zemini boyar, açık seçen ziyaretçi her yenilemede siyah flaş görürdü.
 * Ayrı dosya, çünkü CSP `script-src 'self'` inline betiği engeller. Yalnızca `html[data-boot="light"]`
 * işaretini koyar (zemin index.html'deki stilde); işareti applyTheme kaldırır. Hata verirse koyu kalır.
 * ⚠️ '#E4E7E1' = LIGHT_TOKENS.ground; index.html'deki değerle birlikte değişmeli.
 */
;(function () {
  try {
    if (localStorage.getItem('prizma.scheme') !== 'light') return
    document.documentElement.setAttribute('data-boot', 'light')
    var theme = document.querySelector('meta[name="theme-color"]')
    if (theme) theme.setAttribute('content', '#E4E7E1')
    var scheme = document.querySelector('meta[name="color-scheme"]')
    if (scheme) scheme.setAttribute('content', 'light')
  } catch {
    /* koyu kalır */
  }
})()
