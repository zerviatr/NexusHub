import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { PDFDocument } from 'pdf-lib'
import { parsePageRange } from '../services/pdfService'

export interface PDFFileInfo {
  path: string
  name: string
  size: number
  pageCount?: number
  title?: string
  author?: string
}

export function registerPdfToolkitIPC(): void {
  // 1. Select PDF files
  ipcMain.handle('pdf:selectFiles', async (_, allowMultiple = true) => {
    const res = await dialog.showOpenDialog({
      properties: allowMultiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
      title: 'PDF Dosyalarını Seçin',
    })

    if (res.canceled || !res.filePaths.length) return []

    const files: PDFFileInfo[] = []
    for (const filePath of res.filePaths) {
      try {
        const stats = fs.statSync(filePath)
        const bytes = fs.readFileSync(filePath)
        const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
        files.push({
          path: filePath,
          name: path.basename(filePath),
          size: stats.size,
          pageCount: pdfDoc.getPageCount(),
          title: pdfDoc.getTitle() || undefined,
          author: pdfDoc.getAuthor() || undefined,
        })
      } catch (err: any) {
        const stats = fs.statSync(filePath)
        files.push({
          path: filePath,
          name: path.basename(filePath),
          size: stats.size,
          pageCount: 0,
        })
      }
    }
    return files
  })

  // 1b. Inspect PDF files by path (for drag-and-drop support)
  ipcMain.handle('pdf:inspectFiles', async (_, filePaths: string[]) => {
    if (!Array.isArray(filePaths) || !filePaths.length) return []
    const files: PDFFileInfo[] = []
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) continue
      try {
        const stats = fs.statSync(filePath)
        const bytes = fs.readFileSync(filePath)
        const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
        files.push({
          path: filePath,
          name: path.basename(filePath),
          size: stats.size,
          pageCount: pdfDoc.getPageCount(),
          title: pdfDoc.getTitle() || undefined,
          author: pdfDoc.getAuthor() || undefined,
        })
      } catch {
        try {
          const stats = fs.statSync(filePath)
          files.push({
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            pageCount: 0,
          })
        } catch {}
      }
    }
    return files
  })

  // 2. Merge PDF files
  ipcMain.handle(
    'pdf:merge',
    async (_, { filePaths, outputFileName }: { filePaths: string[]; outputFileName?: string }) => {
      try {
        if (!filePaths || filePaths.length < 2) {
          throw new Error('Birleştirmek için en az 2 PDF dosyası seçilmelidir.')
        }

        const mergedPdf = await PDFDocument.create()

        for (const filePath of filePaths) {
          if (!fs.existsSync(filePath)) continue
          const fileBytes = fs.readFileSync(filePath)
          const srcPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true })
          const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices())
          copiedPages.forEach((page) => mergedPdf.addPage(page))
        }

        const mergedBytes = await mergedPdf.save()

        const saveRes = await dialog.showSaveDialog({
          defaultPath: outputFileName || 'NexusHub_Birlestirilmis.pdf',
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
          title: 'Birleştirilen PDF Dosyasını Kaydet',
        })

        if (saveRes.canceled || !saveRes.filePath) {
          return { success: false, canceled: true }
        }

        fs.writeFileSync(saveRes.filePath, mergedBytes)
        return {
          success: true,
          outputPath: saveRes.filePath,
          totalCount: mergedPdf.getPageCount(),
          size: mergedBytes.length,
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'PDF birleştirme başarısız oldu' }
      }
    }
  )

  // 3. Split PDF / Extract Page Range (e.g. "1-3, 5")
  ipcMain.handle(
    'pdf:split',
    async (_, { filePath, pageRange }: { filePath: string; pageRange: string }) => {
      try {
        if (!fs.existsSync(filePath)) throw new Error('Dosya bulunamadı.')
        const fileBytes = fs.readFileSync(filePath)
        const srcPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true })
        const totalPages = srcPdf.getPageCount()

        const sortedIndices = parsePageRange(pageRange, totalPages)

        if (sortedIndices.length === 0) {
          throw new Error(`Geçerli bir sayfa aralığı girin (Toplam sayfa: ${totalPages}).`)
        }

        const newPdf = await PDFDocument.create()
        const copiedPages = await newPdf.copyPages(srcPdf, sortedIndices)
        copiedPages.forEach((page) => newPdf.addPage(page))

        const newPdfBytes = await newPdf.save()

        const baseName = path.basename(filePath, '.pdf')
        const saveRes = await dialog.showSaveDialog({
          defaultPath: `${baseName}_ayrilmis.pdf`,
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
          title: 'Ayrılan PDF Dosyasını Kaydet',
        })

        if (saveRes.canceled || !saveRes.filePath) {
          return { success: false, canceled: true }
        }

        fs.writeFileSync(saveRes.filePath, newPdfBytes)
        return {
          success: true,
          outputPath: saveRes.filePath,
          pageCount: newPdf.getPageCount(),
          size: newPdfBytes.length,
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'PDF bölme başarısız oldu' }
      }
    }
  )
}
