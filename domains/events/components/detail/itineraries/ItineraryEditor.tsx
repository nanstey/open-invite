import * as React from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Trash2 } from 'lucide-react'

import type { ItineraryItem, SocialEvent } from '../../../types'
import { DateTimeFields } from '../../../../../lib/ui/components/DateTimeFields'
import { LocationAutocomplete } from '../../../../../lib/ui/components/LocationAutocomplete'
import { Button } from '../../../../../lib/ui/9ui/button'
import { Card } from '../../../../../lib/ui/9ui/card'
import { Input } from '../../../../../lib/ui/9ui/input'
import { Textarea } from '../../../../../lib/ui/9ui/textarea'
import { buildQuarterHourTimeOptions } from '../../../../../lib/ui/utils/datetime'
import { formatDateLongEnUS, formatTime12h, splitLocalDateTime, toLocalDateTimeInputValue } from '../../../../../lib/ui/utils/datetime'
import {
  durationHoursToMinutes,
  getItineraryItemEndDate,
  getNextItineraryItemStartIso,
  minutesToQuarterHourHours,
  sortByStartTime} from './itinerary'
import { useOutsideClick } from '../../../hooks/useOutsideClick'

type ItineraryApi = {
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

type ItineraryEditorProps = {
  event: SocialEvent
  itineraryItems: ItineraryItem[]
  showItineraryTimesOnly: boolean
  showItineraryStartTimeOnly: boolean
  hasItinerary: boolean
  draftStartIso: string | null
  durationHours?: number | ''
  formatItineraryLocationForDisplay: (location: string | undefined) => { full: string; label: string; isReal: boolean }
  openItineraryLocationInMaps: (locationFull: string) => void
  itineraryApi: ItineraryApi
}

export function ItineraryEditor(props: ItineraryEditorProps) {
  const {
    event,
    itineraryItems,
    showItineraryTimesOnly,
    showItineraryStartTimeOnly,
    hasItinerary,
    draftStartIso,
    durationHours,
    formatItineraryLocationForDisplay,
    openItineraryLocationInMaps,
    itineraryApi} = props

  const timeOptions = React.useMemo(() => buildQuarterHourTimeOptions(), [])

  const [showCreateItinerary, setShowCreateItinerary] = React.useState(false)
  const [expandedItineraryItemId, setExpandedItineraryItemId] = React.useState<string | null>(null)
  const [openItineraryMenuItemId, setOpenItineraryMenuItemId] = React.useState<string | null>(null)

  useOutsideClick({
    enabled: !!openItineraryMenuItemId,
    onOutsideClick: () => setOpenItineraryMenuItemId(null)})

  // If the parent clears the itinerary list, reset local UI state.
  React.useEffect(() => {
    if (itineraryItems.length !== 0) return
    setShowCreateItinerary(false)
    setExpandedItineraryItemId(null)
    setOpenItineraryMenuItemId(null)
  }, [itineraryItems.length])

  const showItineraryBuilder = hasItinerary || showCreateItinerary
  const orderedItems = React.useMemo(() => sortByStartTime(itineraryItems), [itineraryItems])

  const handleCreateItinerary = React.useCallback(async () => {
    setShowCreateItinerary(true)
    if (itineraryItems.length > 0) return

    const startIso = draftStartIso ?? event.startTime
    const durationMinutes = durationHoursToMinutes(durationHours, 60)

    const newId = await itineraryApi.onAdd({
      title: '',
      startTime: startIso,
      durationMinutes,
      location: undefined,
      description: undefined})

    if (typeof newId === 'string') setExpandedItineraryItemId(newId)
  }, [draftStartIso, durationHours, event.startTime, itineraryApi, itineraryItems.length])

  const toggleExpanded = React.useCallback((id: string) => {
    setExpandedItineraryItemId((prev) => (prev === id ? null : id))
  }, [])

  const toggleMenu = React.useCallback((id: string) => {
    setOpenItineraryMenuItemId((prev) => (prev === id ? null : id))
  }, [])

  const closeMenu = React.useCallback(() => setOpenItineraryMenuItemId(null), [])

  const handleDeleteItem = React.useCallback(
    (id: string) => {
      setOpenItineraryMenuItemId(null)
      setExpandedItineraryItemId((prev) => (prev === id ? null : prev))
      itineraryApi.onDelete(id)
    },
    [itineraryApi],
  )

  const handleAddItem = React.useCallback(async () => {
    const defaultStartIso = getNextItineraryItemStartIso(orderedItems, new Date().toISOString())

    const newId = await itineraryApi.onAdd({
      title: '',
      startTime: defaultStartIso,
      durationMinutes: 60,
      location: undefined,
      description: undefined})

    if (typeof newId === 'string') setExpandedItineraryItemId(newId)
  }, [itineraryApi, orderedItems])

  return (
    <div className="space-y-4">
      {!showItineraryBuilder ? (
        <CreateItineraryButton onClick={handleCreateItinerary} />
      ) : (
        <ItineraryBuilder
          itineraryItems={itineraryItems}
          orderedItems={orderedItems}
          expandedItineraryItemId={expandedItineraryItemId}
          openItineraryMenuItemId={openItineraryMenuItemId}
          showItineraryTimesOnly={showItineraryTimesOnly}
          showItineraryStartTimeOnly={showItineraryStartTimeOnly}
          timeOptions={timeOptions}
          formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
          openItineraryLocationInMaps={openItineraryLocationInMaps}
          itineraryApi={itineraryApi}
          onToggleExpanded={toggleExpanded}
          onToggleMenu={toggleMenu}
          onCloseMenu={closeMenu}
          onDeleteItem={handleDeleteItem}
          onAddItem={handleAddItem}
        />
      )}
    </div>
  )
}

function CreateItineraryButton(props: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="w-full py-3 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
    >
      Create Itinerary
    </button>
  )
}

