import React from 'react'
import { ArrowUpDown } from 'lucide-react'

export type SortDirection = 'asc' | 'desc'

export interface SortableHeaderProps<T extends string> {
  /** Display label */
  label: string
  /** Field identifier for this column */
  field: T
  /** Currently active sort field */
  currentSort: T
  /** Current sort direction */
  direction: SortDirection
  /** Callback when header is clicked */
  onSort: (field: T) => void
}

/**
 * Sortable table header with arrow indicator.
 * 
 * @example
 * <SortableHeader
 *   label="Date"
 *   field="createdAt"
 *   currentSort={sortField}
 *   direction={sortDirection}
 *   onSort={handleSort}
 * />
 */
export function SortableHeader<T extends string>({ 
  label, 
  field, 
  currentSort, 
  direction, 
  onSort 
}: SortableHeaderProps<T>) {
  const isActive = currentSort === field
  
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors ${
        isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${isActive ? 'opacity-100' : 'opacity-50'}`} />
    </button>
  )
}

/**
 * Hook to manage sort state
 */
export function useSort<T extends string>(defaultField: T, defaultDirection: SortDirection = 'desc') {
  const [sortField, setSortField] = React.useState<T>(defaultField)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(defaultDirection)

  const handleSort = React.useCallback((field: T) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }, [sortField])

  return { sortField, sortDirection, handleSort }
}

