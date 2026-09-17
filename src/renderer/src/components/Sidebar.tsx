import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import logoImg from '../assets/logo.png'
import {
  LayoutDashboard,
  Sparkles,
  Mail,
  ShieldCheck,
  FolderArchive,
  Key,
  Clipboard,
  Globe,
  ImageIcon,
  ChevronDown,
  Settings,
  QrCode,
  Braces,
  Search,
  FileCheck,
  Activity,
  ScrollText,
  Code2,
  ShieldAlert,
  Terminal,
  Zap,
  Cpu,
  Send,
  Palette,
  FileText,
  Radio,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
  Clock,
  GitBranch,
  Binary,
} from 'lucide-react'
import { useT } from '../lib/i18n'
import { cyberAudio } from '../lib/cyberAudio'
import { useLicense } from '../lib/LicenseContext'

type NavItem = {
  path: string
  labelKey: string
  icon: React.ElementType
  isPro?: boolean
}

type NavGroup = {
  labelKey: string
  items: NavItem[]
}

// Translation keys only — labels resolved at render time via t()
const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.groups.privacy',
    items: [
             { path: '/decrypter',  labelKey: 'nav.tools.decrypter',         icon: ShieldCheck, isPro: true },
      { path: '/password',   labelKey: 'nav.tools.passwordGenerator',  icon: Key },
      { path: '/fortress',   labelKey: 'nav.tools.cyberFortress',     icon: ShieldAlert, isPro: true },
    ],
  },
  {
    labelKey: 'nav.groups.developer',
    items: [
      { path: '/scratchpad',   labelKey: 'nav.tools.scratchpad',   icon: FileText },
      { path: '/color-studio', labelKey: 'nav.tools.colorStudio',  icon: Palette },
      { path: '/regex-studio', labelKey: 'nav.tools.regexStudio',  icon: Terminal },
      { path: '/fake-data',    labelKey: 'nav.tools.fakeData',     icon: Zap },
      { path: '/api-studio',   labelKey: 'nav.tools.apiStudio',    icon: Send, isPro: true },
      { path: '/qr-code',      labelKey: 'nav.tools.qrCode',       icon: QrCode },
      { path: '/json-studio',  labelKey: 'nav.tools.jsonStudio',   icon: Braces },
      { path: '/hash-studio',  labelKey: 'nav.tools.hashStudio',   icon: FileCheck },
      { path: '/jwt-studio',      labelKey: 'nav.tools.jwtStudio',      icon: KeyRound },
      { path: '/cron-studio',     labelKey: 'nav.tools.cronStudio',     icon: Clock },
      { path: '/mermaid-studio',  labelKey: 'nav.tools.mermaidStudio',  icon: GitBranch },
      { path: '/encoding-studio', labelKey: 'nav.tools.encodingStudio', icon: Binary },
    ],
  },
  {
    labelKey: 'nav.groups.files',
    items: [
      { path: '/pdf-studio', labelKey: 'nav.tools.pdfStudio',        icon: FileText, isPro: true },
      { path: '/organizer',  labelKey: 'nav.tools.bulkOrganizer',    icon: FolderArchive, isPro: true },
             { path: '/image',      labelKey: 'nav.tools.imageToolkit',     icon: ImageIcon, isPro: true },
    ],
  },
  {
    labelKey: 'nav.groups.network',
    items: [
                    { path: '/network',          labelKey: 'nav.tools.networkTools',     icon: Globe, isPro: true },
      { path: '/sentinel',         labelKey: 'nav.tools.sentinel',         icon: Activity, isPro: true },
    ],
  },
]

// ─── Shared active-pill motion IDs ────────────────────────────────────────────
function ActivePill() {
  return (
    <motion.div
      layoutId="activeNav"
      className="absolute inset-0 rounded-lg bg-gradient-to-r from-nexus-accent/20 to-nexus-cyan/10 border border-nexus-accent/30"
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    />
  )
}

