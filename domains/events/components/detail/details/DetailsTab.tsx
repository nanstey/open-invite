import * as React from 'react';
import type { Group, User } from '../../../../../lib/types';
import type { LocationSuggestion } from '../../../../../lib/ui/components/LocationAutocomplete';
import { openExternalUrl } from '../../../../../lib/ui/utils/openExternalUrl';
import type { ItineraryItem, SocialEvent } from '../../../types';
import { ExpensesCard } from '../expenses/ExpensesCard';
import type { EventExpense, ExpenseApi, Person } from '../expenses/types';
import { CapacityCard } from '../guests/CapacityCard';
import { GuestsSettingsCard } from '../guests/GuestsSettingsCard';
import { ScheduleEditor } from '../itineraries/ScheduleEditor';
import { ScheduleSection } from '../itineraries/ScheduleSection';
import { buildGoogleMapsSearchUrl } from '../maps/maps';
import type { EventDateTimeModel } from '../utils/eventDateTimeModel';
import {
  formatItineraryLocationForDisplay,
  formatRawLocationForDisplay,
} from '../utils/locationDisplay';
import { AboutCard } from './AboutCard';
import { DateTimeCard } from './DateTimeCard';
import { LocationCard } from './LocationCard';
import { ScheduleCard } from './ScheduleCard';
import { TitleCard } from './TitleCard';

type DetailsTabEditModel = {
  errors?: Partial<
    Record<
      'title' | 'description' | 'startTime' | 'endTime' | 'location' | 'activityType' | 'groupIds',
      string
    >
  >;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  onChangeStartDate?: (value: string) => void;
  onChangeEndDate?: (value: string) => void;
  onChangeStartTime?: (value: string) => void;
  onChangeEndTime?: (value: string) => void;
  onChangeIsAllDay?: (value: boolean) => void;
  onChange: (patch: Partial<SocialEvent>) => void;
  groups?: Group[];
  groupsLoading?: boolean;
  itinerary?: {
    items: ItineraryItem[];
    onAdd: (input: {
      title: string;
      startTime: string;
      durationMinutes: number;
      location?: string;
      description?: string;
    }) => Promise<string> | string;
    onUpdate: (
      id: string,
      patch: Partial<{
        title: string;
        startTime: string;
        durationMinutes: number;
        location?: string;
        description?: string;
      }>
    ) => Promise<void> | void;
    onDelete: (id: string) => Promise<void> | void;
  };
};

type DetailsTabProps = {
  event: SocialEvent;
  isEditMode: boolean;
  isGuest: boolean;
  onRequireAuth?: () => void;
  currentUserId?: string;
  hostId?: string;
  expenses: EventExpense[];
  expenseApi?: ExpenseApi;
  people: Person[];
  itineraryItems: ItineraryItem[];
  hasItinerary: boolean;
  dateTime: EventDateTimeModel;
  edit?: DetailsTabEditModel;
  showItineraryStartTimeOnly: boolean;
  onChangeItineraryStartTimeOnly: (next: boolean) => void;
  canManageItineraryAttendance: boolean;
  onOpenItineraryAttendance: () => void;
  hasCurrentAttendance: boolean;
  attendanceByItem?: Map<string, User[]>;
};

type EditSectionId =
  | 'privacy'
  | 'title'
  | 'dateTime'
  | 'description'
  | 'schedule'
  | 'location'
  | 'expenses'
  | 'capacity';
