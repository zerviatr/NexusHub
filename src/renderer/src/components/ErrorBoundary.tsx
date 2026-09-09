import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackType?: 'fullscreen' | 'inline'
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

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleReload = () => {
    window.location.hash = '#/'
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackType === 'inline') {
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-nexus-card/40 border border-rose-500/20 rounded-2xl text-center select-none my-6">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Bu Araçta Bir Hata Oluştu</h3>
            <p className="text-xs text-nexus-muted max-w-md mb-3 leading-relaxed">
              Bileşen yüklenirken beklenmedik bir durum gerçekleşti. Diğer araçları kullanmaya devam edebilir veya aracı yeniden başlatabilirsiniz.
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] font-mono text-rose-400/90 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 max-w-lg mb-5 truncate">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center gap-2.5">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-nexus-accent hover:bg-nexus-accent/90 text-white text-xs font-semibold shadow-md shadow-nexus-accent/20 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tekrar Dene</span>
              </button>
              <a
                href="#/"
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-nexus-card border border-nexus-border hover:border-nexus-accent/40 text-nexus-muted hover:text-white text-xs font-medium transition-all active:scale-95"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Panoya Dön</span>
              </a>
            </div>
          </div>
        )
      }

      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-nexus-bg p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Beklenmeyen Bir Görünüm Hatası Oluştu</h2>
          <p className="text-xs text-nexus-muted max-w-md mb-3 leading-relaxed">
            Arayüz bileşeni yüklenirken bir sorunla karşılaşıldı. Verileriniz güvende. Aşağıdaki butonla ana ekrana dönebilirsiniz.
          </p>
          {this.state.error?.message && (
            <p className="text-[11px] font-mono text-rose-400/80 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 max-w-lg mb-6 truncate">
              {this.state.error.message}
            </p>
          )}

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
