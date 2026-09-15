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
  canonicalStringify,
  computeEntryHash,
  verifyAuditChain,
} from '../src/shared/auditIntegrity'

/**
 * Helper to construct a cryptographically valid chain of N entries.
 */
function createValidAuditChain(count: number): ActivityEntry[] {
  const chain: ActivityEntry[] = []
  const categories: ActivityCategory[] = ['security', 'network', 'system', 'file', 'crypto', 'api']
  const statuses: ActivityStatus[] = ['success', 'failure', 'warning', 'info']

  for (let i = 0; i < count; i++) {
    const sequence = i + 1
    const prevHash = i === 0 ? GENESIS_PREV_HASH : chain[i - 1].hash
    const rawEntry: Omit<ActivityEntry, 'hash'> = {
      id: `entry-${sequence.toString().padStart(5, '0')}`,
      sequence,
      timestamp: 1700000000000 + i * 1000,
      toolId: `tool-${(i % 5) + 1}`,
      action: `operation_${i}`,
      category: categories[i % categories.length],
      status: statuses[i % statuses.length],
      details: `Execution log details for operation ${i}`,
      metadata: {
        batchId: Math.floor(i / 10),
        step: i % 10,
        nested: { keyA: `val_${i}`, keyB: i * 42 },
      },
      durationMs: 10 + (i % 50),
      prevHash,
    }

    const hash = computeEntryHash(rawEntry)
    chain.push({ ...rawEntry, hash })
  }

  return chain
}