type CollapsedActionStyle = 'plus' | 'chevron';

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
    edit,
    showItineraryStartTimeOnly,
    onChangeItineraryStartTimeOnly,
    canManageItineraryAttendance,
    onOpenItineraryAttendance,
    hasCurrentAttendance,
    attendanceByItem,
  } = props;

  const openItineraryLocationInMaps = (locationFull: string) => {
    const q = String(locationFull ?? '').trim();
    if (!q) return;
    openExternalUrl(buildGoogleMapsSearchUrl(q));
  };

  const editSectionHasContent = React.useMemo<Record<EditSectionId, boolean>>(
    () => ({
      privacy: true,
      title: true,
      dateTime: true,
      description: event.description.trim().length > 0,
      schedule: itineraryItems.length > 0,
      location:
        event.location.trim().length > 0 ||
        !!event.locationData ||
        (typeof event.coordinates?.lat === 'number' && typeof event.coordinates?.lng === 'number'),
      expenses: expenses.length > 0,
      capacity: typeof event.maxSeats === 'number' && event.maxSeats > 0,
    }),
    [
      event.coordinates?.lat,
      event.coordinates?.lng,
      event.description,
      event.location,
      event.locationData,
      event.maxSeats,
      expenses.length,
      itineraryItems.length,
    ]
  );

  const [editSectionsOpen, setEditSectionsOpen] = React.useState<Record<EditSectionId, boolean>>(
    () => {
      const defaults: Record<EditSectionId, boolean> = {
        privacy: true,
        title: true,
        dateTime: true,
        description: false,
        schedule: false,
        location: false,
        expenses: false,
        capacity: false,
      };

      if (typeof window === 'undefined') return defaults;

      const next = { ...defaults };
      (Object.keys(defaults) as EditSectionId[]).forEach(id => {
        const stored = window.localStorage.getItem(`event-edit-section:${id}`);
        if (stored === 'open') next[id] = true;
        if (stored === 'closed') next[id] = false;
      });
      return next;
    }
  );

  const toggleEditSection = React.useCallback((id: EditSectionId) => {
    setEditSectionsOpen(prev => {
      const nextValue = !prev[id];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`event-edit-section:${id}`, nextValue ? 'open' : 'closed');
      }
      return { ...prev, [id]: nextValue };
    });
  }, []);

  const getOptionalSectionChrome = React.useCallback(
    (
      id: EditSectionId
    ): {
      collapsible: boolean;
      expanded: boolean;
      onToggleExpanded: () => void;
      collapsedActionStyle: CollapsedActionStyle;
      isEmptyState: boolean;
    } => ({
      collapsible: isEditMode,
      expanded: editSectionsOpen[id],
      onToggleExpanded: () => toggleEditSection(id),
      collapsedActionStyle: editSectionHasContent[id] ? 'chevron' : 'plus',
      isEmptyState: !editSectionHasContent[id],
    }),
    [editSectionHasContent, editSectionsOpen, isEditMode, toggleEditSection]
  );

  const showDescriptionSection = isEditMode || editSectionHasContent.description;
  const showDateTimeSection = true;
  const showScheduleSection = isEditMode || hasItinerary;
  const showLocationSection = isEditMode || editSectionHasContent.location;
  const showExpensesSection = isEditMode || editSectionHasContent.expenses;
  const showDividerAfterDescription =
    !isEditMode &&
    showDescriptionSection &&
    (showDateTimeSection || showScheduleSection || showLocationSection || showExpensesSection);
  const showDividerAfterDateTime =
    !isEditMode &&
    showDateTimeSection &&
    (showScheduleSection || showLocationSection || showExpensesSection);
  const showDividerAfterSchedule =
    !isEditMode && showScheduleSection && (showLocationSection || showExpensesSection);
  const showDividerAfterLocation = !isEditMode && showLocationSection && showExpensesSection;

  return (
    <div className="space-y-4">
      {isEditMode ? (
        <GuestsSettingsCard
          event={event}
          onChangeVisibility={next => edit?.onChange({ visibilityType: next })}
          onChangeGroupIds={nextGroupIds => edit?.onChange({ groupIds: nextGroupIds })}
          groupOptions={edit?.groups}
          groupsLoading={edit?.groupsLoading}
          groupError={edit?.errors?.groupIds}
          {...getOptionalSectionChrome('privacy')}
        />
      ) : null}

      {isEditMode ? (
        <TitleCard
          isEditMode={isEditMode}
          title={event.title}
          activityType={event.activityType}
          onChangeTitle={next => edit?.onChange({ title: next })}
          onChangeActivityType={next => edit?.onChange({ activityType: next })}
          errors={{ title: edit?.errors?.title, activityType: edit?.errors?.activityType }}
          {...getOptionalSectionChrome('title')}
        />
      ) : (
        <TitleCard isEditMode={isEditMode} title={event.title} activityType={event.activityType} />
      )}

      {showDescriptionSection ? (
        isEditMode ? (
          <AboutCard
            isEditMode={isEditMode}
            title="Description"
            description={event.description}
            onChangeDescription={next => edit?.onChange({ description: next })}
            error={edit?.errors?.description}
            {...getOptionalSectionChrome('description')}
          />
        ) : (
          <AboutCard isEditMode={isEditMode} description={event.description} />
        )
      ) : null}

      {showDividerAfterDescription ? <hr className="border-slate-700" /> : null}

      {isEditMode ? (
        <DateTimeCard
          isEditMode={isEditMode}
          dateTime={dateTime}
          isFlexibleStart={event.isFlexibleStart}
          startDate={edit?.startDate ?? ''}
          endDate={edit?.endDate ?? ''}
          startTime={edit?.startTime ?? ''}
          endTime={edit?.endTime ?? ''}
          isAllDay={edit?.isAllDay ?? false}
          onChangeStartDate={edit?.onChangeStartDate}
          onChangeEndDate={edit?.onChangeEndDate}
          onChangeStartTime={edit?.onChangeStartTime}
          onChangeEndTime={edit?.onChangeEndTime}
          onChangeIsAllDay={edit?.onChangeIsAllDay}
          errorStartTime={edit?.errors?.startTime}
          errorEndTime={edit?.errors?.endTime}
          {...getOptionalSectionChrome('dateTime')}
        />
      ) : (
        <DateTimeCard
          isEditMode={isEditMode}
          dateTime={dateTime}
          isFlexibleStart={event.isFlexibleStart}
        />
      )}

      {showDividerAfterDateTime ? <hr className="border-slate-700" /> : null}

      {isEditMode ? (
        <CapacityCard
          maxSeats={event.maxSeats}
          onChangeMaxSeats={next => edit?.onChange({ maxSeats: next })}
          {...getOptionalSectionChrome('capacity')}
        />
      ) : null}

      {showScheduleSection ? (
        <ScheduleCard
          isEditMode={isEditMode}
          hasScheduleItems={hasItinerary}
          itineraryAttendanceEnabled={event.itineraryAttendanceEnabled ?? false}
          onChangeItineraryAttendanceEnabled={next =>
            edit?.onChange({ itineraryAttendanceEnabled: next })
          }
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
          {...(isEditMode ? getOptionalSectionChrome('schedule') : {})}
        >
          {isEditMode ? (
            edit?.itinerary ? (
              <ScheduleEditor
                event={event}
                itineraryItems={itineraryItems}
                showItineraryTimesOnly={dateTime.showItineraryTimesOnly}
                showItineraryStartTimeOnly={showItineraryStartTimeOnly}
                hasItinerary={hasItinerary}
                formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
                openItineraryLocationInMaps={openItineraryLocationInMaps}
                itineraryApi={edit.itinerary}
              />
            ) : (
              <div className="text-sm text-slate-500 italic">Schedule editing is unavailable.</div>
            )
          ) : (
            <ScheduleSection
              items={itineraryItems}
              showItineraryTimesOnly={dateTime.showItineraryTimesOnly}
              showItineraryStartTimeOnly={showItineraryStartTimeOnly}
              formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
              openItineraryLocationInMaps={openItineraryLocationInMaps}
              attendanceByItem={event.itineraryAttendanceEnabled ? attendanceByItem : undefined}
            />
          )}
        </ScheduleCard>
      ) : null}

      {showDividerAfterSchedule ? <hr className="border-slate-700" /> : null}

      {showLocationSection ? (
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
          onChangeLocationText={text =>
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
          {...(isEditMode ? getOptionalSectionChrome('location') : {})}
        />
      ) : null}

      {showDividerAfterLocation ? <hr className="border-slate-700" /> : null}

      {showExpensesSection ? (
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
          {...(isEditMode ? getOptionalSectionChrome('expenses') : {})}
        />
      ) : null}
    </div>
  );
}
