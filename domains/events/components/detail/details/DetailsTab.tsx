import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import type { Group, User } from '../../../../../lib/types';
import type { LocationSuggestion } from '../../../../../lib/ui/components/LocationAutocomplete';
import { openExternalUrl } from '../../../../../lib/ui/utils/openExternalUrl';
import type { DraftStartDateTimeLocalModel } from '../../../hooks/useDraftStartDateTimeLocal';
import type { ItineraryItem, SocialEvent } from '../../../types';
import { ExpensesCard } from '../expenses/ExpensesCard';
import type { EventExpense, ExpenseApi, Person } from '../expenses/types';
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
      | 'title'
      | 'description'
      | 'startTime'
      | 'location'
      | 'activityType'
      | 'durationHours'
      | 'groupIds',
      string
    >
  >;
  durationHours?: number | '';
  onChangeDurationHours?: (value: number | '') => void;
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
  draftStart: DraftStartDateTimeLocalModel;
  edit?: DetailsTabEditModel;
  showItineraryStartTimeOnly: boolean;
  onChangeItineraryStartTimeOnly: (next: boolean) => void;
  canManageItineraryAttendance: boolean;
  onOpenItineraryAttendance: () => void;
  hasCurrentAttendance: boolean;
  attendanceByItem?: Map<string, User[]>;
};

function EditSection(props: {
  id: string;
  title: string;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `event-edit-section:${props.id}`;
  const [open, setOpen] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(storageKey) !== 'closed';
  });

  const toggleOpen = () => {
    setOpen(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, next ? 'open' : 'closed');
      }
      return next;
    });
  };

  if (!props.enabled) {
    return <>{props.children}</>;
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/30">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold uppercase tracking-wider text-slate-400">
          {props.title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="space-y-4 p-2 pt-0">{props.children}</div> : null}
    </section>
  );
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
  } = props;

  const openItineraryLocationInMaps = (locationFull: string) => {
    const q = String(locationFull ?? '').trim();
    if (!q) return;
    openExternalUrl(buildGoogleMapsSearchUrl(q));
  };

  return (
    <div className="space-y-4">
      {isEditMode ? (
        <EditSection id="basics" title="Basics" enabled={isEditMode}>
          <TitleCard
            isEditMode={isEditMode}
            title={event.title}
            activityType={event.activityType}
            onChangeTitle={next => edit?.onChange({ title: next })}
            onChangeActivityType={next => edit?.onChange({ activityType: next })}
            errors={{ title: edit?.errors?.title, activityType: edit?.errors?.activityType }}
          />
        </EditSection>
      ) : (
        <TitleCard isEditMode={isEditMode} title={event.title} activityType={event.activityType} />
      )}

      {isEditMode ? (
        <EditSection id="description" title="Description" enabled={isEditMode}>
          <AboutCard
            isEditMode={isEditMode}
            description={event.description}
            onChangeDescription={next => edit?.onChange({ description: next })}
            error={edit?.errors?.description}
          />
        </EditSection>
      ) : (
        <AboutCard isEditMode={isEditMode} description={event.description} />
      )}

      {!isEditMode && <hr className="border-slate-700" />}

      {isEditMode ? (
        <EditSection id="date-time" title="Date & time" enabled={isEditMode}>
          <DateTimeCard
            isEditMode={isEditMode}
            hasItinerary={hasItinerary}
            dateTime={dateTime}
            isFlexibleStart={event.isFlexibleStart}
            draft={draftStart}
            durationHours={edit?.durationHours}
            onChangeDurationHours={edit?.onChangeDurationHours}
            errorStartTime={edit?.errors?.startTime}
            errorDurationHours={edit?.errors?.durationHours}
          />
        </EditSection>
      ) : (
        <DateTimeCard
          isEditMode={isEditMode}
          hasItinerary={hasItinerary}
          dateTime={dateTime}
          isFlexibleStart={event.isFlexibleStart}
          draft={draftStart}
        />
      )}

      {isEditMode ? (
        <EditSection id="settings" title="Attendance & visibility" enabled={isEditMode}>
          <GuestsSettingsCard
            event={event}
            onChangeMaxSeats={next => edit?.onChange({ maxSeats: next })}
            onChangeVisibility={next => edit?.onChange({ visibilityType: next })}
            onChangeGroupIds={nextGroupIds => edit?.onChange({ groupIds: nextGroupIds })}
            groupOptions={edit?.groups}
            groupsLoading={edit?.groupsLoading}
            groupError={edit?.errors?.groupIds}
            onChangeItineraryAttendanceEnabled={next =>
              edit?.onChange({ itineraryAttendanceEnabled: next })
            }
          />
        </EditSection>
      ) : null}

      {!isEditMode && hasItinerary && <hr className="border-slate-700" />}

      {isEditMode || hasItinerary ? (
        <EditSection id="schedule" title="Schedule" enabled={isEditMode}>
          <ScheduleCard
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
                <ScheduleEditor
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
                <div className="text-sm text-slate-500 italic">
                  Schedule editing is unavailable.
                </div>
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
        </EditSection>
      ) : null}

      {!isEditMode && <hr className="border-slate-700" />}

      <EditSection id="location" title="Location" enabled={isEditMode}>
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
        />
      </EditSection>

      {!isEditMode && <hr className="border-slate-700" />}

      <EditSection id="expenses" title="Expenses" enabled={isEditMode}>
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
      </EditSection>
    </div>
  );
}
