import React from 'react'
import { useHeaderImageSearch } from '../../../hooks/useHeaderImageSearch'
import { useHeaderImageSelection } from '../../../hooks/useHeaderImageSelection'
import { HeaderImageModalHeader } from './HeaderImageModalHeader'
import { HeaderImageSearchForm } from './HeaderImageSearchForm'
import { HeaderImageResultsGrid } from './HeaderImageResultsGrid'
import { HeaderImageModalFooter } from './HeaderImageModalFooter'

type HeaderImageModalProps = {
  defaultQuery: string
  initialSelectedUrl?: string
  onClose: () => void
  onUpdate: (imageUrl: string) => Promise<void> | void
}

export const HeaderImageModal: React.FC<HeaderImageModalProps> = ({
  defaultQuery,
  initialSelectedUrl,
  onClose,
  onUpdate,
}) => {
  const { query, setQuery, results, isLoading, error, runSearch } = useHeaderImageSearch(defaultQuery)
  const { selectedUrl, setSelectedUrl, isSaving, handleConfirm } = useHeaderImageSelection({
    initialSelectedUrl,
    onUpdate,
    onClose,
  })

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-stretch justify-stretch">
      <div className="bg-surface w-full h-full overflow-hidden flex flex-col">
        <HeaderImageModalHeader title="Choose header image" onClose={onClose} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
          <HeaderImageSearchForm
            query={query}
            onQueryChange={setQuery}
            onSubmit={() => runSearch(query)}
          />

          {error ? (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</div>
          ) : null}

          {!isLoading && results.length === 0 ? (
            <div className="text-sm text-slate-400">No results. Try a different search.</div>
          ) : null}

          <HeaderImageResultsGrid
            results={results}
            selectedUrl={selectedUrl}
            onSelect={setSelectedUrl}
          />
        </div>

        {/* Footer */}
        <HeaderImageModalFooter
          onCancel={onClose}
          onConfirm={handleConfirm}
          isSaving={isSaving}
          canSave={!!selectedUrl}
        />
      </div>
    </div>
  )
}

