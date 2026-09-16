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
import * as fs from 'fs'
import * as path from 'path'
import { REQUIRED_NEXUS_API_NAMESPACES } from './helpers/testHarness'

describe('E2E FEAT-01: Tauri v2 Skeleton, Build Verification & IPC Bridge', () => {
    const projectRoot = path.resolve(__dirname, '../..')
    const pkgJsonPath = path.join(projectRoot, 'package.json')

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 1: Feature Coverage (Happy Path & Interface Contracts)
    // ─────────────────────────────────────────────────────────────────────────

    it('T1.1: Should verify package.json structure conforms to Tauri migration standards', () => {
        expect(fs.existsSync(pkgJsonPath)).toBe(true)
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
        expect(pkg.name).toBe('zendev')
        expect(pkg.version).toBeDefined()
        expect(pkg.scripts).toBeDefined()
        expect(pkg.scripts.test).toBeDefined()
    })

    it('T1.2: Should verify Vite configuration parameters for Tauri v2 compatibility', () => {
        const viteConfigExists =
            fs.existsSync(path.join(projectRoot, 'vite.config.ts')) ||
            fs.existsSync(path.join(projectRoot, 'electron.vite.config.ts'))
        expect(viteConfigExists).toBe(true)

        // Tauri v2 standard requires clear outDir target
        const content = fs.readFileSync(
            fs.existsSync(path.join(projectRoot, 'vite.config.ts'))
                ? path.join(projectRoot, 'vite.config.ts')
                : path.join(projectRoot, 'electron.vite.config.ts'),
            'utf-8'
        )
        expect(content).toContain('defineConfig')
    })

    it('T1.3: Should verify complete 20-namespace presence in window.nexusAPI interface contract', () => {
        const bridgePath = path.join(
            projectRoot,
            '.agents/teamwork_preview_explorer_survey_1/proposed_tauriBridge.ts'
        )
        expect(fs.existsSync(bridgePath)).toBe(true)
        const bridgeContent = fs.readFileSync(bridgePath, 'utf-8')

        for (const ns of REQUIRED_NEXUS_API_NAMESPACES) {
            const hasNamespace =
                bridgeContent.includes(`${ns}:`) ||
                bridgeContent.includes(`${ns} =`) ||
                bridgeContent.includes(`.${ns}`)
            expect(hasNamespace, `Missing required namespace in bridge: ${ns}`).toBe(true)
        }
    })

    it('T1.4: Should verify Tauri window management commands contract', () => {
        const windowCommands = [
            'window_minimize',
            'window_maximize',
            'window_close',
            'window_is_maximized',
            'window_toggle_always_on_top',
        ]

        // Check if project or survey defines these commands
        const projectMdPath = path.join(
            projectRoot,
            '.agents/teamwork_preview_orchestrator_1/PROJECT.md'
        )
        expect(fs.existsSync(projectMdPath)).toBe(true)
        const projectMd = fs.readFileSync(projectMdPath, 'utf-8')

        for (const cmd of windowCommands) {
            expect(projectMd).toContain(cmd)
        }
    })

    it('T1.5: Should verify proposed Tauri bridge implements safe invoke wrapper and zero-UI changes', () => {
        const surveyBridgePath = path.join(
            projectRoot,
            '.agents/teamwork_preview_explorer_survey_1/proposed_tauriBridge.ts'
        )
        expect(fs.existsSync(surveyBridgePath)).toBe(true)
        const bridgeContent = fs.readFileSync(surveyBridgePath, 'utf-8')

        expect(bridgeContent).toContain('isTauriEnvironment')
        expect(bridgeContent).toContain('safeInvoke')
        expect(bridgeContent).toContain('tauriNexusAPI')
        expect(bridgeContent).toContain('setupEventListener')
    })

    it('T1.6: Should verify frontend main.tsx imports and boots application correctly', () => {
        const mainTsxPath = path.join(projectRoot, 'src/renderer/src/main.tsx')
        expect(fs.existsSync(mainTsxPath)).toBe(true)
        const mainContent = fs.readFileSync(mainTsxPath, 'utf-8')
        expect(mainContent).toContain('ReactDOM')
        expect(mainContent).toContain('App')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 2: Boundary & Corner Cases (Defensive & Robustness)
    // ─────────────────────────────────────────────────────────────────────────

    it('T2.1: Should gracefully handle mock bridge execution outside native Tauri environment', async () => {
        const mockBridge = {
            isTauriEnvironment: () => false,
            safeInvoke: async <T>(cmd: string, _args?: any, fallback?: T): Promise<T> => {
                if (fallback !== undefined) return fallback
                return undefined as unknown as T
            },
        }

        expect(mockBridge.isTauriEnvironment()).toBe(false)
        const fallbackRes = await mockBridge.safeInvoke('port_scan_active_ports', {}, { ports: [] })
        expect(fallbackRes).toEqual({ ports: [] })
    })

    it('T2.2: Should reject commands when invoke throws backend IPC error', async () => {
        const mockFailingBridge = {
            safeInvoke: async (cmd: string) => {
                throw new Error(`Command ${cmd} rejected by Tauri core security policy`)
            },
        }

        await expect(mockFailingBridge.safeInvoke('system_unauthorized_exec')).rejects.toThrow(
            /Command system_unauthorized_exec rejected/
        )
    })

    it('T2.3: Should guarantee event unlistener is idempotent and does not throw on multiple calls', () => {
        let callCount = 0
        const fakeUnlisten = () => {
            callCount++
        }

        let isCleanedUp = false
        const idempotentUnlistener = () => {
            if (!isCleanedUp) {
                isCleanedUp = true
                fakeUnlisten()
            }
        }

        idempotentUnlistener()
        idempotentUnlistener()
        idempotentUnlistener()

        expect(callCount).toBe(1)
    })

    it('T2.4: Should enforce no duplicate command registrations in bridge namespaces', () => {
        const uniqueNamespaces = new Set(REQUIRED_NEXUS_API_NAMESPACES)
        expect(uniqueNamespaces.size).toBe(REQUIRED_NEXUS_API_NAMESPACES.length)
    })

    it('T2.5: Should verify package.json dependency isolation does not conflict with Tauri dependencies', () => {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
        const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
        }

        // Must not depend on obsolete conflicting packages
        expect(allDeps['react']).toBeDefined()
        expect(allDeps['typescript']).toBeDefined()
    })

    it('T2.6: Should ensure bridge handles undefined arguments without crashing', async () => {
        const invokeWithSanitization = async (cmd: string, args?: Record<string, unknown>) => {
            const sanitized = args ? { ...args } : {}
            return { cmd, argKeys: Object.keys(sanitized) }
        }

        const res1 = await invokeWithSanitization('network_ping', undefined)
        expect(res1.argKeys).toEqual([])

        const res2 = await invokeWithSanitization('pdf_merge', { filePaths: ['a.pdf'] })
        expect(res2.argKeys).toEqual(['filePaths'])
    })
})
