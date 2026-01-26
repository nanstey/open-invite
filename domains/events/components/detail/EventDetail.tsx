
import React, { useState } from 'react';
import type { Group, User } from '../../../../lib/types';
import type { ItineraryItem, SocialEvent } from '../../types';
import { Info, MessageSquare, Users } from 'lucide-react';
import { TabGroup, type TabOption } from '../../../../lib/ui/components/TabGroup';
import { useRouterState } from '@tanstack/react-router';
import { HeaderImageModal } from './images/HeaderImageModal'
import { buildGoogleMapsSearchUrl } from './maps/maps'
import { openExternalUrl } from '../../../../lib/ui/utils/openExternalUrl'
import type { EventTab } from './route/routing'
import { useEventPeople } from '../../hooks/useEventPeople'
import { useFriendsForGuests } from '../../hooks/useFriendsForGuests'
import { ChatTab } from './chat/ChatTab'
import { GuestsTab } from './guests/GuestsTab'
import { ItineraryEditor } from './itineraries/ItineraryEditor'
import { ItinerarySection } from './itineraries/ItinerarySection'
import { useInviteShare } from './hooks/useInviteShare'
import { useDraftStartDateTimeLocal } from './hooks/useDraftStartDateTimeLocal'
import { useEventTabsController } from './hooks/useEventTabsController'
import { useAttendanceToggle } from './hooks/useAttendanceToggle'
import { HostedByActionsCard } from './actions/HostedByActionsCard'
import type { EventActionsModel } from './actions/types'
import { StickyHostedByActionsCard } from './actions/StickyHostedByActionsCard'
import { MobileActionsBar } from './actions/MobileActionsBar'
import { TitleCard } from './details/TitleCard'
import { AboutCard } from './details/AboutCard'
import { DateTimeCard } from './details/DateTimeCard'
import { ItineraryCard } from './details/ItineraryCard'
import { LocationCard } from './details/LocationCard'
import { ExpensesCard } from './details/ExpensesCard'
import { HeroHeader } from './header/HeroHeader'
import { KeyFactsCard } from './header/KeyFactsCard'
import { formatItineraryLocationForDisplay, formatRawLocationForDisplay } from './utils/locationDisplay'
import { buildEventDateTimeModel } from './utils/eventDateTimeModel'
import type { LocationSuggestion } from '../../../../lib/ui/components/LocationAutocomplete'

