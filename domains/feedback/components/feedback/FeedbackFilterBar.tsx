
import { Filter, X } from 'lucide-react'
import { FormSelect } from '../../../../lib/ui/components/FormControls'
import {
  FEEDBACK_TYPE_OPTIONS,
  FEEDBACK_IMPORTANCE_OPTIONS,
  FEEDBACK_STATUS_OPTIONS,
  type FeedbackType,
  type FeedbackImportance,
  type FeedbackStatus,
} from '../../types'

export interface FeedbackFilters {
  type: FeedbackType | 'all'
  importance: FeedbackImportance | 'all'
  status: FeedbackStatus | 'all'
  project: 'all' | 'has' | 'none'
}

export interface FeedbackFilterBarProps {
  filters: FeedbackFilters
  onFiltersChange: (filters: FeedbackFilters) => void
  /** Total items before filtering */
  totalCount: number
  /** Items after filtering */
  filteredCount: number
}

export function FeedbackFilterBar({ 
  filters, 
  onFiltersChange, 
  totalCount, 
  filteredCount 
}: FeedbackFilterBarProps) {
  const hasActiveFilters = 
    filters.type !== 'all' || 
    filters.importance !== 'all' || 
    filters.status !== 'all' || 
    filters.project !== 'all'

  const clearFilters = () => {
    onFiltersChange({
      type: 'all',
      importance: 'all',
      status: 'all',
      project: 'all',
    })
  }

  const updateFilter = <K extends keyof FeedbackFilters>(key: K, value: FeedbackFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex items-center gap-2 text-slate-400">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filters:</span>
      </div>
      
      <FormSelect
        value={filters.type}
        onChange={(e) => updateFilter('type', e.target.value as FeedbackType | 'all')}
        size="sm"
        className="!w-auto min-w-[120px]"
      >
        <option value="all">All Types</option>
        {FEEDBACK_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </FormSelect>

      <FormSelect
        value={filters.importance}
        onChange={(e) => updateFilter('importance', e.target.value as FeedbackImportance | 'all')}
        size="sm"
        className="!w-auto min-w-[120px]"
      >
        <option value="all">All Priority</option>
        {FEEDBACK_IMPORTANCE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </FormSelect>

      <FormSelect
        value={filters.status}
        onChange={(e) => updateFilter('status', e.target.value as FeedbackStatus | 'all')}
        size="sm"
        className="!w-auto min-w-[120px]"
      >
        <option value="all">All Status</option>
        {FEEDBACK_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </FormSelect>

      <FormSelect
        value={filters.project}
        onChange={(e) => updateFilter('project', e.target.value as 'all' | 'has' | 'none')}
        size="sm"
        className="!w-auto min-w-[140px]"
      >
        <option value="all">All Projects</option>
        <option value="has">Has Project</option>
        <option value="none">No Project</option>
      </FormSelect>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}

      <div className="ml-auto text-sm text-slate-500">
        {filteredCount} of {totalCount} items
      </div>
    </div>
  )
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: FeedbackFilters): boolean {
  return (
    filters.type !== 'all' ||
    filters.importance !== 'all' ||
    filters.status !== 'all' ||
    filters.project !== 'all'
  )
}

/**
 * Default filter state
 */
export const DEFAULT_FILTERS: FeedbackFilters = {
  type: 'all',
  importance: 'all',
  status: 'all',
  project: 'all',
}

