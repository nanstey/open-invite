import { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { SearchInput } from '../../../../lib/ui/components/SearchInput'
import { fetchAllFeedbackSimple } from '../../../../services/feedbackProjectService'
import { FEEDBACK_TYPE_COLORS, FEEDBACK_IMPORTANCE_COLORS, type SimpleFeedbackItem } from '../../types'

export interface FeedbackPickerProps {
  /** Currently selected feedback IDs */
  selectedIds: string[]
  /** Toggle selection of a feedback item */
  onToggle: (feedbackId: string) => void
  /** Feedback IDs to exclude from the list */
  excludeIds?: string[]
}

/**
 * Multi-select picker for feedback items.
 * Used in project creation and project detail panels.
 */
export function FeedbackPicker({ selectedIds, onToggle, excludeIds = [] }: FeedbackPickerProps) {
  const [feedbackItems, setFeedbackItems] = useState<SimpleFeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadFeedback()
  }, [])

  const loadFeedback = async () => {
    setLoading(true)
    const items = await fetchAllFeedbackSimple()
    setFeedbackItems(items)
    setLoading(false)
  }

  const filteredItems = feedbackItems
    .filter(item => !excludeIds.includes(item.id))
    .filter(item =>
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <SearchInput
        size="sm"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search feedback..."
      />

      {/* Feedback list */}
      <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-900 rounded-lg p-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-sm">
            {searchQuery ? 'No matching feedback' : 'No feedback available'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'bg-primary/20 border border-primary/50'
                    : 'hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div
                  className={`w-4 h-4 mt-0.5 shrink-0 rounded border flex items-center justify-center ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{item.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${
                        FEEDBACK_TYPE_COLORS[item.type] || 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${
                        FEEDBACK_IMPORTANCE_COLORS[item.importance] || 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {item.importance}
                    </span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="text-xs text-slate-400">
          {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}

