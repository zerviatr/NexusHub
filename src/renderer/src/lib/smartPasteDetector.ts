/**
 * Context-Aware Smart Paste & Input Detector for ZenDev / NexusHub HUD
 * 
 * Automatically detects:
 * 1. JSON: Formatter, Minifier, DevSandbox / JsonStudio actions
 * 2. JWT: Header & Payload decoder, claims overview
 * 3. Color: HEX/RGB/HSL detection with color swatch preview & clipboard actions
 * 4. Math & Unit: Safe math evaluation with percentages, e.g. (120 * 45) + 18%,
 *    plus unit & currency conversions (100 USD to EUR, 10 GB to MB, etc.)
 */

export type SmartPasteType = 'json' | 'jwt' | 'color' | 'math'

export interface SmartPasteJson {
  type: 'json'
  raw: string
  formatted: string
  minified: string
  byteSize: number
  itemCount: number
  isObject: boolean
  isArray: boolean
}

export interface SmartPasteJwt {
  type: 'jwt'
  raw: string
  header: Record<string, any>
  payload: Record<string, any>
  signature: string
  algorithm: string
  subject?: string
  issuer?: string
  expiresAt?: string
  isExpired?: boolean
}

export interface SmartPasteColor {
  type: 'color'
  raw: string
  hex: string
  rgb: string
  hsl: string
  hasAlpha: boolean
  previewColor: string
}

export interface SmartPasteMath {
  type: 'math'
  raw: string
  expression: string
  result: string
  detail?: string
  isUnitConversion?: boolean
}

export type SmartPasteResult =
  | SmartPasteJson
  | SmartPasteJwt
  | SmartPasteColor
  | SmartPasteMath

