import * as React from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Trash2 } from 'lucide-react'

import type { ItineraryItem, SocialEvent } from '../../../types'
import { LocationAutocomplete } from '../../../../../lib/ui/components/LocationAutocomplete'
import { FormSelect } from '../../../../../lib/ui/components/FormControls'
import { formatDateLongEnUS, formatTime12h, splitLocalDateTime, toLocalDateTimeInputValue } from '../../../../../lib/ui/utils/datetime'

export function ItineraryEditor(props: {
  event: SocialEvent
  itineraryItems: ItineraryItem[]
  timeOptions: { value: string; label: string }[]
  showItineraryTimesOnly: boolean
  hasItinerary: boolean
  showCreateItinerary: boolean
  setShowCreateItinerary: (next: boolean) => void
  expandedItineraryItemId: string | null
  setExpandedItineraryItemId: (next: string | null) => void
  openItineraryMenuItemId: string | null
  setOpenItineraryMenuItemId: (next: string | null) => void
  draftDate: string
  draftTime: string
  durationHours?: number | ''
  formatItineraryLocationForDisplay: (location: string | undefined) => { full: string; label: string; isReal: boolean }
  openItineraryLocationInMaps: (locationFull: string) => void
  itineraryApi: {
    onAdd: (input: {
      title: string
      startTime: string
      durationMinutes: number
      location?: string
      description?: string
    }) => Promise<string> | string
    onUpdate: (
      id: string,
      patch: Partial<{
        title: string
        startTime: string
        durationMinutes: number
        location?: string
        description?: string
      }>,
    ) => Promise<void> | void
    onDelete: (id: string) => Promise<void> | void
  }
}) {
  const {
    event,
    itineraryItems,
    timeOptions,
    showItineraryTimesOnly,
    hasItinerary,
    showCreateItinerary,
    setShowCreateItinerary,
    expandedItineraryItemId,
    setExpandedItineraryItemId,
    openItineraryMenuItemId,
    setOpenItineraryMenuItemId,
    draftDate,
    draftTime,
    durationHours,
    formatItineraryLocationForDisplay,
    openItineraryLocationInMaps,
    itineraryApi,
  } = props

  const showItineraryBuilder = hasItinerary || showCreateItinerary

  return (
    <div className="space-y-4">
      {!showItineraryBuilder ? (
        <button
          type="button"
          onClick={async () => {
            setShowCreateItinerary(true)
            if (itineraryItems.length > 0) return

            const startIso = draftDate && draftTime ? new Date(`${draftDate}T${draftTime}`).toISOString() : event.startTime

            const durationMinutes = (() => {
              const h = durationHours
              if (typeof h === 'number' && Number.isFinite(h) && h > 0) return Math.max(1, Math.round(h * 60))
              return 60
            })()

            const newId = await itineraryApi.onAdd({
              title: '',
              startTime: startIso,
              durationMinutes,
              location: undefined,
              description: undefined,
            })

            if (typeof newId === 'string') setExpandedItineraryItemId(newId)
          }}
          className="w-full py-3 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
        >
          Create Itinerary
        </button>
      ) : (
        <div className="space-y-3">
          {itineraryItems.length === 0 ? <div className="text-sm text-slate-500 italic">No itinerary items yet.</div> : null}

          {itineraryItems
            .slice()
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((item) => {
              const start = new Date(item.startTime)
              const end = new Date(start.getTime() + item.durationMinutes * 60_000)
              const time = `${formatTime12h(start)} - ${formatTime12h(end)}`
              const date = formatDateLongEnUS(start)
              const loc = formatItineraryLocationForDisplay(item.location)
              const isExpanded = expandedItineraryItemId === item.id

              const { date: itemDate, time: itemTime } = splitLocalDateTime(toLocalDateTimeInputValue(item.startTime))
              const itemDurationHours = Math.round(((item.durationMinutes ?? 0) / 60) * 4) / 4

              return (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/30">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedItineraryItemId(isExpanded ? null : item.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="font-bold text-white truncate">{item.title || 'Untitled item'}</div>
                        <div className="text-sm text-slate-400">{showItineraryTimesOnly ? time : `${date} • ${time}`}</div>
                        {loc.label ? (
                          loc.isReal && loc.full ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openItineraryLocationInMaps(loc.full)
                              }}
                              className="text-sm text-slate-400 truncate underline decoration-slate-600 decoration-dashed hover:text-slate-200 transition-colors text-left"
                              aria-label="Open location in maps"
                            >
                              {loc.label}
                            </button>
                          ) : (
                            <div className="text-sm text-slate-400 truncate">{loc.label}</div>
                          )
                        ) : null}
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenItineraryMenuItemId(openItineraryMenuItemId === item.id ? null : item.id)
                            }}
                            className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                            aria-label="Itinerary item menu"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openItineraryMenuItemId === item.id ? (
                            <div
                              className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-lg z-[2000] overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenItineraryMenuItemId(null)
                                  if (expandedItineraryItemId === item.id) setExpandedItineraryItemId(null)
                                  itineraryApi.onDelete(item.id)
                                }}
                                className="w-full px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedItineraryItemId(isExpanded ? null : item.id)}
                          className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                          aria-label={isExpanded ? 'Collapse item' : 'Expand item'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-800 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Date</div>
                          <input
                            type="date"
                            value={itemDate}
                            onChange={(e) => {
                              const nextDate = e.target.value
                              if (!nextDate || !itemTime) return
                              itineraryApi.onUpdate(item.id, { startTime: new Date(`${nextDate}T${itemTime}`).toISOString() })
                            }}
                            className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none [color-scheme:dark] border-slate-700 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Time</div>
                          <FormSelect
                            value={itemTime}
                            onChange={(e) => {
                              const nextTime = e.target.value
                              if (!itemDate || !nextTime) return
                              itineraryApi.onUpdate(item.id, { startTime: new Date(`${itemDate}T${nextTime}`).toISOString() })
                            }}
                            required
                            size="lg"
                            variant="surface"
                          >
                            <option value="">Select time</option>
                            {timeOptions.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </FormSelect>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Duration (hours)</div>
                          <input
                            type="number"
                            min={0.25}
                            step={0.25}
                            value={itemDurationHours}
                            onChange={(e) =>
                              itineraryApi.onUpdate(item.id, {
                                durationMinutes: Math.max(1, Math.round(Number(e.target.value || 0) * 60)),
                              })
                            }
                            className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
                            placeholder="e.g. 1.5"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Title</div>
                          <input
                            value={item.title}
                            onChange={(e) => itineraryApi.onUpdate(item.id, { title: e.target.value })}
                            className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
                            placeholder="e.g. Meet up"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Location (optional)</div>
                          <LocationAutocomplete
                            value={item.location ?? ''}
                            onChangeText={(text) => itineraryApi.onUpdate(item.id, { location: text || undefined })}
                            onSelect={(selection) => itineraryApi.onUpdate(item.id, { location: selection.locationData.display.full })}
                            placeholder="Location (optional)"
                            className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Description (optional)</div>
                        <textarea
                          value={item.description ?? ''}
                          onChange={(e) => itineraryApi.onUpdate(item.id, { description: e.target.value || undefined })}
                          className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary h-20 resize-none"
                          placeholder="Notes, links, what to bring..."
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}

          <button
            type="button"
            onClick={async () => {
              const sorted = itineraryItems
                .slice()
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              const last = sorted[sorted.length - 1]
              const defaultStartIso = last
                ? new Date(new Date(last.startTime).getTime() + last.durationMinutes * 60_000).toISOString()
                : new Date().toISOString()

              const newId = await itineraryApi.onAdd({
                title: '',
                startTime: defaultStartIso,
                durationMinutes: 60,
                location: undefined,
                description: undefined,
              })

              if (typeof newId === 'string') setExpandedItineraryItemId(newId)
            }}
            className="w-full py-3 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
          >
            Add Item
          </button>
        </div>
      )}
    </div>
  )
}


