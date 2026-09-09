import { describe, it, expect } from 'vitest'

function maskCustomer(name?: string, email?: string): string {
  if (name && name.trim().length > 1) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      const first = parts[0]
      const last = parts[parts.length - 1]
      return `${first[0]}***${first.slice(-1)} ${last[0]}.`
    }
    const single = parts[0]
    return `${single[0]}***${single.slice(-1)}`
  }
  if (email && email.includes('@')) {
    const [user] = email.split('@')
    if (user.length <= 2) return `${user[0]}***`
    return `${user[0]}***${user.slice(-1)}`
  }
  return 'Geliştirici'
}

function formatRelativeTime(ts: number, now = Date.now()): string {
  const diffSec = Math.max(1, Math.floor((now - ts) / 1000))
  if (diffSec < 60) return 'az önce'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} dakika önce`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} saat önce`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} gün önce`
}

describe('Zero-Fake Privacy Social Proof Pipeline', () => {
  it('should cleanly mask multi-word customer names', () => {
    expect(maskCustomer('Ahmet Yılmaz')).toBe('A***t Y.')
    expect(maskCustomer('Caner Selim')).toBe('C***r S.')
  })

  it('should cleanly mask single customer names', () => {
    expect(maskCustomer('Zeynep')).toBe('Z***p')
  })

  it('should cleanly mask email when name is missing', () => {
    expect(maskCustomer(undefined, 'developer@gmail.com')).toBe('d***r')
    expect(maskCustomer('', 'al@domain.com')).toBe('a***')
  })

  it('should fallback to safe default when no name or email', () => {
    expect(maskCustomer()).toBe('Geliştirici')
  })

  it('should format relative timestamps correctly', () => {
    const now = 1700000000000
    expect(formatRelativeTime(now - 30 * 1000, now)).toBe('az önce')
    expect(formatRelativeTime(now - 5 * 60 * 1000, now)).toBe('5 dakika önce')
    expect(formatRelativeTime(now - 3 * 3600 * 1000, now)).toBe('3 saat önce')
    expect(formatRelativeTime(now - 2 * 86400 * 1000, now)).toBe('2 gün önce')
  })
})
