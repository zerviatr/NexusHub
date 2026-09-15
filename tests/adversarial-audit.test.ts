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
import {
  luhnCheck,
  sanitizeString,
  sanitizeMetadata,
} from '../src/shared/auditSanitization'

/**
 * Deterministic helper to construct a valid audit chain of N blocks.
 */
function generateValidChain(count: number): ActivityEntry[] {
  const chain: ActivityEntry[] = []
  const categories: ActivityCategory[] = ['security', 'network', 'system', 'file', 'crypto', 'api', 'general']
  const statuses: ActivityStatus[] = ['success', 'failure', 'warning', 'info']

  for (let i = 0; i < count; i++) {
    const sequence = i + 1
    const prevHash = i === 0 ? GENESIS_PREV_HASH : chain[i - 1].hash
    const raw: Omit<ActivityEntry, 'hash'> = {
      id: `entry-${sequence.toString().padStart(6, '0')}`,
      sequence,
      timestamp: 1710000000000 + i * 500,
      toolId: `tool-${i % 8}`,
      action: `action_${i}`,
      category: categories[i % categories.length],
      status: statuses[i % statuses.length],
      details: `Execution record #${sequence} for operation ${i}`,
      metadata: {
        index: i,
        batch: Math.floor(i / 10),
        deep: {
          level1: {
            level2: {
              data: `val_${i}`,
              metric: i * 7,
            },
          },
        },
      },
      durationMs: 15 + (i % 25),
      prevHash,
    }
    const hash = computeEntryHash(raw)
    chain.push({ ...raw, hash })
  }
  return chain
}

