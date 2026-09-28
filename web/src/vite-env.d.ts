/// <reference types="vite/client" />

/*
  Vite'ın kendi tip bildirimleri.

  Gerekli: `import './theme/theme.css'` gibi yan-etkili varlık import'larını
  TypeScript tek başına tanımıyor (TS2882). Bu satır .css/.svg/.png gibi
  Vite'ın çözdüğü uzantıların modül bildirimlerini getiriyor.
  Ayrıca `import.meta.env` tipleri de buradan geliyor — Faz 6'da lazım olacak.
*/
