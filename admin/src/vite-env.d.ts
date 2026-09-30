/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sitenin adresi ("Siteyi aç"). Geliştirmede compose veriyor; yayında panelle aynı kök. */
  readonly VITE_SITE_URL?: string
}
