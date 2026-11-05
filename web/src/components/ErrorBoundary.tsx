import { Component, type ReactNode } from 'react'

import { abortIntro } from '../prism/intro'
import { LoadError } from './LoadError'

/**
 * Render hatası tüm siteyi boş bırakmasın: hata ekranı çıkar, açılışın gizlemesi kalkar
 * (kural 7). Olay işleyicilerdeki hatalar buraya düşmez; yalnızca render ve efektler.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override componentDidCatch(error: unknown) {
    console.error(error)
    abortIntro()
  }

  override render() {
    return this.state.failed ? <LoadError /> : this.props.children
  }
}
