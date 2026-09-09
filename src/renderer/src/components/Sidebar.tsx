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
  Code2,
  ShieldAlert,
  Terminal,
  Zap,
  Cpu,
  Send,
} from 'lucide-react'
import { useT } from '../lib/i18n'
import { cyberAudio } from '../lib/cyberAudio'

type NavItem = {
  path: string
  labelKey: string
  icon: React.ElementType
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
      { path: '/temp-mail',  labelKey: 'nav.tools.tempMail',         icon: Mail },
      { path: '/decrypter',  labelKey: 'nav.tools.decrypter',        icon: ShieldCheck },
      { path: '/password',   labelKey: 'nav.tools.passwordGenerator', icon: Key },
      { path: '/fortress',   labelKey: 'nav.tools.cyberFortress',    icon: ShieldAlert },
    ],
  },
  {
    labelKey: 'nav.groups.developer',
    items: [
      { path: '/regex-studio', labelKey: 'nav.tools.regexStudio', icon: Terminal },
      { path: '/fake-data',    labelKey: 'nav.tools.fakeData',    icon: Zap },
      { path: '/curl-runner',  labelKey: 'nav.tools.curlRunner',  icon: Send },
      { path: '/dev-sandbox',  labelKey: 'nav.tools.devSandbox',  icon: Code2 },
      { path: '/qr-code',      labelKey: 'nav.tools.qrCode',      icon: QrCode },
      { path: '/json-studio',  labelKey: 'nav.tools.jsonStudio',  icon: Braces },
      { path: '/hash-studio',  labelKey: 'nav.tools.hashStudio',  icon: FileCheck },
    ],
  },
  {
    labelKey: 'nav.groups.files',
    items: [
      { path: '/organizer',  labelKey: 'nav.tools.bulkOrganizer',    icon: FolderArchive },
      { path: '/clipboard',  labelKey: 'nav.tools.clipboardManager', icon: Clipboard },
      { path: '/image',      labelKey: 'nav.tools.imageToolkit',     icon: ImageIcon },
    ],
  },
  {
    labelKey: 'nav.groups.network',
    items: [
      { path: '/system-optimizer', labelKey: 'nav.tools.systemOptimizer', icon: Cpu },
      { path: '/network',          labelKey: 'nav.tools.networkTools',     icon: Globe },
      { path: '/sentinel',         labelKey: 'nav.tools.sentinel',         icon: Activity },
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

function ActiveEdge() {
  return (
    <motion.span
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      exit={{ scaleY: 0, opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-nexus-accent shadow-[0_0_8px_rgba(139,92,246,0.9)] pointer-events-none"
    />
  )
}

// ─── Single nav item button ────────────────────────────────────────────────────
function NavItemBtn({
  item,
  isActive,
  onClick,
  label,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
  label: string
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={`
        relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
        transition-colors duration-150 no-drag
        ${isActive ? 'text-white' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
      `}
    >
      {isActive && <ActivePill />}
      {isActive && <ActiveEdge />}
      <Icon className="w-4 h-4 relative z-10 flex-shrink-0" />
      <span className="relative z-10 truncate">{label}</span>
    </button>
  )
}

// ─── Collapsible group ────────────────────────────────────────────────────────
function NavGroupSection({
  group,
  currentPath,
  navigate,
  t,
}: {
  group: NavGroup
  currentPath: string
  navigate: (p: string) => void
  t: (key: string) => string
}) {
  const hasActive = group.items.some((i) => i.path === currentPath)
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 no-drag group"
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
  const isHome = location.pathname === '/'
  const [appVersion, setAppVersion] = useState('1.0.5')

  useEffect(() => {
    window.nexusAPI?.getVersion?.().then((v) => {
      if (v) setAppVersion(v.replace(/^v/, ''))
    })
  }, [])

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-56 h-full flex flex-col border-r border-nexus-border/30 bg-nexus-surface/50 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg border border-white/10 flex-shrink-0">
          <img src={logoImg} alt="NexusHub" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-base font-bold gradient-text">NexusHub</h1>
          <p className="text-[9px] text-nexus-muted font-medium tracking-widest uppercase">
            {t('nav.subtitle') || 'Multi-Tool Suite'}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-nexus-border to-transparent" />

      {/* Dashboard — pinned, outside groups */}
      <div className="px-3 pt-3 pb-1 space-y-1">
        <button
          onClick={() => navigate('/')}
          className={`
            relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
            transition-colors duration-150 no-drag
            ${isHome ? 'text-white' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
          `}
        >
          {isHome && <ActivePill />}
          {isHome && <ActiveEdge />}
          <LayoutDashboard className="w-4 h-4 relative z-10 flex-shrink-0" />
          <span className="relative z-10">{t('nav.dashboard')}</span>
        </button>

        {/* Quick Switcher Trigger */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('nexus:open-palette'))}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-xs text-nexus-muted hover:text-white transition-all group no-drag"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-nexus-cyan" />
            <span className="text-[12px]">Quick Search</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-nexus-muted">
            Ctrl K
          </span>
        </button>
      </div>

      {/* Scrollable grouped nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 scrollbar-hidden">
        {NAV_GROUPS.map((group) => (
          <NavGroupSection
            key={group.labelKey}
            group={group}
            currentPath={location.pathname}
            navigate={navigate}
            t={t}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3">
        <button
          onClick={() => navigate('/account')}
          className={`
            w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium mb-3
            transition-colors duration-150 no-drag
            ${location.pathname === '/account' ? 'text-white bg-nexus-accent/20 border border-nexus-accent/30' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-card/40'}
          `}
        >
          <Settings className={`w-4 h-4 flex-shrink-0 ${location.pathname === '/account' ? 'text-nexus-accent' : ''}`} />
          <span className="truncate">{t('nav.account') || 'Account Settings'}</span>
        </button>
        <div className="glass-card p-2.5 text-center">
          <p className="text-[10px] text-nexus-muted">NexusHub v{appVersion}</p>
          <p className="text-[9px] text-nexus-muted/60 mt-0.5">Electron + React + TypeScript</p>
        </div>
      </div>
    </motion.aside>
  )
}
