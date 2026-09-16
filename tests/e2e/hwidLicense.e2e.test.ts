/**
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

import { describe, it, expect } from 'vitest'
import { createHmac, generateKeyPairSync } from 'crypto'
import {
    normalizeMachineGuid,
    deriveNodeMachineIdHash,
    deriveFinalDeviceId,
    deriveFallbackDeviceId,
} from './helpers/testHarness'
import {
    validateLicenseKey,
    formatLicenseKey,
    TIER_MAP,
} from '../../src/shared/licenseValidator'
import { verifyEcdsaLicense } from '../../src/shared/ecdsaLicense'
import { generateEcdsaLicense } from '../../server/src/services/licenseSigner'

describe('E2E FEAT-02: Hardware ID & License Backward Compatibility (R3)', () => {
    // Authoritative test vector from hwid_tauri_spec.md
    const KNOWN_GUID = '8d2e925d-b911-4b8a-8f12-090a9a0871a0'
    const EXPECTED_STAGE1_SHA256 = '27ef6ac4ca33913adcbbc7c539695ef45491fdf372fe1f41eeef5a91bc20aecc'
    const EXPECTED_STAGE2_HMAC = '971ebe5fac55c27a43766a8f44a64d1c3cb2f5a41036662b5f9dd00e31d31390'
    const TEST_SECRET = 'TEST_HMAC_SECRET_ZENDEV_MIGRATION'

    // Ephemeral ECDSA keypair for cryptographic testing
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 1: Feature Coverage (Hardware ID & Licensing Contracts)
    // ─────────────────────────────────────────────────────────────────────────

    it('T1.1: Should derive byte-for-byte exact Stage 1 SHA-256 matching legacy node-machine-id', () => {
        const normalized = normalizeMachineGuid(KNOWN_GUID)
        expect(normalized).toBe(KNOWN_GUID)

        const stage1Hash = deriveNodeMachineIdHash(normalized)
        expect(stage1Hash).toBe(EXPECTED_STAGE1_SHA256)
    })

    it('T1.2: Should derive byte-for-byte exact Stage 2 HMAC matching licenseStore getDeviceId()', () => {
        const finalDeviceId = deriveFinalDeviceId(KNOWN_GUID)
        expect(finalDeviceId).toBe(EXPECTED_STAGE2_HMAC)
    })

    it('T1.3: Should validate authentic symmetric HMAC lifetime license', () => {
        const payload = 'L000' // Lifetime (months=000)
        const hmac = createHmac('sha256', TEST_SECRET)
            .update(payload)
            .digest('hex')
            .toUpperCase()
            .slice(0, 16)
        const formattedKey = formatLicenseKey(`NEXUS${payload}${hmac}`)

        const res = validateLicenseKey(formattedKey, TEST_SECRET)
        expect(res.valid).toBe(true)
        expect(res.tier).toBe('lifetime')
        expect(res.expiresAt).toBe(0)
    })

    it('T1.4: Should validate authentic asymmetric ECDSA license locked to current HWID', () => {
        const currentHwid = EXPECTED_STAGE2_HMAC
        const licenseKey = generateEcdsaLicense(
            {
                tier: 'pro',
                hwid: currentHwid,
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
                customer: 'enterprise-client-01',
                features: ['audit_export', 'unlimited_shred', 'api_studio'],
            },
            privateKey
        )

        const result = verifyEcdsaLicense(licenseKey, currentHwid, publicKey)
        expect(result.valid).toBe(true)
        if (result.valid) {
            expect(result.tier).toBe('pro')
            expect(result.hwid).toBe(currentHwid)
            expect(result.features).toContain('api_studio')
        }
    })

    it('T1.5: Should verify anonymous fallback HWID matches ${USERNAME}-${platform} formula', () => {
        const fallback = deriveFallbackDeviceId('alice', 'win32')
        expect(fallback).toHaveLength(64) // 256-bit hex
        expect(fallback).toMatch(/^[0-9a-f]{64}$/)

        // Deterministic validation
        const manualExpected = createHmac('sha256', 'nexus-device-salt')
            .update('alice-win32')
            .digest('hex')
        expect(fallback).toBe(manualExpected)
    })

    it('T1.6: Should correctly parse and decompose standard 25-character license keys', () => {
        const raw = 'NEXUSP1201234567890ABCDEF'
        const formatted = formatLicenseKey(raw)
        expect(formatted).toMatch(/^NEXUS-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/)

        const stripped = formatted.replace(/[^A-Z0-9]/g, '')
        expect(stripped).toHaveLength(25)
        const tierChar = stripped[5]
        const tier = TIER_MAP[tierChar]
        expect(tier).toBe('pro')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 2: Boundary & Corner Cases (Defensive & Robustness)
    // ─────────────────────────────────────────────────────────────────────────

    it('T2.1: Should strip messy registry formatting (newlines, tabs, mixed case)', () => {
        const messyGuid = '  \r\n\t  8D2E925D-B911-4B8A-8F12-090A9A0871A0  \r\n  '
        const normalized = normalizeMachineGuid(messyGuid)
        expect(normalized).toBe(KNOWN_GUID)

        const deviceId = deriveFinalDeviceId(normalized)
        expect(deviceId).toBe(EXPECTED_STAGE2_HMAC)
    })

    it('T2.2: Should reject ECDSA license when HWID does not match current host', () => {
        const targetHwid = EXPECTED_STAGE2_HMAC
        const foreignHwid = 'a'.repeat(64)

        const licenseKey = generateEcdsaLicense(
            {
                tier: 'lifetime',
                hwid: targetHwid,
                expiresAt: 0,
            },
            privateKey
        )

        // Verifying with foreign HWID must fail
        const result = verifyEcdsaLicense(licenseKey, foreignHwid, publicKey)
        expect(result.valid).toBe(false)
        expect(result.reason).toMatch(/mismatch/i)
    })

    it('T2.3: Should reject expired license keys with past timestamp', () => {
        const expiredKey = generateEcdsaLicense(
            {
                tier: 'pro',
                hwid: EXPECTED_STAGE2_HMAC,
                expiresAt: Date.now() - 10000, // expired in past
            },
            privateKey
        )

        const result = verifyEcdsaLicense(expiredKey, EXPECTED_STAGE2_HMAC, publicKey)
        expect(result.valid).toBe(false)
        expect(result.reason).toMatch(/expired/i)
    })

    it('T2.4: Should reject tampered license key bytes and invalid base32', () => {
        const validKey = generateEcdsaLicense(
            {
                tier: 'team',
                expiresAt: Date.now() + 1000000,
            },
            privateKey
        )

        // Corrupt characters inside the signature block
        const tamperedKey = validKey.slice(0, 20) + (validKey[20] === 'A' ? 'B' : 'A') + validKey.slice(21)
        const result = verifyEcdsaLicense(tamperedKey, undefined, publicKey)
        expect(result.valid).toBe(false)
    })

    it('T2.5: Should reject non-existent or malformed license formats', () => {
        expect(validateLicenseKey('', TEST_SECRET).valid).toBe(false)
        expect(validateLicenseKey('INVALID-KEY-STRING', TEST_SECRET).valid).toBe(false)
        expect(validateLicenseKey('NEXUS-XXXXX-XXXXX-XXXXX-XXXXX', TEST_SECRET).valid).toBe(false)
        expect(verifyEcdsaLicense('ZENDEV-INVALID-PAYLOAD-STRUCTURE', undefined, publicKey).valid).toBe(false)
    })

    it('T2.6: Should ensure double-hashing cannot be bypassed by raw GUID single hashing', () => {
        // Naive single-hash failure demonstration
        const naiveSingleHash = createHmac('sha256', 'nexus-device-salt')
            .update(KNOWN_GUID)
            .digest('hex')

        // Must NOT match the authoritative EXPECTED_STAGE2_HMAC
        expect(naiveSingleHash).not.toBe(EXPECTED_STAGE2_HMAC)
    })
})
