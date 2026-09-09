import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import Dashboard from './pages/Dashboard'
import TempMail from './pages/TempMail'
import UniversalDecrypter from './pages/UniversalDecrypter'
import BulkOrganizer from './pages/BulkOrganizer'
import PasswordGenerator from './pages/PasswordGenerator'
import ClipboardManager from './pages/ClipboardManager'
import NetworkTools from './pages/NetworkTools'
import ImageToolkit from './pages/ImageToolkit'
import QrCodeStudio from './pages/QrCodeStudio'
import JsonStudio from './pages/JsonStudio'
import HashStudio from './pages/HashStudio'
import ResourceSentinel from './pages/ResourceSentinel'
import DevSandbox from './pages/DevSandbox'
import CyberFortress from './pages/CyberFortress'
import Account from './pages/Account'
import Activation from './pages/Activation'
import EulaGate from './pages/EulaGate'
import OnboardingTour from './components/OnboardingTour'
import CommandPalette from './components/CommandPalette'
import ProLockGate from './components/ProLockGate'
import FloatingOrb from './components/FloatingOrb'
import UpdateManager from './components/UpdateManager'
import { useLicense } from './lib/LicenseContext'

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.98 },
}

const pageTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { status } = useLicense()

  // Listen to desktop tray navigation and global shortcut events
  useEffect(() => {
    const unbindNav = window.nexusAPI?.onNavigate?.((path: string) => {
      navigate(path)
    })
    const unbindPalette = window.nexusAPI?.onPaletteToggle?.(() => {
      window.dispatchEvent(new CustomEvent('nexus:open-palette'))
    })
    return () => {
      unbindNav?.()
      unbindPalette?.()
    }
  }, [navigate])
  
  const [hasAcceptedEula, setHasAcceptedEula] = useState<boolean>(
    localStorage.getItem('nexus_eula_accepted') === 'true'
  )

  const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(
    localStorage.getItem('nexus_tour_completed') === 'true'
  )

  const [hasChosenFree, setHasChosenFree] = useState<boolean>(
    localStorage.getItem('nexus_free_tier') === 'true'
  )

  const handleAcceptEula = () => {
    localStorage.setItem('nexus_eula_accepted', 'true')
    setHasAcceptedEula(true)
  }

  const handleCompleteTour = () => {
    localStorage.setItem('nexus_tour_completed', 'true')
    setHasCompletedTour(true)
  }

  const handleContinueFree = () => {
    localStorage.setItem('nexus_free_tier', 'true')
    setHasChosenFree(true)
  }

  // If license was revoked remotely, clear any free-tier bypass state
  useEffect(() => {
    if (status === 'revoked') {
      try {
        localStorage.removeItem('nexus_free_tier')
      } catch {}
      setHasChosenFree(false)
    }
  }, [status])

  // Gate 1: EULA
  if (!hasAcceptedEula) {
    return <EulaGate onAccept={handleAcceptEula} />
  }

  // Gate 2: License Check Loading
  if (status === 'checking') {
    return <div className="flex h-screen w-screen bg-nexus-bg" /> // Blank while checking
  }

  // Gate 3: Instant Kick-Out on Revocation
  if (status === 'revoked') {
    return <Activation />
  }

  // Gate 3b: License Inactive or Expired (unless Free Tier selected)
  if ((status === 'inactive' || status === 'expired') && !hasChosenFree) {
    return <Activation onContinueFree={handleContinueFree} />
  }

  const isPro = status === 'active'

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-nexus-bg">
      <UpdateManager />
      <CommandPalette />
      {!hasCompletedTour && <OnboardingTour onComplete={handleCompleteTour} />}
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {/* Ambient background glows */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-nexus-accent/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-nexus-cyan/5 rounded-full blur-3xl" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="relative z-10 p-8"
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route
                  path="/temp-mail"
                  element={isPro ? <TempMail /> : <ProLockGate toolName="TempMail Generator" toolDesc="Instant disposable email addresses to bypass spam and tracking. Reads inbox in real-time." />}
                />
                <Route
                  path="/decrypter"
                  element={isPro ? <UniversalDecrypter /> : <ProLockGate toolName="Universal Decrypter" toolDesc="Resolve shortened and monetized redirect links to their true destination and strip privacy trackers." />}
                />
                <Route
                  path="/organizer"
                  element={isPro ? <BulkOrganizer /> : <ProLockGate toolName="Bulk File Organizer" toolDesc="Clean up messy directories by instantly categorizing and bulk-renaming files with one-click undo." />}
                />
                <Route path="/aylink" element={<Navigate to="/decrypter" replace />} />
                <Route path="/password" element={<PasswordGenerator />} />
                <Route
                  path="/clipboard"
                  element={isPro ? <ClipboardManager /> : <ProLockGate toolName="Clipboard Manager" toolDesc="Auto-tracks local clipboard history up to 50 entries with global shortcut summon." />}
                />
                <Route
                  path="/network"
                  element={isPro ? <NetworkTools /> : <ProLockGate toolName="Network Tools" toolDesc="Public IP detection, DNS querying, port scanning, and native ICMP ping." />}
                />
                <Route
                  path="/image"
                  element={isPro ? <ImageToolkit /> : <ProLockGate toolName="Image Toolkit" toolDesc="Batch convert images to JPEG, PNG, WebP, or AVIF with EXIF metadata stripper." />}
                />
                <Route path="/qr-code" element={<QrCodeStudio />} />
                <Route path="/json-studio" element={<JsonStudio />} />
                <Route path="/hash-studio" element={<HashStudio />} />
                <Route path="/sentinel" element={<ResourceSentinel />} />
                <Route path="/dev-sandbox" element={<DevSandbox />} />
                <Route
                  path="/fortress"
                  element={isPro ? <CyberFortress /> : <ProLockGate toolName="Cyber Fortress" toolDesc="DoD 5220.22-M 7-pass file shredder and military-grade AES-256-GCM vault encryption." />}
                />
                <Route path="/cyber-fortress" element={<Navigate to="/fortress" replace />} />
                <Route path="/account" element={<Account />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <FloatingOrb />
    </div>
  )
}