// ─────────────────────────────────────────────────────────────────────────────
// 1. JSON DETECTION
// ─────────────────────────────────────────────────────────────────────────────
function detectJson(str: string): SmartPasteJson | null {
  const trimmed = str.trim()
  if (trimmed.length < 2) return null

  // Must look like an object or array to avoid single numbers/strings being parsed as JSON
  const startsObject = trimmed.startsWith('{') && trimmed.endsWith('}')
  const startsArray = trimmed.startsWith('[') && trimmed.endsWith(']')
  if (!startsObject && !startsArray) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed !== 'object' || parsed === null) return null

    const isArray = Array.isArray(parsed)
    const isObject = !isArray && typeof parsed === 'object'
    const itemCount = isArray ? parsed.length : Object.keys(parsed).length
    const formatted = JSON.stringify(parsed, null, 2)
    const minified = JSON.stringify(parsed)
    const byteSize = new Blob([trimmed]).size

    return {
      type: 'json',
      raw: trimmed,
      formatted,
      minified,
      byteSize,
      itemCount,
      isObject,
      isArray
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. JWT DETECTION
// ─────────────────────────────────────────────────────────────────────────────
function safeBase64UrlDecode(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch {
    try {
      return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
    } catch {
      return ''
    }
  }
}

function detectJwt(str: string): SmartPasteJwt | null {
  const trimmed = str.trim()
  if (trimmed.length < 20) return null

  // JWT has 3 parts separated by dots
  const parts = trimmed.split('.')
  if (parts.length !== 3) return null

  // Check valid base64url characters
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/
  if (!base64UrlRegex.test(parts[0]) || !base64UrlRegex.test(parts[1])) return null

  try {
    const headerStr = safeBase64UrlDecode(parts[0])
    const payloadStr = safeBase64UrlDecode(parts[1])
    if (!headerStr || !payloadStr) return null

    const header = JSON.parse(headerStr)
    const payload = JSON.parse(payloadStr)

    if (typeof header !== 'object' || typeof payload !== 'object') return null

    const algorithm = header.alg || 'Unknown'
    const subject = payload.sub ? String(payload.sub) : undefined
    const issuer = payload.iss ? String(payload.iss) : undefined

    let expiresAt: string | undefined = undefined
    let isExpired: boolean | undefined = undefined

    if (payload.exp && typeof payload.exp === 'number') {
      const expDate = new Date(payload.exp * 1000)
      expiresAt = expDate.toLocaleString()
      isExpired = expDate.getTime() < Date.now()
    }

    return {
      type: 'jwt',
      raw: trimmed,
      header,
      payload,
      signature: parts[2],
      algorithm,
      subject,
      issuer,
      expiresAt,
      isExpired
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. COLOR DETECTION
// ─────────────────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number; a?: number } | null {
  let clean = hex.replace(/^#/, '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  } else if (clean.length === 4) {
    clean = clean.split('').map((c) => c + c).join('')
  }

  if (clean.length === 6) {
    const num = parseInt(clean, 16)
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    }
  } else if (clean.length === 8) {
    const num = parseInt(clean, 16)
    return {
      r: (num >> 24) & 255,
      g: (num >> 16) & 255,
      b: (num >> 8) & 255,
      a: Math.round(((num & 255) / 255) * 100) / 100
    }
  }
  return null
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

function detectColor(str: string): SmartPasteColor | null {
  const trimmed = str.trim()
  if (trimmed.length < 3 || trimmed.length > 40) return null

  // 1. Hex Color #fff, #ffffff, #ffffff80 or raw 6-digit hex (e.g. 00f0ff, ff5722)
  const hexMatch = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  if (hexMatch) {
    const fullHex = trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
    const rgbObj = hexToRgb(fullHex)
    if (rgbObj) {
      const hsl = rgbToHsl(rgbObj.r, rgbObj.g, rgbObj.b)
      const rgbStr = rgbObj.a !== undefined
        ? `rgba(${rgbObj.r}, ${rgbObj.g}, ${rgbObj.b}, ${rgbObj.a})`
        : `rgb(${rgbObj.r}, ${rgbObj.g}, ${rgbObj.b})`
      const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`

      return {
        type: 'color',
        raw: trimmed,
        hex: fullHex,
        rgb: rgbStr,
        hsl: hslStr,
        hasAlpha: rgbObj.a !== undefined,
        previewColor: fullHex
      }
    }
  }

  // 2. RGB / RGBA
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+)\s*)?\)$/i)
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10))
    const g = Math.min(255, parseInt(rgbMatch[2], 10))
    const b = Math.min(255, parseInt(rgbMatch[3], 10))
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : undefined
    const hsl = rgbToHsl(r, g, b)

    const toHexPart = (n: number) => n.toString(16).padStart(2, '0').toUpperCase()
    const hex = `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`
    const rgbStr = a !== undefined ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`
    const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`

    return {
      type: 'color',
      raw: trimmed,
      hex,
      rgb: rgbStr,
      hsl: hslStr,
      hasAlpha: a !== undefined,
      previewColor: rgbStr
    }
  }

  // 3. HSL / HSLA
  const hslMatch = trimmed.match(/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*([0-9.]+)\s*)?\)$/i)
  if (hslMatch) {
    return {
      type: 'color',
      raw: trimmed,
      hex: trimmed,
      rgb: trimmed,
      hsl: trimmed,
      hasAlpha: hslMatch[4] !== undefined,
      previewColor: trimmed
    }
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MATH & UNIT CONVERSION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

// Realistic conversion baseline (USD base)
const CURRENCIES: Record<string, { rateFromUSD: number; symbol: string }> = {
  USD: { rateFromUSD: 1.0, symbol: '$' },
  EUR: { rateFromUSD: 0.92, symbol: '€' },
  TRY: { rateFromUSD: 38.5, symbol: '₺' },
  GBP: { rateFromUSD: 0.78, symbol: '£' },
  CAD: { rateFromUSD: 1.36, symbol: 'CA$' },
  AUD: { rateFromUSD: 1.52, symbol: 'A$' },
  JPY: { rateFromUSD: 154.0, symbol: '¥' },
  CHF: { rateFromUSD: 0.89, symbol: 'Fr' },
  CNY: { rateFromUSD: 7.24, symbol: '¥' },
  BTC: { rateFromUSD: 0.0000115, symbol: '₿' },
  ETH: { rateFromUSD: 0.00037, symbol: 'Ξ' }
}

const UNITS: Record<string, { type: string; toBase: number; name: string }> = {
  // Length (Base: meter)
  m: { type: 'length', toBase: 1, name: 'Metre' },
  meter: { type: 'length', toBase: 1, name: 'Metre' },
  meters: { type: 'length', toBase: 1, name: 'Metre' },
  metre: { type: 'length', toBase: 1, name: 'Metre' },
  km: { type: 'length', toBase: 1000, name: 'Kilometre' },
  kilometer: { type: 'length', toBase: 1000, name: 'Kilometre' },
  kilometers: { type: 'length', toBase: 1000, name: 'Kilometre' },
  cm: { type: 'length', toBase: 0.01, name: 'Santimetre' },
  centimeter: { type: 'length', toBase: 0.01, name: 'Santimetre' },
  mm: { type: 'length', toBase: 0.001, name: 'Milimetre' },
  mi: { type: 'length', toBase: 1609.344, name: 'Mil' },
  mile: { type: 'length', toBase: 1609.344, name: 'Mil' },
  miles: { type: 'length', toBase: 1609.344, name: 'Mil' },
  ft: { type: 'length', toBase: 0.3048, name: 'Fit' },
  feet: { type: 'length', toBase: 0.3048, name: 'Fit' },
  foot: { type: 'length', toBase: 0.3048, name: 'Fit' },
  in: { type: 'length', toBase: 0.0254, name: 'İnç' },
  inch: { type: 'length', toBase: 0.0254, name: 'İnç' },
  inches: { type: 'length', toBase: 0.0254, name: 'İnç' },
  yd: { type: 'length', toBase: 0.9144, name: 'Yarda' },
  yard: { type: 'length', toBase: 0.9144, name: 'Yarda' },
  yards: { type: 'length', toBase: 0.9144, name: 'Yarda' },

  // Weight (Base: gram)
  g: { type: 'weight', toBase: 1, name: 'Gram' },
  gram: { type: 'weight', toBase: 1, name: 'Gram' },
  grams: { type: 'weight', toBase: 1, name: 'Gram' },
  kg: { type: 'weight', toBase: 1000, name: 'Kilogram' },
  kilogram: { type: 'weight', toBase: 1000, name: 'Kilogram' },
  kilograms: { type: 'weight', toBase: 1000, name: 'Kilogram' },
  mg: { type: 'weight', toBase: 0.001, name: 'Miligram' },
  lb: { type: 'weight', toBase: 453.59237, name: 'Pound' },
  lbs: { type: 'weight', toBase: 453.59237, name: 'Pound' },
  pound: { type: 'weight', toBase: 453.59237, name: 'Pound' },
  pounds: { type: 'weight', toBase: 453.59237, name: 'Pound' },
  oz: { type: 'weight', toBase: 28.34952, name: 'Ons' },
  ounce: { type: 'weight', toBase: 28.34952, name: 'Ons' },
  ounces: { type: 'weight', toBase: 28.34952, name: 'Ons' },
  ton: { type: 'weight', toBase: 1000000, name: 'Ton' },
  tons: { type: 'weight', toBase: 1000000, name: 'Ton' },

  // Digital Data (Base: Byte)
  b: { type: 'data', toBase: 1, name: 'Byte' },
  byte: { type: 'data', toBase: 1, name: 'Byte' },
  bytes: { type: 'data', toBase: 1, name: 'Byte' },
  kb: { type: 'data', toBase: 1024, name: 'KB' },
  mb: { type: 'data', toBase: 1024 * 1024, name: 'MB' },
  gb: { type: 'data', toBase: 1024 * 1024 * 1024, name: 'GB' },
  tb: { type: 'data', toBase: 1024 * 1024 * 1024 * 1024, name: 'TB' },

  // Time (Base: second)
  s: { type: 'time', toBase: 1, name: 'Saniye' },
  sec: { type: 'time', toBase: 1, name: 'Saniye' },
  second: { type: 'time', toBase: 1, name: 'Saniye' },
  seconds: { type: 'time', toBase: 1, name: 'Saniye' },
  min: { type: 'time', toBase: 60, name: 'Dakika' },
  minute: { type: 'time', toBase: 60, name: 'Dakika' },
  minutes: { type: 'time', toBase: 60, name: 'Dakika' },
  h: { type: 'time', toBase: 3600, name: 'Saat' },
  hr: { type: 'time', toBase: 3600, name: 'Saat' },
  hour: { type: 'time', toBase: 3600, name: 'Saat' },
  hours: { type: 'time', toBase: 3600, name: 'Saat' },
  day: { type: 'time', toBase: 86400, name: 'Gün' },
  days: { type: 'time', toBase: 86400, name: 'Gün' },
  week: { type: 'time', toBase: 604800, name: 'Hafta' },
  weeks: { type: 'time', toBase: 604800, name: 'Hafta' }
}

function detectUnitOrCurrencyConversion(str: string): SmartPasteMath | null {
  const match = str.trim().match(/^([0-9.,]+)\s*([a-zA-Z$€₺£]+)\s+(?:to|in|->|=>)\s+([a-zA-Z$€₺£]+)$/i)
  if (!match) return null

  const rawVal = parseFloat(match[1].replace(/,/g, ''))
  if (isNaN(rawVal)) return null

  const fromUnit = match[2].toUpperCase()
  const toUnit = match[3].toUpperCase()

  // 1. Currency Conversion
  if (CURRENCIES[fromUnit] && CURRENCIES[toUnit]) {
    const fromInfo = CURRENCIES[fromUnit]
    const toInfo = CURRENCIES[toUnit]
    // convert fromUnit -> USD -> toUnit
    const inUSD = rawVal / fromInfo.rateFromUSD
    const targetVal = inUSD * toInfo.rateFromUSD

    const formatted = targetVal.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    })

    return {
      type: 'math',
      raw: str,
      expression: `${rawVal} ${fromUnit} → ${toUnit}`,
      result: `${formatted} ${toUnit}`,
      detail: `Kur dönüşümü: 1 ${fromUnit} ≈ ${(toInfo.rateFromUSD / fromInfo.rateFromUSD).toFixed(4)} ${toUnit}`,
      isUnitConversion: true
    }
  }

  // 2. Physical / Data Unit Conversion
  const uFrom = match[2].toLowerCase()
  const uTo = match[3].toLowerCase()

  // Temperature special case
  if ((uFrom === 'c' || uFrom === 'celsius') && (uTo === 'f' || uTo === 'fahrenheit')) {
    const res = (rawVal * 9) / 5 + 32
    return {
      type: 'math',
      raw: str,
      expression: `${rawVal}°C → °F`,
      result: `${res.toFixed(2)} °F`,
      detail: `(${rawVal} × 9/5) + 32 = ${res.toFixed(2)} °F`,
      isUnitConversion: true
    }
  }
  if ((uFrom === 'f' || uFrom === 'fahrenheit') && (uTo === 'c' || uTo === 'celsius')) {
    const res = ((rawVal - 32) * 5) / 9
    return {
      type: 'math',
      raw: str,
      expression: `${rawVal}°F → °C`,
      result: `${res.toFixed(2)} °C`,
      detail: `(${rawVal} - 32) × 5/9 = ${res.toFixed(2)} °C`,
      isUnitConversion: true
    }
  }

  if (UNITS[uFrom] && UNITS[uTo] && UNITS[uFrom].type === UNITS[uTo].type) {
    const fromDef = UNITS[uFrom]
    const toDef = UNITS[uTo]
    const inBase = rawVal * fromDef.toBase
    const converted = inBase / toDef.toBase

    const formatted = converted.toLocaleString('en-US', {
      maximumFractionDigits: 4
    })

    return {
      type: 'math',
      raw: str,
      expression: `${rawVal} ${uFrom.toUpperCase()} → ${uTo.toUpperCase()}`,
      result: `${formatted} ${uTo.toUpperCase()}`,
      detail: `${fromDef.name} → ${toDef.name} dönüşümü`,
      isUnitConversion: true
    }
  }

  return null
}

/**
 * Safe Mathematical Expression Evaluator
 * Supports:
 * - Basic math: +, -, *, /, ^, %
 * - Parentheses: (120 * 45)
 * - Percentage additions/subtractions: (120 * 45) + 18%, 500 - 20%, 15% of 250
 * - Functions: sqrt, sin, cos, tan, abs, log
 */
function evaluateMathExpression(str: string): SmartPasteMath | null {
  const trimmed = str.trim()
  if (trimmed.length < 2) return null

  // Check if expression looks like math
  // Must contain math operators or functions, not just pure letters or a single plain number
  const mathChars = /[+\-*/^%()]/
  const mathFuncs = /(sqrt|abs|sin|cos|tan|log|pow|of)/i
  if (!mathChars.test(trimmed) && !mathFuncs.test(trimmed)) {
    return null
  }

  // Reject paths, commands, URLs, json, etc.
  if (trimmed.startsWith('/') || trimmed.startsWith('\\') || trimmed.startsWith('http') || trimmed.includes(':')) {
    return null
  }

  // Case A: "X% of Y" -> e.g. "15% of 250"
  const pctOfMatch = trimmed.match(/^([0-9.,]+)%\s+of\s+([0-9.,]+)$/i)
  if (pctOfMatch) {
    const pct = parseFloat(pctOfMatch[1].replace(/,/g, ''))
    const base = parseFloat(pctOfMatch[2].replace(/,/g, ''))
    if (!isNaN(pct) && !isNaN(base)) {
      const res = (pct / 100) * base
      return {
        type: 'math',
        raw: str,
        expression: `${pct}% of ${base}`,
        result: res.toLocaleString('en-US', { maximumFractionDigits: 6 }),
        detail: `(${pct} / 100) × ${base} = ${res}`
      }
    }
  }

  // Case B: Handle percentage additions/subtractions like:
  // "(120 * 45) + 18%" or "500 + 20%" or "1000 - 15%"
  const trailingPctMatch = trimmed.match(/^(.*)\s*([+\-])\s*([0-9.,]+)%$/)
  if (trailingPctMatch) {
    const baseExpr = trailingPctMatch[1].trim()
    const op = trailingPctMatch[2]
    const pct = parseFloat(trailingPctMatch[3].replace(/,/g, ''))

    const baseVal = safeCalculate(baseExpr)
    if (baseVal !== null && !isNaN(baseVal) && !isNaN(pct)) {
      const delta = (baseVal * pct) / 100
      const finalRes = op === '+' ? baseVal + delta : baseVal - delta

      const formattedRes = finalRes.toLocaleString('en-US', { maximumFractionDigits: 6 })
      const formattedBase = baseVal.toLocaleString('en-US', { maximumFractionDigits: 4 })
      const formattedDelta = delta.toLocaleString('en-US', { maximumFractionDigits: 4 })

      return {
        type: 'math',
        raw: str,
        expression: trimmed,
        result: formattedRes,
        detail: `${formattedBase} ${op} ${pct}% (${formattedDelta}) = ${formattedRes}`
      }
    }
  }

  // Case C: Standard math expression
  const val = safeCalculate(trimmed)
  if (val !== null && !isNaN(val) && isFinite(val)) {
    // Avoid false positives on single numbers without operators
    const hasOperator = /[+\-*/^%]/.test(trimmed) || mathFuncs.test(trimmed)
    if (!hasOperator) return null

    const formatted = val.toLocaleString('en-US', { maximumFractionDigits: 6 })
    return {
      type: 'math',
      raw: str,
      expression: trimmed,
      result: formatted
    }
  }

  return null
}

/**
 * Tokenizer & Recursive Descent Parser for safe arithmetic (No eval / Function)
 */
function safeCalculate(expr: string): number | null {
  try {
    // Replace functions with tokens
    let sanitized = expr
      .replace(/sqrt\s*\(/gi, 'Q(')
      .replace(/abs\s*\(/gi, 'A(')
      .replace(/log\s*\(/gi, 'L(')
      .replace(/\^/g, '**')
      .replace(/,/g, '')

    // Check for illegal characters (only numbers, operators, parens, decimal, and tokenized funcs allowed)
    if (!/^[0-9+\-*/().%\sQA L*]+$/.test(sanitized)) {
      return null
    }

    // Tokenize
    const tokens: string[] = []
    let i = 0
    while (i < sanitized.length) {
      const char = sanitized[i]
      if (/\s/.test(char)) {
        i++
        continue
      }
      if (/[0-9.]/.test(char)) {
        let num = ''
        while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
          num += sanitized[i]
          i++
        }
        tokens.push(num)
        continue
      }
      if (char === '*' && sanitized[i + 1] === '*') {
        tokens.push('^')
        i += 2
        continue
      }
      tokens.push(char)
      i++
    }

    // Grammar Parser
    let pos = 0
    function peek(): string | null {
      return pos < tokens.length ? tokens[pos] : null
    }
    function consume(): string {
      return tokens[pos++]
    }

    function parseExpression(): number {
      let result = parseTerm()
      while (peek() === '+' || peek() === '-') {
        const op = consume()
        const next = parseTerm()
        result = op === '+' ? result + next : result - next
      }
      return result
    }

    function parseTerm(): number {
      let result = parsePower()
      while (peek() === '*' || peek() === '/' || peek() === '%') {
        const op = consume()
        const next = parsePower()
        if (op === '*') result *= next
        else if (op === '/') result = next === 0 ? NaN : result / next
        else if (op === '%') result = result % next
      }
      return result
    }

    function parsePower(): number {
      let result = parseFactor()
      if (peek() === '^') {
        consume()
        const next = parsePower()
        result = Math.pow(result, next)
      }
      return result
    }

    function parseFactor(): number {
      const token = peek()
      if (token === null) throw new Error('Unexpected end of expression')

      // Unary +/-
      if (token === '+') {
        consume()
        return parseFactor()
      }
      if (token === '-') {
        consume()
        return -parseFactor()
      }

      // Functions Q(x), A(x), L(x)
      if (token === 'Q' || token === 'A' || token === 'L') {
        const func = consume()
        if (consume() !== '(') throw new Error('Expected (')
        const arg = parseExpression()
        if (consume() !== ')') throw new Error('Expected )')
        if (func === 'Q') return Math.sqrt(arg)
        if (func === 'A') return Math.abs(arg)
        if (func === 'L') return Math.log10(arg)
      }

      if (token === '(') {
        consume()
        const result = parseExpression()
        if (consume() !== ')') throw new Error('Missing closing parenthesis')
        return result
      }

      const num = parseFloat(token)
      if (isNaN(num)) throw new Error(`Invalid number: ${token}`)
      consume()
      return num
    }

    const result = parseExpression()
    if (pos !== tokens.length) return null
    return result
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DETECTOR FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export function detectSmartPaste(input: string): SmartPasteResult | null {
  if (!input || !input.trim()) return null

  // 1. Check Color (very specific regex)
  const color = detectColor(input)
  if (color) return color

  // 2. Check Unit / Currency conversion (e.g. 100 USD to EUR, 10 GB to MB)
  const unitConv = detectUnitOrCurrencyConversion(input)
  if (unitConv) return unitConv

  // 3. Check Math (e.g. (120 * 45) + 18%)
  const math = evaluateMathExpression(input)
  if (math) return math

  // 4. Check JWT (3-part segment)
  const jwt = detectJwt(input)
  if (jwt) return jwt

  // 5. Check JSON (object / array)
  const json = detectJson(input)
  if (json) return json

  return null
}
