import * as React from 'react'

import type { ItineraryItem } from '../../../types'
import { formatDateLongEnUS, formatTime12h } from '../../../../../lib/ui/utils/datetime'
import { sortByStartTime } from './itinerary'

export function ItinerarySection(props: {
  items: ItineraryItem[]
  showItineraryTimesOnly: boolean
  formatItineraryLocationForDisplay: (location: string | undefined) => { full: string; label: string; isReal: boolean }
  openItineraryLocationInMaps: (locationFull: string) => void
}) {
  const { items, showItineraryTimesOnly, formatItineraryLocationForDisplay, openItineraryLocationInMaps } = props
  const orderedItems = React.useMemo(() => sortByStartTime(items), [items])

  return (
    <div className="space-y-3">
      {orderedItems.map((item) => {
          const start = new Date(item.startTime)
          const end = new Date(start.getTime() + item.durationMinutes * 60_000)
          const time = `${formatTime12h(start)} - ${formatTime12h(end)}`
          const date = formatDateLongEnUS(start)
          const loc = formatItineraryLocationForDisplay(item.location)
          return (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{item.title}</div>
                  <div className="text-sm text-slate-400">{showItineraryTimesOnly ? time : `${date} • ${time}`}</div>
                  {loc.label ? (
                    loc.isReal && loc.full ? (
                      <button
                        type="button"
                        onClick={() => openItineraryLocationInMaps(loc.full)}
                        className="text-sm text-slate-400 truncate underline decoration-slate-600 decoration-dashed hover:text-slate-200 transition-colors text-left"
                        aria-label="Open location in maps"
                      >
                        {loc.label}
                      </button>
                    ) : (
                      <div className="text-sm text-slate-400 truncate">{loc.label}</div>
                    )
                  ) : null}
                </div>
              </div>
              {item.description ? <div className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">{item.description}</div> : null}
            </div>
          )
        })}
    </div>
  )
}


