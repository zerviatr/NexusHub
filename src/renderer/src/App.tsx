import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import Account from './pages/Account'
import Activation from './pages/Activation'
import EulaGate from './pages/EulaGate'
import OnboardingTour from './components/OnboardingTour'
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
  const { status } = useLicense()
  
  const [hasAcceptedEula, setHasAcceptedEula] = useState<boolean>(
    localStorage.getItem('nexus_eula_accepted') === 'true'
  )

  const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(
    localStorage.getItem('nexus_tour_completed') === 'true'
  )

  const handleAcceptEula = () => {
    localStorage.setItem('nexus_eula_accepted', 'true')
    setHasAcceptedEula(true)
  }

  const handleCompleteTour = () => {
    localStorage.setItem('nexus_tour_completed', 'true')
    setHasCompletedTour(true)
  }

  // Gate 1: EULA
  if (!hasAcceptedEula) {
    return <EulaGate onAccept={handleAcceptEula} />
  }

  // Gate 2: License Check Loading
  if (status === 'checking') {
    return <div className="flex h-screen w-screen bg-nexus-bg" /> // Blank while checking
  }

  // Gate 3: License Validation
  if (status === 'inactive' || status === 'expired') {
    return <Activation />
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-nexus-bg">
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
                <Route path="/temp-mail" element={<TempMail />} />
                <Route path="/decrypter" element={<UniversalDecrypter />} />
                <Route path="/organizer" element={<BulkOrganizer />} />
                <Route path="/aylink" element={<Navigate to="/decrypter" replace />} />
                <Route path="/password" element={<PasswordGenerator />} />
                <Route path="/clipboard" element={<ClipboardManager />} />
                <Route path="/network" element={<NetworkTools />} />
                <Route path="/image" element={<ImageToolkit />} />
                <Route path="/account" element={<Account />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
