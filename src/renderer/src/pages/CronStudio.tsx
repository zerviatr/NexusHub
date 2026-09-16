import { useState, useMemo, useEffect } from 'react'
import {
  Clock,
  Calendar,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ListOrdered,
  Layers,
  AlertCircle,
  HelpCircle,
  Play,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { useT } from '../lib/i18n'
import { cyberAudio } from '../lib/cyberAudio'
import {
  validateCronExpression,
  getNextCronOccurrences,
  explainCron,
  formatRelativeCountdown,
  CRON_PRESETS,
  type CronParts,
} from '../lib/cronEngine'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CronStudio() {
  const { t, locale } = useT()
  const activeLocale = (locale === 'tr' ? 'tr' : 'en') as 'en' | 'tr'

  // Current expression
  const [expression, setExpression] = useState<string>('0 9 * * 1-5')
  const [copiedExpr, setCopiedExpr] = useState<boolean>(false)

  // Active builder tab
  const [activeSegment, setActiveSegment] = useState<'minute' | 'hour' | 'dom' | 'month' | 'dow'>('minute')

  // Clock tick for live countdowns
  const [now, setNow] = useState<Date>(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Validate expression
  const validation = useMemo(() => {
    return validateCronExpression(expression)
  }, [expression])

  // Parsed 5 segments
  const parts: CronParts = useMemo(() => {
    if (validation.isValid && validation.parts) {
      return validation.parts
    }
    const raw = expression.trim().split(/\s+/)
    return {
      minute: raw[0] || '*',
      hour: raw[1] || '*',
      dayOfMonth: raw[2] || '*',
      month: raw[3] || '*',
      dayOfWeek: raw[4] || '*',
    }
  }, [expression, validation])

  // Natural language explanation
  const explanation = useMemo(() => {
    return explainCron(expression, activeLocale)
  }, [expression, activeLocale])

  // Next 10 executions
  const nextOccurrences = useMemo(() => {
    if (!validation.isValid) return []
    return getNextCronOccurrences(expression, 10, now)
  }, [expression, validation.isValid, now])

  // Update a single segment
  const updateSegment = (segment: keyof CronParts, newVal: string) => {
    cyberAudio.click()
    const current = { ...parts, [segment]: newVal }
    setExpression(`${current.minute} ${current.hour} ${current.dayOfMonth} ${current.month} ${current.dayOfWeek}`)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    cyberAudio.copySuccess()
    setCopiedExpr(true)
    setTimeout(() => setCopiedExpr(false), 1800)
  }

  const applyPreset = (expr: string) => {
    cyberAudio.click()
    setExpression(expr)
  }

  return (
    <BaseToolTemplate
      title={t('cronStudio.title') || 'Cron Expression Studio'}
      description={
        t('cronStudio.description') ||
        'Visual cron builder, natural language explanations, and next 10 execution timestamps.'
      }
      icon={Clock}
      gradient="from-amber-500 to-orange-600"
    >
      <div className="space-y-6">
        {/* ─── EXPRESSION INPUT & BANNER ────────────────────────────────────────── */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <label className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                {t('cronStudio.expression') || 'Cron Expression'}
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyPreset('* * * * *')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-nexus-surface/60 border border-white/5 text-xs text-nexus-muted hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => handleCopy(expression)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-nexus-surface border border-nexus-border/60 text-xs text-white hover:border-amber-400/50 transition-colors"
              >
                {copiedExpr ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Large Expression Display & Input */}
          <div className="relative">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="* * * * *"
              className="w-full bg-nexus-base border border-nexus-border/60 rounded-xl px-4 py-3 text-lg font-mono text-amber-300 tracking-wider focus:outline-none focus:border-amber-400/60"
            />
          </div>

          {/* Validation Error / Human Explanation Banner */}
          {validation.isValid ? (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <HelpCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-300">
                  {t('cronStudio.humanReadable') || 'Schedule Explanation'}
                </p>
                <p className="text-sm font-medium text-white">{explanation}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{validation.error}</span>
            </div>
          )}
        </div>

        {/* ─── QUICK PRESETS BAR ──────────────────────────────────────────────── */}
        <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-nexus-muted uppercase tracking-wider">
              {t('cronStudio.presetsTitle') || 'Quick Presets'}
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {CRON_PRESETS.map((p) => {
              const isActive = expression === p.expression
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.expression)}
                  className={`p-2.5 rounded-xl text-left transition-all border ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 shadow-sm'
                      : 'bg-nexus-surface/50 border-white/5 text-nexus-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <p className="text-xs font-semibold truncate">
                    {activeLocale === 'tr' ? p.labelTr : p.labelEn}
                  </p>
                  <p className="text-[10px] font-mono text-nexus-muted mt-0.5">{p.expression}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── VISUAL 5-FIELD INTERACTIVE BUILDER ──────────────────────────────── */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Layers className="w-4 h-4 text-nexus-cyan" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Visual Field Editor
            </h3>
          </div>

          {/* 5 Field Tabs */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'minute', key: 'minute', label: t('cronStudio.fields.minute') || 'Minute', val: parts.minute },
              { id: 'hour', key: 'hour', label: t('cronStudio.fields.hour') || 'Hour', val: parts.hour },
              {
                id: 'dom',
                key: 'dayOfMonth',
                label: t('cronStudio.fields.dayOfMonth') || 'Day (Month)',
                val: parts.dayOfMonth,
              },
              { id: 'month', key: 'month', label: t('cronStudio.fields.month') || 'Month', val: parts.month },
              {
                id: 'dow',
                key: 'dayOfWeek',
                label: t('cronStudio.fields.dayOfWeek') || 'Day (Week)',
                val: parts.dayOfWeek,
              },
            ].map((f) => {
              const isSelected = activeSegment === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    cyberAudio.click()
                    setActiveSegment(f.id as any)
                  }}
                  className={`p-3 rounded-xl text-center border transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                      : 'bg-nexus-surface/40 border-white/5 text-nexus-muted hover:text-white'
                  }`}
                >
                  <span className="block text-[11px] font-semibold">{f.label}</span>
                  <span className="block text-xs font-mono font-bold text-white mt-0.5">{f.val}</span>
                </button>
              )
            })}
          </div>

          {/* Active Field Control Center */}
          <div className="p-4 rounded-xl bg-nexus-base/70 border border-white/5 space-y-4">
            {/* MINUTE BUILDER */}
            {activeSegment === 'minute' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-nexus-muted">Common:</span>
                  {[
                    { label: 'Every minute (*)', val: '*' },
                    { label: 'Every 5m (*/5)', val: '*/5' },
                    { label: 'Every 10m (*/10)', val: '*/10' },
                    { label: 'Every 15m (*/15)', val: '*/15' },
                    { label: 'Every 30m (*/30)', val: '*/30' },
                    { label: 'At minute 0 (0)', val: '0' },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => updateSegment('minute', btn.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                        parts.minute === btn.val
                          ? 'bg-amber-500 text-black font-semibold'
                          : 'bg-nexus-surface border border-white/10 text-white hover:border-amber-400'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold text-nexus-muted pt-2">
                  Or select specific minute (0 - 59):
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => {
                    const isSelected =
                      parts.minute === String(m) ||
                      parts.minute.split(',').includes(String(m))
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const currentList = parts.minute === '*' ? [] : parts.minute.split(',')
                          let nextList: string[]
                          if (currentList.includes(String(m))) {
                            nextList = currentList.filter((x) => x !== String(m))
                          } else {
                            nextList = [...currentList, String(m)]
                          }
                          updateSegment('minute', nextList.length === 0 ? '*' : nextList.join(','))
                        }}
                        className={`py-1 text-xs font-mono rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                            : 'bg-nexus-surface/50 border-white/5 text-nexus-muted hover:text-white'
                        }`}
                      >
                        {m.toString().padStart(2, '0')}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* HOUR BUILDER */}
            {activeSegment === 'hour' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-nexus-muted">Common:</span>
                  {[
                    { label: 'Every hour (*)', val: '*' },
                    { label: 'Every 2h (*/2)', val: '*/2' },
                    { label: 'Every 6h (*/6)', val: '*/6' },
                    { label: 'Every 12h (*/12)', val: '*/12' },
                    { label: 'Midnight (0)', val: '0' },
                    { label: 'Morning (9)', val: '9' },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => updateSegment('hour', btn.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                        parts.hour === btn.val
                          ? 'bg-amber-500 text-black font-semibold'
                          : 'bg-nexus-surface border border-white/10 text-white hover:border-amber-400'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold text-nexus-muted pt-2">
                  Select specific hours (0 - 23):
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => {
                    const isSelected =
                      parts.hour === String(h) || parts.hour.split(',').includes(String(h))
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          const currentList = parts.hour === '*' ? [] : parts.hour.split(',')
                          let nextList: string[]
                          if (currentList.includes(String(h))) {
                            nextList = currentList.filter((x) => x !== String(h))
                          } else {
                            nextList = [...currentList, String(h)]
                          }
                          updateSegment('hour', nextList.length === 0 ? '*' : nextList.join(','))
                        }}
                        className={`py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                            : 'bg-nexus-surface/50 border-white/5 text-nexus-muted hover:text-white'
                        }`}
                      >
                        {h.toString().padStart(2, '0')}:00
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* DAY OF MONTH BUILDER */}
            {activeSegment === 'dom' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-nexus-muted">Common:</span>
                  {[
                    { label: 'Every day (*)', val: '*' },
                    { label: '1st of month (1)', val: '1' },
                    { label: '1st and 15th (1,15)', val: '1,15' },
                    { label: 'Last day of month (31)', val: '31' },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => updateSegment('dayOfMonth', btn.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                        parts.dayOfMonth === btn.val
                          ? 'bg-amber-500 text-black font-semibold'
                          : 'bg-nexus-surface border border-white/10 text-white hover:border-amber-400'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold text-nexus-muted pt-2">
                  Select specific days (1 - 31):
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    const isSelected =
                      parts.dayOfMonth === String(d) ||
                      parts.dayOfMonth.split(',').includes(String(d))
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const currentList = parts.dayOfMonth === '*' ? [] : parts.dayOfMonth.split(',')
                          let nextList: string[]
                          if (currentList.includes(String(d))) {
                            nextList = currentList.filter((x) => x !== String(d))
                          } else {
                            nextList = [...currentList, String(d)]
                          }
                          updateSegment('dayOfMonth', nextList.length === 0 ? '*' : nextList.join(','))
                        }}
                        className={`py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                            : 'bg-nexus-surface/50 border-white/5 text-nexus-muted hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* MONTH BUILDER */}
            {activeSegment === 'month' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-nexus-muted">Common:</span>
                  {[
                    { label: 'Every month (*)', val: '*' },
                    { label: 'Quarterly (1,4,7,10)', val: '1,4,7,10' },
                    { label: 'Half-yearly (1,7)', val: '1,7' },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => updateSegment('month', btn.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                        parts.month === btn.val
                          ? 'bg-amber-500 text-black font-semibold'
                          : 'bg-nexus-surface border border-white/10 text-white hover:border-amber-400'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold text-nexus-muted pt-2">
                  Select months (1 - 12):
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {MONTH_LABELS.map((mName, idx) => {
                    const mNum = idx + 1
                    const isSelected =
                      parts.month === String(mNum) ||
                      parts.month.split(',').includes(String(mNum))
                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => {
                          const currentList = parts.month === '*' ? [] : parts.month.split(',')
                          let nextList: string[]
                          if (currentList.includes(String(mNum))) {
                            nextList = currentList.filter((x) => x !== String(mNum))
                          } else {
                            nextList = [...currentList, String(mNum)]
                          }
                          updateSegment('month', nextList.length === 0 ? '*' : nextList.join(','))
                        }}
                        className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                            : 'bg-nexus-surface/50 border-white/5 text-nexus-muted hover:text-white'
                        }`}
                      >
                        {mName} ({mNum})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* DAY OF WEEK BUILDER */}
            {activeSegment === 'dow' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-nexus-muted">Common:</span>
                  {[
                    { label: 'Every day (*)', val: '*' },
                    { label: 'Weekdays (1-5)', val: '1-5' },
                    { label: 'Weekends (0,6)', val: '0,6' },
                    { label: 'Only Sunday (0)', val: '0' },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => updateSegment('dayOfWeek', btn.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                        parts.dayOfWeek === btn.val
                          ? 'bg-amber-500 text-black font-semibold'
                          : 'bg-nexus-surface border border-white/10 text-white hover:border-amber-400'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold text-nexus-muted pt-2">
                  Select days of week (0 = Sun .. 6 = Sat):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {DAY_LABELS.map((dName, dIdx) => {
                    const isSelected =
                      parts.dayOfWeek === String(dIdx) ||
                      parts.dayOfWeek.split(',').includes(String(dIdx)) ||
                      (parts.dayOfWeek === '1-5' && dIdx >= 1 && dIdx <= 5) ||
                      (parts.dayOfWeek === '0,6' && (dIdx === 0 || dIdx === 6))
                    return (
                      <button
                        key={dName}
                        type="button"
                        onClick={() => {
                          const currentList =
                            parts.dayOfWeek === '*'
                              ? []
                              : parts.dayOfWeek === '1-5'
                              ? ['1', '2', '3', '4', '5']
                              : parts.dayOfWeek.split(',')
                          let nextList: string[]
                          if (currentList.includes(String(dIdx))) {
                            nextList = currentList.filter((x) => x !== String(dIdx))
                          } else {
                            nextList = [...currentList, String(dIdx)]
                          }
                          updateSegment('dayOfWeek', nextList.length === 0 ? '*' : nextList.join(','))
                        }}
                        className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                            : 'bg-nexus-surface/50 border-white/5 text-nexus-muted hover:text-white'
                        }`}
                      >
                        {dName} ({dIdx})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── NEXT 10 EXECUTION TIMESTAMPS SCHEDULE ─────────────────────────── */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                {t('cronStudio.nextExecutions') || 'Next 10 Scheduled Runs'}
              </h3>
            </div>
            <span className="text-xs text-nexus-muted font-mono">
              Local: {now.toLocaleTimeString()}
            </span>
          </div>

          {nextOccurrences.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-nexus-muted">
                    <th className="py-2.5 px-3 w-16">
                      {t('cronStudio.runNumber') || 'Run #'}
                    </th>
                    <th className="py-2.5 px-3">
                      {t('cronStudio.scheduledTime') || 'Scheduled Time'}
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      {t('cronStudio.relativeTime') || 'Countdown'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {nextOccurrences.map((occ, idx) => {
                    const relative = formatRelativeCountdown(occ, now, activeLocale)
                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3 text-nexus-muted">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <span className="text-amber-300 mr-2">{occ.toLocaleDateString()}</span>
                          <span>{occ.toLocaleTimeString()}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                          {relative}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-nexus-muted py-4 text-center">
              No upcoming executions found within 1 year for this expression.
            </p>
          )}
        </div>
      </div>
    </BaseToolTemplate>
  )
}
