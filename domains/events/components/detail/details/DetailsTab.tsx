

import type { User } from '../../../../../lib/types'
import type { LocationSuggestion } from '../../../../../lib/ui/components/LocationAutocomplete'
import type { ItineraryItem, SocialEvent } from '../../../types'
import type { Person, EventExpense, ExpenseApi } from '../expenses/types'
import type { DraftStartDateTimeLocalModel } from '../../../hooks/useDraftStartDateTimeLocal'
import type { EventDateTimeModel } from '../utils/eventDateTimeModel'
import { buildGoogleMapsSearchUrl } from '../maps/maps'
import { openExternalUrl } from '../../../../../lib/ui/utils/openExternalUrl'
import { formatItineraryLocationForDisplay, formatRawLocationForDisplay } from '../utils/locationDisplay'
import { TitleCard } from './TitleCard'
import { AboutCard } from './AboutCard'
import { DateTimeCard } from './DateTimeCard'
import { ItineraryCard } from './ItineraryCard'
import { LocationCard } from './LocationCard'
import { ExpensesCard } from '../expenses/ExpensesCard'
import { ItineraryEditor } from '../itineraries/ItineraryEditor'
import { ItinerarySection } from '../itineraries/ItinerarySection'

type DetailsTabEditModel = {
  errors?: Partial<Record<'title' | 'description' | 'startTime' | 'location' | 'activityType' | 'durationHours', string>>
  durationHours?: number | ''
  onChangeDurationHours?: (value: number | '') => void
  onChange: (patch: Partial<SocialEvent>) => void
  itinerary?: {
    items: ItineraryItem[]
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
}

type DetailsTabProps = {
  event: SocialEvent
  isEditMode: boolean
  isGuest: boolean
  onRequireAuth?: () => void
  currentUserId?: string
  hostId?: string
  expenses: EventExpense[]
  expenseApi?: ExpenseApi
  people: Person[]
  itineraryItems: ItineraryItem[]
  hasItinerary: boolean
  dateTime: EventDateTimeModel
  draftStart: DraftStartDateTimeLocalModel
  edit?: DetailsTabEditModel
  showItineraryStartTimeOnly: boolean
  onChangeItineraryStartTimeOnly: (next: boolean) => void
  canManageItineraryAttendance: boolean
  onOpenItineraryAttendance: () => void
  hasCurrentAttendance: boolean
  attendanceByItem?: Map<string, User[]>
}

export function DetailsTab(props: DetailsTabProps) {
  const {
    event,
    isEditMode,
    isGuest,
    onRequireAuth,
    currentUserId,
    hostId,
    expenses,
    expenseApi,
    people,
    itineraryItems,
    hasItinerary,
    dateTime,
    draftStart,
    edit,
    showItineraryStartTimeOnly,
    onChangeItineraryStartTimeOnly,
    canManageItineraryAttendance,
    onOpenItineraryAttendance,
    hasCurrentAttendance,
    attendanceByItem,
  } = props

  const openItineraryLocationInMaps = (locationFull: string) => {
    const q = String(locationFull ?? '').trim()
    if (!q) return
    openExternalUrl(buildGoogleMapsSearchUrl(q))
  }

  return (
    <div className="space-y-4">
      <TitleCard
        isEditMode={isEditMode}
        title={event.title}
        activityType={event.activityType}
        onChangeTitle={(next) => edit?.onChange({ title: next })}
        onChangeActivityType={(next) => edit?.onChange({ activityType: next })}
        errors={isEditMode ? { title: edit?.errors?.title, activityType: edit?.errors?.activityType } : undefined}
      />

      <AboutCard
        isEditMode={isEditMode}
        description={event.description}
        onChangeDescription={(next) => edit?.onChange({ description: next })}
        error={isEditMode ? edit?.errors?.description : undefined}
      />

      {!isEditMode && <hr className="border-slate-700" />}

      <DateTimeCard
        isEditMode={isEditMode}
        hasItinerary={hasItinerary}
        dateTime={dateTime}
        isFlexibleStart={event.isFlexibleStart}
        draft={draftStart}
        durationHours={edit?.durationHours}
        onChangeDurationHours={edit?.onChangeDurationHours}
        errorStartTime={isEditMode ? edit?.errors?.startTime : undefined}
        errorDurationHours={isEditMode ? edit?.errors?.durationHours : undefined}
      />

      {!isEditMode && hasItinerary && <hr className="border-slate-700" />}

      {isEditMode || hasItinerary ? (
        <ItineraryCard
          isEditMode={isEditMode}
          showItineraryStartTimeOnly={showItineraryStartTimeOnly}
          onChangeItineraryStartTimeOnly={onChangeItineraryStartTimeOnly}
          headerActions={
            canManageItineraryAttendance ? (
              <button
                type="button"
                onClick={onOpenItineraryAttendance}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {hasCurrentAttendance ? 'Edit selections' : 'Choose items'}
              </button>
            ) : null
          }
        >
          {isEditMode ? (
            edit?.itinerary ? (
              <ItineraryEditor
                event={event}
                itineraryItems={itineraryItems}
                showItineraryTimesOnly={dateTime.showItineraryTimesOnly}
                showItineraryStartTimeOnly={showItineraryStartTimeOnly}
                hasItinerary={hasItinerary}
                draftStartIso={draftStart.draftStartIso}
                durationHours={edit?.durationHours}
                formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
                openItineraryLocationInMaps={openItineraryLocationInMaps}
                itineraryApi={edit.itinerary}
              />
            ) : (
              <div className="text-sm text-slate-500 italic">Itinerary editing is unavailable.</div>
            )
          ) : (
            <ItinerarySection
              items={itineraryItems}
              showItineraryTimesOnly={dateTime.showItineraryTimesOnly}
              showItineraryStartTimeOnly={showItineraryStartTimeOnly}
              formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
              openItineraryLocationInMaps={openItineraryLocationInMaps}
              attendanceByItem={event.itineraryAttendanceEnabled ? attendanceByItem : undefined}
            />
          )}
        </ItineraryCard>
      ) : null}

      {!isEditMode && <hr className="border-slate-700" />}

      <LocationCard
        itineraryItems={itineraryItems}
        formatRawLocationForDisplay={formatRawLocationForDisplay}
        formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
        onOpenItineraryLocationInMaps={openItineraryLocationInMaps}
        activityType={event.activityType}
        title={event.title || 'Map'}
        eventLocation={event.location}
        eventLocationData={event.locationData}
        eventCoordinates={event.coordinates}
        isEditMode={isEditMode}
        locationValue={event.location}
        onChangeLocationText={(text) =>
          edit?.onChange({ location: text, coordinates: undefined, locationData: undefined })
        }
        onSelectLocation={(selection: LocationSuggestion) =>
          edit?.onChange({
            location: selection.locationData.display.full,
            coordinates: {
              lat: selection.locationData.geo.lat,
              lng: selection.locationData.geo.lng,
            },
            locationData: selection.locationData,
          })
        }
        locationError={isEditMode ? edit?.errors?.location : undefined}
      />

      {!isEditMode && <hr className="border-slate-700" />}

      <ExpensesCard
        isEditMode={isEditMode}
        isGuest={isGuest}
        onRequireAuth={onRequireAuth}
        currentUserId={currentUserId}
        hostId={hostId}
        expenses={expenses}
        expenseApi={expenseApi}
        people={people}
        itineraryItems={itineraryItems}
      />
    </div>
  )
}
