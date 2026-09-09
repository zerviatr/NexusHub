import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs/promises'
import { CATEGORIES, getCategory, getUniquePath } from '../src/main/services/organizerCore'

describe('NexusHub File Organizer Categorization', () => {
  it('should categorize known image extensions', () => {
    expect(getCategory('.png')).toBe('Images')
    expect(getCategory('.JPG')).toBe('Images')
    expect(getCategory('.webp')).toBe('Images')
  })

  it('should categorize document extensions including PDF', () => {
    expect(getCategory('.pdf')).toBe('Documents')
    expect(getCategory('.DOCX')).toBe('Documents')
    expect(getCategory('.csv')).toBe('Documents')
  })

  it('should categorize code extensions', () => {
    expect(getCategory('.ts')).toBe('Code')
    expect(getCategory('.py')).toBe('Code')
    expect(getCategory('.rs')).toBe('Code')
  })

  it('should categorize unknown extensions as Others', () => {
    expect(getCategory('.unknownext')).toBe('Others')
    expect(getCategory('.xyz123')).toBe('Others')
  })

  it('should generate collision-free unique path when target already exists', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-organizer-test-'))
    try {
      const file1 = path.join(tempDir, 'document.txt')
      await fs.writeFile(file1, 'first file content', 'utf8')

      // Path for candidate file with same name
      const uniquePath1 = await getUniquePath(file1)
      expect(uniquePath1).toBe(path.join(tempDir, 'document (1).txt'))

      // Now create document (1).txt too
      await fs.writeFile(uniquePath1, 'second file content', 'utf8')
      const uniquePath2 = await getUniquePath(file1)
      expect(uniquePath2).toBe(path.join(tempDir, 'document (2).txt'))
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  })
})
