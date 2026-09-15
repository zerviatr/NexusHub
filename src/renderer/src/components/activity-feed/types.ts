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

/**
 * Activity category taxonomy covering security, network, system, files, cryptography, APIs, and general operations.
 */
export type ActivityCategory = 'security' | 'network' | 'system' | 'file' | 'crypto' | 'api' | 'general'

/**
 * Execution outcome status of an audited workstation operation.
 */
export type ActivityStatus = 'success' | 'failure' | 'warning' | 'info'

/**
 * Tamper-evident activity journal entry with cryptographic SHA-256 chaining.
 */
export interface ActivityEntry {
  id: string
  sequence?: number
  timestamp: number
  toolId: string
  toolName?: string
  action: string
  category: ActivityCategory
  status: ActivityStatus
  details?: string
  metadata?: Record<string, any>
  durationMs?: number
  hash: string
  prevHash: string
}

/**
 * Real-time filter criteria for querying the activity ledger.
 */
export interface ActivityFilter {
  search: string
  toolId: string
  category: string
  status: string
  timeRange: 'today' | '7d' | '30d' | 'all'
}

/**
 * Verification outcome of the cryptographic SHA-256 hash chain matching auditIntegrity.ts.
 */
export interface ChainVerificationResult {
  valid: boolean
  totalVerified: number
  brokenIndex?: number
  brokenEntryId?: string
  brokenReason?: string
  error?: string
  expectedHash?: string
  actualHash?: string
  timestamp: number
  lastVerifiedAt?: number
}

/**
 * Aggregated statistics for the Activity Feed dashboard.
 */
export interface JournalStats {
  totalEvents: number
  chainIntegrity: number
  verifiedBlocks: number
  failedCount: number
}
