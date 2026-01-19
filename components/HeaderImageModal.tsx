import React, { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search, X } from 'lucide-react'
import { searchPexelsImages, type PexelsImage } from '../services/pexelsService'

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
  const initialQuery = useMemo(() => defaultQuery?.trim() || '', [defaultQuery])
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<PexelsImage[]>([])
  const [selectedUrl, setSelectedUrl] = useState<string>(initialSelectedUrl ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = async (nextQuery: string) => {
    const q = nextQuery.trim()
    if (!q) {
      setResults([])
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const imgs = await searchPexelsImages(q, { pageSize: 20 })
      setResults(imgs)
    } catch (e: any) {
      setResults([])
      setError(e?.message || 'Search failed.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Auto-search immediately on open using the event title (defaultQuery).
    if (initialQuery) {
      runSearch(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Debounced auto-search while typing.
    const handle = window.setTimeout(() => {
      runSearch(query)
    }, 500)

    return () => {
      window.clearTimeout(handle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-stretch justify-stretch">
      <div className="bg-surface w-full h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/60 shrink-0">
          <h2 className="text-lg font-bold text-white">Choose header image</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" type="button">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(e) => {
              // Allow Enter to trigger an immediate search (in addition to debounce).
              e.preventDefault()
              runSearch(query)
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search images"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-white focus:border-primary outline-none"
              />
            </div>
          </form>

          {error ? (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</div>
          ) : null}

          {!isLoading && results.length === 0 ? (
            <div className="text-sm text-slate-400">No results. Try a different search.</div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((img) => {
              const isSelected = selectedUrl === img.fullUrl
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedUrl(img.fullUrl)}
                  className={`text-left rounded-xl overflow-hidden border transition-colors ${
                    isSelected ? 'border-primary' : 'border-slate-800 hover:border-slate-600'
                  } bg-slate-900/40`}
                >
                  <div className="relative w-full aspect-[16/10] bg-slate-800">
                    <img src={img.thumbnailUrl} alt={img.title} className="w-full h-full object-cover" />
                    {isSelected ? (
                      <div className="absolute inset-0 ring-2 ring-primary pointer-events-none" />
                    ) : null}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-semibold text-white truncate">{img.title || 'Untitled'}</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 truncate">
                        {(img.creator || img.license) ? `${img.creator || 'Unknown'}${img.license ? ` • ${img.license}` : ''}` : ''}
                      </div>
                      {img.sourceUrl ? (
                        <a
                          href={img.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Open source"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/60 flex justify-end items-center shrink-0">
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-5 py-3 rounded-xl text-slate-200 hover:bg-slate-800 text-base font-semibold"
              type="button"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedUrl || isSaving}
              onClick={async () => {
                if (!selectedUrl) return
                setIsSaving(true)
                try {
                  await onUpdate(selectedUrl)
                  onClose()
                } finally {
                  setIsSaving(false)
                }
              }}
              className="w-1/2 sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary text-white text-base font-bold shadow-lg shadow-primary/20"
            >
              {isSaving ? 'Updating…' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


