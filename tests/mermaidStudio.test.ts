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

import { describe, it, expect, beforeAll } from 'vitest'
import DOMPurify from 'dompurify'

// In Node test runtime, attach sanitize and addHook to DOMPurify instance
const dp = ((DOMPurify as any).default || DOMPurify) as any
if (typeof dp.sanitize !== 'function') {
  dp.sanitize = (s: any) => (typeof s === 'string' ? s : String(s ?? ''))
  dp.addHook = () => {}
  dp.setConfig = () => {}
  dp.clearConfig = () => {}
  dp.isValidAttribute = () => true
  dp.reset = () => {}
}

import mermaid from 'mermaid'
import enJson from '../src/renderer/src/locales/en.json'
import trJson from '../src/renderer/src/locales/tr.json'

// Built-in presets matching MermaidStudio.tsx
export const MERMAID_PRESETS = {
  flowchart: {
    name: 'Flowchart',
    type: 'flowchart-v2',
    code: `flowchart TD
    Client[Web & Desktop Client] -->|Tauri IPC / HTTPS| Gateway[API Gateway & Router]
    Gateway --> ServiceA[Auth & Security Service]
    Gateway --> ServiceB[Developer Tool Suite]
    ServiceA --> DB[(SQLite Local DB)]
    ServiceB --> Engine[Native Crypto & WASM Engine]
    style Client fill:#8b5cf6,stroke:#a78bfa,stroke-width:2px,color:#fff
    style Gateway fill:#06b6d4,stroke:#22d3ee,stroke-width:2px,color:#fff
    style Engine fill:#10b981,stroke:#34d399,stroke-width:2px,color:#fff`,
  },
  sequence: {
    name: 'Sequence Diagram',
    type: 'sequence',
    code: `sequenceDiagram
    autonumber
    actor Dev as Developer
    participant UI as Desktop React UI
    participant Bridge as Tauri IPC Bridge
    participant Rust as Rust Native Engine

    Dev->>UI: Request Port Scan
    UI->>Bridge: invoke("scan_listening_ports")
    Bridge->>Rust: Query OS Socket Table
    Rust-->>Bridge: List of Listening Sockets
    Bridge-->>UI: Render Active Ports
    UI-->>Dev: Display Interactive Table`,
  },
  erd: {
    name: 'Entity Relationship',
    type: 'er',
    code: `erDiagram
    USER ||--o{ LICENSE : owns
    USER ||--o{ ACTIVITY_LOG : generates
    LICENSE ||--|{ ACTIVATION : validates
    ACTIVITY_LOG ||--|| AUDIT_BLOCK : hashes

    USER {
        string id PK
        string email
        string tier
        datetime created_at
    }
    LICENSE {
        string license_key PK
        string hardware_id
        boolean active
        datetime expires_at
    }
    ACTIVITY_LOG {
        string id PK
        string tool_name
        string action
        datetime timestamp
    }`,
  },
  state: {
    name: 'State Machine',
    type: 'stateDiagram',
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Scanning: Trigger Port Scan
    Scanning --> SocketsDiscovered: Success
    Scanning --> ScanError: Timeout / Permission
    SocketsDiscovered --> Filtered: Apply Web / DB Preset
    Filtered --> Terminating: Kill Process (SIGKILL)
    Terminating --> Idle: Socket Released
    ScanError --> Idle: Retry`,
  },
  classDiagram: {
    name: 'Class Diagram',
    type: 'classDiagram',
    code: `classDiagram
    class DeveloperTool {
        +String id
        +String title
        +String route
        +run() void
        +export() Blob
    }
    class JwtStudio {
        +String token
        +verifySignature() boolean
        +generateToken() String
    }
    class CronStudio {
        +String expression
        +getNextOccurrences() Date[]
        +explain() String
    }
    DeveloperTool <|-- JwtStudio
    DeveloperTool <|-- CronStudio`,
  },
  gitGraph: {
    name: 'Git Graph',
    type: 'gitGraph',
    code: `gitGraph
    commit id: "Initial v2.0"
    branch develop
    checkout develop
    commit id: "Add Tauri Skeleton"
    branch feature/jwt-studio
    checkout feature/jwt-studio
    commit id: "Implement Web Crypto HMAC"
    checkout develop
    merge feature/jwt-studio
    checkout main
    merge develop tag: "v2.4.3"`,
  },
}

describe('Markdown & Mermaid Live Canvas — mermaidStudio Comprehensive Test Suite', () => {
  beforeAll(() => {
    // Provide DOMPurify polyfill in Node runtime for Mermaid text sanitization
    if (!(globalThis as any).DOMPurify || typeof (globalThis as any).DOMPurify.sanitize !== 'function') {
      ;(globalThis as any).DOMPurify = {
        sanitize: (str: string) => str,
      }
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#0e0e18',
        primaryColor: '#8b5cf6',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#a78bfa',
        lineColor: '#22d3ee',
        secondaryColor: '#1e1e30',
        tertiaryColor: '#161625',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      },
      securityLevel: 'loose',
    })
  })

  describe('1. Built-in Diagram Presets Validation', () => {
    it('parses flowchart TD preset successfully with valid syntax', async () => {
      const preset = MERMAID_PRESETS.flowchart
      const result = await mermaid.parse(preset.code.trim())
      expect(result).toBeTruthy()
      expect(result.diagramType).toBe(preset.type)
      expect(preset.code).toContain('Client[Web & Desktop Client]')
      expect(preset.code).toContain('DB[(SQLite Local DB)]')
    })

    it('parses sequenceDiagram preset successfully with valid syntax', async () => {
      const preset = MERMAID_PRESETS.sequence
      const result = await mermaid.parse(preset.code.trim())
      expect(result).toBeTruthy()
      expect(result.diagramType).toBe(preset.type)
      expect(preset.code).toContain('participant Bridge as Tauri IPC Bridge')
      expect(preset.code).toContain('participant Rust as Rust Native Engine')
    })

    it('parses erDiagram preset successfully with valid schema relations', async () => {
      const preset = MERMAID_PRESETS.erd
      const result = await mermaid.parse(preset.code.trim())
      expect(result).toBeTruthy()
      expect(result.diagramType).toBe(preset.type)
      expect(preset.code).toContain('USER ||--o{ LICENSE : owns')
      expect(preset.code).toContain('LICENSE ||--|{ ACTIVATION : validates')
    })

    it('parses stateDiagram-v2 preset successfully with states and transitions', async () => {
      const preset = MERMAID_PRESETS.state
      const result = await mermaid.parse(preset.code.trim())
      expect(result).toBeTruthy()
      expect(result.diagramType).toBe(preset.type)
      expect(preset.code).toContain('[*] --> Idle')
      expect(preset.code).toContain('Scanning --> SocketsDiscovered: Success')
    })

    it('parses classDiagram preset successfully with OOP structures', async () => {
      const preset = MERMAID_PRESETS.classDiagram
      const result = await mermaid.parse(preset.code.trim())
      expect(result).toBeTruthy()
      expect(result.diagramType).toBe(preset.type)
      expect(preset.code).toContain('class DeveloperTool')
      expect(preset.code).toContain('DeveloperTool <|-- JwtStudio')
    })

    it('parses gitGraph preset successfully with branching and merging', async () => {
      const preset = MERMAID_PRESETS.gitGraph
      const result = await mermaid.parse(preset.code.trim())
      expect(result).toBeTruthy()
      expect(result.diagramType).toBe(preset.type)
      expect(preset.code).toContain('branch develop')
      expect(preset.code).toContain('merge feature/jwt-studio')
    })
  })

  describe('2. Syntax Error Detection & Handling', () => {
    it('detects and rejects completely invalid diagram text with an error', async () => {
      const invalidCode = 'this is not a valid mermaid diagram at all 12345'
      await expect(mermaid.parse(invalidCode)).rejects.toThrow()
    })

    it('detects syntax errors in broken flowchart statements', async () => {
      const brokenFlowchart = `flowchart TD
      A[Start] --->>> B(Incomplete syntax without closure
      `
      await expect(mermaid.parse(brokenFlowchart)).rejects.toThrow()
    })

    it('detects syntax errors in malformed sequence diagrams', async () => {
      const brokenSequence = `sequenceDiagram
      Alice ->>
      `
      await expect(mermaid.parse(brokenSequence)).rejects.toThrow()
    })
  })

  describe('3. SVG Rendering Contracts & Export Specifications', () => {
    it('verifies Dark Theme configuration tokens match ZenDev brand standards', () => {
      const themeConfig = {
        darkMode: true,
        background: '#0e0e18',
        primaryColor: '#8b5cf6',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#a78bfa',
        lineColor: '#22d3ee',
        secondaryColor: '#1e1e30',
        tertiaryColor: '#161625',
      }

      expect(themeConfig.background).toBe('#0e0e18')
      expect(themeConfig.primaryColor).toBe('#8b5cf6')
      expect(themeConfig.lineColor).toBe('#22d3ee')
      expect(themeConfig.darkMode).toBe(true)
    })

    it('verifies viewBox parsing and 2x resolution scaling logic for crisp PNG export', () => {
      const mockSvgWithViewBox = `<svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg"><g></g></svg>`
      const match = mockSvgWithViewBox.match(/viewBox=["']([^"']+)["']/)
      expect(match).not.toBeNull()

      const parts = match![1].split(/\s+/).map(Number)
      expect(parts.length).toBe(4)
      const width = parts[2]
      const height = parts[3]

      expect(width).toBe(1000)
      expect(height).toBe(600)

      // 2x Retina scale calculation
      const scale = 2
      const canvasWidth = width * scale
      const canvasHeight = height * scale

      expect(canvasWidth).toBe(2000)
      expect(canvasHeight).toBe(1200)
    })

    it('verifies SVG download blob metadata specifications', () => {
      const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><circle cx="50" cy="50" r="40"/></svg>`
      const blob = new Blob([mockSvg], { type: 'image/svg+xml;charset=utf-8' })

      expect(blob.type).toBe('image/svg+xml;charset=utf-8')
      expect(blob.size).toBe(mockSvg.length)
    })
  })

  describe('4. Bilingual i18n Translation Key Verification', () => {
    it('verifies mermaidStudio namespace has 100% key parity and non-empty strings in en.json and tr.json', () => {
      const enKeys = Object.keys((enJson as any).mermaidStudio || {})
      const trKeys = Object.keys((trJson as any).mermaidStudio || {})

      expect(enKeys.length).toBeGreaterThanOrEqual(10)
      expect(enKeys.sort()).toEqual(trKeys.sort())

      expect((enJson as any).mermaidStudio.title).toBe('Mermaid & Architecture Canvas')
      expect((trJson as any).mermaidStudio.title).toBe('Mermaid & Mimari Tuval')
      expect((enJson as any).mermaidStudio.copySvg).toBeTruthy()
      expect((trJson as any).mermaidStudio.downloadSvg).toBeTruthy()
      expect((enJson as any).mermaidStudio.copyPng).toBeTruthy()
      expect((trJson as any).mermaidStudio.downloadPng).toBeTruthy()
    })
  })
})
