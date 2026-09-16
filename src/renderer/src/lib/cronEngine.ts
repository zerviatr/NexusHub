/**
 * cronEngine.ts
 * High-performance, zero-dependency cron expression parser, visual segment matcher,
 * next occurrence calculator, and bilingual natural language human-readable explainer.
 */

export interface CronParts {
  minute: string
  hour: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
}

export interface CronValidationResult {
  isValid: boolean
  error?: string
  parts?: CronParts
  normalized?: string
}

export interface CronPreset {
  id: string
  expression: string
  labelEn: string
  labelTr: string
  category: 'frequent' | 'daily' | 'weekly' | 'monthly'
}

export const CRON_PRESETS: CronPreset[] = [
  {
    id: 'every-minute',
    expression: '* * * * *',
    labelEn: 'Every minute',
    labelTr: 'Her dakika',
    category: 'frequent',
  },
  {
    id: 'every-5-min',
    expression: '*/5 * * * *',
    labelEn: 'Every 5 minutes',
    labelTr: 'Her 5 dakikada bir',
    category: 'frequent',
  },
  {
    id: 'every-15-min',
    expression: '*/15 * * * *',
    labelEn: 'Every 15 minutes',
    labelTr: 'Her 15 dakikada bir',
    category: 'frequent',
  },
  {
    id: 'every-30-min',
    expression: '*/30 * * * *',
    labelEn: 'Every 30 minutes',
    labelTr: 'Her 30 dakikada bir',
    category: 'frequent',
  },
  {
    id: 'hourly',
    expression: '0 * * * *',
    labelEn: 'Hourly at minute 0',
    labelTr: 'Her saat başı (dakika 0)',
    category: 'frequent',
  },
  {
    id: 'every-2-hours',
    expression: '0 */2 * * *',
    labelEn: 'Every 2 hours',
    labelTr: 'Her 2 saatte bir',
    category: 'frequent',
  },
  {
    id: 'daily-midnight',
    expression: '0 0 * * *',
    labelEn: 'Daily at 00:00 (Midnight)',
    labelTr: 'Her gün 00:00 (Gece yarısı)',
    category: 'daily',
  },
  {
    id: 'daily-9am',
    expression: '0 9 * * *',
    labelEn: 'Daily at 09:00 AM',
    labelTr: 'Her sabah saat 09:00\'da',
    category: 'daily',
  },
  {
    id: 'workdays-9am',
    expression: '0 9 * * 1-5',
    labelEn: 'Monday through Friday at 09:00 AM',
    labelTr: 'Hafta içi her gün saat 09:00\'da',
    category: 'daily',
  },
  {
    id: 'weekly-sunday',
    expression: '0 0 * * 0',
    labelEn: 'Weekly on Sunday at 00:00',
    labelTr: 'Her Pazar gece yarısı 00:00\'da',
    category: 'weekly',
  },
  {
    id: 'monthly-first',
    expression: '0 0 1 * *',
    labelEn: 'Monthly on 1st day at 00:00',
    labelTr: 'Her ayın 1. günü 00:00\'da',
    category: 'monthly',
  },
  {
    id: 'quarterly-first',
    expression: '0 0 1 1,4,7,10 *',
    labelEn: 'Quarterly on 1st day at 00:00',
    labelTr: 'Üç ayda bir ayın ilk günü 00:00\'da',
    category: 'monthly',
  },
]

const MONTH_NAMES_EN = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_NAMES_TR = [
  '',
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

const DAY_NAMES_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const DAY_NAMES_TR = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
]

/**
 * Checks whether a single integer value matches a cron field segment.
 */