describe('Audit Integrity & Tamper-Evident Hash Chaining (tests/auditIntegrity.test.ts)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Genesis Block Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Genesis Block Verification', () => {
    it('verifies empty audit chains cleanly as valid with 0 verified', () => {
      const result = verifyAuditChain([])
      expect(result.valid).toBe(true)
      expect(result.totalVerified).toBe(0)
      expect(result.brokenIndex).toBeUndefined()
    })

    it('verifies a single valid genesis block with 64 zeros prevHash and sequence 1', () => {
      const chain = createValidAuditChain(1)
      expect(chain[0].prevHash).toBe(GENESIS_PREV_HASH)
      expect(chain[0].prevHash).toBe('0'.repeat(64))
      expect(chain[0].sequence).toBe(1)

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(true)
      expect(result.totalVerified).toBe(1)
      expect(result.brokenIndex).toBeUndefined()
    })

    it('rejects genesis block with invalid prevHash salt and reports index 0', () => {
      const chain = createValidAuditChain(1)
      chain[0].prevHash = 'a'.repeat(64)
      // Even if hash is recomputed to match the altered prevHash:
      chain[0].hash = computeEntryHash(chain[0])

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(0)
      expect(result.totalVerified).toBe(0)
      expect(result.brokenReason).toMatch(/genesis prevhash mismatch/i)
    })

    it('rejects entry if sequence is less than 1 and reports index 0', () => {
      const chain = createValidAuditChain(1)
      chain[0].sequence = 0
      chain[0].hash = computeEntryHash(chain[0])

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(0)
      expect(result.brokenReason).toMatch(/sequence must be at least 1/i)
    })

    it('verifies pruned sliding-window chain where sequence > 1 and prevHash is valid 64-char hex string', () => {
      const fullChain = createValidAuditChain(10)
      const prunedChain = fullChain.slice(4)
      expect(prunedChain[0].sequence).toBe(5)
      expect(prunedChain[0].prevHash).toMatch(/^[a-f0-9]{64}$/i)

      const result = verifyAuditChain(prunedChain)
      expect(result.valid).toBe(true)
      expect(result.totalVerified).toBe(6)
      expect(result.brokenIndex).toBeUndefined()
    })

    it('rejects pruned sliding-window chain if initial prevHash is not a valid 64-char hex string', () => {
      const fullChain = createValidAuditChain(10)
      const prunedChain = fullChain.slice(4)
      prunedChain[0].prevHash = 'invalid-hex-prev-hash'
      prunedChain[0].hash = computeEntryHash(prunedChain[0])

      const result = verifyAuditChain(prunedChain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(0)
      expect(result.brokenReason).toMatch(/64-character hex string/i)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Hash Chain Link Integrity over 50+ Sequentially Added Entries
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Hash Chain Link Integrity (50+ Entries)', () => {
    it('verifies full cryptographic link integrity over 60 sequentially added entries', () => {
      const count = 60
      const chain = createValidAuditChain(count)

      expect(chain.length).toBe(count)

      // Verify every link points directly to predecessor hash
      for (let i = 1; i < chain.length; i++) {
        expect(chain[i].prevHash).toBe(chain[i - 1].hash)
        expect(chain[i].sequence).toBe(chain[i - 1].sequence + 1)
      }

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(true)
      expect(result.totalVerified).toBe(count)
      expect(result.brokenIndex).toBeUndefined()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Tamper Detection — Modifying Metadata Value Breaks Chain
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Tamper Detection — Modifying Metadata', () => {
    it('detects tampering of metadata value and reports exact broken index', () => {
      const chain = createValidAuditChain(50)
      const targetIndex = 25

      // Modify metadata inside target block without updating stored hash
      chain[targetIndex].metadata = {
        ...chain[targetIndex].metadata,
        injectedMaliciousField: 'TAMPERED_DATA',
      }

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
      expect(result.brokenEntryId).toBe(chain[targetIndex].id)
      expect(result.totalVerified).toBe(targetIndex)
      expect(result.brokenReason).toMatch(/tampered content at index 25/i)
    })

    it('detects tampering of nested metadata values', () => {
      const chain = createValidAuditChain(40)
      const targetIndex = 12

      // Mutate deep nested property
      chain[targetIndex].metadata!.nested.keyA = 'mutated_deep_value'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
      expect(result.brokenReason).toMatch(/tampered content/i)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Tamper Detection — Modifying Core Fields
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Tamper Detection — Modifying Status, Timestamp, ToolId, Action', () => {
    it('detects status alteration and reports exact index', () => {
      const chain = createValidAuditChain(30)
      const targetIndex = 10
      chain[targetIndex].status = chain[targetIndex].status === 'success' ? 'failure' : 'success'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
      expect(result.totalVerified).toBe(targetIndex)
    })

    it('detects timestamp modification and reports exact index', () => {
      const chain = createValidAuditChain(30)
      const targetIndex = 15
      chain[targetIndex].timestamp += 999999

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
      expect(result.totalVerified).toBe(targetIndex)
    })

    it('detects toolId modification and reports exact index', () => {
      const chain = createValidAuditChain(30)
      const targetIndex = 7
      chain[targetIndex].toolId = 'rogue-imposter-tool'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
      expect(result.totalVerified).toBe(targetIndex)
    })

    it('detects action modification and reports exact index', () => {
      const chain = createValidAuditChain(30)
      const targetIndex = 22
      chain[targetIndex].action = 'unauthorized_action'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
      expect(result.totalVerified).toBe(targetIndex)
    })

    it('detects category or duration alteration', () => {
      const chain = createValidAuditChain(30)
      const targetIndex = 18
      chain[targetIndex].durationMs = (chain[targetIndex].durationMs ?? 0) + 500

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
    })

    it('detects details alteration and reports exact index', () => {
      const chain = createValidAuditChain(30)
      const targetIndex = 12
      chain[targetIndex].details = 'Tampered log message details'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
      expect(result.brokenReason).toMatch(/tampered content/i)
    })

    it('detects hash collision/forgery attempt where middle block is re-hashed but subsequent block prevHash is broken', () => {
      const chain = createValidAuditChain(30)
      const targetIndex = 14

      // Attacker tampers with block 14 AND recomputes block 14's hash:
      chain[targetIndex].action = 'forged_action'
      chain[targetIndex].hash = computeEntryHash(chain[targetIndex])

      // Verification of block 14 will pass individual hash test, but block 15 prevHash will not match!
      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(15)
      expect(result.brokenReason).toMatch(/prevHash does not match/i)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Sequence Gap & Deletion Detection
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Sequence Gap & Deletion Detection', () => {
    it('detects deleted entry from middle of the chain and reports broken index', () => {
      const chain = createValidAuditChain(50)
      // Delete entry at index 20
      chain.splice(20, 1)

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(20)
      expect(result.brokenReason).toMatch(/(prevHash does not match|sequence gap)/i)
    })

    it('detects sequence gap even if prevHash was manually forged', () => {
      const chain = createValidAuditChain(10)
      // Simulate deleting index 4, but attacker adjusted index 5's prevHash to match index 3's hash
      // without updating sequence:
      const block3Hash = chain[3].hash
      chain.splice(4, 1)
      chain[4].prevHash = block3Hash
      chain[4].hash = computeEntryHash(chain[4])

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(4)
      expect(result.brokenReason).toMatch(/sequence gap/i)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Canonical Stringify & Hash Determinism
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. Canonical Stringify & Key-Order Invariant Hash', () => {
    it('produces identical serialized string regardless of property insertion order', () => {
      const obj1 = { a: 1, b: 2, c: 'hello' }
      const obj2 = { c: 'hello', b: 2, a: 1 }

      expect(canonicalStringify(obj1)).toBe(canonicalStringify(obj2))
      expect(canonicalStringify(obj1)).toBe('{"a":1,"b":2,"c":"hello"}')
    })

    it('handles deeply nested objects with shuffled keys deterministically', () => {
      const deep1 = {
        z: { b: 2, a: 1 },
        y: [10, { k: 'val', j: 'val' }],
        x: 'top',
      }
      const deep2 = {
        x: 'top',
        y: [10, { j: 'val', k: 'val' }],
        z: { a: 1, b: 2 },
      }

      expect(canonicalStringify(deep1)).toBe(canonicalStringify(deep2))
    })

    it('computes identical entry SHA-256 hash for objects with different key order', () => {
      const baseEntry: Omit<ActivityEntry, 'hash'> = {
        id: 'entry-canon-1',
        sequence: 1,
        timestamp: 1700000000000,
        toolId: 'api-studio',
        action: 'dispatch_request',
        category: 'api',
        status: 'success',
        details: 'Dispatched GET /api/v1/users',
        metadata: {
          url: 'https://api.example.com',
          method: 'GET',
          headers: { Authorization: 'Bearer token', Accept: 'application/json' },
          params: { page: 1, limit: 50 },
        },
        durationMs: 45,
        prevHash: GENESIS_PREV_HASH,
      }

      const shuffledEntry: Omit<ActivityEntry, 'hash'> = {
        ...baseEntry,
        metadata: {
          params: { limit: 50, page: 1 },
          method: 'GET',
          url: 'https://api.example.com',
          headers: { Accept: 'application/json', Authorization: 'Bearer token' },
        },
      }

      const hash1 = computeEntryHash(baseEntry)
      const hash2 = computeEntryHash(shuffledEntry)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })

    it('safely handles circular references without infinite recursion', () => {
      const circularObj: any = { name: 'circular-test' }
      circularObj.self = circularObj

      const serialized = canonicalStringify(circularObj)
      expect(serialized).toContain('"[CIRCULAR]"')
      expect(() => computeEntryHash({
        id: 'circ-1',
        sequence: 1,
        timestamp: 1700000000000,
        toolId: 'test',
        action: 'circ',
        category: 'general',
        status: 'info',
        details: 'circular metadata test',
        metadata: circularObj,
        prevHash: GENESIS_PREV_HASH,
      })).not.toThrow()
    })

    it('prevents field delimiter collision across fields using length-prefixed encoding', () => {
      const base: Omit<ActivityEntry, 'hash'> = {
        id: 'entry-coll',
        sequence: 1,
        timestamp: 1000,
        toolId: 'tool-A|extra',
        action: 'action-B',
        category: 'general',
        status: 'info',
        details: 'd',
        metadata: {},
        durationMs: 0,
        prevHash: GENESIS_PREV_HASH,
      }
      const entryA = { ...base, toolId: 'tool-A|extra', action: 'action-B' }
      const entryB = { ...base, toolId: 'tool-A', action: 'extra|action-B' }

      const hashA = computeEntryHash(entryA)
      const hashB = computeEntryHash(entryB)

      expect(hashA).not.toBe(hashB)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 7. High-Throughput Performance Benchmark
  // ───────────────────────────────────────────────────────────────────────────
  describe('7. High-Throughput Performance Benchmark', () => {
    it('verifies 1,000 blocks in under 100ms', () => {
      const chain1000 = createValidAuditChain(1000)
      expect(chain1000.length).toBe(1000)

      const startTime = performance.now()
      const result = verifyAuditChain(chain1000)
      const durationMs = performance.now() - startTime

      expect(result.valid).toBe(true)
      expect(result.totalVerified).toBe(1000)
      expect(result.brokenIndex).toBeUndefined()

      // High-throughput requirement: 1,000 blocks in under 100ms
      expect(durationMs).toBeLessThan(100)
    })
  })
})
