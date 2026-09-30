import { useStrings } from '../i18n/strings'
import { LocaleSwitch } from './LocaleSwitch'
import { Nav } from './Nav'

/**
 * Sabit üst çubuk: prizma işareti (girişe dönüş) + bölümler solda, dil sağda.
 *
 * Oturum 2 (kullanıcı isteği): isim çubuktan kalktı — isim girişte zaten
 * dairenin üstünde; alt çizgi (slayt ilerlemesi) kalktı — konum sağdaki rayda.
 *
 * Oturum 4 (kullanıcı isteği): üçgen işaretin yerine "INTRO / GİRİŞ" yazısı —
 * ne olduğu daha anlaşılır. Üçgenin göz alıcılığı yazıda sürüyor: harfler
 * akan tayfla dolu, etrafında aynı ışıma (theme.css → .brand). Dil geçişinde
 * harfleri çözülüyor (data-i18n-fade).
 */
export function SiteHeader() {
  const t = useStrings()

  return (
    <header className="site-header" data-reveal-chrome>
      <div className="site-header-inner container">
        <a className="brand" href="#ust" data-i18n-fade>
          {t('slideIntro')}
        </a>
        <Nav />
        <LocaleSwitch />
      </div>
    </header>
  )
}