function ItineraryBuilder(props: {
  itineraryItems: ItineraryItem[]
  orderedItems: ItineraryItem[]
  expandedItineraryItemId: string | null
  openItineraryMenuItemId: string | null
  showItineraryTimesOnly: boolean
  showItineraryStartTimeOnly: boolean
  timeOptions: Array<{ value: string; label: string }>
  formatItineraryLocationForDisplay: (location: string | undefined) => { full: string; label: string; isReal: boolean }
  openItineraryLocationInMaps: (locationFull: string) => void
  itineraryApi: ItineraryApi
  onToggleExpanded: (id: string) => void
  onToggleMenu: (id: string) => void
  onCloseMenu: () => void
  onDeleteItem: (id: string) => void
  onAddItem: () => void
}) {
  const {
    itineraryItems,
    orderedItems,
    expandedItineraryItemId,
    openItineraryMenuItemId,
    showItineraryTimesOnly,
    showItineraryStartTimeOnly,
    timeOptions,
    formatItineraryLocationForDisplay,
    openItineraryLocationInMaps,
    itineraryApi,
    onToggleExpanded,
    onToggleMenu,
    onCloseMenu,
    onDeleteItem,
    onAddItem} = props

  return (
    <div className="space-y-3">
      {itineraryItems.length === 0 ? <div className="text-sm text-slate-500 italic">No itinerary items yet.</div> : null}

      {orderedItems.map((item) => (
        <ItineraryItemCard
          key={item.id}
          item={item}
          isExpanded={expandedItineraryItemId === item.id}
          isMenuOpen={openItineraryMenuItemId === item.id}
          showItineraryTimesOnly={showItineraryTimesOnly}
          showItineraryStartTimeOnly={showItineraryStartTimeOnly}
          timeOptions={timeOptions}
          formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
          openItineraryLocationInMaps={openItineraryLocationInMaps}
          onToggleExpanded={() => onToggleExpanded(item.id)}
          onToggleMenu={() => onToggleMenu(item.id)}
          onCloseMenu={onCloseMenu}
          onDelete={() => onDeleteItem(item.id)}
          onUpdate={(patch) => itineraryApi.onUpdate(item.id, patch)}
        />
      ))}

      <Button
        type="button"
        onClick={onAddItem}
        className="w-full py-3 font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
      >
        Add Item
      </Button>
    </div>
  )
}

