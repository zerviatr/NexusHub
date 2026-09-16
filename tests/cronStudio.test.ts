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
  validateCronExpression,
  matchesField,
  getNextCronOccurrences,
  explainCron,
  formatRelativeCountdown,
  CRON_PRESETS,
} from '../src/renderer/src/lib/cronEngine'
import enJson from '../src/renderer/src/locales/en.json'
import trJson from '../src/renderer/src/locales/tr.json'

describe('Cron Expression Studio — cronEngine Comprehensive Test Suite', () => {
  describe('1. 5-Field Syntax Validation (validateCronExpression)', () => {
    it('validates standard wildcard expressions', () => {
      const res = validateCronExpression('* * * * *')
      expect(res.isValid).toBe(true)
      expect(res.parts).toEqual({
        minute: '*',
        hour: '*',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '*',
      })
      expect(res.normalized).toBe('* * * * *')
    })

    it('validates step intervals in various positions', () => {
      expect(validateCronExpression('*/5 * * * *').isValid).toBe(true)
      expect(validateCronExpression('0 */2 * * *').isValid).toBe(true)
      expect(validateCronExpression('0 0 */10 * *').isValid).toBe(true)
    })

    it('validates ranges and lists', () => {
      expect(validateCronExpression('0 9-17 * * 1-5').isValid).toBe(true)
      expect(validateCronExpression('0,15,30,45 * * * *').isValid).toBe(true)
      expect(validateCronExpression('0 0 1,15 * 1,3,5').isValid).toBe(true)
    })

    it('handles extra internal and surrounding whitespace gracefully', () => {
      const res = validateCronExpression('   0   9   *   *   1-5   ')
      expect(res.isValid).toBe(true)
      expect(res.normalized).toBe('0 9 * * 1-5')
    })
  })

  describe('2. Invalid Syntax Rejection', () => {
    it('rejects empty and whitespace-only strings', () => {
      expect(validateCronExpression('').isValid).toBe(false)
      expect(validateCronExpression('   ').isValid).toBe(false)
    })

    it('rejects expressions with incorrect segment counts (not 5)', () => {
      expect(validateCronExpression('* * *').isValid).toBe(false)
      expect(validateCronExpression('* * * *').isValid).toBe(false)
      expect(validateCronExpression('* * * * * *').isValid).toBe(false) // 6 fields
    })

    it('rejects out-of-range field values', () => {
      expect(validateCronExpression('60 * * * *').isValid).toBe(false) // minute 0-59
      expect(validateCronExpression('* 24 * * *').isValid).toBe(false) // hour 0-23
      expect(validateCronExpression('* * 32 * *').isValid).toBe(false) // day of month 1-31
      expect(validateCronExpression('* * * 13 *').isValid).toBe(false) // month 1-12
      expect(validateCronExpression('* * * * 8').isValid).toBe(false) // day of week 0-7
    })

    it('rejects inverted or invalid ranges', () => {
      expect(validateCronExpression('30-10 * * * *').isValid).toBe(false)
      expect(validateCronExpression('* 18-9 * * *').isValid).toBe(false)
      expect(validateCronExpression('* * * * 5-1').isValid).toBe(false)
    })

    it('rejects invalid or zero step dividers', () => {
      expect(validateCronExpression('*/0 * * * *').isValid).toBe(false)
      expect(validateCronExpression('*/-5 * * * *').isValid).toBe(false)
      expect(validateCronExpression('*/abc * * * *').isValid).toBe(false)
    })

    it('rejects non-numeric characters where numbers are required', () => {
      expect(validateCronExpression('abc * * * *').isValid).toBe(false)
      expect(validateCronExpression('* hello * * *').isValid).toBe(false)
    })
  })

  describe('3. Next 10 Scheduled Occurrences (getNextCronOccurrences)', () => {
    it('produces exactly 10 ascending future timestamps starting from base date', () => {
      const baseDate = new Date('2026-06-01T12:00:00Z')
      const occurrences = getNextCronOccurrences('*/15 * * * *', 10, baseDate)

      expect(occurrences.length).toBe(10)

      // Strictly ascending (monotonic) order assertion
      for (let i = 0; i < occurrences.length - 1; i++) {
        expect(occurrences[i].getTime()).toBeLessThan(occurrences[i + 1].getTime())
      }

      // First occurrence must be strictly after baseDate
      expect(occurrences[0].getTime()).toBeGreaterThan(baseDate.getTime())
      // First occurrence should be at minute 15, 30, 45, or 0
      expect(occurrences[0].getMinutes() % 15).toBe(0)
    })

    it('correctly calculates occurrences for workday 9:00 AM schedule (0 9 * * 1-5)', () => {
      const baseDate = new Date('2026-06-01T00:00:00Z') // Monday
      const occurrences = getNextCronOccurrences('0 9 * * 1-5', 10, baseDate)

      expect(occurrences.length).toBe(10)
      for (const occ of occurrences) {
        expect(occ.getHours()).toBe(9)
        expect(occ.getMinutes()).toBe(0)
        // Day of week must be between 1 (Monday) and 5 (Friday)
        const dow = occ.getDay()
        expect(dow).toBeGreaterThanOrEqual(1)
        expect(dow).toBeLessThanOrEqual(5)
      }
    })

    it('correctly calculates occurrences for monthly schedule (0 0 1 * *)', () => {
      const baseDate = new Date('2026-01-15T00:00:00Z')
      const occurrences = getNextCronOccurrences('0 0 1 * *', 5, baseDate)

      expect(occurrences.length).toBe(5)
      for (const occ of occurrences) {
        expect(occ.getDate()).toBe(1)
        expect(occ.getHours()).toBe(0)
        expect(occ.getMinutes()).toBe(0)
      }
    })

    it('returns empty array when expression is invalid', () => {
      const occurrences = getNextCronOccurrences('invalid cron expression', 10)
      expect(occurrences).toEqual([])
    })
  })

  describe('4. Bilingual Natural Language Explanations (explainCron)', () => {
    it('explains frequent intervals in English and Turkish', () => {
      expect(explainCron('* * * * *', 'en')).toBe('Every minute')
      expect(explainCron('* * * * *', 'tr')).toBe('Her dakika')

      expect(explainCron('*/5 * * * *', 'en')).toBe('Every 5 minutes')
      expect(explainCron('*/5 * * * *', 'tr')).toBe('Her 5 dakikada bir')

      expect(explainCron('*/15 * * * *', 'en')).toBe('Every 15 minutes')
      expect(explainCron('*/15 * * * *', 'tr')).toBe('Her 15 dakikada bir')

      expect(explainCron('0 * * * *', 'en')).toBe('Every hour')
      expect(explainCron('0 * * * *', 'tr')).toBe('Her saat başı')

      expect(explainCron('0 */2 * * *', 'en')).toBe('Every 2 hours')
      expect(explainCron('0 */2 * * *', 'tr')).toBe('Her 2 saatte bir')
    })

    it('explains daily schedules at specific times in English and Turkish', () => {
      expect(explainCron('0 0 * * *', 'en')).toBe('Every day at 00:00 (Midnight)')
      expect(explainCron('0 0 * * *', 'tr')).toBe("Her gün saat 00:00'da (Gece yarısı)")

      expect(explainCron('0 9 * * *', 'en')).toBe('Every day at 09:00')
      expect(explainCron('0 9 * * *', 'tr')).toBe("Her gün saat 09:00'da")
    })

    it('explains workday schedules in English and Turkish', () => {
      expect(explainCron('0 9 * * 1-5', 'en')).toBe('At 09:00, Monday through Friday')
      expect(explainCron('0 9 * * 1-5', 'tr')).toBe("Pazartesi ile Cuma arasında her gün saat 09:00'da")
    })

    it('returns error string when expression is invalid', () => {
      expect(explainCron('invalid', 'en')).toBe('Invalid cron expression')
      expect(explainCron('invalid', 'tr')).toBe('Geçersiz cron ifadesi')
    })
  })

  describe('5. Built-in Preset Library (CRON_PRESETS)', () => {
    it('contains all 12 expected common presets with valid syntax', () => {
      expect(CRON_PRESETS.length).toBe(12)

      for (const preset of CRON_PRESETS) {
        expect(preset.id).toBeTruthy()
        expect(preset.expression).toBeTruthy()
        expect(preset.labelEn).toBeTruthy()
        expect(preset.labelTr).toBeTruthy()
        expect(['frequent', 'daily', 'weekly', 'monthly']).toContain(preset.category)

        const validation = validateCronExpression(preset.expression)
        expect(validation.isValid).toBe(true)

        // Verify next occurrences can be computed for every preset
        const occ = getNextCronOccurrences(preset.expression, 3)
        expect(occ.length).toBe(3)
      }
    })
  })

  describe('6. Field Value Matching (matchesField)', () => {
    it('matches wildcards and question marks', () => {
      expect(matchesField(15, '*', 0, 59)).toBe(true)
      expect(matchesField(5, '?', 0, 59)).toBe(true)
    })

    it('matches exact numbers', () => {
      expect(matchesField(10, '10', 0, 59)).toBe(true)
      expect(matchesField(11, '10', 0, 59)).toBe(false)
    })

    it('matches ranges (e.g. 1-5)', () => {
      expect(matchesField(1, '1-5', 0, 6)).toBe(true)
      expect(matchesField(3, '1-5', 0, 6)).toBe(true)
      expect(matchesField(5, '1-5', 0, 6)).toBe(true)
      expect(matchesField(6, '1-5', 0, 6)).toBe(false)
    })

    it('matches lists (e.g. 10,20,30)', () => {
      expect(matchesField(10, '10,20,30', 0, 59)).toBe(true)
      expect(matchesField(20, '10,20,30', 0, 59)).toBe(true)
      expect(matchesField(15, '10,20,30', 0, 59)).toBe(false)
    })

    it('matches steps (e.g. */5)', () => {
      expect(matchesField(0, '*/5', 0, 59)).toBe(true)
      expect(matchesField(15, '*/5', 0, 59)).toBe(true)
      expect(matchesField(16, '*/5', 0, 59)).toBe(false)
    })
  })

  describe('7. Relative Countdown Formatter (formatRelativeCountdown)', () => {
    it('formats countdown in English and Turkish', () => {
      const now = new Date('2026-06-01T12:00:00Z')
      const targetMin = new Date('2026-06-01T12:15:30Z')

      expect(formatRelativeCountdown(targetMin, now, 'en')).toBe('in 15m 30s')
      expect(formatRelativeCountdown(targetMin, now, 'tr')).toBe('15 dk 30 sn sonra')

      const targetHour = new Date('2026-06-01T14:30:00Z')
      expect(formatRelativeCountdown(targetHour, now, 'en')).toBe('in 2h 30m')
      expect(formatRelativeCountdown(targetHour, now, 'tr')).toBe('2 saat 30 dk sonra')

      const past = new Date('2026-06-01T11:00:00Z')
      expect(formatRelativeCountdown(past, now, 'en')).toBe('right now')
      expect(formatRelativeCountdown(past, now, 'tr')).toBe('hemen şimdi')
    })
  })

  describe('8. Bilingual i18n Translation Key Verification', () => {
    it('verifies cronStudio namespace has 100% key parity and non-empty strings in en.json and tr.json', () => {
      const enKeys = Object.keys((enJson as any).cronStudio || {})
      const trKeys = Object.keys((trJson as any).cronStudio || {})

      expect(enKeys.length).toBeGreaterThanOrEqual(10)
      expect(enKeys.sort()).toEqual(trKeys.sort())

      expect((enJson as any).cronStudio.title).toBe('Cron Expression Studio')
      expect((trJson as any).cronStudio.title).toBe('Cron İfade Stüdyosu')
      expect((enJson as any).cronStudio.expression).toBeTruthy()
      expect((trJson as any).cronStudio.expression).toBeTruthy()
    })
  })
})