export function matchesField(val: number, expr: string, min: number, max: number): boolean {
  if (expr === '*' || expr === '?') return true

  // Handle lists: e.g. "1,5,10"
  if (expr.includes(',')) {
    return expr.split(',').some((sub) => matchesField(val, sub.trim(), min, max))
  }

  // Handle steps: e.g. "*/5" or "10-30/5"
  if (expr.includes('/')) {
    const [rangePart, stepPart] = expr.split('/')
    const step = parseInt(stepPart, 10)
    if (isNaN(step) || step <= 0) return false

    if (rangePart === '*' || rangePart === '') {
      return (val - min) % step === 0
    }

    if (rangePart.includes('-')) {
      const [startStr, endStr] = rangePart.split('-')
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (val < start || val > end) return false
      return (val - start) % step === 0
    }

    const base = parseInt(rangePart, 10)
    if (val < base) return false
    return (val - base) % step === 0
  }

  // Handle ranges: e.g. "1-5"
  if (expr.includes('-')) {
    const [startStr, endStr] = expr.split('-')
    const start = parseInt(startStr, 10)
    const end = parseInt(endStr, 10)
    return val >= start && val <= end
  }

  // Exact number
  const parsed = parseInt(expr, 10)
  if (isNaN(parsed)) return false

  // In cron, 7 is also Sunday in some conventions
  if (min === 0 && max === 6 && parsed === 7 && val === 0) {
    return true
  }

  return val === parsed
}

/**
 * Validates a 5-field cron string.
 */
export function validateCronExpression(expression: string): CronValidationResult {
  const clean = expression.trim().replace(/\s+/g, ' ')
  if (!clean) {
    return { isValid: false, error: 'Expression is empty' }
  }

  const parts = clean.split(' ')
  if (parts.length !== 5) {
    return {
      isValid: false,
      error: `Expected 5 segments (minute hour day month dayOfWeek), got ${parts.length}`,
    }
  }

  const [min, hour, dom, mon, dow] = parts

  const check = (expr: string, minVal: number, maxVal: number, name: string): string | null => {
    if (expr === '*' || expr === '?') return null
    for (const sub of expr.split(',')) {
      const trimmed = sub.trim()
      if (!trimmed) return `Empty sub-expression in ${name}`
      if (trimmed.includes('/')) {
        const [r, s] = trimmed.split('/')
        const stepNum = parseInt(s, 10)
        if (isNaN(stepNum) || stepNum <= 0) return `Invalid step ${s} in ${name}`
        if (r !== '*' && r !== '') {
          if (r.includes('-')) {
            const [st, en] = r.split('-').map(Number)
            if (isNaN(st) || isNaN(en) || st > en || st < minVal || en > maxVal) {
              return `Invalid range ${r} in ${name}`
            }
          } else {
            const single = Number(r)
            if (isNaN(single) || single < minVal || single > maxVal) {
              return `Invalid value ${r} in ${name}`
            }
          }
        }
      } else if (trimmed.includes('-')) {
        const [st, en] = trimmed.split('-').map(Number)
        if (isNaN(st) || isNaN(en) || st > en || st < minVal || en > (maxVal === 6 ? 7 : maxVal)) {
          return `Invalid range ${trimmed} in ${name}`
        }
      } else {
        const num = Number(trimmed)
        if (isNaN(num) || num < minVal || num > (maxVal === 6 ? 7 : maxVal)) {
          return `Invalid number ${trimmed} in ${name} (allowed: ${minVal}-${maxVal})`
        }
      }
    }
    return null
  }

  const minErr = check(min, 0, 59, 'minute')
  if (minErr) return { isValid: false, error: minErr }

  const hourErr = check(hour, 0, 23, 'hour')
  if (hourErr) return { isValid: false, error: hourErr }

  const domErr = check(dom, 1, 31, 'day of month')
  if (domErr) return { isValid: false, error: domErr }

  const monErr = check(mon, 1, 12, 'month')
  if (monErr) return { isValid: false, error: monErr }

  const dowErr = check(dow, 0, 6, 'day of week')
  if (dowErr) return { isValid: false, error: dowErr }

  return {
    isValid: true,
    parts: {
      minute: min,
      hour,
      dayOfMonth: dom,
      month: mon,
      dayOfWeek: dow,
    },
    normalized: `${min} ${hour} ${dom} ${mon} ${dow}`,
  }
}

/**
 * Calculates next N scheduled execution timestamps starting from a given date.
 */
export function getNextCronOccurrences(
  cron: string,
  count = 10,
  startDate = new Date()
): Date[] {
  const validation = validateCronExpression(cron)
  if (!validation.isValid || !validation.parts) return []

  const { minute: minExpr, hour: hourExpr, dayOfMonth: domExpr, month: monthExpr, dayOfWeek: dowExpr } =
    validation.parts

  const results: Date[] = []
  const current = new Date(startDate.getTime())
  current.setSeconds(0, 0)
  // Advance by 1 minute from current time
  current.setMinutes(current.getMinutes() + 1)

  let iterations = 0
  const MAX_ITERATIONS = 525600 // 1 year of minutes

  while (results.length < count && iterations < MAX_ITERATIONS) {
    iterations++
    const m = current.getMinutes()
    const h = current.getHours()
    const dom = current.getDate()
    const mon = current.getMonth() + 1
    const dow = current.getDay()

    // Optimization: skip hour or day if it doesn't match
    if (!matchesField(mon, monthExpr, 1, 12)) {
      current.setMonth(current.getMonth() + 1, 1)
      current.setHours(0, 0, 0, 0)
      continue
    }

    if (!matchesField(dom, domExpr, 1, 31) || !matchesField(dow, dowExpr, 0, 6)) {
      current.setDate(current.getDate() + 1)
      current.setHours(0, 0, 0, 0)
      continue
    }

    if (!matchesField(h, hourExpr, 0, 23)) {
      current.setHours(current.getHours() + 1, 0, 0, 0)
      continue
    }

    if (matchesField(m, minExpr, 0, 59)) {
      results.push(new Date(current.getTime()))
    }

    current.setMinutes(current.getMinutes() + 1)
  }

  return results
}

/**
 * Generate human-readable natural language schedule explanation in EN or TR.
 */
export function explainCron(cron: string, locale: 'en' | 'tr' = 'en'): string {
  const validation = validateCronExpression(cron)
  if (!validation.isValid || !validation.parts) {
    return locale === 'tr' ? 'Geçersiz cron ifadesi' : 'Invalid cron expression'
  }

  const { minute, hour, dayOfMonth, month, dayOfWeek } = validation.parts

  // Check direct common presets
  if (cron === '* * * * *') {
    return locale === 'tr' ? 'Her dakika' : 'Every minute'
  }
  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const step = minute.slice(2)
    return locale === 'tr' ? `Her ${step} dakikada bir` : `Every ${step} minutes`
  }
  if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const step = hour.slice(2)
    return locale === 'tr' ? `Her ${step} saatte bir` : `Every ${step} hours`
  }
  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return locale === 'tr' ? 'Her saat başı' : 'Every hour'
  }
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && !hour.includes('*') && !minute.includes('*')) {
    const padH = hour.padStart(2, '0')
    const padM = minute.padStart(2, '0')
    if (padH === '00' && padM === '00') {
      return locale === 'tr' ? 'Her gün saat 00:00\'da (Gece yarısı)' : 'Every day at 00:00 (Midnight)'
    }
    return locale === 'tr' ? `Her gün saat ${padH}:${padM}'da` : `Every day at ${padH}:${padM}`
  }
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5' && !hour.includes('*') && !minute.includes('*')) {
    const padH = hour.padStart(2, '0')
    const padM = minute.padStart(2, '0')
    return locale === 'tr'
      ? `Pazartesi ile Cuma arasında her gün saat ${padH}:${padM}'da`
      : `At ${padH}:${padM}, Monday through Friday`
  }

  // Compositional natural language engine
  if (locale === 'tr') {
    return composeExplanationTr(minute, hour, dayOfMonth, month, dayOfWeek)
  }
  return composeExplanationEn(minute, hour, dayOfMonth, month, dayOfWeek)
}

