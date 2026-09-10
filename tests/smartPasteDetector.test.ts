import { describe, it, expect } from 'vitest'
import { detectSmartPaste } from '../src/renderer/src/lib/smartPasteDetector'

describe('SmartPasteDetector', () => {
  it('detects JSON objects and arrays', () => {
    const jsonStr = '{"app": "ZenDev", "version": "2.3.1"}'
    const res = detectSmartPaste(jsonStr)
    expect(res).not.toBeNull()
    expect(res?.type).toBe('json')
    if (res?.type === 'json') {
      expect(res.isObject).toBe(true)
      expect(res.itemCount).toBe(2)
      expect(res.formatted).toContain('ZenDev')
      expect(res.minified).toBe('{"app":"ZenDev","version":"2.3.1"}')
    }
  })

  it('detects JWT tokens', () => {
    const jwtStr = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const res = detectSmartPaste(jwtStr)
    expect(res).not.toBeNull()
    expect(res?.type).toBe('jwt')
    if (res?.type === 'jwt') {
      expect(res.algorithm).toBe('HS256')
      expect(res.subject).toBe('1234567890')
      expect(res.payload.name).toBe('John Doe')
    }
  })

  it('detects Hex and RGB colors', () => {
    const hexRes = detectSmartPaste('#ff5722')
    expect(hexRes).not.toBeNull()
    expect(hexRes?.type).toBe('color')
    if (hexRes?.type === 'color') {
      expect(hexRes.hex).toBe('#FF5722')
      expect(hexRes.rgb).toBe('rgb(255, 87, 34)')
    }

    const rgbRes = detectSmartPaste('rgb(0, 240, 255)')
    expect(rgbRes).not.toBeNull()
    expect(rgbRes?.type).toBe('color')
    if (rgbRes?.type === 'color') {
      expect(rgbRes.hex).toBe('#00F0FF')
    }
  })

  it('calculates math expressions with percentages: (120 * 45) + 18%', () => {
    const res = detectSmartPaste('(120 * 45) + 18%')
    expect(res).not.toBeNull()
    expect(res?.type).toBe('math')
    if (res?.type === 'math') {
      expect(res.result).toBe('6,372')
    }
  })

  it('converts currencies: 100 USD to EUR', () => {
    const res = detectSmartPaste('100 USD to EUR')
    expect(res).not.toBeNull()
    expect(res?.type).toBe('math')
    if (res?.type === 'math') {
      expect(res.result).toContain('EUR')
      expect(res.isUnitConversion).toBe(true)
    }
  })

  it('converts units: 10 GB to MB', () => {
    const res = detectSmartPaste('10 GB to MB')
    expect(res).not.toBeNull()
    expect(res?.type).toBe('math')
    if (res?.type === 'math') {
      expect(res.result).toBe('10,240 MB')
    }
  })
})
