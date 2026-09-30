import { useStrings } from '../i18n/strings'

/**
 * İçerik (`/content.json`) gelmediğinde sitenin yerine çıkan ekran — main.tsx.
 *
 * Yedek içerik bilerek yok (Faz 6, kullanıcı kararı): tek kaynak veritabanı.
 * Açılış hazırlanmadan çıkıyor (`prepareIntro` çağrılmıyor), yani
 * `html[data-intro]` bu ekranı gizleyemez (kural 7). Renkler varsayılan ön ayardan.
 */
export function LoadError() {
  const t = useStrings()

  return (
    <main className="load-error">
      <p>{t('loadError')}</p>
      <button type="button" className="hero-link" onClick={() => window.location.reload()}>
        {t('retry')}
      </button>
    </main>
  )
}
