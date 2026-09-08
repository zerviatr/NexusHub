/**
 * Image Toolkit IPC Handler
 *
 * Uses `sharp` for image processing.
 * IPC channels:
 *   image:selectFiles  → string[] (file paths)
 *   image:getMetadata  → (filePath: string) → ImageMeta
 *   image:process      → (jobs: ImageJob[]) → ImageProcessResult[]
 */

import { ipcMain, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export interface ImageMeta {
  filePath: string
  name: string
  width?: number
  height?: number
  format?: string
  size: number
  error?: string
}

export interface ImageJob {
  inputPath: string
  outputDir: string
  format: 'jpeg' | 'png' | 'webp' | 'avif'
  width?: number
  height?: number
  quality: number
  stripExif: boolean
  suffix: string
}

export interface ImageProcessResult {
  inputPath: string
  outputPath: string
  success: boolean
  outputSize?: number
  error?: string
}

export function registerImageToolkitIPC(): void {
  // Select image files via dialog
  ipcMain.handle('image:selectFiles', async (): Promise<string[]> => {
    const result = await dialog.showOpenDialog({
      title: 'Select Images',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'tiff', 'bmp'],
        },
      ],
    })
    return result.canceled ? [] : result.filePaths
  })

  // Get metadata for a single image
  ipcMain.handle('image:getMetadata', async (_, filePath: string): Promise<ImageMeta> => {
    try {
      let sharp: any
      try {
        sharp = require('sharp')
      } catch {
        return {
          filePath,
          name: path.basename(filePath),
          size: 0,
          error: 'sharp not installed — run: npm install sharp',
        }
      }

      const stats = fs.statSync(filePath)
      const meta = await sharp(filePath).metadata()

      return {
        filePath,
        name: path.basename(filePath),
        width: meta.width,
        height: meta.height,
        format: meta.format,
        size: stats.size,
      }
    } catch (err: any) {
      return {
        filePath,
        name: path.basename(filePath),
        size: 0,
        error: err.message,
      }
    }
  })

  // Process image jobs
  ipcMain.handle(
    'image:process',
    async (_, jobs: ImageJob[]): Promise<ImageProcessResult[]> => {
      let sharp: any
      try {
        sharp = require('sharp')
      } catch {
        return jobs.map((j) => ({
          inputPath: j.inputPath,
          outputPath: '',
          success: false,
          error: 'sharp not installed — run: npm install sharp',
        }))
      }

      const results: ImageProcessResult[] = []

      for (const job of jobs) {
        try {
          // Build output path
          const inputExt = path.extname(job.inputPath)
          const inputBase = path.basename(job.inputPath, inputExt)
          const outputName = `${inputBase}${job.suffix}.${job.format === 'jpeg' ? 'jpg' : job.format}`
          const outputPath = path.join(job.outputDir, outputName)

          // Ensure output dir exists
          fs.mkdirSync(job.outputDir, { recursive: true })

          // Build sharp pipeline
          let pipeline = sharp(job.inputPath)

          // Resize if dimensions specified
          if (job.width || job.height) {
            pipeline = pipeline.resize({
              width: job.width || undefined,
              height: job.height || undefined,
              fit: 'inside',
              withoutEnlargement: true,
            })
          }

          // Strip EXIF if requested
          if (job.stripExif) {
            pipeline = pipeline.rotate() // Auto-rotate from EXIF then strip
          }

          // Format-specific output
          const qualityOpt = { quality: job.quality }
          if (job.format === 'jpeg') pipeline = pipeline.jpeg(qualityOpt)
          else if (job.format === 'png')
            pipeline = pipeline.png({ compressionLevel: Math.round((100 - job.quality) / 11) })
          else if (job.format === 'webp') pipeline = pipeline.webp(qualityOpt)
          else if (job.format === 'avif') pipeline = pipeline.avif(qualityOpt)

          await pipeline.toFile(outputPath)

          const outputStats = fs.statSync(outputPath)
          results.push({
            inputPath: job.inputPath,
            outputPath,
            success: true,
            outputSize: outputStats.size,
          })
        } catch (err: any) {
          results.push({
            inputPath: job.inputPath,
            outputPath: '',
            success: false,
            error: err.message,
          })
        }
      }

      return results
    }
  )
}