function ItineraryItemCard(props: {
  // `key` is a special React prop; some TS setups still want it declared explicitly on local components.
  key?: React.Key
  item: ItineraryItem
  isExpanded: boolean
  isMenuOpen: boolean
  showItineraryTimesOnly: boolean
  showItineraryStartTimeOnly: boolean
  timeOptions: Array<{ value: string; label: string }>
  formatItineraryLocationForDisplay: (location: string | undefined) => { full: string; label: string; isReal: boolean }
  openItineraryLocationInMaps: (locationFull: string) => void
  onToggleExpanded: () => void
  onToggleMenu: () => void
  onCloseMenu: () => void
  onDelete: () => void
  onUpdate: (
    patch: Partial<{
      title: string
      startTime: string
      durationMinutes: number
      location?: string
      description?: string
    }>,
  ) => Promise<void> | void
}) {
  const {
    item,
    isExpanded,
    isMenuOpen,
    showItineraryTimesOnly,
    showItineraryStartTimeOnly,
    timeOptions,
    formatItineraryLocationForDisplay,
    openItineraryLocationInMaps,
    onToggleExpanded,
    onToggleMenu,
    onCloseMenu,
    onDelete,
    onUpdate} = props

  const start = new Date(item.startTime)
  const end = getItineraryItemEndDate(item)
  const time = showItineraryStartTimeOnly ? formatTime12h(start) : `${formatTime12h(start)} - ${formatTime12h(end)}`
  const date = formatDateLongEnUS(start)
  const loc = formatItineraryLocationForDisplay(item.location)

  const { date: itemDate, time: itemTime } = splitLocalDateTime(toLocalDateTimeInputValue(item.startTime))
  const itemDurationHours = minutesToQuarterHourHours(item.durationMinutes)

  return (
    <Card className="rounded-xl border border-slate-800 bg-slate-900/30">
      <div className="p-4">
        <ItineraryItemHeader
          title={item.title}
          dateLabel={date}
          timeLabel={time}
          showItineraryTimesOnly={showItineraryTimesOnly}
          location={loc}
          openItineraryLocationInMaps={openItineraryLocationInMaps}
          isExpanded={isExpanded}
          isMenuOpen={isMenuOpen}
          onToggleExpanded={onToggleExpanded}
          onToggleMenu={onToggleMenu}
          onCloseMenu={onCloseMenu}
          onDelete={onDelete}
        />
      </div>

      {isExpanded ? (
        <ItineraryItemFields
          item={item}
          itemDate={itemDate}
          itemTime={itemTime}
          itemDurationHours={itemDurationHours}
          timeOptions={timeOptions}
          onUpdate={onUpdate}
        />
      ) : null}
    </Card>
  )
}

function ItineraryItemHeader(props: {
  title: string
  dateLabel: string
  timeLabel: string
  showItineraryTimesOnly: boolean
  location: { full: string; label: string; isReal: boolean }
  openItineraryLocationInMaps: (locationFull: string) => void
  isExpanded: boolean
  isMenuOpen: boolean
  onToggleExpanded: () => void
  onToggleMenu: () => void
  onCloseMenu: () => void
  onDelete: () => void
}) {
  const {
    title,
    dateLabel,
    timeLabel,
    showItineraryTimesOnly,
    location,
    openItineraryLocationInMaps,
    isExpanded,
    isMenuOpen,
    onToggleExpanded,
    onToggleMenu,
    onCloseMenu,
    onDelete} = props

  return (
    <div className="flex items-start justify-between gap-3">
      <ItineraryItemSummary
        title={title}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        showItineraryTimesOnly={showItineraryTimesOnly}
        location={location}
        openItineraryLocationInMaps={openItineraryLocationInMaps}
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
      />

      <ItineraryItemActions
        isExpanded={isExpanded}
        isMenuOpen={isMenuOpen}
        onToggleExpanded={onToggleExpanded}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
        onDelete={onDelete}
      />
    </div>
  )
}

