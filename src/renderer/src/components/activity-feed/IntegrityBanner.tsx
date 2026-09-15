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
import { ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Lock } from 'lucide-react'
import { ChainVerificationResult } from './types'
import { cyberAudio } from '../../lib/cyberAudio'
import { useT } from '../../lib/i18n'

interface IntegrityBannerProps {
  verification: ChainVerificationResult | null
  isVerifying: boolean
  onVerify: () => void
  totalCount: number
}

/**
 * Real-time tamper-evident cryptographic verification status banner.
 * Displays unbroken SHA-256 chain health or alerts if block discontinuity is detected.
 */
export const IntegrityBanner: React.FC<IntegrityBannerProps> = ({
  verification,
  isVerifying,
  onVerify,
  totalCount,
}) => {
  const { t } = useT()

  // Neutral state before first verification or when journal is empty
  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-nexus-card/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-nexus-cyan/10 border border-nexus-cyan/20 flex items-center justify-center text-nexus-cyan flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {t('activityFeed.integrity.genesisBlock') || 'Cryptographic Ledger Ready'}
            </h3>
            <p className="text-xs text-nexus-muted">
              {t('activityFeed.empty.noEventsDesc') ||
                'Activity records will automatically stream here as you use workstation tools.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isValid = verification?.valid ?? true
  const totalVerified = verification?.totalVerified ?? totalCount
  const brokenIndex = verification?.brokenIndex

  return (
    <div
      className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-300 ${
        !isValid
          ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
          : isVerifying
            ? 'bg-nexus-cyan/10 border-nexus-cyan/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
            : 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status icon and description */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
              !isValid
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse'
                : isVerifying
                  ? 'bg-nexus-cyan/20 border-nexus-cyan/40 text-nexus-cyan'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            }`}
          >
            {!isValid ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isVerifying ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-wide">
                {!isValid
                  ? t('activityFeed.integrity.compromisedTitle') || 'Audit Tampering Detected!'
                  : isVerifying
                    ? t('activityFeed.integrity.verifying') || 'Verifying SHA-256 Hash Chain...'
                    : t('activityFeed.integrity.verifiedTitle') ||
                      'Cryptographic Hash Chain Verified'}
              </h3>
              {isValid && !isVerifying && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>100% Intact</span>
                </span>
              )}
            </div>

            <p className="text-xs text-nexus-muted mt-0.5">
              {!isValid
                ? (
                    t('activityFeed.integrity.compromisedDesc') ||
                    'Hash chain discontinuity detected at block #{{index}}. Potential database modification!'
                  ).replace('{{index}}', String(brokenIndex ?? 0))
                : (
                    t('activityFeed.integrity.verifiedDesc') ||
                    'All {{count}} audit journal blocks are unbroken and match SHA-256 genesis chaining.'
                  ).replace('{{count}}', String(totalVerified))}
            </p>
          </div>
        </div>

        {/* Verification Trigger Button */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {verification?.lastVerifiedAt && (
            <span className="text-[11px] text-nexus-muted hidden lg:inline font-mono">
              {new Date(verification.lastVerifiedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => {
              cyberAudio.click()
              onVerify()
            }}
            disabled={isVerifying}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              !isValid
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-nexus-card/80 text-nexus-text border-white/10 hover:border-nexus-cyan/40 hover:text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{t('activityFeed.integrity.reverify') || 'Re-verify'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default IntegrityBanner
