import { describe, it, expect, beforeEach } from 'vitest'

const memoryStore: Record<string, string> = {}
if (typeof globalThis.localStorage === 'undefined') {
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => memoryStore[key] ?? null,
    setItem: (key: string, val: string) => {
      memoryStore[key] = val
    },
    removeItem: (key: string) => {
      delete memoryStore[key]
    },
    clear: () => {
      for (const k of Object.keys(memoryStore)) delete memoryStore[k]
    }
  }
}

import {
  analyzeReDoS,
  parseRegexAST,
  generateCodeSnippets
} from '../src/renderer/src/lib/regexEngine'
import {
  cyberAudio,
  setAudioProfile,
  getAudioProfile,
  type AudioProfile
} from '../src/renderer/src/lib/cyberAudio'

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  }
}

describe('Regex Lab Pro - ReDoS Vulnerability Scanner', () => {
  it('should detect nested quantifiers as critical ReDoS vulnerability', () => {
    const dangerousPatterns = ['(a+)+', '(x*)*', '([a-zA-Z0-9]+)*$', '(\\d+)+']
    for (const pat of dangerousPatterns) {
      const res = analyzeReDoS(pat)
      expect(res.isVulnerable).toBe(true)
      expect(res.severity).toBe('critical')
      expect(res.score).toBeLessThanOrEqual(50)
      expect(res.findings.length).toBeGreaterThan(0)
      expect(res.pathologicalInput).toBeDefined()
    }
  })

  it('should detect overlapping alternation inside quantified groups', () => {
    const res = analyzeReDoS('(a|aa)+')
    expect(res.isVulnerable).toBe(true)
    expect(res.findings.some((f) => f.title.includes('Alternatif') || f.title.includes('Alternation'))).toBe(true)
  })

  it('should mark clean and standard regex patterns as safe', () => {
    const safePatterns = [
      '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      '\\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b',
      '#([0-9a-fA-F]{3}){1,2}\\b',
      'https?:\\/\\/[^\\s/$.?#].[^\\s]*'
    ]
    for (const pat of safePatterns) {
      const res = analyzeReDoS(pat)
      expect(res.isVulnerable).toBe(false)
      expect(res.severity).toBe('safe')
      expect(res.score).toBeGreaterThanOrEqual(90)
    }
  })

  it('should handle empty or whitespace-only patterns gracefully', () => {
    const res = analyzeReDoS('')
    expect(res.score).toBe(100)
    expect(res.severity).toBe('safe')
    expect(res.findings).toEqual([])
  })
})

describe('Regex Lab Pro - AST Group & Token Explainer', () => {
  it('should parse character classes and escaped shorthands', () => {
    const tokens = parseRegexAST('\\d+\\w*\\s?')
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.some((t) => t.raw === '\\d' && t.badge === 'Sınıf')).toBe(true)
    expect(tokens.some((t) => t.raw === '\\w')).toBe(true)
    expect(tokens.some((t) => t.raw === '\\s')).toBe(true)
  })

  it('should identify lookahead and lookbehind assertions', () => {
    const tokens = parseRegexAST('(?=abc)(?!def)(?<=ghi)(?<!jkl)')
    expect(tokens.some((t) => t.raw === '(?=...)' && t.badge === 'Lookahead')).toBe(true)
    expect(tokens.some((t) => t.raw === '(?!...)' && t.type === 'lookaround')).toBe(true)
    expect(tokens.some((t) => t.raw === '(?<=...)' && t.badge === 'Lookbehind')).toBe(true)
    expect(tokens.some((t) => t.raw === '(?<!...)')).toBe(true)
  })

  it('should parse named groups and non-capturing groups', () => {
    const tokens = parseRegexAST('(?<username>[a-z]+)(?:@)(domain)')
    expect(tokens.some((t) => t.raw.includes('?<username>') && t.badge === 'İsimli Grup')).toBe(true)
    expect(tokens.some((t) => t.raw === '(?:...)' && t.title.includes('Non-Capturing'))).toBe(true)
    expect(tokens.some((t) => t.raw === '(...)')).toBe(true)
  })

  it('should parse quantifiers and anchors', () => {
    const tokens = parseRegexAST('^\\w+?\\b$')
    expect(tokens.some((t) => t.raw === '^' && t.badge === 'Çapa')).toBe(true)
    expect(tokens.some((t) => t.raw === '$' && t.badge === 'Çapa')).toBe(true)
    expect(tokens.some((t) => t.raw === '\\b')).toBe(true)
    expect(tokens.some((t) => t.raw === '+?' && t.badge === 'Niceleyici')).toBe(true)
  })
})

describe('Regex Lab Pro - Multi-Language Code Export', () => {
  it('should generate 6 production-ready language snippets', () => {
    const snippets = generateCodeSnippets('^test[0-9]+', 'gi', 'test1234')
    expect(snippets).toHaveLength(6)

    const ids = snippets.map((s) => s.id)
    expect(ids).toContain('typescript')
    expect(ids).toContain('python')
    expect(ids).toContain('go')
    expect(ids).toContain('rust')
    expect(ids).toContain('java')
    expect(ids).toContain('csharp')

    for (const snip of snippets) {
      expect(snip.code).toContain('^test[0-9]+')
      expect(snip.code.length).toBeGreaterThan(50)
    }
  })
})

describe('CyberAudioEngine - Multi-Profile Sound System', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should switch between cyber, mechanical, linear and stealth profiles', () => {
    const profiles: AudioProfile[] = ['cyber', 'mechanical', 'linear', 'stealth']

    for (const p of profiles) {
      setAudioProfile(p)
      expect(getAudioProfile()).toBe(p)
      expect(cyberAudio.getAudioProfile()).toBe(p)
      expect(localStorage.getItem('nexus_sfx_profile')).toBe(p)
    }
  })

  it('should not throw errors when invoking audio triggers in any profile', () => {
    const profiles: AudioProfile[] = ['cyber', 'mechanical', 'linear', 'stealth']

    for (const p of profiles) {
      cyberAudio.setAudioProfile(p)
      expect(() => cyberAudio.click()).not.toThrow()
      expect(() => cyberAudio.copySuccess()).not.toThrow()
      expect(() => cyberAudio.purge()).not.toThrow()
      expect(() => cyberAudio.shred()).not.toThrow()
      expect(() => cyberAudio.navigate()).not.toThrow()
    }
  })
})
