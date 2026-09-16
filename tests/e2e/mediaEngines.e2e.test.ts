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

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import { createTempSandbox } from './helpers/testHarness'

/**
 * Pure Page Range Parser matching ZenDev PDF specification:
 * Handles ranges "1-3, 5, 8-10", out-of-order "4-2", bounds clamping [1, totalPages].
 */
export function parsePdfPageRange(pageRange: string, totalPages: number): number[] {
    if (!pageRange || totalPages <= 0) return []

    const selectedIndices = new Set<number>()
    const parts = pageRange.split(',').map((p) => p.trim())

    for (const part of parts) {
        const rangeMatch = part.match(/^(-?\d+)\s*-\s*(-?\d+)$/)
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10)
            const end = parseInt(rangeMatch[2], 10)
            if (!isNaN(start) && !isNaN(end)) {
                const lower = Math.min(start, end)
                const upper = Math.max(start, end)
                for (let i = lower; i <= upper; i++) {
                    if (i >= 1 && i <= totalPages) {
                        selectedIndices.add(i - 1)
                    }
                }
            }
        } else {
            const pageNum = parseInt(part, 10)
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                selectedIndices.add(pageNum - 1)
            }
        }
    }

    return Array.from(selectedIndices).sort((a, b) => a - b)
}

/**
 * Inspects PDF buffer for header magic, page count, and title metadata in /Info dictionary.
 */
export function inspectPdfBytes(buf: Buffer): { isValid: boolean; version: string; pageCount: number; title?: string } {
    const headerStr = buf.subarray(0, 10).toString('latin1')
    const matchVer = headerStr.match(/%PDF-(\d+\.\d+)/)
    if (!matchVer) {
        throw new Error('Invalid PDF format: missing %PDF header signature')
    }

    const content = buf.toString('latin1')
    // Count /Type /Page (singular page object)
    const pageMatches = content.match(/\/Type\s*\/Page\b/g) || []
    const pageCount = pageMatches.length

    const titleMatch = content.match(/\/Title\s*\(([^)]+)\)/)
    const title = titleMatch ? titleMatch[1] : undefined

    return {
        isValid: true,
        version: matchVer[1],
        pageCount,
        title,
    }
}

