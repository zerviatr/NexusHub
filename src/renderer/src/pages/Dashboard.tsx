import { useState } from 'react'
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
  Terminal,
  Cpu,
  Send,
  Star,
  Palette,
  FileText,
} from 'lucide-react'
import { useT } from '../lib/i18n'
import { cyberAudio } from '../lib/cyberAudio'


const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t, locale } = useT()

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_pinned_tools')
      return saved ? JSON.parse(saved) : ['color-studio', 'port-killer', 'scratchpad']
    } catch {
      return ['color-studio', 'port-killer', 'scratchpad']
    }
  })

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      cyberAudio.click()
    } catch {}
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem('nexus_pinned_tools', JSON.stringify(next))
      return next
    })
  }

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
    {
      id: 'regex-studio',
      path: '/regex-studio',
      title: 'Regex Lab & Live Tester',
      description: 'Anlık düzenli ifade deneme, grupları yakalama, bayrak kontrolleri ve hazır regex şablonları.',
      icon: Terminal,
      gradient: 'from-violet-600 to-purple-600',
      glowColor: 'rgba(139, 92, 246, 0.3)',
      status: 'Yeni',
    },
    {
      id: 'fake-data',
      path: '/fake-data',
      title: 'Fake Data & Mock Generator',
      description: 'Geliştirici ve test süreçleri için gerçekçi Türkçe sahte kimlik, geçerli test kartları ve toplu JSON/CSV dışa aktarma.',
      icon: Zap,
      gradient: 'from-cyan-600 to-teal-600',
      glowColor: 'rgba(20, 184, 166, 0.3)',
      status: 'Yeni',
    },
    {
      id: 'curl-runner',
      path: '/curl-runner',
      title: 'HTTP & cURL Micro Runner',
      description: 'Hafif, anlık API istek testi, JSON yanıt ayrıştırıcı, HTTP durum kodları ve gecikme ölçer.',
      icon: Send,
      gradient: 'from-blue-600 to-indigo-600',
      glowColor: 'rgba(59, 130, 246, 0.3)',
      status: 'Yeni',
    },
    {
      id: 'system-optimizer',
      path: '/system-optimizer',
      title: 'Windows System Optimizer',
      description: 'Windows DNS önbelleğini temizleme (flushdns) ve geçici disk çöplerini güvenle temizleyerek alan kazanma.',
      icon: Cpu,
      gradient: 'from-emerald-600 to-cyan-600',
      glowColor: 'rgba(16, 185, 129, 0.3)',
      status: 'Yeni',
    },
    {
      id: 'color-studio',
      path: '/color-studio',
      title: t('nav.tools.colorStudio') || 'Color Studio & Contrast',
      description: t('dashboard.tools.colorStudio.desc') || 'HEX, RGB, HSL dönüştürücü, ekran damlalığı, görsel palet çıkarıcı ve WCAG kontrast denetleyici.',
      icon: Palette,
      gradient: 'from-purple-600 to-pink-500',
      glowColor: 'rgba(236, 72, 153, 0.3)',
      status: 'Yeni',
    },
    {
      id: 'port-killer',
      path: '/port-killer',
      title: t('nav.tools.portKiller') || 'Port & Process Watchdog',
      description: t('dashboard.tools.portKiller.desc') || 'Aktif dinlenen portları tarayın, portu hangi process kilitlemiş görün ve tek tıkla sonlandırın.',
      icon: Activity,
      gradient: 'from-rose-600 to-amber-600',
      glowColor: 'rgba(244, 63, 94, 0.3)',
      status: 'Yeni',
    },
    {
      id: 'scratchpad',
      path: '/scratchpad',
      title: t('nav.tools.scratchpad') || 'Markdown Scratchpad',
      description: t('dashboard.tools.scratchpad.desc') || 'Canlı çift panel önizleme, anlık metin istatistiği ve otomatik kayıt özellikli not alanı.',
      icon: FileText,
      gradient: 'from-emerald-600 to-teal-500',
      glowColor: 'rgba(16, 185, 129, 0.3)',
      status: 'Yeni',
    },
    {
      id: 'pdf-studio',
      path: '/pdf-studio',
      title: t('nav.tools.pdfStudio') || 'PDF Studio & Documents',
      description: locale === 'tr'
        ? 'Çoklu PDF belgelerini tek tıkla birleştirin, sayfa aralığına göre bölün ve meta verileri tamamen yerel işleyin.'
        : 'Merge multiple PDF documents, split by custom page ranges, and inspect metadata with zero cloud upload.',
      icon: FileText,
      gradient: 'from-amber-600 to-rose-600',
      glowColor: 'rgba(245, 158, 11, 0.3)',
      status: 'Yeni',
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
          { icon: Zap, label: t('dashboard.stats.activeTools') || 'Active Tools', value: `${tools.length} ${locale === 'tr' ? 'Modül' : 'Tools'}`, color: 'text-nexus-cyan', spotColor: 'rgba(6, 182, 212, 0.15)' },
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

      {/* Pinned favorites section */}
      {pinnedIds.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h2 className="text-xs font-semibold text-white tracking-widest uppercase">
              Sabitlenen Favoriler (Pinned Tools)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tools
              .filter((t) => pinnedIds.includes(t.id))
              .map((tool) => (
                <div
                  key={`pin_${tool.id}`}
                  onClick={() => navigate(tool.path)}
                  className="p-3.5 rounded-2xl bg-nexus-card/80 border border-nexus-accent/30 hover:border-nexus-cyan/50 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-lg shadow-black/30 group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-white shrink-0`}>
                      <tool.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-nexus-cyan transition-colors truncate max-w-[150px]">
                        {tool.title}
                      </h4>
                      <span className="text-[10px] text-nexus-muted font-mono">{tool.status}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => togglePin(tool.id, e)}
                    className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300"
                    title="Favorilerden Çıkar"
                  >
                    <Star className="w-4 h-4 fill-amber-400" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => togglePin(tool.id, e)}
                      className={`p-1.5 rounded-lg transition-all ${
                        pinnedIds.includes(tool.id)
                          ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30'
                          : 'text-nexus-muted hover:text-white bg-white/[0.04]'
                      }`}
                      title={pinnedIds.includes(tool.id) ? 'Favorilerden Kaldır' : 'Favorilere Sabitle'}
                    >
                      <Star className={`w-3.5 h-3.5 ${pinnedIds.includes(tool.id) ? 'fill-amber-400' : ''}`} />
                    </button>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {tool.status}
                    </span>
                  </div>
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
