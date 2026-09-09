import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { parsePageRange, inspectPdfBuffer } from '../src/main/services/pdfService'

describe('PDF Service & Page Range Parsing (pdfService)', () => {
  describe('parsePageRange', () => {
    it('should parse single page numbers to 0-based indices', () => {
      expect(parsePageRange('1', 5)).toEqual([0])
      expect(parsePageRange('5', 5)).toEqual([4])
    })

    it('should parse continuous page ranges', () => {
      expect(parsePageRange('1-3', 5)).toEqual([0, 1, 2])
    })

    it('should handle inverted ranges gracefully (e.g. 4-2 -> 2,3,4)', () => {
      expect(parsePageRange('4-2', 5)).toEqual([1, 2, 3])
    })

    it('should parse mixed comma-separated pages and ranges', () => {
      expect(parsePageRange('1-2, 5, 8-9', 10)).toEqual([0, 1, 4, 7, 8])
    })

    it('should deduplicate and sort overlapping ranges', () => {
      expect(parsePageRange('1-3, 2, 3, 1-4', 5)).toEqual([0, 1, 2, 3])
    })

    it('should ignore out-of-bounds and zero/negative page numbers', () => {
      expect(parsePageRange('0, 1, 6, 99', 5)).toEqual([0])
      expect(parsePageRange('-5-2', 5)).toEqual([0, 1])
    })

    it('should return empty array for empty, whitespace, or invalid strings', () => {
      expect(parsePageRange('', 5)).toEqual([])
      expect(parsePageRange('   ', 5)).toEqual([])
      expect(parsePageRange('abc, xyz', 5)).toEqual([])
      expect(parsePageRange('1-3', 0)).toEqual([])
    })
  })

  describe('inspectPdfBuffer', () => {
    it('should accurately inspect page count and metadata from PDF bytes', async () => {
      // Generate a small 2-page test PDF in memory
      const pdfDoc = await PDFDocument.create()
      pdfDoc.setTitle('ZenDev Test Document')
      pdfDoc.setAuthor('Antigravity')
      pdfDoc.addPage([200, 200])
      pdfDoc.addPage([200, 200])
      const pdfBytes = await pdfDoc.save()

      const info = await inspectPdfBuffer(pdfBytes)
      expect(info.pageCount).toBe(2)
      expect(info.title).toBe('ZenDev Test Document')
      expect(info.author).toBe('Antigravity')
    })
  })
})
