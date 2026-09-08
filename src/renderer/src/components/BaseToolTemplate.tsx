import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface BaseToolTemplateProps {
  title: string
  description: string
  icon: LucideIcon
  gradient?: string
  children: React.ReactNode
}

/**
 * Reusable tool page layout.
 * Provides a consistent animated header (icon + title + description)
 * and a content slot for tool-specific UI.
 *
 * Usage for new tools:
 *   <BaseToolTemplate title="My Tool" description="Does things" icon={Wrench}>
 *     <MyToolUI />
 *   </BaseToolTemplate>
 */
export default function BaseToolTemplate({
  title,
  description,
  icon: Icon,
  gradient = 'from-nexus-accent to-nexus-cyan',
  children,
}: BaseToolTemplateProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-4 mb-8"
      >
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg glow-accent`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-sm text-nexus-muted mt-0.5">{description}</p>
        </div>
      </motion.div>

      {/* Tool content slot */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
