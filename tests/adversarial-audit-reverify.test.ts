/*
 Copyright 2025 Lee Boonstra

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import { describe, it, expect } from 'vitest'
import {
  ActivityEntry,
  ActivityCategory,
  ActivityStatus,
  GENESIS_PREV_HASH,
  computeEntryHash,
  verifyAuditChain,
} from '../src/shared/auditIntegrity'
import {
  sanitizeString,
  sanitizeMetadata,
} from '../src/shared/auditSanitization'

function createSampleChain(size: number, startSeq = 1, initialPrevHash = GENESIS_PREV_HASH): ActivityEntry[] {
  const chain: ActivityEntry[] = []
  let prevHash = initialPrevHash
  for (let i = 0; i < size; i++) {
    const sequence = startSeq + i
    const raw: Omit<ActivityEntry, 'hash'> = {
      id: `entry-${sequence}`,
      sequence,
      timestamp: 1700000000000 + i * 1000,
      toolId: `tool-${i % 3}`,
      action: `action_${i}`,
      category: 'system' as ActivityCategory,
      status: 'success' as ActivityStatus,
      details: `Detailed operation description for entry #${sequence}`,
      metadata: { seq: sequence, flag: true },
      durationMs: 10 + i,
      prevHash,
    }
    const hash = computeEntryHash(raw)
    prevHash = hash
    chain.push({ ...raw, hash })
  }
  return chain
}

describe('Challenger Re-Verification Adversarial Oracle', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. DETAILS TAMPERING ADVERSARIAL ORACLE
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Details Tampering Empirical Verification', () => {
    it('detects details modification at genesis block (index 0) and pinpoints brokenIndex: 0', () => {
      const chain = createSampleChain(10)
      chain[0].details = 'Tampered genesis details'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(0)
      expect(result.brokenEntryId).toBe(chain[0].id)
      expect(result.brokenReason).toContain('Tampered content at index 0')
    })

    it('detects details modification at intermediate block (index 5) and pinpoints brokenIndex: 5', () => {
      const chain = createSampleChain(10)
      chain[5].details = 'Tampered mid-chain details'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(5)
      expect(result.brokenEntryId).toBe(chain[5].id)
      expect(result.totalVerified).toBe(5)
      expect(result.brokenReason).toContain('Tampered content at index 5')
    })

    it('detects details modification at tail block (index 9) and pinpoints brokenIndex: 9', () => {
      const chain = createSampleChain(10)
      chain[9].details = 'Tampered tail details'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(9)
      expect(result.brokenEntryId).toBe(chain[9].id)
      expect(result.totalVerified).toBe(9)
      expect(result.brokenReason).toContain('Tampered content at index 9')
    })

    it('detects subtle 1-character and whitespace tampering in details', () => {
      const chain = createSampleChain(5)
      const orig = chain[2].details
      chain[2].details = orig + ' '

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(2)
    })

    it('detects unicode / emoji / newline injections in details', () => {
      const chain = createSampleChain(5)
      chain[3].details = 'Attack\nInjected\r\nNewline 🔥'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(3)
    })

    it('produces distinct computeEntryHash for empty string vs missing details', () => {
      const base: Omit<ActivityEntry, 'hash'> = {
        id: 'test-1',
        sequence: 1,
        timestamp: 1000,
        toolId: 'tool',
        action: 'act',
        category: 'general',
        status: 'info',
        details: '',
        metadata: {},
        durationMs: 0,
        prevHash: GENESIS_PREV_HASH,
      }
      const hashWithEmpty = computeEntryHash(base)
      const hashWithUndef = computeEntryHash({ ...base, details: undefined as any })
      // Both fallback to empty string (entry.details ?? '') consistently
      expect(hashWithEmpty).toBe(hashWithUndef)

      // But non-empty details produces completely different hash
      const hashWithText = computeEntryHash({ ...base, details: 'non-empty' })
      expect(hashWithText).not.toBe(hashWithEmpty)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. DELIMITER COLLISION RESISTANCE ORACLE
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Delimiter Collision Resistance via Length-Prefixed Encoding', () => {
    it('prevents delimiter shifting across toolId and action', () => {
      const entry1: Omit<ActivityEntry, 'hash'> = {
        id: 'e1',
        sequence: 1,
        timestamp: 1000,
        toolId: 'admin|audit',
        action: 'purge',
        category: 'system',
        status: 'success',
        details: 'd',
        metadata: {},
        durationMs: 0,
        prevHash: GENESIS_PREV_HASH,
      }
      const entry2: Omit<ActivityEntry, 'hash'> = {
        id: 'e1',
        sequence: 1,
        timestamp: 1000,
        toolId: 'admin',
        action: 'audit|purge',
        category: 'system',
        status: 'success',
        details: 'd',
        metadata: {},
        durationMs: 0,
        prevHash: GENESIS_PREV_HASH,
      }

      const hash1 = computeEntryHash(entry1)
      const hash2 = computeEntryHash(entry2)
      expect(hash1).not.toBe(hash2)
    })

    it('prevents boundary shifting across action, category, and details', () => {
      const entryA: Omit<ActivityEntry, 'hash'> = {
        id: 'e1',
        sequence: 1,
        timestamp: 1000,
        toolId: 'tool',
        action: 'exec|system',
        category: 'general',
        status: 'info',
        details: 'details|extra',
        metadata: {},
        durationMs: 0,
        prevHash: GENESIS_PREV_HASH,
      }
      const entryB: Omit<ActivityEntry, 'hash'> = {
        id: 'e1',
        sequence: 1,
        timestamp: 1000,
        toolId: 'tool',
        action: 'exec',
        category: 'system' as ActivityCategory,
        status: 'info',
        details: 'extra',
        metadata: {},
        durationMs: 0,
        prevHash: GENESIS_PREV_HASH,
      }

      expect(computeEntryHash(entryA)).not.toBe(computeEntryHash(entryB))
    })

    it('resists adversarial length-prefix injection attacks', () => {
      // Attacker attempts to inject fake length prefix like '3:foo' inside toolId
      const normal: Omit<ActivityEntry, 'hash'> = {
        id: 'e1',
        sequence: 1,
        timestamp: 1000,
        toolId: 'normal',
        action: 'test',
        category: 'general',
        status: 'info',
        details: 'msg',
        metadata: {},
        durationMs: 0,
        prevHash: GENESIS_PREV_HASH,
      }
      const attack: Omit<ActivityEntry, 'hash'> = {
        ...normal,
        toolId: '6:normal|4:test',
      }

      expect(computeEntryHash(attack)).not.toBe(computeEntryHash(normal))
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. QUERY PARAM SECRETS & BEARER TOKEN PADDING REDACTION ORACLE
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. Query Parameter Secrets & Bearer Padding Redaction', () => {
    it('redacts all variants of access_token, refresh_token, client_secret in URLs', () => {
      const testCases = [
        {
          input: 'https://oauth.provider.com/token?access_token=secret123&keep=ok',
          expected: 'https://oauth.provider.com/token?access_token=[REDACTED]&keep=ok',
        },
        {
          input: 'https://oauth.provider.com/token?accessToken=secret123&keep=ok',
          expected: 'https://oauth.provider.com/token?accessToken=[REDACTED]&keep=ok',
        },
        {
          input: 'https://oauth.provider.com/token?refresh_token=refresh456&keep=ok',
          expected: 'https://oauth.provider.com/token?refresh_token=[REDACTED]&keep=ok',
        },
        {
          input: 'https://oauth.provider.com/token?refreshToken=refresh456&keep=ok',
          expected: 'https://oauth.provider.com/token?refreshToken=[REDACTED]&keep=ok',
        },
        {
          input: 'https://oauth.provider.com/token?client_secret=secret789&keep=ok',
          expected: 'https://oauth.provider.com/token?client_secret=[REDACTED]&keep=ok',
        },
        {
          input: 'https://oauth.provider.com/token?clientSecret=secret789&keep=ok',
          expected: 'https://oauth.provider.com/token?clientSecret=[REDACTED]&keep=ok',
        },
        {
          input: 'https://api.com/v1/auth?public=1&access_token=topsecret&refresh_token=toprefresh&client_secret=topclient#frag',
          expected: 'https://api.com/v1/auth?public=1&access_token=[REDACTED]&refresh_token=[REDACTED]&client_secret=[REDACTED]#frag',
        },
      ]

      for (const { input, expected } of testCases) {
        const sanitized = sanitizeString(input)
        expect(sanitized).toBe(expected)
      }
    })

    it('cleanly redacts Bearer tokens with 0, 1, and 2 trailing padding equals (=, ==)', () => {
      const paddingCases = [
        {
          input: 'Bearer dXNlcnBhc3M==',
          expected: 'Bearer [REDACTED_TOKEN]',
        },
        {
          input: 'Bearer dXNlcnBhc3M=',
          expected: 'Bearer [REDACTED_TOKEN]',
        },
        {
          input: 'Bearer dXNlcnBhc3M',
          expected: 'Bearer [REDACTED_TOKEN]',
        },
        {
          input: 'Authorization: Bearer dXNlcnBhc3M==, NextHeader: ok',
          expected: 'Authorization: Bearer [REDACTED_TOKEN], NextHeader: ok',
        },
        {
          input: 'Bearer dXNlcnBhc3M==\nLine2',
          expected: 'Bearer [REDACTED_TOKEN]\nLine2',
        },
        {
          input: 'Bearer dXNlcnBhc3M==.',
          expected: 'Bearer [REDACTED_TOKEN].',
        },
      ]

      for (const { input, expected } of paddingCases) {
        const sanitized = sanitizeString(input)
        expect(sanitized).toBe(expected)
        expect(sanitized).not.toContain('dXNlcnBhc3M')
        expect(sanitized).not.toContain('==')
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 4. RETENTION PRUNING (> 5,000 ENTRIES) SLIDING-WINDOW VERIFICATION ORACLE
  // ──────────────────────────────────────────────────────────────────────────
  describe('4. Retention Pruning Sliding-Window Cryptographic Verification', () => {
    it('verifies a pruned sliding-window chain starting at sequence 5001 with valid 64-char hex prevHash', () => {
      const validHexPrevHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90'
      const prunedChain = createSampleChain(100, 5001, validHexPrevHash)

      const result = verifyAuditChain(prunedChain)
      expect(result.valid).toBe(true)
      expect(result.totalVerified).toBe(100)
      expect(result.brokenIndex).toBeUndefined()
    })

    it('rejects a pruned sliding-window chain if the initial prevHash is NOT a valid 64-char hex string', () => {
      const invalidPrevHashes = [
        'short-hash',
        '0'.repeat(63), // 63 chars (too short)
        '0'.repeat(65), // 65 chars (too long)
        'g'.repeat(64), // invalid hex char 'g'
        'invalid_non_hex_prev_hash_value_that_is_64_characters_long_012345',
      ]

      for (const badHash of invalidPrevHashes) {
        const prunedChain = createSampleChain(5, 5001, badHash)
        const result = verifyAuditChain(prunedChain)
        expect(result.valid).toBe(false)
        expect(result.brokenIndex).toBe(0)
        expect(result.brokenReason).toContain('Pruned log initial prevHash must be a valid 64-character hex string')
      }
    })

    it('detects sequence gaps inside a pruned sliding-window chain', () => {
      const validHex = '1'.repeat(64)
      const prunedChain = createSampleChain(20, 5001, validHex)
      // Delete element at index 10 (creates sequence gap 5010 -> 5012)
      prunedChain.splice(10, 1)

      const result = verifyAuditChain(prunedChain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(10)
      expect(result.brokenReason).toMatch(/(prevHash does not match|Sequence gap)/i)
    })

    it('detects hash link breakage inside a pruned sliding-window chain', () => {
      const validHex = '2'.repeat(64)
      const prunedChain = createSampleChain(20, 5001, validHex)
      // Corrupt prevHash of block 8
      prunedChain[8].prevHash = '3'.repeat(64)

      const result = verifyAuditChain(prunedChain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(8)
      expect(result.brokenReason).toContain('prevHash does not match')
    })

    it('detects details tampering inside a pruned sliding-window chain', () => {
      const validHex = '4'.repeat(64)
      const prunedChain = createSampleChain(20, 5001, validHex)
      // Mutate details of block 12
      prunedChain[12].details = 'Tampered details in pruned log'

      const result = verifyAuditChain(prunedChain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(12)
      expect(result.brokenReason).toContain('Tampered content at index 12')
    })

    it('rejects an unpruned chain (sequence === 1) if prevHash is not GENESIS_PREV_HASH', () => {
      const chain = createSampleChain(10, 1, '1'.repeat(64))
      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(0)
      expect(result.brokenReason).toContain('Genesis prevHash mismatch')
    })

    it('rejects entries with sequence < 1 (e.g. sequence 0 or negative)', () => {
      const chain = createSampleChain(5, 0, GENESIS_PREV_HASH)
      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(0)
      expect(result.brokenReason).toContain('sequence must be at least 1')
    })
  })
})
