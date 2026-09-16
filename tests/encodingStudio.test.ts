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

import { describe, it, expect } from 'vitest'
import {
  textToBytes,
  bytesToText,
  bytesToBase64,
  base64ToBytes,
  bytesToHex,
  hexToBytes,
  textToUrlEncoded,
  urlEncodedToText,
  generateHexDump,
  exportBytesAsCArray,
  parseDataUrl,
  formatByteSize,
} from '../src/renderer/src/lib/encodingEngine'
import enJson from '../src/renderer/src/locales/en.json'
import trJson from '../src/renderer/src/locales/tr.json'

describe('Base64, Hex & Data-URL Studio — encodingEngine Comprehensive Test Suite', () => {
  describe('1. Bidirectional Conversions (Plain Text, Base64, Hex, URL)', () => {
    it('round-trips standard ASCII text across all 4 formats', () => {
      const plain = 'ZenDev High Performance Developer Suite 2026'

      const bytes = textToBytes(plain)
      expect(bytesToText(bytes)).toBe(plain)

      const b64 = bytesToBase64(bytes)
      expect(bytesToText(base64ToBytes(b64))).toBe(plain)

      const hex = bytesToHex(bytes)
      expect(bytesToText(hexToBytes(hex))).toBe(plain)

      const url = textToUrlEncoded(plain)
      expect(urlEncodedToText(url)).toBe(plain)
    })

    it('round-trips multi-byte UTF-8 Turkish characters with zero corruption', () => {
      const turkishText = 'Çankaya Üniversitesi — Şiir ve Özgürlük: ğ, ü, ş, ı, ö, ç, İ, Ğ, Ü, Ş, Ö, Ç'
      const bytes = textToBytes(turkishText)
      expect(bytesToText(bytes)).toBe(turkishText)

      const b64 = bytesToBase64(bytes)
      expect(bytesToText(base64ToBytes(b64))).toBe(turkishText)

      const hex = bytesToHex(bytes)
      expect(bytesToText(hexToBytes(hex))).toBe(turkishText)

      const url = textToUrlEncoded(turkishText)
      expect(urlEncodedToText(url)).toBe(turkishText)
    })

    it('round-trips multi-byte emojis and Unicode symbols', () => {
      const emojiText = 'NexusHub 🚀 🔒 🛡️ 💎 ⚡ 💻'
      const bytes = textToBytes(emojiText)
      expect(bytesToText(bytes)).toBe(emojiText)

      const b64 = bytesToBase64(bytes)
      expect(bytesToText(base64ToBytes(b64))).toBe(emojiText)

      const hex = bytesToHex(bytes)
      expect(bytesToText(hexToBytes(hex))).toBe(emojiText)
    })

    it('handles empty strings cleanly across all converters', () => {
      const empty = ''
      const bytes = textToBytes(empty)
      expect(bytes.length).toBe(0)
      expect(bytesToText(bytes)).toBe('')
      expect(bytesToBase64(bytes)).toBe('')
      expect(bytesToHex(bytes)).toBe('')
      expect(textToUrlEncoded(empty)).toBe('')
      expect(urlEncodedToText('')).toBe('')
    })
  })

  describe('2. Hex Formatting & Parsing (bytesToHex, hexToBytes)', () => {
    it('formats bytes with different custom separators', () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef])

      expect(bytesToHex(bytes, ' ')).toBe('de ad be ef')
      expect(bytesToHex(bytes, ':')).toBe('de:ad:be:ef')
      expect(bytesToHex(bytes, '')).toBe('deadbeef')
    })

    it('parses uppercase, lowercase, and mixed-case hex strings with or without spaces', () => {
      const expected = new Uint8Array([0xca, 0xfe, 0xba, 0xbe])

      expect(hexToBytes('cafe babe')).toEqual(expected)
      expect(hexToBytes('CAFE BABE')).toEqual(expected)
      expect(hexToBytes('CaFeBaBe')).toEqual(expected)
      expect(hexToBytes('ca:fe:ba:be')).toEqual(expected)
    })

    it('throws an error for hex strings with an odd number of digits', () => {
      expect(() => hexToBytes('abc')).toThrow('even number of digits')
      expect(() => hexToBytes('12345')).toThrow('even number of digits')
    })
  })

  describe('3. Canonical 16-Byte Hex Dump Analyzer (generateHexDump)', () => {
    it('generates canonical 16-byte rows with 8-character hex offsets', () => {
      const text = '0123456789ABCDEF' // Exactly 16 bytes
      const bytes = textToBytes(text)
      const rows = generateHexDump(bytes)

      expect(rows.length).toBe(1)
      expect(rows[0].offset).toBe(0)
      expect(rows[0].hexOffset).toBe('00000000')
      expect(rows[0].bytes.length).toBe(16)
      expect(rows[0].hexCodes.length).toBe(16)
      expect(rows[0].asciiChars.length).toBe(16)
      expect(rows[0].asciiChars.join('')).toBe(text)
    })

    it('generates multi-row dumps with sequential 16-byte hex offsets (00000000, 00000010, 00000020)', () => {
      const bytes = new Uint8Array(48) // 3 full rows
      for (let i = 0; i < 48; i++) bytes[i] = 65 + (i % 26) // A-Z

      const rows = generateHexDump(bytes)
      expect(rows.length).toBe(3)
      expect(rows[0].hexOffset).toBe('00000000')
      expect(rows[1].hexOffset).toBe('00000010')
      expect(rows[2].hexOffset).toBe('00000020')
    })

    it('replaces non-printable control characters (< 32 or > 126) with dots in ASCII column', () => {
      const bytes = new Uint8Array([0, 1, 2, 31, 32, 65, 90, 126, 127, 255])
      const rows = generateHexDump(bytes)
      const ascii = rows[0].asciiChars

      expect(ascii[0]).toBe('.') // 0 (NUL)
      expect(ascii[1]).toBe('.') // 1
      expect(ascii[2]).toBe('.') // 2
      expect(ascii[3]).toBe('.') // 31
      expect(ascii[4]).toBe(' ') // 32 (Space)
      expect(ascii[5]).toBe('A') // 65
      expect(ascii[6]).toBe('Z') // 90
      expect(ascii[7]).toBe('~') // 126
      expect(ascii[8]).toBe('.') // 127 (DEL)
      expect(ascii[9]).toBe('.') // 255
    })

    it('pads partial rows with spaces when byte count is not a multiple of 16', () => {
      const bytes = new Uint8Array([0x41, 0x42, 0x43]) // 3 bytes
      const rows = generateHexDump(bytes)

      expect(rows.length).toBe(1)
      expect(rows[0].bytes.length).toBe(3)
      expect(rows[0].hexCodes.slice(0, 3)).toEqual(['41', '42', '43'])
      expect(rows[0].hexCodes[3]).toBe('  ') // Empty hex padding
      expect(rows[0].asciiChars[3]).toBe(' ') // Empty ascii padding
    })
  })

  describe('4. C-Array Binary Buffer Exporter (exportBytesAsCArray)', () => {
    it('exports bytes as a valid C array declaration with length', () => {
      const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc])
      const cCode = exportBytesAsCArray(bytes, 'firmware_patch')

      expect(cCode).toContain('const unsigned char firmware_patch[] = {')
      expect(cCode).toContain('0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc')
      expect(cCode).toContain('const unsigned int firmware_patch_len = 6;')
    })
  })

  describe('5. Data-URL Parser & Media Categorizer (parseDataUrl)', () => {
    it('parses valid PNG image Data-URL', () => {
      const samplePngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const parsed = parseDataUrl(samplePngDataUrl)

      expect(parsed.isValid).toBe(true)
      expect(parsed.mimeType).toBe('image/png')
      expect(parsed.mediaCategory).toBe('image')
      expect(parsed.isBase64).toBe(true)
      expect(parsed.byteSize).toBeGreaterThan(10)
      expect(parsed.error).toBeUndefined()
    })

    it('categorizes various media types correctly (audio, video, pdf, text)', () => {
      expect(parseDataUrl('data:audio/mp3;base64,SUQzBA...').mediaCategory).toBe('audio')
      expect(parseDataUrl('data:video/mp4;base64,AAAAFG...').mediaCategory).toBe('video')
      expect(parseDataUrl('data:application/pdf;base64,JVBERi...').mediaCategory).toBe('pdf')
      expect(parseDataUrl('data:text/plain;charset=utf-8;base64,SGVsbG8=').mediaCategory).toBe('text')
      expect(parseDataUrl('data:application/json;base64,eyJmb28iOiJiYXIifQ==').mediaCategory).toBe('text')
    })

    it('rejects invalid inputs that do not match Data-URL specifications', () => {
      const notDataUrl = 'https://example.com/image.png'
      const resNoPrefix = parseDataUrl(notDataUrl)
      expect(resNoPrefix.isValid).toBe(false)
      expect(resNoPrefix.error).toContain('does not start with data:')

      const noComma = 'data:image/png;base64'
      const resNoComma = parseDataUrl(noComma)
      expect(resNoComma.isValid).toBe(false)
      expect(resNoComma.error).toContain('missing comma separator')
    })
  })

  describe('6. Byte Size Formatting Helper (formatByteSize)', () => {
    it('formats bytes, kilobytes, and megabytes accurately', () => {
      expect(formatByteSize(512)).toBe('512 B')
      expect(formatByteSize(2048)).toBe('2.0 KB')
      expect(formatByteSize(1572864)).toBe('1.50 MB')
    })
  })

  describe('7. Bilingual i18n Translation Key Verification', () => {
    it('verifies encodingStudio namespace has 100% key parity and non-empty strings in en.json and tr.json', () => {
      const enKeys = Object.keys((enJson as any).encodingStudio || {})
      const trKeys = Object.keys((trJson as any).encodingStudio || {})

      expect(enKeys.length).toBeGreaterThanOrEqual(15)
      expect(enKeys.sort()).toEqual(trKeys.sort())

      expect((enJson as any).encodingStudio.title).toBe('Base64, Hex & Data-URL Studio')
      expect((trJson as any).encodingStudio.title).toBe('Base64, Hex & Data-URL Stüdyosu')
      expect((enJson as any).encodingStudio.inputText).toBeTruthy()
      expect((trJson as any).encodingStudio.outputBase64).toBeTruthy()
      expect((enJson as any).encodingStudio.outputHex).toBeTruthy()
      expect((trJson as any).encodingStudio.offset).toBeTruthy()
    })
  })
})
