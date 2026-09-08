import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Zap,
  Shield,
  Sparkles,
  Mail,
  ShieldCheck,
  FolderArchive,
  Link2,
  Key,
  Clipboard,
  Globe,
  ImageIcon,
} from 'lucide-react'
import { useT } from '../lib/i18n'


const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useT()

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
      id: 'aylink-bypasser',
      path: '/aylink',
      title: t('nav.tools.aylinkBypasser') || 'Aylink Bypasser',
      description: t('dashboard.tools.aylinkBypasser.desc') || 'Bypass aylink, cpmlink, ay.live and similar monetised redirect pages instantly without a browser.',
      icon: Link2,
      gradient: 'from-violet-600 to-purple-600',
      glowColor: 'rgba(139, 92, 246, 0.3)',
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
          dangerouslySetInnerHTML={{ __html: t('dashboard.readyTitle') || 'Your <span class="gradient-text">NexusHub</span> is ready.' }}
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-nexus-muted text-lg max-w-xl"
        >
          {t('dashboard.readyDesc') || 'A unified suite of powerful tools at your fingertips. Select a tool below to get started.'}
        </motion.p>
      </div>

      {/* Stats row */}
      <motion.div
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.1, delayChildren: 0.25 }}
        className="grid grid-cols-3 gap-4 mb-10"
      >
        {[
          { icon: Zap, label: t('dashboard.stats.activeTools') || 'Active Tools', value: '8', color: 'text-nexus-accent' },
          { icon: Shield, label: t('dashboard.stats.security') || 'Security', value: t('dashboard.stats.ipcIsolated') || 'IPC Isolated', color: 'text-nexus-success' },
          {
            icon: Sparkles,
            label: t('dashboard.stats.status') || 'Status',
            value: t('dashboard.stats.allSystemsGo') || 'All Systems Go',
            color: 'text-nexus-cyan',
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card p-4 flex items-center gap-4"
          >
            <div
              className={`w-10 h-10 rounded-xl bg-nexus-card flex items-center justify-center ${stat.color}`}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-nexus-muted">{stat.label}</p>
              <p className="text-sm font-semibold text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Tools grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xs font-semibold text-nexus-muted tracking-widest uppercase mb-4">
          {t('dashboard.availableTools') || 'Available Tools'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tool cards */}
          {tools.map((tool, index) => (
            <motion.button
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.08 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(tool.path)}
              className="glass-card p-6 text-left group cursor-pointer relative overflow-hidden"
            >
              {/* Hover glow overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: `inset 0 0 60px ${tool.glowColor}` }}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}
                  >
                    <tool.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-nexus-success bg-nexus-success/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-nexus-success animate-pulse" />
                    {tool.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-nexus-accent-light transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-nexus-muted leading-relaxed mb-4">
                  {tool.description}
                </p>

                <div className="flex items-center gap-2 text-sm font-medium text-nexus-accent group-hover:text-nexus-accent-light transition-colors">
                  <span>{t('dashboard.launchTool') || 'Launch Tool'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
