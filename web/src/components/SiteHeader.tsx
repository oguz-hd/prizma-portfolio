import { useContent } from '../content/useContent'
import { LocaleSwitch } from './LocaleSwitch'
import { Nav } from './Nav'

/**
 * Sabit üst çubuk: prizma işareti (girişe dönüş) + bölümler solda, dil sağda.
 *
 * Oturum 2 (kullanıcı isteği): isim çubuktan kalktı — isim girişte zaten
 * dairenin üstünde; alt çizgi (slayt ilerlemesi) kalktı — konum sağdaki rayda.
 *
 * İşaret merkezdeki prizmanın küçük kopyası: içi yavaşça dönen tayfla dolu
 * (theme.css → .brand-mark). Bağlantının erişilebilir adı içerikteki isim.
 */
export function SiteHeader() {
  const { profile } = useContent()

  return (
    <header className="site-header" data-reveal-chrome>
      <div className="site-header-inner container">
        <a className="brand" href="#ust" aria-label={profile.name}>
          <span className="brand-mark" aria-hidden="true" />
        </a>
        <Nav />
        <LocaleSwitch />
      </div>
    </header>
  )
}
