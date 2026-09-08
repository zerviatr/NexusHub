import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SpotlightCard from '../components/SpotlightCard'
import {
  ArrowRight,
  Zap,
  Shield,
  Sparkles,
  Mail,
  ShieldCheck,
  FolderArchive,
  Key,
  Clipboard,
  Globe,
  ImageIcon,
  QrCode,
  Braces,
  FileCheck,
  Activity,
  Code2,
  ShieldAlert,
} from 'lucide-react'
import { useT } from '../lib/i18n'


const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t, locale } = useT()

  const tools = [
    {
      id: 'temp-mail',
      path: '/temp-mail',
      title: t('nav.tools.tempMail') || 'TempMail Generator',
      description: t('dashboard.tools.tempMail.desc') || 'Instant disposable email addresses to bypass spam and tracking. Reads inbox in real-time.',
      icon: Mail,
      gradient: 'from-cyan-600 to-blue-600',
      glowColor: 'rgba(6, 182, 212, 0.3)',
      status: t('dashboard.status.online') || 'Online',
    },
    {
      id: 'universal-decrypter',
      path: '/decrypter',
      title: t('nav.tools.decrypter') || 'Universal Decrypter',
      description: t('dashboard.tools.decrypter.desc') || 'Resolve shortened links to their true destination and strip privacy-invading trackers.',
      icon: ShieldCheck,
      gradient: 'from-emerald-600 to-teal-600',
      glowColor: 'rgba(16, 185, 129, 0.3)',
      status: t('dashboard.status.active') || 'Active',
    },
    {
      id: 'bulk-organizer',
      path: '/organizer',
      title: t('nav.tools.bulkOrganizer') || 'Bulk File Organizer',
      description: t('dashboard.tools.bulkOrganizer.desc') || 'Clean up messy directories by instantly categorizing and bulk-renaming files by extension.',
      icon: FolderArchive,
      gradient: 'from-orange-600 to-rose-600',
      glowColor: 'rgba(244, 63, 94, 0.3)',
      status: t('dashboard.status.ready') || 'Ready',
    },
    {
      id: 'password-generator',
      path: '/password',
      title: t('nav.tools.passwordGenerator') || 'Password Generator',
      description: t('dashboard.tools.passwordGenerator.desc') || 'Generate cryptographically secure passwords, passphrases, and PINs with strength estimation.',
      icon: Key,
      gradient: 'from-amber-500 to-orange-600',
      glowColor: 'rgba(245, 158, 11, 0.3)',
      status: t('dashboard.status.ready') || 'Ready',
    },
    {
      id: 'clipboard-manager',
      path: '/clipboard',
      title: t('nav.tools.clipboardManager') || 'Clipboard Manager',
      description: t('dashboard.tools.clipboardManager.desc') || 'Auto-tracks clipboard history up to 50 entries. Search, copy back, and delete with one click.',
      icon: Clipboard,
      gradient: 'from-sky-500 to-indigo-600',
      glowColor: 'rgba(14, 165, 233, 0.3)',
      status: t('dashboard.status.live') || 'Live',
    },
    {
      id: 'network-tools',
      path: '/network',
      title: t('nav.tools.networkTools') || 'Network Tools',
      description: t('dashboard.tools.networkTools.desc') || 'IP resolution, DNS querying, port scanning, and ICMP ping — all running natively via Node.js.',
      icon: Globe,
      gradient: 'from-emerald-500 to-cyan-600',
      glowColor: 'rgba(16, 185, 129, 0.3)',
      status: t('dashboard.status.ready') || 'Ready',
    },
    {
      id: 'image-toolkit',
      path: '/image',
      title: t('nav.tools.imageToolkit') || 'Image Toolkit',
      description: t('dashboard.tools.imageToolkit.desc') || 'Batch convert images to JPEG, PNG, WebP, or AVIF. Resize, strip EXIF metadata, process locally.',
      icon: ImageIcon,
      gradient: 'from-pink-500 to-rose-600',
      glowColor: 'rgba(236, 72, 153, 0.3)',
      status: t('dashboard.status.ready') || 'Ready',
    },
    {
      id: 'qr-code-studio',
      path: '/qr-code',
      title: t('nav.tools.qrCode') || 'QR Code Studio',
      description: t('dashboard.tools.qrCode.desc') || 'Custom QR code generator for WiFi, URLs, and vCards with vector SVG and high-res PNG export.',
      icon: QrCode,
      gradient: 'from-cyan-500 to-blue-600',
      glowColor: 'rgba(6, 182, 212, 0.3)',
      status: t('dashboard.status.live') || 'Live',
    },
    {
      id: 'json-studio',
      path: '/json-studio',
      title: t('nav.tools.jsonStudio') || 'JSON & JWT Studio',
      description: t('dashboard.tools.jsonStudio.desc') || 'Offline JSON beautifier, minifier, validator, and real-time JWT token claim inspector.',
      icon: Braces,
      gradient: 'from-indigo-500 to-cyan-500',
      glowColor: 'rgba(99, 102, 241, 0.3)',
      status: t('dashboard.status.active') || 'Active',
    },
    {
      id: 'hash-studio',
      path: '/hash-studio',
      title: t('nav.tools.hashStudio') || 'Hash & Checksum Studio',
      description: t('dashboard.tools.hashStudio.desc') || 'Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes for text and files with instant checksum verification.',
      icon: FileCheck,
      gradient: 'from-emerald-500 to-teal-600',
      glowColor: 'rgba(16, 185, 129, 0.3)',
      status: t('dashboard.status.live') || 'Live',
    },
    {
      id: 'sentinel',
      path: '/sentinel',
      title: 'Resource Sentinel',
      description: 'Gerçek zamanlı donanım sensörleri, çekirdek CPU yükü, RAM tüketim analizörü ve tek tıkla bellek temizleme motoru.',
      icon: Activity,
      gradient: 'from-cyan-500 to-emerald-600',
      glowColor: 'rgba(6, 182, 212, 0.3)',
      status: 'Pro',
    },
    {
      id: 'dev-sandbox',
      path: '/dev-sandbox',
      title: 'DevSandbox API Studio',
      description: 'Hafif, ultra hızlı REST API ve Webhook test stüdyosu. GET/POST istekleri gönderin, gecikmeyi ölçün ve cURL çıktısı alın.',
      icon: Code2,
      gradient: 'from-indigo-500 to-nexus-cyan',
      glowColor: 'rgba(99, 102, 241, 0.3)',
      status: 'Pro',
    },
    {
      id: 'cyber-fortress',
      path: '/fortress',
      title: 'Cyber Fortress & Shredder',
      description: 'DoD 5220.22-M standardında 7 geçişli geri döndürülemez dosya imha motoru ve AES-256-GCM güvenli kasa şifreleme.',
      icon: ShieldAlert,
      gradient: 'from-rose-500 to-amber-600',
      glowColor: 'rgba(244, 63, 94, 0.3)',
      status: 'Pro',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero section */}
      <div className="mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="w-8 h-8 rounded-lg bg-nexus-accent/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-nexus-accent" />
          </div>
          <span className="text-sm font-semibold text-nexus-accent tracking-wide">
            {t('dashboard.welcomeBack') || 'WELCOME BACK'}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl font-extrabold text-white mb-3"
        >
          {locale === 'tr' ? (
            <>NexusHub <span className="gradient-text">Kullanıma Hazır</span>.</>
          ) : (
            <>Your <span className="gradient-text">NexusHub</span> is ready.</>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-nexus-muted text-lg max-w-xl"
        >
          {t('dashboard.readyDesc') || 'A unified suite of powerful tools at your fingertips. Select a tool below to get started.'}
        </motion.p>
      </div>

      {/* Quick stats */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={{
          animate: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
        }}
        className="grid grid-cols-3 gap-4 mb-10"
      >
        {[
          { icon: Zap, label: t('dashboard.stats.activeTools') || 'Active Tools', value: '10 Tools', color: 'text-nexus-cyan', spotColor: 'rgba(6, 182, 212, 0.15)' },
          { icon: Shield, label: t('dashboard.stats.security') || 'Security Guard', value: t('dashboard.stats.ipcIsolated') || 'IPC Isolated', color: 'text-emerald-400', spotColor: 'rgba(16, 185, 129, 0.15)' },
          {
            icon: Sparkles,
            label: t('dashboard.stats.status') || 'System Engine',
            value: t('dashboard.stats.allSystemsGo') || 'All Systems Ready',
            color: 'text-nexus-accent',
            spotColor: 'rgba(139, 92, 246, 0.15)',
          },
        ].map((stat) => (
          <SpotlightCard
            key={stat.label}
            spotlightColor={stat.spotColor}
            className="p-4"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center ${stat.color} shadow-lg`}
              >
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-nexus-muted uppercase tracking-wider">{stat.label}</p>
                <p className="text-base font-bold text-white tracking-tight mt-0.5">{stat.value}</p>
              </div>
            </div>
          </SpotlightCard>
        ))}
      </motion.div>

      {/* Tools grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xs font-semibold text-nexus-muted tracking-widest uppercase">
              {t('dashboard.availableTools') || 'Available Tools'}
            </h2>
            <p className="text-xs text-nexus-muted/60 mt-0.5">High-performance native desktop utilities</p>
          </div>
          <span className="text-xs font-mono text-nexus-muted px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
            {tools.length} Modules Installed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Tool cards */}
          {tools.map((tool, index) => (
            <SpotlightCard
              key={tool.id}
              spotlightColor={tool.glowColor}
              whileHover={{ scale: 1.015, y: -3 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => navigate(tool.path)}
              className="p-6 text-left group cursor-pointer border border-white/5 hover:border-nexus-cyan/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg shadow-black/40 group-hover:scale-105 transition-transform duration-200`}
                  >
                    <tool.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {tool.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-nexus-cyan transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-nexus-muted leading-relaxed mb-6 line-clamp-2">
                  {tool.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-nexus-cyan group-hover:text-nexus-cyan-light transition-colors">
                <span>{t('dashboard.launchTool') || 'Launch Tool'}</span>
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] group-hover:bg-nexus-cyan/20 border border-white/5 group-hover:border-nexus-cyan/40 flex items-center justify-center transition-all">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