function ItineraryItemSummary(props: {
  title: string
  dateLabel: string
  timeLabel: string
  showItineraryTimesOnly: boolean
  location: { full: string; label: string; isReal: boolean }
  openItineraryLocationInMaps: (locationFull: string) => void
  isExpanded: boolean
  onToggleExpanded: () => void
}) {
  const {
    title,
    dateLabel,
    timeLabel,
    showItineraryTimesOnly,
    location,
    openItineraryLocationInMaps,
    isExpanded,
    onToggleExpanded} = props

  return (
    <div
      className="min-w-0 flex-1 text-left cursor-pointer"
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={onToggleExpanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggleExpanded()
        }
      }}
    >
      <div className="font-bold text-white truncate">{title || 'Untitled item'}</div>
      <div className="text-sm text-slate-400">{showItineraryTimesOnly ? timeLabel : `${dateLabel} • ${timeLabel}`}</div>
      {location.label ? (
        location.isReal && location.full ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openItineraryLocationInMaps(location.full)
            }}
            className="text-sm text-slate-400 truncate underline decoration-slate-600 decoration-dashed hover:text-slate-200 transition-colors text-left"
            aria-label="Open location in maps"
          >
            {location.label}
          </button>
        ) : (
          <div className="text-sm text-slate-400 truncate">{location.label}</div>
        )
      ) : null}
    </div>
  )
}

function ItineraryItemActions(props: {
  isExpanded: boolean
  isMenuOpen: boolean
  onToggleExpanded: () => void
  onToggleMenu: () => void
  onCloseMenu: () => void
  onDelete: () => void
}) {
  const { isExpanded, isMenuOpen, onToggleExpanded, onToggleMenu, onCloseMenu, onDelete } = props

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleMenu()
          }}
          className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          aria-label="Itinerary item menu"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isMenuOpen ? (
          <div
            className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-lg z-[2000] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                onCloseMenu()
                onDelete()
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
        onClick={onToggleExpanded}
        className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
        aria-label={isExpanded ? 'Collapse item' : 'Expand item'}
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
    </div>
  )
}

function ItineraryItemFields(props: {
  item: ItineraryItem
  itemDate: string
  itemTime: string
  itemDurationHours: number
  timeOptions: Array<{ value: string; label: string }>
  onUpdate: (
    patch: Partial<{
      title: string
      startTime: string
      durationMinutes: number
      location?: string
      description?: string
    }>,
  ) => Promise<void> | void
}) {
  const { item, itemDate, itemTime, itemDurationHours, timeOptions, onUpdate } = props

  return (
    <div className="border-t border-slate-800 p-4 space-y-3">
      <DateTimeFields
        date={itemDate}
        time={itemTime}
        durationHours={itemDurationHours}
        timeOptions={timeOptions}
        size="compact"
        minDurationHours={0.25}
        durationStepHours={0.25}
        durationPlaceholder="e.g. 1.5"
        onChangeDate={(nextDate) => {
          if (!nextDate || !itemTime) return
          onUpdate({ startTime: new Date(`${nextDate}T${itemTime}`).toISOString() })
        }}
        onChangeTime={(nextTime) => {
          if (!itemDate || !nextTime) return
          onUpdate({ startTime: new Date(`${itemDate}T${nextTime}`).toISOString() })
        }}
        onChangeDurationHours={(next) =>
          onUpdate({
            durationMinutes: Math.max(1, Math.round(Number(next || 0) * 60))})
        }
      />

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Title</div>
          <Input
            value={item.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
            placeholder="e.g. Meet up"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Location (optional)</div>
          <LocationAutocomplete
            value={item.location ?? ''}
            onChangeText={(text) => onUpdate({ location: text || undefined })}
            onSelect={(selection) => onUpdate({ location: selection.locationData.display.full })}
            placeholder="Location (optional)"
            className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Description (optional)</div>
        <Textarea
          value={item.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value || undefined })}
          className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary h-20 resize-none"
          placeholder="Notes, links, what to bring..."
        />
      </div>
    </div>
  )
}