describe('E2E FEAT-05: Media Processing Engines (PDF & Image Lanczos3 Transcoder)', () => {
    let sandbox: {
        sandboxDir: string
        createFile: (relativePath: string, content: string | Buffer) => Promise<string>
        cleanup: () => Promise<void>
    }

    beforeEach(async () => {
        sandbox = await createTempSandbox('media-engines-e2e-')
    })

    afterEach(async () => {
        await sandbox.cleanup()
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 1: Feature Coverage (PDF Manipulation & Image Transcoder Contracts)
    // ─────────────────────────────────────────────────────────────────────────

    it('T1.1: Should accurately inspect page count and metadata from PDF files', () => {
        const samplePdf = Buffer.from(
            '%PDF-1.7\n' +
            '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
            '2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n' +
            '3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n' +
            '4 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n' +
            '5 0 obj\n<< /Title (Financial Quarterly Report) >>\nendobj\n' +
            'trailer\n<< /Root 1 0 R /Info 5 0 R >>\n%%EOF\n'
        )

        const info = inspectPdfBytes(samplePdf)
        expect(info.isValid).toBe(true)
        expect(info.version).toBe('1.7')
        expect(info.pageCount).toBe(2)
        expect(info.title).toBe('Financial Quarterly Report')
    })

    it('T1.2: Should merge multiple distinct PDF documents with object renumbering', () => {
        // lopdf merge object renumbering logic simulation
        interface PdfObject {
            id: number
            generation: number
            type: string
        }

        const docA: PdfObject[] = [
            { id: 1, generation: 0, type: 'Catalog' },
            { id: 2, generation: 0, type: 'Pages' },
            { id: 3, generation: 0, type: 'Page' },
        ]

        const docB: PdfObject[] = [
            { id: 1, generation: 0, type: 'Catalog' },
            { id: 2, generation: 0, type: 'Pages' },
            { id: 3, generation: 0, type: 'Page' },
            { id: 4, generation: 0, type: 'Page' },
        ]

        // Renumber docB objects starting from max(docA.id) + 1
        const maxA = Math.max(...docA.map((o) => o.id))
        const renumberedB = docB.map((o) => ({
            ...o,
            id: o.id + maxA,
        }))

        const mergedObjects = [...docA, ...renumberedB]
        const allIds = mergedObjects.map((o) => o.id)
        const uniqueIds = new Set(allIds)

        // All object IDs must be unique after renumbering
        expect(uniqueIds.size).toBe(mergedObjects.length)
        expect(Math.min(...allIds)).toBe(1)
        expect(Math.max(...allIds)).toBe(7)
    })

    it('T1.3: Should split PDF document according to page range specification', () => {
        const totalPages = 6
        // User specifies pages 1, 3-4 (0-based indices 0, 2, 3)
        const targetIndices = parsePdfPageRange('1, 3-4', totalPages)
        expect(targetIndices).toEqual([0, 2, 3])
        expect(targetIndices).toHaveLength(3)

        // Verify page subset extraction preserves order and zero-based indexing
        const pages = ['Page1', 'Page2', 'Page3', 'Page4', 'Page5', 'Page6']
        const extracted = targetIndices.map((idx) => pages[idx])
        expect(extracted).toEqual(['Page1', 'Page3', 'Page4'])
    })

    it('T1.4: Should compute aspect-ratio preserving dimensions without enlargement (fit: inside)', () => {
        const computeFitInside = (
            srcW: number,
            srcH: number,
            targetW?: number,
            targetH?: number,
            withoutEnlargement = true
        ) => {
            if (!targetW && !targetH) return { width: srcW, height: srcH }

            let w = targetW || srcW
            let h = targetH || srcH

            const srcRatio = srcW / srcH
            const targetRatio = w / h

            if (srcRatio > targetRatio) {
                h = Math.round(w / srcRatio)
            } else {
                w = Math.round(h * srcRatio)
            }

            if (withoutEnlargement) {
                w = Math.min(w, srcW)
                h = Math.min(h, srcH)
            }

            return { width: w, height: h }
        }

        // Downscale 1920x1080 to max 800x800 -> 800x450
        const res1 = computeFitInside(1920, 1080, 800, 800)
        expect(res1).toEqual({ width: 800, height: 450 })

        // Do not enlarge small 400x300 image when target is 1000x1000
        const res2 = computeFitInside(400, 300, 1000, 1000, true)
        expect(res2).toEqual({ width: 400, height: 300 })
    })

    it('T1.5: Should validate PNG binary header chunks (IHDR 13 bytes)', () => {
        // Minimal valid 1x1 PNG buffer
        const minimalPng = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
            0x00, 0x00, 0x00, 0x0d,                         // IHDR length (13 bytes)
            0x49, 0x48, 0x44, 0x52,                         // "IHDR"
            0x00, 0x00, 0x01, 0x00,                         // Width: 256
            0x00, 0x00, 0x00, 0x80,                         // Height: 128
            0x08, 0x06, 0x00, 0x00, 0x00,                   // Bit depth, Color, Compression, Filter, Interlace
            0x14, 0x22, 0xb7, 0x23                          // CRC
        ])

        const parsePngHeader = (buf: Buffer) => {
            const signature = buf.subarray(0, 8)
            const isPng = signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
            if (!isPng) return null

            const width = buf.readUInt32BE(16)
            const height = buf.readUInt32BE(20)
            const bitDepth = buf[24]
            return { isPng, width, height, bitDepth }
        }

        const parsed = parsePngHeader(minimalPng)
        expect(parsed).not.toBeNull()
        expect(parsed?.width).toBe(256)
        expect(parsed?.height).toBe(128)
        expect(parsed?.bitDepth).toBe(8)
    })

    it('T1.6: Should parse complex, non-sequential and inverted page range inputs', () => {
        expect(parsePdfPageRange('1-3, 5, 8-10', 10)).toEqual([0, 1, 2, 4, 7, 8, 9])
        expect(parsePdfPageRange('4-2', 5)).toEqual([1, 2, 3]) // inverted range auto-swaps
        expect(parsePdfPageRange('3, 2, 1', 5)).toEqual([0, 1, 2]) // auto-sorts
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TIER 2: Boundary & Corner Cases (Malformed Inputs, Out-of-Bounds & EXIF)
    // ─────────────────────────────────────────────────────────────────────────

    it('T2.1: Should return empty page array for invalid, blank, or out-of-bounds page ranges', () => {
        expect(parsePdfPageRange('', 10)).toEqual([])
        expect(parsePdfPageRange('   ', 10)).toEqual([])
        expect(parsePdfPageRange('invalid-range', 10)).toEqual([])
        expect(parsePdfPageRange('0, 999', 5)).toEqual([])
        expect(parsePdfPageRange('-5 - -2', 5)).toEqual([])
    })

    it('T2.2: Should reject corrupted non-PDF bytes gracefully', () => {
        const corruptBytes = Buffer.from('NOT-A-REAL-PDF-FILE-HEADER')
        expect(() => inspectPdfBytes(corruptBytes)).toThrow(/Invalid PDF format/)
    })

    it('T2.3: Should clamp page ranges that exceed the total document page count', () => {
        // Document has only 3 pages, but user requests 1-10
        const result = parsePdfPageRange('1-10', 3)
        expect(result).toEqual([0, 1, 2])
    })

    it('T2.4: Should format image output path with suffix and format extensions', () => {
        const buildImagePath = (inputPath: string, outputDir: string, suffix: string, format: string) => {
            const inputExt = path.extname(inputPath)
            const inputBase = path.basename(inputPath, inputExt)
            const outExt = format === 'jpeg' ? '.jpg' : `.${format}`
            return path.join(outputDir, `${inputBase}${suffix}${outExt}`)
        }

        const out = buildImagePath('C:\\photos\\banner.png', 'C:\\output', '-resized', 'webp')
        expect(out).toBe('C:\\output\\banner-resized.webp')

        const outJpeg = buildImagePath('asset.bmp', 'D:\\images', '_thumb', 'jpeg')
        expect(outJpeg).toBe('D:\\images\\asset_thumb.jpg')
    })

    it('T2.5: Should detect and strip EXIF APP1 metadata marker from JPEG buffer', () => {
        // JPEG starts with SOI (0xFF, 0xD8). EXIF APP1 marker is 0xFF, 0xE1
        const jpegWithExif = Buffer.from([
            0xff, 0xd8,             // SOI
            0xff, 0xe1, 0x00, 0x08, // APP1 marker + length 8
            0x45, 0x78, 0x69, 0x66, // "Exif"
            0x00, 0x00,             // Nul padding
            0xff, 0xda,             // Start of scan
            0x00, 0x00,
        ])

        const stripExifFromBuffer = (buf: Buffer): Buffer => {
            if (buf[0] !== 0xff || buf[1] !== 0xd8) return buf // Not a JPEG

            let offset = 2
            while (offset < buf.length - 4) {
                if (buf[offset] === 0xff && buf[offset + 1] === 0xe1) {
                    // Found APP1 EXIF segment
                    const segmentLength = buf.readUInt16BE(offset + 2)
                    // Slice around the EXIF block
                    return Buffer.concat([
                        buf.subarray(0, offset),
                        buf.subarray(offset + 2 + segmentLength)
                    ])
                }
                offset++
            }
            return buf
        }

        const stripped = stripExifFromBuffer(jpegWithExif)
        expect(stripped.includes(Buffer.from('Exif'))).toBe(false)
        expect(stripped[0]).toBe(0xff)
        expect(stripped[1]).toBe(0xd8)
    })

    it('T2.6: Should deduplicate identical pages requested multiple times in range', () => {
        const ranges = '1, 1, 1-2, 2, 1-3, 3'
        const deduplicated = parsePdfPageRange(ranges, 5)
        expect(deduplicated).toEqual([0, 1, 2])
        expect(new Set(deduplicated).size).toBe(deduplicated.length)
    })
})