function composeExplanationEn(
  min: string,
  hour: string,
  dom: string,
  mon: string,
  dow: string
): string {
  let timeStr = ''
  if (min === '*' && hour === '*') {
    timeStr = 'Every minute'
  } else if (min.startsWith('*/') && hour === '*') {
    timeStr = `Every ${min.slice(2)} minutes`
  } else if (!hour.includes('*') && !hour.includes('/') && !min.includes('*') && !min.includes('/')) {
    timeStr = `At ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  } else if (hour === '*') {
    timeStr = `At minute ${min} of every hour`
  } else {
    timeStr = `At minute ${min}, hour ${hour}`
  }

  let dowStr = ''
  if (dow !== '*' && dow !== '?') {
    if (dow === '1-5') {
      dowStr = 'Monday through Friday'
    } else if (dow === '0,6' || dow === '6,0') {
      dowStr = 'on weekends'
    } else {
      const days = dow
        .split(',')
        .map((d) => DAY_NAMES_EN[parseInt(d, 10)] || d)
        .join(', ')
      dowStr = `on ${days}`
    }
  }

  let domStr = ''
  if (dom !== '*' && dom !== '?') {
    domStr = `on day ${dom} of the month`
  }

  let monStr = ''
  if (mon !== '*') {
    const months = mon
      .split(',')
      .map((m) => MONTH_NAMES_EN[parseInt(m, 10)] || m)
      .join(', ')
    monStr = `in ${months}`
  }

  const qualifiers = [dowStr, domStr, monStr].filter(Boolean).join(', ')
  return qualifiers ? `${timeStr}, ${qualifiers}` : timeStr
}

function composeExplanationTr(
  min: string,
  hour: string,
  dom: string,
  mon: string,
  dow: string
): string {
  let timeStr = ''
  if (min === '*' && hour === '*') {
    timeStr = 'Her dakika'
  } else if (min.startsWith('*/') && hour === '*') {
    timeStr = `Her ${min.slice(2)} dakikada bir`
  } else if (!hour.includes('*') && !hour.includes('/') && !min.includes('*') && !min.includes('/')) {
    timeStr = `saat ${hour.padStart(2, '0')}:${min.padStart(2, '0')}'da`
  } else if (hour === '*') {
    timeStr = `her saatin ${min}. dakikasında`
  } else {
    timeStr = `${hour} saatinde, ${min}. dakikada`
  }

  let dowStr = ''
  if (dow !== '*' && dow !== '?') {
    if (dow === '1-5') {
      dowStr = 'Hafta içi her gün'
    } else if (dow === '0,6' || dow === '6,0') {
      dowStr = 'Hafta sonları'
    } else {
      const days = dow
        .split(',')
        .map((d) => DAY_NAMES_TR[parseInt(d, 10)] || d)
        .join(', ')
      dowStr = `${days} günleri`
    }
  }

  let domStr = ''
  if (dom !== '*' && dom !== '?') {
    domStr = `ayın ${dom}. günü`
  }

  let monStr = ''
  if (mon !== '*') {
    const months = mon
      .split(',')
      .map((m) => MONTH_NAMES_TR[parseInt(m, 10)] || m)
      .join(', ')
    monStr = `${months} aylarında`
  }

  const qualifiers = [monStr, domStr, dowStr].filter(Boolean).join(', ')
  if (qualifiers) {
    return `${qualifiers} ${timeStr}`
  }
  return timeStr
}

/**
 * Format relative countdown from now to target date.
 */
export function formatRelativeCountdown(target: Date, now = new Date(), locale: 'en' | 'tr' = 'en'): string {
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) {
    return locale === 'tr' ? 'hemen şimdi' : 'right now'
  }

  const totalSecs = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const minutes = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60

  if (locale === 'tr') {
    if (days > 0) return `${days} gün ${hours} saat sonra`
    if (hours > 0) return `${hours} saat ${minutes} dk sonra`
    if (minutes > 0) return `${minutes} dk ${secs} sn sonra`
    return `${secs} saniye sonra`
  }

  if (days > 0) return `in ${days}d ${hours}h`
  if (hours > 0) return `in ${hours}h ${minutes}m`
  if (minutes > 0) return `in ${minutes}m ${secs}s`
  return `in ${secs}s`
}
