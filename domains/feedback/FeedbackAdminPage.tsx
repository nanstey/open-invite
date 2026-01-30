import React, { useState, useEffect, useMemo } from 'react'
import { ArrowUpDown, Search, Loader2, Filter, X } from 'lucide-react'
import { fetchAllFeedback } from '../../services/feedbackService'
import { FeedbackDetailPanel } from './FeedbackDetailPanel'
import { FormSelect } from '../../lib/ui/components/FormControls'
import {
  FEEDBACK_TYPE_COLORS,
  FEEDBACK_IMPORTANCE_COLORS,
  FEEDBACK_STATUS_COLORS,
  FEEDBACK_TYPE_OPTIONS,
  FEEDBACK_IMPORTANCE_OPTIONS,
  FEEDBACK_STATUS_OPTIONS,
  type Feedback,
  type FeedbackStatus,
  type FeedbackType,
  type FeedbackImportance,
} from './types'

type SortField = 'createdAt' | 'title' | 'type' | 'importance' | 'status'
type SortDirection = 'asc' | 'desc'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${className}`}>
      {children}
    </span>
  )
}

interface SortableHeaderProps {
  label: string
  field: SortField
  currentSort: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
}

function SortableHeader({ label, field, currentSort, direction, onSort }: SortableHeaderProps) {
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

export function FeedbackAdminPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  
  // Filters
  const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all')
  const [filterImportance, setFilterImportance] = useState<FeedbackImportance | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all')
  
  const hasActiveFilters = filterType !== 'all' || filterImportance !== 'all' || filterStatus !== 'all'
  
  const clearFilters = () => {
    setFilterType('all')
    setFilterImportance('all')
    setFilterStatus('all')
  }

  useEffect(() => {
    const loadFeedback = async () => {
      setLoading(true)
      const data = await fetchAllFeedback()
      setFeedback(data)
      setLoading(false)
    }
    loadFeedback()
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleStatusChange = (id: string, newStatus: FeedbackStatus) => {
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus, updatedAt: new Date().toISOString() } : f))
    )
    if (selectedFeedback?.id === id) {
      setSelectedFeedback((prev) => (prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null))
    }
  }

  const filteredAndSortedFeedback = useMemo(() => {
    let result = [...feedback]

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(term) ||
          f.description.toLowerCase().includes(term) ||
          f.userName?.toLowerCase().includes(term)
      )
    }

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((f) => f.type === filterType)
    }

    // Filter by importance
    if (filterImportance !== 'all') {
      result = result.filter((f) => f.importance === filterImportance)
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((f) => f.status === filterStatus)
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortField) {
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'type':
          aVal = a.type
          bVal = b.type
          break
        case 'importance':
          const importanceOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          aVal = importanceOrder[a.importance]
          bVal = importanceOrder[b.importance]
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [feedback, searchTerm, filterType, filterImportance, filterStatus, sortField, sortDirection])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search feedback..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-primary"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <FormSelect
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as FeedbackType | 'all')}
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
          value={filterImportance}
          onChange={(e) => setFilterImportance(e.target.value as FeedbackImportance | 'all')}
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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FeedbackStatus | 'all')}
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
          {filteredAndSortedFeedback.length} of {feedback.length} items
        </div>
      </div>

      {/* Table */}
      {filteredAndSortedFeedback.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">
            {searchTerm || hasActiveFilters
              ? 'No feedback matches your filters.'
              : 'No feedback submitted yet.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden">
          {/* Table Header - Desktop */}
          <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_120px] gap-4 p-4 border-b border-slate-700 bg-slate-800/50">
            <SortableHeader label="Title" field="title" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label="Type" field="type" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label="Priority" field="importance" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label="Status" field="status" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label="Date" field="createdAt" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-700/50">
            {filteredAndSortedFeedback.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFeedback(f)}
                className="w-full text-left p-4 hover:bg-slate-800/50 transition-colors"
              >
                {/* Desktop Layout */}
                <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_120px] gap-4 items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{f.title}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {f.userName || 'Unknown User'}
                    </div>
                  </div>
                  <Badge className={FEEDBACK_TYPE_COLORS[f.type]}>{f.type}</Badge>
                  <Badge className={FEEDBACK_IMPORTANCE_COLORS[f.importance]}>{f.importance}</Badge>
                  <Badge className={FEEDBACK_STATUS_COLORS[f.status]}>{f.status}</Badge>
                  <div className="text-xs text-slate-400">{formatDate(f.createdAt)}</div>
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-bold text-white">{f.title}</div>
                    <Badge className={FEEDBACK_STATUS_COLORS[f.status]}>{f.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={FEEDBACK_TYPE_COLORS[f.type]}>{f.type}</Badge>
                    <Badge className={FEEDBACK_IMPORTANCE_COLORS[f.importance]}>{f.importance}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{f.userName || 'Unknown User'}</span>
                    <span>{formatDate(f.createdAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedFeedback && (
        <FeedbackDetailPanel
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

