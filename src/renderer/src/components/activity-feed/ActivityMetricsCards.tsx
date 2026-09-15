/*
 * Copyright 2025 Lee Boonstra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react'
import { Activity, ShieldCheck, Layers, AlertOctagon } from 'lucide-react'
import SpotlightCard from '../SpotlightCard'
import { useT } from '../../lib/i18n'

interface ActivityMetricsCardsProps {
  totalEvents: number
  chainIntegrity: number
  verifiedBlocks: number
  failedCount: number
}

/**
 * 4 Glassmorphic metric cards summarizing workstation activity volume,
 * cryptographic integrity ratio, verified chained blocks, and failure counts.
 */
export const ActivityMetricsCards: React.FC<ActivityMetricsCardsProps> = ({
  totalEvents,
  chainIntegrity,
  verifiedBlocks,
  failedCount,
}) => {
  const { t } = useT()

  const metrics = [
    {
      id: 'total',
      title: t('activityFeed.metrics.totalEvents') || 'Total Logged Events',
      value: totalEvents.toLocaleString(),
      icon: Activity,
      color: 'text-nexus-cyan',
      borderColor: 'border-nexus-cyan/20',
      bgColor: 'bg-nexus-cyan/10',
      spotlight: 'rgba(6, 182, 212, 0.15)',
    },
    {
      id: 'integrity',
      title: t('activityFeed.metrics.chainIntegrity') || 'Chain Integrity',
      value: `${chainIntegrity.toFixed(1)}%`,
      icon: ShieldCheck,
      color: chainIntegrity >= 100 ? 'text-emerald-400' : 'text-rose-400',
      borderColor: chainIntegrity >= 100 ? 'border-emerald-500/20' : 'border-rose-500/20',
      bgColor: chainIntegrity >= 100 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      spotlight: chainIntegrity >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
    },
    {
      id: 'blocks',
      title: t('activityFeed.metrics.verifiedBlocks') || 'Verified Blocks',
      value: verifiedBlocks.toLocaleString(),
      icon: Layers,
      color: 'text-nexus-accent',
      borderColor: 'border-nexus-accent/20',
      bgColor: 'bg-nexus-accent/10',
      spotlight: 'rgba(139, 92, 246, 0.15)',
    },
    {
      id: 'failed',
      title: t('activityFeed.metrics.failedActions') || 'Failed / Blocked Ops',
      value: failedCount.toLocaleString(),
      icon: AlertOctagon,
      color: failedCount > 0 ? 'text-amber-400' : 'text-nexus-muted',
      borderColor: failedCount > 0 ? 'border-amber-500/20' : 'border-white/5',
      bgColor: failedCount > 0 ? 'bg-amber-500/10' : 'bg-white/5',
      spotlight: failedCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 148, 184, 0.1)',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((m) => {
        const Icon = m.icon
        return (
          <SpotlightCard
            key={m.id}
            spotlightColor={m.spotlight}
            className={`p-4 rounded-xl border ${m.borderColor} bg-nexus-surface/80 backdrop-blur-md`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-nexus-muted truncate">{m.title}</span>
              <div className={`w-7 h-7 rounded-lg ${m.bgColor} flex items-center justify-center flex-shrink-0 ${m.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold tracking-tight text-white font-mono">
                {m.value}
              </span>
            </div>
          </SpotlightCard>
        )
      })}
    </div>
  )
}

export default ActivityMetricsCards