interface EventDetailProps {
  event: SocialEvent;
  currentUser?: User | null;
  onClose?: () => void;
  onUpdateEvent: (updated: SocialEvent) => void;
  onPostComment?: (eventId: string, text: string) => Promise<void> | void;
  onJoin?: (eventId: string) => Promise<void> | void;
  onLeave?: (eventId: string) => Promise<void> | void;
  activeTab?: EventTab;
  onTabChange?: (tab: EventTab) => void;
  onDismiss?: () => void;
  onRequireAuth?: () => void;
  onEditRequested?: () => void;
  showBackButton?: boolean;
  layout?: 'shell' | 'public';
  mode?: 'view' | 'edit';
  edit?: {
    canEdit: boolean;
    isSaving?: boolean;
    primaryLabel?: string;
    groups?: Group[];
    groupsLoading?: boolean;
    errors?: Partial<Record<'title' | 'description' | 'startTime' | 'location' | 'activityType' | 'durationHours', string>>;
    startDateTimeLocal?: string;
    onChangeStartDateTimeLocal?: (value: string) => void;
    durationHours?: number | '';
    onChangeDurationHours?: (value: number | '') => void;
    onChange: (patch: Partial<SocialEvent>) => void;
    itinerary?: {
      items: ItineraryItem[];
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
    expenses?: {
      items: NonNullable<SocialEvent['expenses']>;
      onAdd: (input: Omit<NonNullable<SocialEvent['expenses']>[number], 'id' | 'eventId'>) => Promise<string> | string
      onUpdate: (
        id: string,
        patch: Partial<Omit<NonNullable<SocialEvent['expenses']>[number], 'id' | 'eventId'>>,
      ) => Promise<void> | void
      onDelete: (id: string) => Promise<void> | void
    }
    onSave: () => void;
    onCancel: () => void;
  };
}

// location display helpers moved to `detail/utils/locationDisplay`.

export type { EventTab } from './route/routing'

export const EventDetail: React.FC<EventDetailProps> = ({
  event,
  currentUser,
  onClose,
  onUpdateEvent,
  onPostComment,
  onJoin,
  onLeave,
  activeTab: activeTabProp,
  onTabChange,
  onDismiss,
  onRequireAuth,
  onEditRequested,
  showBackButton = true,
  layout = 'shell',
  mode = 'view',
  edit,
}) => {
  // --- Layout / navigation ---
  const { pathname } = useRouterState({ select: (s) => ({ pathname: s.location.pathname }) });
  const reserveBottomNavSpace = layout === 'shell' && !pathname.startsWith('/events/');

  // --- Mode / edit capability ---
  const isEditMode = mode === 'edit' && !!edit;
  const canSave = !!edit?.canEdit;

  // --- Share / invite ---
  const { inviteCopied, shareInvite: handleShareInvite } = useInviteShare({
    eventId: event.id,
    eventSlug: event.slug,
    eventTitle: event.title,
  })

  // --- Local UI state ---
  const [showHeaderImageModal, setShowHeaderImageModal] = useState(false)

  // --- Viewer identity ---
  const currentUserId = currentUser?.id;
  const isGuest = !currentUserId;

  // --- Tabs (controlled/uncontrolled + guest gating) ---
  const tabController = useEventTabsController({
    activeTabProp,
    onTabChange,
    isGuest,
    onRequireAuth,
  })
  const activeTab = tabController.activeTab

  // --- People / social data ---
  const { host, attendeesList, commentUsers } = useEventPeople({ event, currentUserId: currentUserId ?? undefined })

  const expensePeople = React.useMemo(() => {
    const all: Array<{ id: string; name: string }> = []
    if (currentUser) all.push({ id: currentUser.id, name: currentUser.name })
    if (host) all.push({ id: host.id, name: host.name })
    for (const u of attendeesList) all.push({ id: u.id, name: u.name })
    const uniq = new Map(all.map((p) => [p.id, p] as const))
    return Array.from(uniq.values())
  }, [attendeesList, currentUser, host])

  // --- Edit form draft state ---
  const draftStart = useDraftStartDateTimeLocal({
    enabled: isEditMode,
    startDateTimeLocal: edit?.startDateTimeLocal,
    onChangeStartDateTimeLocal: edit?.onChangeStartDateTimeLocal,
  })

  // --- Attendance / permissions ---
  const isHost = !!currentUserId && event.hostId === currentUserId;
  const isAttending = !!currentUserId && event.attendees.includes(currentUserId);
  const isInvolved = isHost || isAttending;
  const hasSeatLimit = typeof event.maxSeats === 'number' && event.maxSeats > 0
  const isFull = hasSeatLimit && event.attendees.length >= event.maxSeats
  const attendance = useAttendanceToggle({
    enabled: !isEditMode,
    event,
    currentUserId,
    isHost,
    isAttending,
    isFull,
    onJoin,
    onLeave,
    onRequireAuth,
    onUpdateEvent,
  })
  const isJoinDisabled = attendance.isJoinDisabled

  // --- Itinerary models ---
  const itineraryItems: ItineraryItem[] =
    (isEditMode ? edit?.itinerary?.items : event.itineraryItems) ?? []
  const hasItinerary = itineraryItems.length > 0

  // --- Derived view models ---
  const dateTime = React.useMemo(
    () =>
      buildEventDateTimeModel({
        eventStartTime: event.startTime,
        eventEndTime: event.endTime,
        itineraryItems,
      }),
    [event.endTime, event.startTime, itineraryItems],
  )
  
  const seats = React.useMemo(() => {
    const attendeeCount = attendeesList.length
    const maxSeats = event.maxSeats
    const goingLabel = maxSeats ? `${attendeeCount}/${maxSeats}` : `${attendeeCount}`
    const spotsLeft = maxSeats ? Math.max(maxSeats - attendeeCount, 0) : null
    return { attendeeCount, maxSeats, goingLabel, spotsLeft }
  }, [attendeesList.length, event.maxSeats])

  // --- UI options ---
  // Time options are now owned by `DateTimeCard` and `ItineraryEditor`.

  const tabs: TabOption[] = [
    { id: 'details', label: 'Details', icon: <Info className="w-4 h-4" /> },
    { id: 'guests', label: 'Guests', icon: <Users className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const { friendIds } = useFriendsForGuests({ enabled: !isGuest && !isEditMode && activeTab === 'guests' })

  const openItineraryLocationInMaps = (locationFull: string) => {
    const q = String(locationFull ?? '').trim()
    if (!q) return
    openExternalUrl(buildGoogleMapsSearchUrl(q))
  }

  const actionsModel: EventActionsModel = {
    mode: isEditMode ? 'edit' : 'view',
    inviteCopied,
    onShareInvite: handleShareInvite,
    showDismiss: !!onDismiss && !isInvolved && !isEditMode,
    onDismiss,
    isHost,
    onEditRequested,
    onJoinLeave: attendance.onJoinLeave,
    isJoinDisabled,
    isAttending,
    isFull,
    onSave: edit?.onSave,
    onCancel: edit?.onCancel,
    canSave,
    isSaving: edit?.isSaving,
    primaryLabel: edit?.primaryLabel,
  }

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar bg-background text-slate-100 ${
        layout === 'shell' && reserveBottomNavSpace ? 'pb-44' : 'pb-28'
      } md:pb-10`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <HeroHeader
        eventId={event.id}
        headerImageUrl={event.headerImageUrl}
        activityType={event.activityType}
        title={event.title}
        showBackButton={showBackButton && !!onClose}
        onBack={onClose}
        showHeaderImagePicker={isEditMode && isHost}
        onOpenHeaderImagePicker={() => setShowHeaderImageModal(true)}
      />

      <KeyFactsCard
        host={host}
        dateTime={dateTime}
        isFlexibleStart={event.isFlexibleStart}
        location={{ raw: event.location, locationData: event.locationData }}
        coordinates={event.coordinates}
        seats={seats}
      />

      <HostedByActionsCard
        host={host}
        seats={seats}
        actions={actionsModel}
      />

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: tabbed content */}
        <div className="space-y-4 min-w-0">
          <TabGroup tabs={tabs} activeTab={activeTab} onChange={tabController.onTabChange} />

          {activeTab === 'details' ? (
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

              {isEditMode || hasItinerary ? (
                <ItineraryCard>
                  {isEditMode ? (
                    edit?.itinerary ? (
                      <ItineraryEditor
                        event={event}
                        itineraryItems={itineraryItems}
                        showItineraryTimesOnly={dateTime.showItineraryTimesOnly}
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
                      formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
                      openItineraryLocationInMaps={openItineraryLocationInMaps}
                    />
                  )}
                </ItineraryCard>
              ) : null}

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

              <ExpensesCard
                isEditMode={isEditMode}
                isGuest={isGuest}
                onRequireAuth={onRequireAuth}
                currentUserId={currentUser?.id}
                expenses={(isEditMode ? edit?.expenses?.items : event.expenses) ?? []}
                expenseApi={
                  isEditMode && edit?.expenses
                    ? {
                        onAdd: edit.expenses.onAdd,
                        onUpdate: edit.expenses.onUpdate,
                        onDelete: edit.expenses.onDelete,
                      }
                    : undefined
                }
                people={expensePeople}
              />
            </div>
          ) : null}

          {activeTab === 'guests' ? (
            <GuestsTab
              event={event}
              attendeesList={attendeesList}
              friendIds={friendIds}
              currentUserId={currentUserId ?? undefined}
              isEditMode={isEditMode}
              onChangeAttendees={(nextAttendees) => edit?.onChange({ attendees: nextAttendees })}
              onChangeMaxSeats={(next) => edit?.onChange({ maxSeats: next })}
            />
          ) : null}

          {activeTab === 'chat' ? (
            <ChatTab
              event={event}
              commentUsers={commentUsers}
              currentUserId={currentUserId ?? undefined}
              isEditMode={isEditMode}
              isGuest={isGuest}
              onRequireAuth={onRequireAuth}
              onPostComment={onPostComment}
              onUpdateEvent={onUpdateEvent}
            />
          ) : null}
        </div>

        <StickyHostedByActionsCard host={host} seats={seats} actions={actionsModel} />
      </div>

      <MobileActionsBar reserveBottomNavSpace={reserveBottomNavSpace} actions={actionsModel} />

      {showHeaderImageModal ? (
        <HeaderImageModal
          defaultQuery={event.title || ''}
          initialSelectedUrl={event.headerImageUrl}
          onClose={() => setShowHeaderImageModal(false)}
          onUpdate={(imageUrl) => {
            if (isEditMode) {
              edit?.onChange({ headerImageUrl: imageUrl })
              return
            }
            onUpdateEvent({ ...event, headerImageUrl: imageUrl })
          }}
        />
      ) : null}

    </div>
  );
};
