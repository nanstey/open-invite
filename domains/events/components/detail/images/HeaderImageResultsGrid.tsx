

import { ExternalLink } from 'lucide-react'

import type { PexelsImage } from '../../../../../services/pexelsService'

type HeaderImageResultsGridProps = {
  results: PexelsImage[]
  selectedUrl: string
  onSelect: (url: string) => void
}

export function HeaderImageResultsGrid(props: HeaderImageResultsGridProps) {
  const { results, selectedUrl, onSelect } = props

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((img) => {
        const isSelected = selectedUrl === img.fullUrl
        const credit = getImageCredit(img)
        return (
          <button
            key={img.id}
            type="button"
            onClick={() => onSelect(img.fullUrl)}
            className={`text-left rounded-xl overflow-hidden border transition-colors ${
              isSelected ? 'border-primary' : 'border-slate-800 hover:border-slate-600'
            } bg-slate-900/40`}
          >
            <div className="relative w-full aspect-[16/10] bg-slate-800">
              <img src={img.thumbnailUrl} alt={img.title} className="w-full h-full object-cover" />
              {isSelected ? <div className="absolute inset-0 ring-2 ring-primary pointer-events-none" /> : null}
            </div>
            <div className="p-2">
              <div className="text-xs font-semibold text-white truncate">{img.title || 'Untitled'}</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 truncate">{credit}</div>
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
  )
}

function getImageCredit(image: PexelsImage): string {
  if (!image.creator && !image.license) return ''
  if (image.creator && image.license) return `${image.creator} • ${image.license}`
  return image.creator || image.license || ''
}
