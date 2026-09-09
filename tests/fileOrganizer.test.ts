import { describe, it, expect } from 'vitest'

const CATEGORIES: Record<string, string[]> = {
  Images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'],
  Videos: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.flv', '.m4v'],
  Audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
  Documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv', '.odt', '.ods'],
  Archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
  Installers: ['.exe', '.msi', '.dmg', '.pkg', '.apk', '.iso', '.appimage'],
  Code: ['.js', '.ts', '.py', '.html', '.css', '.json', '.xml', '.md', '.yml', '.yaml', '.sql', '.sh', '.bat', '.ps1', '.env', '.log', '.cpp', '.c', '.java', '.go', '.rs'],
}

function getCategory(ext: string): string {
  const lowerExt = ext.toLowerCase()
  for (const [category, extensions] of Object.entries(CATEGORIES)) {
    if (extensions.includes(lowerExt)) {
      return category
    }
  }
  return 'Others'
}

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
})
