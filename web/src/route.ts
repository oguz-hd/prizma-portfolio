/**
 * Router yok — bu boyuttaki bir site için gereksiz ağırlık. Üç durum var:
 *
 *   ?lab            token laboratuvarı (panel tema editörünün tohumu)
 *   /               site (slaytlar #hash ile: /#projeler)
 *   başka her yol   404 — sunucu (Caddy `try_files`, Vite dev) bilinmeyen
 *                   yolda da index.html veriyor, ayrım burada.
 *
 * main.tsx (mount öncesi, açılışı hazırlamak için) ve App aynı cevabı okusun
 * diye tek yerde.
 */
export const isLab =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('lab')

export const isNotFound =
  typeof window !== 'undefined' && !['/', '/index.html'].includes(window.location.pathname)
