/**
 * encodingEngine.ts
 * High-performance, UTF-8 safe multi-modal converter (Text, Base64, Hex, URL),
 * Data-URL media parser, and canonical 16-byte hex dump analyzer.
 */

export interface HexDumpRow {
  offset: number
  hexOffset: string
  bytes: number[]
  hexCodes: string[]
  asciiChars: string[]
}

export interface DataUrlParts {
  isValid: boolean
  mimeType: string
  isBase64: boolean
  charset?: string
  data: string
  mediaCategory: 'image' | 'audio' | 'video' | 'pdf' | 'text' | 'unknown'
  byteSize: number
  error?: string
}

// ─── UTF-8 & Raw Byte Conversions ─────────────────────────────────────────────

export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToBytes(base64Str: string): Uint8Array {
  const clean = base64Str.trim().replace(/\s+/g, '')
  let normalized = clean.replace(/-/g, '+').replace(/_/g, '/')
  while (normalized.length % 4) {
    normalized += '='
  }
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array, separator = ' '): string {
  const hexArr: string[] = []
  for (let i = 0; i < bytes.length; i++) {
    hexArr.push(bytes[i].toString(16).padStart(2, '0'))
  }
  return hexArr.join(separator)
}

export function hexToBytes(hexStr: string): Uint8Array {
  const clean = hexStr.replace(/[^0-9a-fA-F]/g, '')
  if (clean.length % 2 !== 0) {
    throw new Error('Hex string must have an even number of digits')
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
  }
  return bytes
}

export function textToUrlEncoded(text: string): string {
  return encodeURIComponent(text)
}

export function urlEncodedToText(encoded: string): string {
  return decodeURIComponent(encoded)
}

// ─── Canonical Hex Dump Engine ────────────────────────────────────────────────

/**
 * Generates canonical 16-byte rows for memory/binary hex inspection.
 */
export function generateHexDump(bytes: Uint8Array, maxBytes = 32768): HexDumpRow[] {
  const slice = bytes.subarray(0, maxBytes)
  const rows: HexDumpRow[] = []

  for (let i = 0; i < slice.length; i += 16) {
    const chunk = slice.subarray(i, Math.min(i + 16, slice.length))
    const byteList: number[] = []
    const hexCodes: string[] = []
    const asciiChars: string[] = []

    for (let j = 0; j < 16; j++) {
      if (j < chunk.length) {
        const b = chunk[j]
        byteList.push(b)
        hexCodes.push(b.toString(16).padStart(2, '0'))
        // Printable ASCII is 32..126
        if (b >= 32 && b <= 126) {
          asciiChars.push(String.fromCharCode(b))
        } else {
          asciiChars.push('.')
        }
      } else {
        hexCodes.push('  ')
        asciiChars.push(' ')
      }
    }

    rows.push({
      offset: i,
      hexOffset: i.toString(16).padStart(8, '0'),
      bytes: byteList,
      hexCodes,
      asciiChars,
    })
  }

  return rows
}

/**
 * Export raw bytes as a C array string.
 */
export function exportBytesAsCArray(bytes: Uint8Array, arrayName = 'data'): string {
  const lines: string[] = []
  lines.push(`const unsigned char ${arrayName}[] = {`)

  for (let i = 0; i < bytes.length; i += 12) {
    const chunk = bytes.subarray(i, Math.min(i + 12, bytes.length))
    const hexValues = Array.from(chunk).map((b) => `0x${b.toString(16).padStart(2, '0')}`)
    lines.push(`    ${hexValues.join(', ')}${i + 12 < bytes.length ? ',' : ''}`)
  }

  lines.push(`};`)
  lines.push(`const unsigned int ${arrayName}_len = ${bytes.length};`)
  return lines.join('\n')
}

// ─── Data-URL Visualizer Engine ───────────────────────────────────────────────

export function parseDataUrl(input: string): DataUrlParts {
  const clean = input.trim()
  if (!clean.startsWith('data:')) {
    return {
      isValid: false,
      mimeType: '',
      isBase64: false,
      data: '',
      mediaCategory: 'unknown',
      byteSize: 0,
      error: 'Input does not start with data:',
    }
  }

  const commaIndex = clean.indexOf(',')
  if (commaIndex === -1) {
    return {
      isValid: false,
      mimeType: '',
      isBase64: false,
      data: '',
      mediaCategory: 'unknown',
      byteSize: 0,
      error: 'Invalid Data-URL: missing comma separator',
    }
  }

  const meta = clean.substring(5, commaIndex) // after "data:"
  const rawData = clean.substring(commaIndex + 1)
  const metaParts = meta.split(';')

  const mimeType = metaParts[0] || 'text/plain'
  const isBase64 = metaParts.includes('base64')
  const charsetPart = metaParts.find((p) => p.startsWith('charset='))
  const charset = charsetPart ? charsetPart.split('=')[1] : undefined

  let mediaCategory: 'image' | 'audio' | 'video' | 'pdf' | 'text' | 'unknown' = 'unknown'
  if (mimeType.startsWith('image/')) mediaCategory = 'image'
  else if (mimeType.startsWith('audio/')) mediaCategory = 'audio'
  else if (mimeType.startsWith('video/')) mediaCategory = 'video'
  else if (mimeType === 'application/pdf') mediaCategory = 'pdf'
  else if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) {
    mediaCategory = 'text'
  }

  let byteSize = 0
  try {
    if (isBase64) {
      byteSize = base64ToBytes(rawData).byteLength
    } else {
      byteSize = new TextEncoder().encode(decodeURIComponent(rawData)).byteLength
    }
  } catch {
    byteSize = rawData.length
  }

  return {
    isValid: true,
    mimeType,
    isBase64,
    charset,
    data: rawData,
    mediaCategory,
    byteSize,
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file as Data-URL'))
    reader.readAsDataURL(file)
  })
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file as ArrayBuffer'))
    reader.readAsArrayBuffer(file)
  })
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
