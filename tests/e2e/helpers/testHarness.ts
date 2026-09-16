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

import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import * as os from 'os'
import { createHash, createHmac, randomBytes } from 'crypto'

/**
 * 51-byte Cyber Fortress header structure:
 * - 0..7   (7B):  ASCII "NEXUSV1"
 * - 7..23  (16B): Salt for PBKDF2
 * - 23..35 (12B): Nonce / IV for AES-256-GCM
 * - 35..51 (16B): Authentication Tag (written after stream encryption)
 */
export interface VaultHeaderInfo {
    magic: string
    salt: Buffer
    iv: Buffer
    authTag: Buffer
    isValid: boolean
}

/**
 * Parses and verifies a Cyber Fortress .nexusvault 51-byte header.
 */
export function parseVaultHeader(filePath: string): VaultHeaderInfo {
    const fd = fsSync.openSync(filePath, 'r')
    const headerBuf = Buffer.alloc(51)
    fsSync.readSync(fd, headerBuf, 0, 51, 0)
    fsSync.closeSync(fd)

    const magic = headerBuf.subarray(0, 7).toString('utf-8')
    const salt = headerBuf.subarray(7, 23)
    const iv = headerBuf.subarray(23, 35)
    const authTag = headerBuf.subarray(35, 51)

    return {
        magic,
        salt,
        iv,
        authTag,
        isValid: magic === 'NEXUSV1' && salt.length === 16 && iv.length === 12 && authTag.length === 16,
    }
}

/**
 * Canonical Windows Registry MachineGuid normalization as performed by legacy node-machine-id expose():
 * .replace(/\r+|\n+|\s+/ig, '').toLowerCase()
 */
export function normalizeMachineGuid(rawGuid: string): string {
    return rawGuid.replace(/\r+|\n+|\s+/gi, '').toLowerCase()
}

/**
 * Stage 1: Legacy node-machine-id default hash (when original is falsy/undefined)
 * SHA-256 hex digest of normalized GUID.
 */
export function deriveNodeMachineIdHash(normalizedGuid: string): string {
    return createHash('sha256').update(normalizedGuid).digest('hex').toLowerCase()
}

/**
 * Stage 2: ZenDev licenseStore getDeviceId() salted HMAC
 * HMAC-SHA256 of Stage 1 hash using key 'nexus-device-salt'.
 */
export function deriveFinalDeviceId(normalizedGuid: string, salt = 'nexus-device-salt'): string {
    const stage1 = deriveNodeMachineIdHash(normalizedGuid)
    return createHmac('sha256', salt).update(stage1).digest('hex').toLowerCase()
}

/**
 * Fallback device ID generator when registry query fails:
 * `${USERNAME}-${platform}` -> HMAC-SHA256 with 'nexus-device-salt'.
 */
export function deriveFallbackDeviceId(username = 'unknown', platform = 'win32', salt = 'nexus-device-salt'): string {
    const raw = `${username}-${platform}`
    return createHmac('sha256', salt).update(raw).digest('hex').toLowerCase()
}

/**
 * Creates an isolated temporary directory for test fixtures.
 */
export async function createTempSandbox(prefix = 'zendev-e2e-') {
    const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))

    const createFile = async (relativePath: string, content: string | Buffer): Promise<string> => {
        const fullPath = path.join(sandboxDir, relativePath)
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        if (typeof content === 'string') {
            await fs.writeFile(fullPath, content, 'utf-8')
        } else {
            await fs.writeFile(fullPath, content)
        }
        return fullPath
    }

    const cleanup = async () => {
        try {
            await fs.rm(sandboxDir, { recursive: true, force: true })
        } catch {
            // Ignore cleanup race conditions
        }
    }

    return {
        sandboxDir,
        createFile,
        cleanup,
    }
}

/**
 * Expected 20 namespaces in window.nexusAPI.
 */
export const REQUIRED_NEXUS_API_NAMESPACES = [
    'bypassLink',
    'tempMail',
    'decrypter',
    'organizer',
    'clipboard',
    'network',
    'image',
    'sentinel',
    'fortress',
    'pdf',
    'system',
    'settings',
    'updater',
    'port',
    'journal',
    'pubsub',
    'license',
    'safeStorage',
    'onVisibilityChange',
    'memorySweep',
] as const
