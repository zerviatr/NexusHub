import { useState, useEffect, useRef, useId, useCallback } from 'react'
import {
  Workflow,
  Sparkles,
  Copy,
  Check,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  FileCode,
  Maximize2,
  Minimize2,
  FileImage,
  Layers,
} from 'lucide-react'
import mermaid from 'mermaid'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useT } from '../lib/i18n'
import { cyberAudio } from '../lib/cyberAudio'
import { useFileGatewayDrop } from '../lib/fileGateway'

// Initialize Mermaid with ZenDev Dark Palette
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#0e0e18',
    primaryColor: '#8b5cf6',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#a78bfa',
    lineColor: '#22d3ee',
    secondaryColor: '#1e1e30',
    tertiaryColor: '#161625',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  securityLevel: 'loose',
})

const TEMPLATES: Record<string, { labelKey: string; defaultLabel: string; code: string }> = {
  flowchart: {
    labelKey: 'mermaidStudio.templates.flowchart',
    defaultLabel: 'Flowchart',
    code: `flowchart TD
    Client[Web & Desktop Client] -->|Tauri IPC / HTTPS| Gateway[API Gateway & Router]
    Gateway --> ServiceA[Auth & Security Service]
    Gateway --> ServiceB[Developer Tool Suite]
    ServiceA --> DB[(SQLite Local DB)]
    ServiceB --> Engine[Native Crypto & WASM Engine]
    style Client fill:#8b5cf6,stroke:#a78bfa,stroke-width:2px,color:#fff
    style Gateway fill:#06b6d4,stroke:#22d3ee,stroke-width:2px,color:#fff
    style Engine fill:#10b981,stroke:#34d399,stroke-width:2px,color:#fff`,
  },
  sequence: {
    labelKey: 'mermaidStudio.templates.sequence',
    defaultLabel: 'Sequence Diagram',
    code: `sequenceDiagram
    autonumber
    actor Dev as Developer
    participant UI as Desktop React UI
    participant Bridge as Tauri IPC Bridge
    participant Rust as Rust Native Engine

    Dev->>UI: Request Port Scan
    UI->>Bridge: invoke("scan_listening_ports")
    Bridge->>Rust: Query OS Socket Table
    Rust-->>Bridge: List of Listening Sockets
    Bridge-->>UI: Render Active Ports
    UI-->>Dev: Display Interactive Table`,
  },
  erd: {
    labelKey: 'mermaidStudio.templates.erd',
    defaultLabel: 'Entity Relationship',
    code: `erDiagram
    USER ||--o{ LICENSE : owns
    USER ||--o{ ACTIVITY_LOG : generates
    LICENSE ||--|{ ACTIVATION : validates
    ACTIVITY_LOG ||--|| AUDIT_BLOCK : hashes

    USER {
        string id PK
        string email
        string tier
        datetime created_at
    }
    LICENSE {
        string license_key PK
        string hardware_id
        boolean active
        datetime expires_at
    }
    ACTIVITY_LOG {
        string id PK
        string tool_name
        string action
        datetime timestamp
    }`,
  },
  state: {
    labelKey: 'mermaidStudio.templates.state',
    defaultLabel: 'State Machine',
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Scanning: Trigger Port Scan
    Scanning --> SocketsDiscovered: Success
    Scanning --> ScanError: Timeout / Permission
    SocketsDiscovered --> Filtered: Apply Web / DB Preset
    Filtered --> Terminating: Kill Process (SIGKILL)
    Terminating --> Idle: Socket Released
    ScanError --> Idle: Retry`,
  },
  classDiagram: {
    labelKey: 'mermaidStudio.templates.classDiagram',
    defaultLabel: 'Class Diagram',
    code: `classDiagram
    class DeveloperTool {
        +String id
        +String title
        +String route
        +run() void
        +export() Blob
    }
    class JwtStudio {
        +String token
        +verifySignature() boolean
        +generateToken() String
    }
    class CronStudio {
        +String expression
        +getNextOccurrences() Date[]
        +explain() String
    }
    DeveloperTool <|-- JwtStudio
    DeveloperTool <|-- CronStudio`,
  },
  gitGraph: {
    labelKey: 'mermaidStudio.templates.gitGraph',
    defaultLabel: 'Git Graph',
    code: `gitGraph
    commit id: "Initial v2.0"
    branch develop
    checkout develop
    commit id: "Add Tauri Skeleton"
    branch feature/jwt-studio
    checkout feature/jwt-studio
    commit id: "Implement Web Crypto HMAC"
    checkout develop
    merge feature/jwt-studio
    checkout main
    merge develop tag: "v2.4.3"`,
  },
}

export default function MermaidStudio() {
  const { t } = useT()
  const uniqueId = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [code, setCode] = useState<string>(TEMPLATES.flowchart.code)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('flowchart')
  const [svgOutput, setSvgOutput] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Copy status
  const [copiedSvg, setCopiedSvg] = useState<boolean>(false)
  const [copiedPng, setCopiedPng] = useState<boolean>(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const renderCounter = useRef<number>(0)

  // Ingest dropped .mmd or .mermaid files
  useFileGatewayDrop(async (detail) => {
    const lower = detail.name.toLowerCase()
    if (lower.endsWith('.mmd') || lower.endsWith('.mermaid') || lower.endsWith('.txt')) {
      try {
        const text = await detail.file.text()
        setCode(text)
        cyberAudio.click()
      } catch (err) {
        console.error('Failed to read dropped Mermaid file:', err)
      }
    }
  })

  // Render diagram via debounced Mermaid API
  useEffect(() => {
    let isCancelled = false
    const timer = setTimeout(async () => {
      renderCounter.current += 1
      const renderId = `zendev-mermaid-${uniqueId}-${renderCounter.current}`
      try {
        const { svg } = await mermaid.render(renderId, code.trim())
        if (!isCancelled) {
          setSvgOutput(svg)
          setErrorMsg(null)
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          setErrorMsg(msg)
        }
      } finally {
        // Clean up temporary mermaid error elements injected into body
        const stray = document.getElementById(renderId)
        if (stray) stray.remove()
        const strayError = document.getElementById(`d${renderId}`)
        if (strayError) strayError.remove()
      }
    }, 200)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [code, uniqueId])

  // Template switch
  const handleSelectTemplate = (tmplKey: string) => {
    cyberAudio.click()
    setSelectedTemplate(tmplKey)
    if (TEMPLATES[tmplKey]) {
      setCode(TEMPLATES[tmplKey].code)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }

  // Zoom controls
  const handleZoomIn = () => {
    cyberAudio.click()
    setZoom((prev) => Math.min(prev + 0.2, 3.0))
  }
  const handleZoomOut = () => {
    cyberAudio.click()
    setZoom((prev) => Math.max(prev - 0.2, 0.4))
  }
  const handleResetZoom = () => {
    cyberAudio.click()
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true)
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    })
  }
  const handleMouseUp = () => setIsPanning(false)

  // Copy SVG code
  const handleCopySvg = () => {
    if (!svgOutput) return
    navigator.clipboard.writeText(svgOutput)
    cyberAudio.copySuccess()
    setCopiedSvg(true)
    setTimeout(() => setCopiedSvg(false), 1800)
  }

  // Download SVG file
  const handleDownloadSvg = () => {
    if (!svgOutput) return
    cyberAudio.copySuccess()
    const blob = new Blob([svgOutput], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zendev-diagram-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Helper: Render SVG to Canvas Blob for PNG export
  const renderSvgToPngBlob = useCallback(
    (svgStr: string, scale = 2): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(svgStr, 'image/svg+xml')
        const svgElem = doc.documentElement

        let width = parseFloat(svgElem.getAttribute('width') || '')
        let height = parseFloat(svgElem.getAttribute('height') || '')
        const viewBox = svgElem.getAttribute('viewBox')

        if ((!width || !height) && viewBox) {
          const parts = viewBox.split(/\s+/).map(Number)
          if (parts.length === 4) {
            width = parts[2]
            height = parts[3]
          }
        }
        if (!width || !height || isNaN(width) || isNaN(height)) {
          width = 800
          height = 600
        }

        const canvas = document.createElement('canvas')
        canvas.width = width * scale
        canvas.height = height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to create Canvas 2D context'))
          return
        }

        // Fill background matching dark theme
        ctx.fillStyle = '#0e0e18'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const img = new Image()
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)

        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          URL.revokeObjectURL(url)
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Canvas PNG conversion failed'))
          }, 'image/png')
        }
        img.onerror = (err) => {
          URL.revokeObjectURL(url)
          reject(err)
        }
        img.src = url
      })
    },
    []
  )

  // Copy PNG to clipboard
  const handleCopyPng = async () => {
    if (!svgOutput) return
    try {
      const blob = await renderSvgToPngBlob(svgOutput, 2)
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ])
      cyberAudio.copySuccess()
      setCopiedPng(true)
      setTimeout(() => setCopiedPng(false), 1800)
    } catch (err) {
      cyberAudio.error()
      console.error('Failed to copy PNG to clipboard:', err)
    }
  }

  // Download PNG file
  const handleDownloadPng = async () => {
    if (!svgOutput) return
    try {
      const blob = await renderSvgToPngBlob(svgOutput, 2)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zendev-diagram-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
      cyberAudio.copySuccess()
    } catch (err) {
      cyberAudio.error()
      console.error('Failed to download PNG:', err)
    }
  }

  return (
    <BaseToolTemplate
      title={t('mermaidStudio.title') || 'Mermaid & Flow Studio'}
      description={
        t('mermaidStudio.description') ||
        'Real-time architecture diagrams, sequence flows, and ERD visualizer with SVG/PNG export.'
      }
      icon={Workflow}
      gradient="from-cyan-500 to-blue-600"
    >
      <div className="space-y-6">
        {/* ─── TEMPLATES BAR & TOOLBAR ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl border border-white/5">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-nexus-muted font-medium mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-nexus-cyan" />
              Templates:
            </span>
            {Object.entries(TEMPLATES).map(([key, val]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectTemplate(key)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  selectedTemplate === key
                    ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 font-semibold shadow-sm'
                    : 'bg-nexus-surface/60 text-nexus-muted hover:text-white border border-white/5'
                }`}
              >
                {t(val.labelKey) || val.defaultLabel}
              </button>
            ))}
          </div>

          {/* Export & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopySvg}
              disabled={!svgOutput}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/60 text-xs text-white hover:border-nexus-cyan/40 transition-colors disabled:opacity-50"
            >
              {copiedSvg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {t('mermaidStudio.copySvg') || 'Copy SVG'}
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              disabled={!svgOutput}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/60 text-xs text-white hover:border-nexus-cyan/40 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {t('mermaidStudio.downloadSvg') || 'Download SVG'}
            </button>
            <button
              type="button"
              onClick={handleCopyPng}
              disabled={!svgOutput}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-border/60 text-xs text-white hover:border-cyan-400/50 transition-colors disabled:opacity-50"
            >
              {copiedPng ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileImage className="w-3.5 h-3.5 text-cyan-400" />}
              {t('mermaidStudio.copyPng') || 'Copy PNG'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!svgOutput}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs text-white font-medium transition-all shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {t('mermaidStudio.downloadPng') || 'Download PNG'}
            </button>
          </div>
        </div>

        {/* ─── SPLIT VIEW: EDITOR & LIVE CANVAS ──────────────────────────────── */}
        <div
          className={`grid gap-4 ${
            isFullscreen ? 'fixed inset-4 z-50 bg-nexus-base/95 p-4 rounded-2xl border border-white/10 grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
          }`}
        >
          {/* Left Column: Code Editor */}
          {!isFullscreen && (
            <div className="lg:col-span-5 glass-panel p-4 rounded-2xl border border-white/5 flex flex-col space-y-3 min-h-[560px]">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <label className="text-xs font-semibold text-nexus-cyan uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  {t('mermaidStudio.editor') || 'Diagram Code'}
                </label>
                <button
                  type="button"
                  onClick={() => setCode('')}
                  className="text-[11px] text-nexus-muted hover:text-rose-400 transition-colors"
                >
                  Clear
                </button>
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter Mermaid syntax (graph TD, sequenceDiagram, erDiagram...)"
                className="flex-1 w-full bg-nexus-base/80 border border-nexus-border/60 rounded-xl p-3.5 text-xs font-mono text-cyan-100 focus:outline-none focus:border-nexus-cyan/60 transition-colors resize-none leading-relaxed"
                spellCheck={false}
              />

              {/* Syntax Error Banner */}
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="overflow-hidden">
                    <p className="font-semibold">Mermaid Syntax Error</p>
                    <p className="font-mono text-[11px] text-rose-300/80 truncate">{errorMsg}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Column: Live Interactive Canvas */}
          <div
            className={`${
              isFullscreen ? 'col-span-1 h-full' : 'lg:col-span-7'
            } glass-panel p-4 rounded-2xl border border-white/5 flex flex-col space-y-3 min-h-[560px]`}
          >
            {/* Canvas Header & Zoom Controls */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-nexus-cyan" />
                {t('mermaidStudio.preview') || 'Live Canvas'}
              </span>

              {/* Zoom & Canvas controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title={t('mermaidStudio.zoomIn') || 'Zoom In'}
                  className="p-1.5 rounded-lg bg-nexus-surface border border-white/5 text-nexus-muted hover:text-white transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-nexus-muted px-1">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title={t('mermaidStudio.zoomOut') || 'Zoom Out'}
                  className="p-1.5 rounded-lg bg-nexus-surface border border-white/5 text-nexus-muted hover:text-white transition-colors"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title={t('mermaidStudio.resetZoom') || 'Reset Zoom'}
                  className="p-1.5 rounded-lg bg-nexus-surface border border-white/5 text-nexus-muted hover:text-white transition-colors ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded-lg bg-nexus-surface border border-white/5 text-nexus-muted hover:text-white transition-colors ml-1"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Interactive Viewport Canvas */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`flex-1 w-full bg-[#0a0a14] rounded-xl border border-white/5 overflow-hidden relative select-none flex items-center justify-center ${
                isPanning ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{ minHeight: '460px' }}
            >
              {svgOutput ? (
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                  }}
                  dangerouslySetInnerHTML={{ __html: svgOutput }}
                  className="flex items-center justify-center max-w-full max-h-full p-4 pointer-events-none"
                />
              ) : (
                <div className="text-center text-nexus-muted text-xs space-y-2">
                  <Workflow className="w-8 h-8 text-white/10 mx-auto animate-pulse" />
                  <p>Rendering diagram...</p>
                </div>
              )}

              {/* Canvas watermark hint */}
              <div className="absolute bottom-2 right-3 text-[10px] text-white/20 pointer-events-none font-mono">
                Pan: Drag &bull; Zoom: Buttons
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseToolTemplate>
  )
}
