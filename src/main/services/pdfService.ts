/**
 * src/main/services/pdfService.ts
 *
 * Core pure PDF manipulation and range parsing utilities.
 * Decoupled from Electron dialogs and IPC handlers.
 */

import { PDFDocument } from 'pdf-lib'

/**
 * Parses user page range input (e.g. "1-3, 5, 8-10") into a sorted array
 * of 0-based page indices within [0, totalPages - 1].
 * Handles out-of-order ranges, whitespace, duplicate pages, and invalid values gracefully.
 */
export function parsePageRange(pageRange: string, totalPages: number): number[] {
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
            selectedIndices.add(i - 1) // convert 1-based to 0-based
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
 * Reads metadata and page count from raw PDF bytes without filesystem coupling.
 */
export async function inspectPdfBuffer(
  fileBytes: Buffer | Uint8Array
): Promise<{ pageCount: number; title?: string; author?: string }> {
  const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true })
  return {
    pageCount: pdfDoc.getPageCount(),
    title: pdfDoc.getTitle() || undefined,
    author: pdfDoc.getAuthor() || undefined,
  }
}
