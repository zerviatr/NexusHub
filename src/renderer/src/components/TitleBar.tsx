import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Minus, Square, X, Copy } from 'lucide-react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.nexusAPI) {
        const maximized = await window.nexusAPI.isMaximized()
        setIsMaximized(maximized)
      }
    }
    checkMaximized()

    // Re-check after potential resize events
    const interval = setInterval(checkMaximized, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleMinimize = () => window.nexusAPI?.minimize()
  const handleMaximize = () => {
    window.nexusAPI?.maximize()
    setIsMaximized(!isMaximized)
  }
  const handleClose = () => window.nexusAPI?.close()

  return (
    <div className="h-10 flex items-center justify-between bg-nexus-surface/80 backdrop-blur-xl border-b border-nexus-border/20 drag select-none shrink-0">
      {/* Left spacer */}
      <div className="w-4" />

      {/* Center title */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-nexus-muted font-medium tracking-wide">NexusHub</span>
      </div>

      {/* Window controls */}
      <div className="flex items-center no-drag">
        <motion.button
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.9 }}
          onClick={handleMinimize}
          className="w-11 h-10 flex items-center justify-center text-nexus-muted hover:text-nexus-text transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </motion.button>

        <motion.button
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.9 }}
          onClick={handleMaximize}
          className="w-11 h-10 flex items-center justify-center text-nexus-muted hover:text-nexus-text transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </motion.button>

        <motion.button
          whileHover={{ backgroundColor: 'rgba(239,68,68,0.8)' }}
          whileTap={{ scale: 0.9 }}
          onClick={handleClose}
          className="w-11 h-10 flex items-center justify-center text-nexus-muted hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  )
}
