import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NexusHub ErrorBoundary caught]:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.hash = '#/'
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-nexus-bg p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Beklenmeyen Bir Görünüm Hatası Oluştu</h2>
          <p className="text-xs text-nexus-muted max-w-md mb-6 leading-relaxed">
            Arayüz bileşeni yüklenirken bir sorunla karşılaşıldı. Verileriniz güvende. Aşağıdaki butonla ana ekrana dönebilirsiniz.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nexus-accent hover:bg-nexus-accent/90 text-white text-xs font-semibold shadow-lg shadow-nexus-accent/20 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yeniden Başlat & Ana Sayfa</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
