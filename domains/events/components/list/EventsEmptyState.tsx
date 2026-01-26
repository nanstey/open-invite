import React from 'react'

type EventsEmptyStateProps = {
  onClearFilters: () => void
}

export function EventsEmptyState({ onClearFilters }: EventsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
      <div className="text-4xl mb-4">🌪️</div>
      <p>No events found matching your filters.</p>
      <button onClick={onClearFilters} className="mt-2 text-primary hover:underline" type="button">
        Clear Filters
      </button>
    </div>
  )
}


