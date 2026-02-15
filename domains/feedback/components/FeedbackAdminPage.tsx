import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, FolderKanban } from 'lucide-react'
import { fetchAllFeedback } from '../../../services/feedbackService'
import { fetchAllFeedbackProjectMappings, type FeedbackProjectMapping } from '../../../services/feedbackProjectService'
import { FeedbackDetailPanel } from './feedback/FeedbackDetailPanel'
import { FeedbackRow } from './feedback/FeedbackRow'
import { FeedbackFilterBar, DEFAULT_FILTERS, hasActiveFilters, type FeedbackFilters } from './feedback/FeedbackFilterBar'
import { SearchInput } from '../../../lib/ui/components/SearchInput'
import { SortableHeader, useSort } from '../../../lib/ui/components/SortableHeader'
import type { Feedback, FeedbackStatus } from '../types'

type SortField = 'createdAt' | 'title' | 'type' | 'importance' | 'status'

export interface FeedbackAdminPageProps {
  initialFeedbackId?: string
}

export function FeedbackAdminPage({ initialFeedbackId }: FeedbackAdminPageProps) {
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [projectMappings, setProjectMappings] = useState<FeedbackProjectMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [initialFeedbackHandled, setInitialFeedbackHandled] = useState(false)
  const [filters, setFilters] = useState<FeedbackFilters>(DEFAULT_FILTERS)
  
  const { sortField, sortDirection, handleSort } = useSort<SortField>('createdAt', 'desc')

  // Helper to get projects for a feedback item
  const getProjectsForFeedback = (feedbackId: string) => {
    return projectMappings.filter(m => m.feedbackId === feedbackId)
  }

  // Auto-open feedback if initialFeedbackId is provided
  useEffect(() => {
    if (initialFeedbackId && feedback.length > 0 && !initialFeedbackHandled) {
      const item = feedback.find(f => f.id === initialFeedbackId)
      if (item) {
        setSelectedFeedback(item)
      }
      setInitialFeedbackHandled(true)
    }
  }, [initialFeedbackId, feedback, initialFeedbackHandled])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const [feedbackData, mappingsData] = await Promise.all([
        fetchAllFeedback(),
        fetchAllFeedbackProjectMappings(),
      ])
      setFeedback(feedbackData)
      setProjectMappings(mappingsData)
      setLoading(false)
    }
    loadData()
  }, [])

  const handleStatusChange = (id: string, newStatus: FeedbackStatus) => {
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus, updatedAt: new Date().toISOString() } : f))
    )
    if (selectedFeedback?.id === id) {
      setSelectedFeedback((prev) => (prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null))
    }
  }

  const handleProjectsChange = async () => {
    const mappingsData = await fetchAllFeedbackProjectMappings()
    setProjectMappings(mappingsData)
  }

  const handleProjectClick = (projectId: string) => {
    navigate({ to: '/admin/projects', search: { projectId } })
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

    // Apply filters
    if (filters.type !== 'all') {
      result = result.filter((f) => f.type === filters.type)
    }
    if (filters.importance !== 'all') {
      result = result.filter((f) => f.importance === filters.importance)
    }
    if (filters.status !== 'all') {
      result = result.filter((f) => f.status === filters.status)
    }
    if (filters.project !== 'all') {
      const feedbackIdsWithProjects = new Set(projectMappings.map(m => m.feedbackId))
      if (filters.project === 'has') {
        result = result.filter((f) => feedbackIdsWithProjects.has(f.id))
      } else if (filters.project === 'none') {
        result = result.filter((f) => !feedbackIdsWithProjects.has(f.id))
      }
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
  }, [feedback, searchTerm, filters, projectMappings, sortField, sortDirection])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const isFiltered = searchTerm || hasActiveFilters(filters)

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      {/* Search */}
      <div className="my-4">
        <SearchInput
          size="lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search feedback..."
        />
      </div>

      {/* Filters */}
      <FeedbackFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={feedback.length}
        filteredCount={filteredAndSortedFeedback.length}
      />

      {/* Table */}
      {filteredAndSortedFeedback.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">
            {isFiltered
              ? 'No feedback matches your filters.'
              : 'No feedback submitted yet.'}
          </p>
          {hasActiveFilters(filters) && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-3 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden">
          {/* Table Header - Desktop */}
          <div className="hidden md:grid grid-cols-[1fr_180px_100px_100px_100px_100px] gap-4 p-4 border-b border-slate-700 bg-slate-800/50">
            <SortableHeader label="Title" field="title" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
            <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              <FolderKanban className="w-3 h-3" />
              Project
            </div>
            <SortableHeader label="Type" field="type" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label="Priority" field="importance" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label="Status" field="status" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
            <SortableHeader label="Date" field="createdAt" currentSort={sortField} direction={sortDirection} onSort={handleSort} />
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-700/50">
            {filteredAndSortedFeedback.map((f) => (
              <FeedbackRow
                key={f.id}
                feedback={f}
                projectMappings={getProjectsForFeedback(f.id)}
                onClick={() => setSelectedFeedback(f)}
                onProjectClick={handleProjectClick}
              />
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
          onProjectsChange={handleProjectsChange}
        />
      )}
    </div>
  )
}
