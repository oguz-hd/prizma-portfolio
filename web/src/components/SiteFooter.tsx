import type { Ref } from 'react'

import { useContent } from '../content/useContent'
import { useStrings } from '../i18n/strings'

/**
 * Altbilgi — kapanış karesinin (İletişim) dibinde, e-posta yayının altında
 * (Contact.tsx → usePlaceBelow). Bilerek sade: yıl, isim, başa dön.
 *
 * "Başa dön" sıradan bir `#ust` bağlantısı; deck.ts sayfadaki her `#slayt`
 * bağlantısını tanıdığı için giriş slaytına geçiş animasyonuyla dönüyor.
 */
export function SiteFooter({ ref }: { ref?: Ref<HTMLElement> }) {
  const { profile } = useContent()
  const t = useStrings()

  return (
    <footer ref={ref} className="site-footer" data-reveal data-i18n-fade>
      {/* "©" YOK: site artık tümüyle Departure Mono ve fontta o glif yok — yerine
          garip bir işaret basıyordu (trex-portfolio'da görülmüştü). */}
      <p className="label site-footer-note">
        {new Date().getFullYear()} · {profile.name}
      </p>
      <a className="hero-link" href="#ust">
        {t('backToTop')}
      </a>
    </footer>
  )
}