function ActiveEdge({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <motion.span
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      exit={{ scaleY: 0, opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`absolute ${collapsed ? 'left-0.5' : 'left-0'} top-2 bottom-2 w-1 rounded-r-full bg-nexus-accent shadow-[0_0_8px_rgba(var(--nexus-accent-rgb,139,92,246),0.9)] pointer-events-none`}
    />
  )
}

// ─── Single nav item button ────────────────────────────────────────────────────
function NavItemBtn({
  item,
  isActive,
  onClick,
  label,
  collapsed = false,
  isPro = true,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
  label: string
  collapsed?: boolean
  isPro?: boolean
}) {
  const Icon = item.icon
  const showPro = item.isPro && !isPro
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        title={collapsed ? (showPro ? `${label} (PRO)` : label) : undefined}
        className={`
          relative w-full flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'} rounded-lg text-[13px] font-medium
          transition-colors duration-150 no-drag cursor-pointer
          ${isActive ? 'text-white' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
        `}
      >
        {isActive && <ActivePill />}
        {isActive && <ActiveEdge collapsed={collapsed} />}
        <Icon className="w-4 h-4 relative z-10 flex-shrink-0" />
        {!collapsed && <span className="relative z-10 truncate">{label}</span>}
        {!collapsed && showPro && (
          <span className="relative z-10 ml-auto text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            PRO
          </span>
        )}
        {collapsed && showPro && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" />
        )}
      </button>

      {/* Floating tooltip on collapsed mode */}
      {collapsed && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-nexus-surface border border-nexus-border/80 text-white text-xs rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
          <span>{label}</span>
          {showPro && (
            <span className="text-[9px] font-mono font-bold px-1 rounded bg-amber-500/20 text-amber-300">
              PRO
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Collapsible group ────────────────────────────────────────────────────────
function NavGroupSection({
  group,
  currentPath,
  navigate,
  t,
  collapsed = false,
  isPro = true,
}: {
  group: NavGroup
  currentPath: string
  navigate: (p: string) => void
  t: (key: string) => string
  collapsed?: boolean
  isPro?: boolean
}) {
  const hasActive = group.items.some((i) => i.path === currentPath)
  const [open, setOpen] = useState(true)

  if (collapsed) {
    return (
      <div className="space-y-1 py-1">
        <div className="w-6 h-px mx-auto bg-nexus-border/40 my-1.5" />
        {group.items.map((item) => (
          <NavItemBtn
            key={item.path}
            item={item}
            isActive={currentPath === item.path}
            onClick={() => {
              cyberAudio.navigate()
              navigate(item.path)
            }}
            label={t(item.labelKey)}
            collapsed={true}
            isPro={isPro}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 no-drag group cursor-pointer"
      >
        <span className="text-[10px] text-nexus-muted font-semibold tracking-widest uppercase group-hover:text-nexus-text/70 transition-colors">
          {t(group.labelKey)}
        </span>
        <motion.div animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
          <ChevronDown
            className={`w-3 h-3 transition-colors ${
              hasActive ? 'text-nexus-accent' : 'text-nexus-muted/50 group-hover:text-nexus-muted'
            }`}
          />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pb-1">
              {group.items.map((item) => (
                <NavItemBtn
                  key={item.path}
                  item={item}
                  isActive={currentPath === item.path}
                  onClick={() => {
                    cyberAudio.navigate()
                    navigate(item.path)
                  }}
                  label={t(item.labelKey)}
                  collapsed={false}
                  isPro={isPro}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useT()
  const { status } = useLicense()
  const isPro = status === 'active'
  const isHome = location.pathname === '/'
  const isActivity = location.pathname === '/activity-feed'
  const [appVersion, setAppVersion] = useState('2.4.3')
  const [downloadedUpdate, setDownloadedUpdate] = useState<string | null>(null)

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nexus_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('nexus_sidebar_collapsed', String(next))
      } catch {}
      try {
        cyberAudio.click()
      } catch {}
      window.dispatchEvent(new CustomEvent('nexus:sidebar-collapse', { detail: { collapsed: next } }))
      return next
    })
  }

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar rail
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (isInput) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleCollapsed()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    window.nexusAPI?.getVersion?.().then((v) => {
      if (v) setAppVersion(v.replace(/^v/, ''))
    })

    const unbind = window.nexusAPI?.updater?.onDownloaded?.((info: any) => {
      if (info?.version) setDownloadedUpdate(info.version)
    })
    return () => unbind?.()
  }, [])

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`h-full flex flex-col border-r border-nexus-border/30 bg-nexus-surface/50 backdrop-blur-xl transition-all duration-300 ease-in-out relative select-none shrink-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo & Toggle Header */}
      {collapsed ? (
        <div className="p-3 flex flex-col items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl overflow-hidden shadow-lg border border-white/10 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
            title="ZenDev"
          >
            <img src={logoImg} alt="ZenDev" className="w-full h-full object-cover" />
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Expand sidebar (Ctrl+B)"
            className="p-1 rounded-lg text-nexus-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer no-drag"
          >
            <PanelLeftOpen className="w-4 h-4 text-nexus-cyan" />
          </button>
        </div>
      ) : (
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg border border-white/10 flex-shrink-0">
              <img src={logoImg} alt="ZenDev" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold gradient-text">ZenDev</h1>
              <p className="text-[9px] text-nexus-muted font-medium tracking-widest uppercase truncate">
                {t('nav.subtitle') || 'Multi-Tool Suite'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Collapse sidebar (Ctrl+B)"
            className="p-1.5 rounded-lg text-nexus-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer no-drag shrink-0"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Divider */}
      <div className={`${collapsed ? 'mx-2' : 'mx-4'} h-px bg-gradient-to-r from-transparent via-nexus-border to-transparent`} />

      {/* Dashboard & Quick Search */}
      <div className={`${collapsed ? 'px-2 pt-2' : 'px-3 pt-3'} pb-1 space-y-1`}>
        {collapsed ? (
          <div className="relative group flex justify-center">
            <button
              onClick={() => {
                cyberAudio.navigate()
                navigate('/')
              }}
              title={t('nav.dashboard')}
              className={`
                relative w-full flex items-center justify-center p-2.5 rounded-lg text-[13px] font-medium
                transition-colors duration-150 no-drag
                ${isHome ? 'text-white' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
              `}
            >
              {isHome && <ActivePill />}
              {isHome && <ActiveEdge collapsed={true} />}
              <LayoutDashboard className="w-4 h-4 relative z-10 flex-shrink-0" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-nexus-surface border border-nexus-border/80 text-white text-xs rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {t('nav.dashboard')}
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              cyberAudio.navigate()
              navigate('/')
            }}
            className={`
              relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
              transition-colors duration-150 no-drag
              ${isHome ? 'text-white' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
            `}
          >
            {isHome && <ActivePill />}
            {isHome && <ActiveEdge collapsed={false} />}
            <LayoutDashboard className="w-4 h-4 relative z-10 flex-shrink-0" />
            <span className="relative z-10">{t('nav.dashboard')}</span>
          </button>
        )}

        {/* Activity Feed */}
        {collapsed ? (
          <div className="relative group flex justify-center">
            <button
              onClick={() => {
                cyberAudio.navigate()
                navigate('/activity-feed')
              }}
              title={t('nav.tools.activityFeed') || 'Activity Feed'}
              className={`
                relative w-full flex items-center justify-center p-2.5 rounded-lg text-[13px] font-medium
                transition-colors duration-150 no-drag
                ${isActivity ? 'text-white' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
              `}
            >
              {isActivity && <ActivePill />}
              {isActivity && <ActiveEdge collapsed={true} />}
              <ScrollText className="w-4 h-4 relative z-10 flex-shrink-0 text-nexus-cyan" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-nexus-surface border border-nexus-border/80 text-white text-xs rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {t('nav.tools.activityFeed') || 'Activity Feed'}
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              cyberAudio.navigate()
              navigate('/activity-feed')
            }}
            className={`
              relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
              transition-colors duration-150 no-drag
              ${isActivity ? 'text-white' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
            `}
          >
            {isActivity && <ActivePill />}
            {isActivity && <ActiveEdge collapsed={false} />}
            <ScrollText className="w-4 h-4 relative z-10 flex-shrink-0 text-nexus-cyan" />
            <span className="relative z-10">{t('nav.tools.activityFeed') || 'Activity Feed'}</span>
          </button>
        )}

        {/* Quick Switcher Trigger */}
        {collapsed ? (
          <div className="relative group flex justify-center pt-1">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('nexus:open-palette'))}
              title="Quick Search (Ctrl+K)"
              className="w-full flex items-center justify-center p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-nexus-cyan hover:text-white transition-all no-drag"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-nexus-surface border border-nexus-border/80 text-white text-xs rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Quick Search (Ctrl+K)
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('nexus:open-palette'))}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-xs text-nexus-muted hover:text-white transition-all group no-drag cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-nexus-cyan" />
              <span className="text-[12px]">Quick Search</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-nexus-muted">
              Ctrl K
            </span>
          </button>
        )}
      </div>

      {/* Scrollable grouped nav */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'} pb-2 space-y-2 scrollbar-hidden`}>
        {NAV_GROUPS.map((group) => (
          <NavGroupSection
            key={group.labelKey}
            group={group}
            currentPath={location.pathname}
            navigate={navigate}
            t={t}
            collapsed={collapsed}
            isPro={isPro}
          />
        ))}
      </nav>

      {/* Upgrade to Pro Callout for Free Users */}
      {!isPro && !collapsed && (
        <div className="mx-3 mb-2 p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-nexus-cyan/10 border border-amber-500/30 text-left">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-amber-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              ZenDev Free
            </span>
            <button
              type="button"
              onClick={() => {
                cyberAudio.copySuccess()
                navigate('/account')
              }}
              className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:brightness-110 transition cursor-pointer"
            >
              PRO Abone Ol
            </button>
          </div>
          <p className="text-[10px] text-nexus-muted leading-relaxed">
            ApiStudio, WorkflowChains ve 10+ ileri araca 149 ₺/ay'dan başlayan esnek SaaS planlarıyla abone olun.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className={collapsed ? 'p-2' : 'p-3'}>
        {downloadedUpdate && !collapsed && (
          <button
            type="button"
            onClick={() => {
              try {
                cyberAudio.copySuccess()
              } catch {}
              window.dispatchEvent(new CustomEvent('nexus:updating-start', { detail: { version: downloadedUpdate } }))
              window.nexusAPI?.updater?.installNow?.()
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 mb-3 rounded-xl bg-gradient-to-r from-nexus-cyan via-nexus-accent to-emerald-400 text-black font-bold text-xs shadow-lg shadow-nexus-cyan/30 animate-pulse active:scale-95 transition-all cursor-pointer no-drag"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Güncelle ({downloadedUpdate})</span>
          </button>
        )}

        {collapsed ? (
          <div className="relative group flex justify-center mb-2">
            <button
              onClick={() => {
                cyberAudio.navigate()
                navigate('/account')
              }}
              title={t('nav.account') || 'Account Settings'}
              className={`
                w-full flex items-center justify-center p-2.5 rounded-lg text-[13px] font-medium
                transition-colors duration-150 no-drag cursor-pointer
                ${location.pathname === '/account' ? 'text-white bg-nexus-accent/20 border border-nexus-accent/30' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
              `}
            >
              <Settings className={`w-4 h-4 flex-shrink-0 ${location.pathname === '/account' ? 'text-nexus-accent' : ''}`} />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-nexus-surface border border-nexus-border/80 text-white text-xs rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {t('nav.account') || 'Account Settings'}
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              cyberAudio.navigate()
              navigate('/account')
            }}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium mb-3
              transition-colors duration-150 no-drag cursor-pointer
              ${location.pathname === '/account' ? 'text-white bg-nexus-accent/20 border border-nexus-accent/30' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
            `}
          >
            <Settings className={`w-4 h-4 flex-shrink-0 ${location.pathname === '/account' ? 'text-nexus-accent' : ''}`} />
            <span className="truncate">{t('nav.account') || 'Account Settings'}</span>
          </button>
        )}

        {collapsed ? (
          <div className="text-center py-1 font-mono text-[10px] text-nexus-muted/60" title={`ZenDev v${appVersion}`}>
            v{appVersion}
          </div>
        ) : (
          <div className="glass-card p-2.5 text-center">
            <p className="text-[10px] text-nexus-muted font-mono font-semibold">ZenDev v{appVersion}</p>
            <p className="text-[9px] text-nexus-muted/60 mt-0.5">Electron + React + TypeScript</p>
          </div>
        )}
      </div>
    </motion.aside>
  )
}

