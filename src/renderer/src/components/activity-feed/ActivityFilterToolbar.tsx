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

import React from 'react'
import { Search, X, Filter, RotateCcw } from 'lucide-react'
import { ActivityCategory, ActivityFilter, ActivityStatus } from './types'
import { cyberAudio } from '../../lib/cyberAudio'
import { useT } from '../../lib/i18n'

interface ActivityFilterToolbarProps {
  filter: ActivityFilter
  onFilterChange: (newFilter: ActivityFilter) => void
  toolsList: Array<{ id: string; name: string }>
  totalMatches: number
  totalCount: number
  onReset: () => void
}

const CATEGORIES: Array<{ id: ActivityCategory | ''; labelKey: string; defaultLabel: string }> = [
  { id: '', labelKey: 'activityFeed.filters.allCategories', defaultLabel: 'All Categories' },
  { id: 'security', labelKey: 'activityFeed.categories.security', defaultLabel: 'Security' },
  { id: 'network', labelKey: 'activityFeed.categories.network', defaultLabel: 'Network' },
  { id: 'system', labelKey: 'activityFeed.categories.system', defaultLabel: 'System' },
  { id: 'file', labelKey: 'activityFeed.categories.file', defaultLabel: 'Files' },
  { id: 'crypto', labelKey: 'activityFeed.categories.crypto', defaultLabel: 'Crypto' },
  { id: 'api', labelKey: 'activityFeed.categories.api', defaultLabel: 'API & Diagnostics' },
]

const STATUSES: Array<{ id: ActivityStatus | ''; labelKey: string; defaultLabel: string; dotColor: string }> = [
  { id: '', labelKey: 'activityFeed.filters.allStatuses', defaultLabel: 'All Statuses', dotColor: 'bg-white/40' },
  { id: 'success', labelKey: 'activityFeed.statuses.success', defaultLabel: 'Success', dotColor: 'bg-emerald-400' },
  { id: 'failure', labelKey: 'activityFeed.statuses.failure', defaultLabel: 'Failure', dotColor: 'bg-rose-400' },
  { id: 'warning', labelKey: 'activityFeed.statuses.warning', defaultLabel: 'Warning', dotColor: 'bg-amber-400' },
  { id: 'info', labelKey: 'activityFeed.statuses.info', defaultLabel: 'Info', dotColor: 'bg-nexus-cyan' },
]

const TIME_RANGES: Array<{ id: 'today' | '7d' | '30d' | 'all'; labelKey: string; defaultLabel: string }> = [
  { id: 'all', labelKey: 'activityFeed.filters.allTime', defaultLabel: 'All Time' },
  { id: 'today', labelKey: 'activityFeed.filters.today', defaultLabel: 'Today' },
  { id: '7d', labelKey: 'activityFeed.filters.last7Days', defaultLabel: 'Last 7 Days' },
  { id: '30d', labelKey: 'activityFeed.filters.last30Days', defaultLabel: 'Last 30 Days' },
]

/**
 * Filter toolbar with search, tool selection, category pills, status filter, and time range tabs.
 */
export const ActivityFilterToolbar: React.FC<ActivityFilterToolbarProps> = ({
  filter,
  onFilterChange,
  toolsList,
  totalMatches,
  totalCount,
  onReset,
}) => {
  const { t } = useT()

  const isFiltered =
    Boolean(filter.search) ||
    Boolean(filter.toolId) ||
    Boolean(filter.category) ||
    Boolean(filter.status) ||
    filter.timeRange !== 'all'

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, search: e.target.value })
  }

  const handleClearSearch = () => {
    cyberAudio.click()
    onFilterChange({ ...filter, search: '' })
  }

  const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    cyberAudio.click()
    onFilterChange({ ...filter, toolId: e.target.value })
  }

  const handleCategorySelect = (category: string) => {
    cyberAudio.click()
    onFilterChange({ ...filter, category })
  }

  const handleStatusSelect = (status: string) => {
    cyberAudio.click()
    onFilterChange({ ...filter, status })
  }

  const handleTimeRangeSelect = (timeRange: 'today' | '7d' | '30d' | 'all') => {
    cyberAudio.click()
    onFilterChange({ ...filter, timeRange })
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-nexus-surface/90 border border-white/5 backdrop-blur-md">
      {/* Top row: Search input + Tool select + Reset */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search box */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-nexus-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filter.search}
            onChange={handleSearchChange}
            placeholder={
              t('activityFeed.filters.searchPlaceholder') ||
              'Search action, tool, details or SHA-256 hash...'
            }
            className="w-full bg-nexus-card/80 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-nexus-text placeholder-nexus-muted focus:outline-none focus:border-nexus-cyan/50 focus:ring-1 focus:ring-nexus-cyan/30 transition-all"
          />
          {filter.search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tool selector dropdown */}
        <div className="w-full sm:w-56">
          <select
            value={filter.toolId}
            onChange={handleToolChange}
            className="w-full bg-nexus-card/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-nexus-text focus:outline-none focus:border-nexus-cyan/50 focus:ring-1 focus:ring-nexus-cyan/30 transition-all cursor-pointer"
          >
            <option value="">{t('activityFeed.filters.allTools') || 'All Tools'}</option>
            {toolsList.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset / Matches indicator */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <span className="text-xs text-nexus-muted font-mono whitespace-nowrap">
            {totalMatches} / {totalCount}
          </span>
          {isFiltered && (
            <button
              onClick={() => {
                cyberAudio.click()
                onReset()
              }}
              title="Reset all filters"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-nexus-muted hover:text-white bg-nexus-card/80 border border-white/10 hover:border-white/20 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: Category pills + Status pills + Time range tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
        {/* Category pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-nexus-muted font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-nexus-cyan" />
            <span>Category:</span>
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = filter.category === cat.id
            return (
              <button
                key={cat.id || 'all'}
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-nexus-cyan/20 text-nexus-cyan border border-nexus-cyan/40 shadow-sm'
                    : 'bg-nexus-card/60 text-nexus-muted border border-white/5 hover:text-nexus-text hover:bg-nexus-card'
                }`}
              >
                {t(cat.labelKey) || cat.defaultLabel}
              </button>
            )
          })}
        </div>

        {/* Status and Time range filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status selector */}
          <div className="flex items-center gap-1">
            {STATUSES.map((st) => {
              const isSelected = filter.status === st.id
              return (
                <button
                  key={st.id || 'all'}
                  onClick={() => handleStatusSelect(st.id)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-nexus-muted hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`} />
                  <span>{t(st.labelKey) || st.defaultLabel}</span>
                </button>
              )
            })}
          </div>

          {/* Time range tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-nexus-card/80 border border-white/10">
            {TIME_RANGES.map((tr) => {
              const isSelected = filter.timeRange === tr.id
              return (
                <button
                  key={tr.id}
                  onClick={() => handleTimeRangeSelect(tr.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-nexus-accent/30 text-white shadow-sm'
                      : 'text-nexus-muted hover:text-nexus-text'
                  }`}
                >
                  {t(tr.labelKey) || tr.defaultLabel}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityFilterToolbar
