import { useStrings } from '../i18n/strings'
import { LocaleSwitch } from './LocaleSwitch'
import { Nav } from './Nav'
import { SchemeSwitch } from './SchemeSwitch'

/**
 * Sabit üst çubuk: "INTRO / GİRİŞ" yazısı (girişe dönüş) + bölümler solda,
 * tema ve dil düğmeleri sağda.
 *
 * İsim çubukta yok — girişte zaten dairenin üstünde; slayt ilerlemesi de
 * çubukta değil, sağdaki rayda. Yazının harfleri akan tayfla dolu, etrafında
 * ışıma var (theme.css → .brand); dil geçişinde harfleri çözülüyor (data-i18n-fade).
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
        <div className="header-controls">
          <SchemeSwitch />
          <LocaleSwitch />
        </div>
      </div>
    </header>
  )
}
