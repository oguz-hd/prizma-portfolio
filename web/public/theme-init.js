/*
 * Sayfa boyanmadan önce ziyaretçinin açık tema seçimini işaretler (Sorun 6, 05.11.2026).
 *
 * Neden ayrı dosya: Caddy CSP'si `script-src 'self'` — inline betik çalışmaz.
 * Neden burada: JS paketi inip tema uygulanana kadar `index.html` koyu zemini boyar;
 * açık temayı seçmiş ziyaretçi her yenilemede kısa bir siyah flaş görürdü.
 *
 * Yalnızca `html[data-boot="light"]` işaretini koyar; zemin rengi index.html'deki stilde
 * (renk kodlarının yaşadığı ikinci yer, presets.ts → LIGHT_TOKENS.ground ile aynı olmalı).
 * İşareti theme/scheme.ts → initScheme kaldırır; ondan sonra zemini --ground belirler.
 * Hata verirse (gizli sekme, kapalı site verisi) sessizce koyu kalır.
 */
;(function () {
  try {
    if (localStorage.getItem('prizma.scheme') !== 'light') return
    document.documentElement.setAttribute('data-boot', 'light')
    var theme = document.querySelector('meta[name="theme-color"]')
    if (theme) theme.setAttribute('content', '#E4E7E1')
    var scheme = document.querySelector('meta[name="color-scheme"]')
    if (scheme) scheme.setAttribute('content', 'light')
  } catch (e) {
    /* koyu kalır */
  }
})()