describe('Adversarial Stress Test Suite: Audit Integrity & Sanitization', () => {
  // =========================================================================
  // SUITE 1: TAMPER DETECTION STRESS & PINPOINT ACCURACY
  // =========================================================================
  describe('1. Tamper Detection Stress & Pinpoint Accuracy', () => {
    it('catches deep metadata mutation at index 73 in a 100-block chain and pinpoints brokenIndex', () => {
      const chain = generateValidChain(100)
      const targetIndex = 73

      // Mutate deep metadata property
      chain[targetIndex].metadata!.deep.level1.level2.data = 'MALICIOUS_INJECTION'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
      expect(result.brokenEntryId).toBe(chain[targetIndex].id)
      expect(result.totalVerified).toBe(targetIndex)
      expect(result.brokenReason).toContain(`index ${targetIndex}`)
    })

    it('catches deep metadata mutation at index 0 (genesis block) and reports brokenIndex 0', () => {
      const chain = generateValidChain(100)
      chain[0].metadata!.index = 99999

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(0)
      expect(result.brokenEntryId).toBe(chain[0].id)
      expect(result.totalVerified).toBe(0)
    })

    it('catches deep metadata mutation at the final block (index 99) in a 100-block chain', () => {
      const chain = generateValidChain(100)
      chain[99].metadata!.deep.level1.level2.metric = -1

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(99)
      expect(result.totalVerified).toBe(99)
    })

    it('detects tampering of timestamp in block 42', () => {
      const chain = generateValidChain(100)
      chain[42].timestamp += 1000

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(42)
      expect(result.totalVerified).toBe(42)
    })

    it('detects tampering of action name in block 33', () => {
      const chain = generateValidChain(100)
      chain[33].action = 'unauthorized_action_overwrite'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(33)
      expect(result.totalVerified).toBe(33)
    })

    it('detects tampering of status in block 58', () => {
      const chain = generateValidChain(100)
      chain[58].status = chain[58].status === 'success' ? 'failure' : 'success'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(58)
      expect(result.totalVerified).toBe(58)
    })

    it('detects tampering of category in block 19', () => {
      const chain = generateValidChain(100)
      chain[19].category = 'crypto'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(19)
    })

    it('detects tampering of durationMs in block 88', () => {
      const chain = generateValidChain(100)
      chain[88].durationMs = 9999

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(88)
    })

    it('detects tampering of details field and reports brokenIndex', () => {
      const chain = generateValidChain(100)
      const targetIndex = 50
      const originalDetails = chain[targetIndex].details

      // Attacker changes critical audit details
      chain[targetIndex].details = 'CRITICAL OVERWRITE: Malicious actor transferred $1,000,000 to external wallet'

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(targetIndex)
      expect(result.brokenReason).toMatch(/tampered content/i)
      expect(chain[targetIndex].details).not.toBe(originalDetails)
    })

    it('detects block swap attack: swapping adjacent blocks 40 and 41', () => {
      const chain = generateValidChain(100)
      const temp = chain[40]
      chain[40] = chain[41]
      chain[41] = temp

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(40)
    })

    it('detects sequence gap: deleting an entry from middle of the chain (index 50)', () => {
      const chain = generateValidChain(100)
      chain.splice(50, 1)

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(50)
      expect(result.brokenReason).toMatch(/(prevHash does not match|sequence gap)/i)
    })

    it('verifies pruned chain after deleting genesis entry and detects sequence gap if intermediate entry deleted', () => {
      const chain = generateValidChain(100)
      // Deleting genesis entry (index 0) produces valid pruned sliding-window chain:
      const pruned = chain.slice(1)
      const resultPruned = verifyAuditChain(pruned)
      expect(resultPruned.valid).toBe(true)

      // But deleting an entry inside the pruned chain causes a sequence gap:
      pruned.splice(5, 1)
      const resultBroken = verifyAuditChain(pruned)
      expect(resultBroken.valid).toBe(false)
      expect(resultBroken.brokenIndex).toBe(5)
      expect(resultBroken.brokenReason).toMatch(/(prevHash does not match|sequence gap)/i)
    })

    it('detects injected forged block with valid hash but invalid prevHash', () => {
      const chain = generateValidChain(100)
      const forgedEntry: ActivityEntry = {
        id: 'entry-forged-999',
        sequence: 45,
        timestamp: 1710000000000,
        toolId: 'attacker-tool',
        action: 'forged_action',
        category: 'security',
        status: 'success',
        details: 'Forged details',
        metadata: {},
        durationMs: 0,
        prevHash: 'f'.repeat(64), // Invalid prevHash
        hash: '',
      }
      forgedEntry.hash = computeEntryHash(forgedEntry)

      // Replace index 45 with forged entry
      chain[45] = forgedEntry

      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(45)
      expect(result.brokenReason).toMatch(/prevHash does not match/i)
    })

    it('detects injected block with forged prevHash matching predecessor, but invalid subsequent link', () => {
      const chain = generateValidChain(100)
      const forgedEntry: ActivityEntry = {
        id: 'entry-forged-45',
        sequence: 46, // matches expected sequence for chain[45]
        timestamp: 1710000000000,
        toolId: 'attacker-tool',
        action: 'forged_action',
        category: 'security',
        status: 'success',
        details: 'Forged details',
        metadata: {},
        durationMs: 0,
        prevHash: chain[44].hash, // correctly points to chain[44]
        hash: '',
      }
      forgedEntry.hash = computeEntryHash(forgedEntry)

      // Inject into chain at 45
      chain[45] = forgedEntry

      // verifyAuditChain should pass 0..45, but fail at 46 because chain[46].prevHash points to old chain[45].hash
      const result = verifyAuditChain(chain)
      expect(result.valid).toBe(false)
      expect(result.brokenIndex).toBe(46)
      expect(result.brokenReason).toMatch(/prevHash does not match/i)
    })

    it('prevents separator collision between fields with pipe (|) via length-prefixed encoding', () => {
      // Test whether unescaped pipe characters in toolId and action cause hash collisions
      const entryA: Omit<ActivityEntry, 'hash'> = {
        id: 'coll-1',
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

      const entryB: Omit<ActivityEntry, 'hash'> = {
        id: 'coll-1',
        sequence: 1,
        timestamp: 1000,
        toolId: 'tool-A',
        action: 'extra|action-B',
        category: 'general',
        status: 'info',
        details: 'd',
        metadata: {},
        durationMs: 0,
        prevHash: GENESIS_PREV_HASH,
      }

      const hashA = computeEntryHash(entryA)
      const hashB = computeEntryHash(entryB)

      // Hashes are distinct due to length-prefixed encoding!
      expect(hashA).not.toBe(hashB)
    })
  })

  // =========================================================================
  // SUITE 2: CANONICAL KEY INVARIANCE & STRUCTURAL INTEGRITY
  // =========================================================================
  describe('2. Canonical Key Invariance & Structural Integrity', () => {
    it('computes identical SHA-256 hash for metadata with reverse, sorted, and random key orders', () => {
      const metaSorted = {
        alpha: 'first',
        beta: 2,
        gamma: [1, 2, 3],
        omega: { deepA: 'nested1', deepB: 'nested2' },
        zeta: true,
      }

      const metaReversed = {
        zeta: true,
        omega: { deepB: 'nested2', deepA: 'nested1' },
        gamma: [1, 2, 3],
        beta: 2,
        alpha: 'first',
      }

      const metaScrambled = {
        beta: 2,
        omega: { deepA: 'nested1', deepB: 'nested2' },
        zeta: true,
        alpha: 'first',
        gamma: [1, 2, 3],
      }

      const base: Omit<ActivityEntry, 'hash'> = {
        id: 'entry-canon-test',
        sequence: 1,
        timestamp: 1700000000000,
        toolId: 'canon-tool',
        action: 'test_canonical',
        category: 'crypto',
        status: 'success',
        details: 'Canonical hash invariance test',
        durationMs: 10,
        prevHash: GENESIS_PREV_HASH,
      }

      const hash1 = computeEntryHash({ ...base, metadata: metaSorted })
      const hash2 = computeEntryHash({ ...base, metadata: metaReversed })
      const hash3 = computeEntryHash({ ...base, metadata: metaScrambled })

      expect(hash1).toBe(hash2)
      expect(hash2).toBe(hash3)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })

    it('safely handles deeply nested objects with 50 levels without stack overflow in canonicalStringify', () => {
      let root: any = { level: 0 }
      let curr = root
      for (let i = 1; i <= 50; i++) {
        curr.next = { level: i }
        curr = curr.next
      }

      expect(() => canonicalStringify(root)).not.toThrow()
    })

    it('handles circular references safely in canonicalStringify', () => {
      const circ: any = { name: 'cycle' }
      circ.loop = circ

      const serialized = canonicalStringify(circ)
      expect(serialized).toContain('"[CIRCULAR]"')
      expect(() => computeEntryHash({
        id: 'circ-entry',
        sequence: 1,
        timestamp: 1000,
        toolId: 'tool',
        action: 'act',
        category: 'general',
        status: 'info',
        details: 'circular',
        metadata: circ,
        prevHash: GENESIS_PREV_HASH,
      })).not.toThrow()
    })

    it('handles mutual circular references (A -> B -> A) without stack overflow', () => {
      const a: any = { name: 'A' }
      const b: any = { name: 'B', ref: a }
      a.ref = b

      expect(() => canonicalStringify(a)).not.toThrow()
      const strA = canonicalStringify(a)
      expect(strA).toContain('"[CIRCULAR]"')
    })

    it('handles array containing itself safely in canonicalStringify', () => {
      const arr: any[] = [1, 2]
      arr.push(arr)

      expect(() => canonicalStringify(arr)).not.toThrow()
      expect(canonicalStringify(arr)).toContain('"[CIRCULAR]"')
    })

    it('EMPIRICAL OBSERVATION: Directed Acyclic Graph (DAG) false-positive circular tagging', () => {
      const sharedChild = { sharedKey: 'sharedValue' }
      const dag = {
        branchA: sharedChild,
        branchB: sharedChild,
      }

      const serialized = canonicalStringify(dag)
      // EMPIRICAL EVIDENCE: branchB is tagged as [CIRCULAR] even though there is no cycle!
      expect(serialized).toBe('{"branchA":{"sharedKey":"sharedValue"},"branchB":"[CIRCULAR]"}')
    })
  })

  // =========================================================================
  // SUITE 3: REDACTION STRESS & ADVERSARIAL SENSITIVE DATA
  // =========================================================================
  describe('3. Redaction Stress & Sensitive Credentials', () => {
    it('redacts all flavors of OpenAI keys (standard, proj, svcacct)', () => {
      const text = [
        'sk-1234567890abcdef1234567890abcdef',
        'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789aBcDeFgH',
        'sk-svcacct-1234567890abcdef1234567890abcdef',
      ].join(' and ')

      const sanitized = sanitizeString(text)
      expect(sanitized).not.toContain('sk-1234567890abcdef')
      expect(sanitized).not.toContain('sk-proj-AbCdEf')
      expect(sanitized).not.toContain('sk-svcacct-12345')
      expect(sanitized).toBe('[REDACTED_API_KEY] and [REDACTED_API_KEY] and [REDACTED_API_KEY]')
    })

    it('redacts Anthropic Claude keys (sk-ant-...)', () => {
      const key = 'sk-ant-api03-abcdef1234567890abcdef1234567890'
      expect(sanitizeString(`Key: ${key}`)).toBe('Key: [REDACTED_API_KEY]')
    })

    it('redacts Google Gemini keys (AIza...)', () => {
      const key = 'AIzaSyB1C2D3E4F5G6H7I8J9K0L1M2N3O4P5Q6R'
      expect(sanitizeString(`Google key: ${key}`)).toBe('Google key: [REDACTED_API_KEY]')
    })

    it('redacts HTTP Bearer tokens with diverse b64 formats', () => {
      const b1 = 'Authorization: Bearer mySecretToken123'
      const b2 = 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig'
      expect(sanitizeString(b1)).toBe('Authorization: Bearer [REDACTED_TOKEN]')
      expect(sanitizeString(b2)).toBe('Bearer [REDACTED_TOKEN]')
    })

    it('redacts Bearer token ending in equal signs without leaking trailing padding', () => {
      const bWithPadding = 'Bearer dXNlcnBhc3M=='
      const sanitized = sanitizeString(bWithPadding)
      expect(sanitized).toBe('Bearer [REDACTED_TOKEN]')
      expect(sanitized).not.toContain('==')
    })

    it('redacts JSON Web Tokens (JWT) standing alone in text', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0'
      const text = `Session JWT token is ${jwt} for user`
      expect(sanitizeString(text)).toBe('Session JWT token is [REDACTED_JWT] for user')
    })

    it('redacts real Luhn-valid Credit Card numbers for Visa, Mastercard, Amex, Discover', () => {
      const cards = [
        '4000001234567899', // Visa
        '4000 0012 3456 7899', // Visa spaced
        '4000-0012-3456-7899', // Visa dashed
        '5500000000000004', // Mastercard
        '5500 0000 0000 0004', // Mastercard spaced
        '378282246310005', // Amex 15-digit
        '3782 822463 10005', // Amex spaced
        '6011000999999992', // Discover (valid check digit 2)
      ]

      for (const card of cards) {
        expect(luhnCheck(card)).toBe(true)
        const sanitized = sanitizeString(`Card payment for ${card} done`)
        expect(sanitized).not.toContain(card)
        expect(sanitized).toContain('[REDACTED_CREDIT_CARD]')
      }
    })

    it('does NOT redact non-card numbers that fail Luhn algorithm', () => {
      const invalidCards = [
        '4000001234567891',
        '1234567890123456',
        '9999999999999999',
        '1234567890123451',
        '9876543210987650',
      ]

      for (const nonCard of invalidCards) {
        expect(luhnCheck(nonCard)).toBe(false)
        const sanitized = sanitizeString(`Account number ${nonCard} ok`)
        expect(sanitized).toContain(nonCard)
        expect(sanitized).not.toContain('[REDACTED_CREDIT_CARD]')
      }
    })

    it('redacts all standard PEM private keys (RSA, EC, OPENSSH, PKCS#8)', () => {
      const rsaPem = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y3y...
-----END RSA PRIVATE KEY-----`

      const ecPem = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEI...
-----END EC PRIVATE KEY-----`

      const openSshPem = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAA...
-----END OPENSSH PRIVATE KEY-----`

      const pkcs8Pem = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VXTU...
-----END PRIVATE KEY-----`

      expect(sanitizeString(rsaPem)).toBe('[REDACTED_PRIVATE_KEY]')
      expect(sanitizeString(ecPem)).toBe('[REDACTED_PRIVATE_KEY]')
      expect(sanitizeString(openSshPem)).toBe('[REDACTED_PRIVATE_KEY]')
      expect(sanitizeString(pkcs8Pem)).toBe('[REDACTED_PRIVATE_KEY]')
    })

    it('safely handles circular object in sanitizeMetadata without stack overflow', () => {
      const circ: any = { user: 'alice', meta: { score: 100 } }
      circ.self = circ
      circ.meta.root = circ

      expect(() => sanitizeMetadata(circ)).not.toThrow()
      const sanitized = sanitizeMetadata(circ)
      expect(sanitized.user).toBe('alice')
      expect(sanitized.self).toBe('[CIRCULAR]')
      expect(sanitized.meta.root).toBe('[CIRCULAR]')
    })

    it('redacts sensitive metadata keys and nested secrets in sanitizeMetadata', () => {
      const meta = {
        apiKey: 'AIzaSyB1C2D3E4F5G6H7I8J9K0L1M2N3O4P5Q6R',
        password: 'SuperSecretPassword!',
        token: 'secret-token-value',
        nested: {
          client_secret: 'oauth-client-secret-xyz',
          normalData: 'Harmless telemetry',
          deepToken: 'Bearer mySuperSecretToken',
        },
      }

      const sanitized = sanitizeMetadata(meta)
      expect(sanitized.apiKey).toBe('[REDACTED_SECRET]')
      expect(sanitized.password).toBe('[REDACTED_SECRET]')
      expect(sanitized.token).toBe('[REDACTED_SECRET]')
      expect(sanitized.nested.client_secret).toBe('[REDACTED_SECRET]')
      expect(sanitized.nested.normalData).toBe('Harmless telemetry')
      expect(sanitized.nested.deepToken).toBe('Bearer [REDACTED_TOKEN]')
    })

    it('redacts URL query params with access_token and refresh_token', () => {
      const url = 'https://auth.example.com/oauth/callback?access_token=secretAccessToken123&refresh_token=secretRefreshToken456'
      const sanitized = sanitizeString(url)
      expect(sanitized).not.toContain('secretAccessToken123')
      expect(sanitized).not.toContain('secretRefreshToken456')
      expect(sanitized).toBe('https://auth.example.com/oauth/callback?access_token=[REDACTED]&refresh_token=[REDACTED]')
    })
  })
})
