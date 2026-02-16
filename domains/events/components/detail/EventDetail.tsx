import { useRouterState } from '@tanstack/react-router';
import { Info, MessageSquare, Users } from 'lucide-react';
import React, { useState } from 'react';
import type { Group, User } from '../../../../lib/types';
import { TabGroup, type TabOption } from '../../../../lib/ui/components/TabGroup';
import { fetchEventById } from '../../../../services/eventService';
import { upsertItineraryAttendance } from '../../../../services/itineraryAttendanceService';
import { useAttendanceToggle } from '../../hooks/useAttendanceToggle';
import { useDraftStartDateTimeLocal } from '../../hooks/useDraftStartDateTimeLocal';
import { useEventPeople } from '../../hooks/useEventPeople';
import { useEventTabsController } from '../../hooks/useEventTabsController';
import { useFriendsForGuests } from '../../hooks/useFriendsForGuests';
import { useInviteShare } from '../../hooks/useInviteShare';
import type { EventExpense, ItineraryItem, SocialEvent } from '../../types';
import { HostedByActionsCard } from './actions/HostedByActionsCard';
import { LeaveEventDialog } from './actions/LeaveEventDialog';
import { MobileActionsBar } from './actions/MobileActionsBar';
import type { EventActionsModel } from './actions/types';
import { ChatTab } from './chat/ChatTab';
import { DetailsTab } from './details/DetailsTab';
import { GuestsTab } from './guests/GuestsTab';
import { HeroHeader } from './header/HeroHeader';
import { KeyFactsCard } from './header/KeyFactsCard';
import { HeaderImageModal } from './images/HeaderImageModal';
import { ItineraryAttendanceOverlay } from './itineraries/ItineraryAttendanceOverlay';
import type { EventTab } from './route/routing';
import { buildEventDateTimeModel } from './utils/eventDateTimeModel';

interface EventDetailProps {
  event: SocialEvent;
  currentUser?: User | null;
  onClose?: () => void;
  onUpdateEvent: (updated: SocialEvent) => void;
  onPostComment?: (eventId: string, text: string) => Promise<void> | void;
  onToggleCommentReaction?: (
    eventId: string,
    commentId: string,
    emoji: string
  ) => Promise<void> | void;
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
    errors?: Partial<
      Record<
        'title' | 'description' | 'startTime' | 'location' | 'activityType' | 'durationHours',
        string
      >
    >;
    startDateTimeLocal?: string;
    onChangeStartDateTimeLocal?: (value: string) => void;
    durationHours?: number | '';
    onChangeDurationHours?: (value: number | '') => void;
    onChange: (patch: Partial<SocialEvent>) => void;
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
    expenses?: {
      items: EventExpense[];
      onAdd: (input: Omit<EventExpense, 'id' | 'eventId'>) => Promise<string> | string;
      onUpdate: (
        id: string,
        patch: Partial<Omit<EventExpense, 'id' | 'eventId'>>
      ) => Promise<void> | void;
      onDelete: (id: string) => Promise<void> | void;
    };
    onSave: () => void;
    onCancel: () => void;
  };
}

// location display helpers moved to `detail/utils/locationDisplay`.

export type { EventTab } from './route/routing';

export const EventDetail: React.FC<EventDetailProps> = ({
  event,
  currentUser,
  onClose,
  onUpdateEvent,
  onPostComment,
  onToggleCommentReaction,
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
  const { pathname } = useRouterState({ select: s => ({ pathname: s.location.pathname }) });
  const reserveBottomNavSpace = layout === 'shell' && !pathname.startsWith('/events/');

  // --- Mode / edit capability ---
  const isEditMode = mode === 'edit' && !!edit;
  const canSave = !!edit?.canEdit;

  // --- Share / invite ---
  const { inviteCopied, shareInvite: handleShareInvite } = useInviteShare({
    eventId: event.id,
    eventSlug: event.slug,
    eventTitle: event.title,
  });

  // --- Local UI state ---
  const [showHeaderImageModal, setShowHeaderImageModal] = useState(false);
  const [showItineraryAttendanceOverlay, setShowItineraryAttendanceOverlay] = useState(false);
  const [guestItineraryFilterId, setGuestItineraryFilterId] = useState('');
  const [pendingJoin, setPendingJoin] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  // --- Itinerary time display (persisted on event) ---
  const showItineraryStartTimeOnly = event.itineraryTimeDisplay === 'START_ONLY';
  const handleChangeItineraryStartTimeOnly = (next: boolean) => {
    if (!isEditMode) return;
    edit?.onChange({ itineraryTimeDisplay: next ? 'START_ONLY' : 'START_AND_END' });
  };

  // --- Viewer identity ---
  const currentUserId = currentUser?.id;
  const isGuest = !currentUserId;

  // --- Tabs (controlled/uncontrolled + guest gating) ---
  const tabController = useEventTabsController({
    activeTabProp,
    onTabChange,
    isGuest,
    onRequireAuth,
  });
  const activeTab = tabController.activeTab;

  // --- People / social data ---
  const { host, attendeesList, commentUsers, reactionUsers } = useEventPeople({
    event,
    currentUserId: currentUserId ?? undefined,
  });

  const expensePeople = React.useMemo(() => {
    const all: Array<{ id: string; name: string }> = [];
    if (currentUser) all.push({ id: currentUser.id, name: currentUser.name });
    if (host) all.push({ id: host.id, name: host.name });
    for (const u of attendeesList) all.push({ id: u.id, name: u.name });
    const uniq = new Map(all.map(p => [p.id, p] as const));
    return Array.from(uniq.values());
  }, [attendeesList, currentUser, host]);

  // --- Edit form draft state ---
  const draftStart = useDraftStartDateTimeLocal({
    enabled: isEditMode,
    startDateTimeLocal: edit?.startDateTimeLocal,
    onChangeStartDateTimeLocal: edit?.onChangeStartDateTimeLocal,
  });

  // --- Attendance / permissions ---
  const isHost = !!currentUserId && event.hostId === currentUserId;
  const isAttending = !!currentUserId && event.attendees.includes(currentUserId);
  const isInvolved = isHost || isAttending;
  const hasSeatLimit = typeof event.maxSeats === 'number' && event.maxSeats > 0;
  const isFull = hasSeatLimit && event.attendees.length >= (event.maxSeats ?? 0);
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
  });
  const isJoinDisabled = attendance.isJoinDisabled;

  // --- Itinerary models ---
  const itineraryItems: ItineraryItem[] =
    (isEditMode ? edit?.itinerary?.items : event.itineraryItems) ?? [];
  const hasItinerary = itineraryItems.length > 0;
  const itineraryAttendance = event.itineraryAttendance ?? [];
  const currentAttendance = currentUserId
    ? itineraryAttendance.find(entry => entry.userId === currentUserId)
    : undefined;
  const currentAttendanceIds = currentAttendance?.itineraryItemIds ?? [];
  const canManageItineraryAttendance =
    !isEditMode &&
    event.itineraryAttendanceEnabled &&
    !!currentUserId &&
    isAttending &&
    !isHost &&
    hasItinerary;
  const shouldGateJoin =
    !isEditMode &&
    event.itineraryAttendanceEnabled &&
    !!currentUserId &&
    !isHost &&
    hasItinerary &&
    !isAttending;
  const shouldPromptItineraryAttendance =
    canManageItineraryAttendance &&
    (!currentAttendance || (currentAttendance.itineraryItemIds?.length ?? 0) === 0);

  const wasAttendingRef = React.useRef(isAttending);

  React.useEffect(() => {
    const wasAttending = wasAttendingRef.current;
    wasAttendingRef.current = isAttending;

    if (!wasAttending && isAttending && canManageItineraryAttendance) {
      setShowItineraryAttendanceOverlay(true);
      return;
    }

    if (shouldPromptItineraryAttendance) {
      setShowItineraryAttendanceOverlay(true);
    }
  }, [canManageItineraryAttendance, isAttending, shouldPromptItineraryAttendance]);

  const handleSaveAttendance = React.useCallback(
    async (selectedIds: string[]) => {
      if (pendingJoin && !isAttending) {
        if (onJoin) {
          await onJoin(event.id);
        } else {
          return false;
        }
      }
      const saved = await upsertItineraryAttendance(event.id, selectedIds);
      if (!saved) return false;
      const refreshed = await fetchEventById(event.id);
      if (refreshed) {
        onUpdateEvent(refreshed);
      }
      setPendingJoin(false);
      return true;
    },
    [event.id, isAttending, onJoin, onUpdateEvent, pendingJoin]
  );

  const attendanceByItem = React.useMemo(() => {
    if (!itineraryAttendance.length || attendeesList.length === 0) return new Map<string, User[]>();
    const byId = new Map(attendeesList.map(person => [person.id, person]));
    const map = new Map<string, User[]>();
    for (const entry of itineraryAttendance) {
      const user = byId.get(entry.userId);
      if (!user) continue;
      for (const itemId of entry.itineraryItemIds ?? []) {
        const list = map.get(itemId) ?? [];
        list.push(user as User);
        map.set(itemId, list);
      }
    }
    return map;
  }, [attendeesList, itineraryAttendance]);

  // --- Derived view models ---
  const dateTime = React.useMemo(
    () =>
      buildEventDateTimeModel({
        eventStartTime: event.startTime,
        eventEndTime: event.endTime,
        itineraryItems,
      }),
    [event.endTime, event.startTime, itineraryItems]
  );

  const seats = React.useMemo(() => {
    const attendeeCount = attendeesList.length;
    const maxSeats = event.maxSeats;
    const goingLabel = maxSeats ? `${attendeeCount}/${maxSeats}` : `${attendeeCount}`;
    const spotsLeft = maxSeats ? Math.max(maxSeats - attendeeCount, 0) : null;
    return { attendeeCount, maxSeats, goingLabel, spotsLeft };
  }, [attendeesList.length, event.maxSeats]);

  // --- UI options ---
  // Time options are now owned by `DateTimeCard` and `ItineraryEditor`.

  const tabs: TabOption[] = [
    { id: 'details', label: 'Details', icon: <Info className="w-4 h-4" /> },
    { id: 'guests', label: 'Guests', icon: <Users className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const { friendIds, outgoingRequestIds, incomingRequestMap } = useFriendsForGuests({
    enabled: !isGuest && !isEditMode && activeTab === 'guests',
  });

  const actionsModel: EventActionsModel = {
    mode: isEditMode ? 'edit' : 'view',
    inviteCopied,
    onShareInvite: handleShareInvite,
    showDismiss: !!onDismiss && !isInvolved && !isEditMode,
    onDismiss,
    isHost,
    onEditRequested,
    onJoinLeave: async () => {
      if (isAttending) {
        setLeaveConfirmOpen(true);
        return;
      }
      if (shouldGateJoin) {
        setPendingJoin(true);
        setShowItineraryAttendanceOverlay(true);
        return;
      }
      await attendance.onJoinLeave();
    },
    isJoinDisabled,
    isAttending,
    isFull,
    onSave: edit?.onSave,
    onCancel: edit?.onCancel,
    canSave,
    isSaving: edit?.isSaving,
    primaryLabel: edit?.primaryLabel,
  };

  const expenseApi: ExpenseApi | undefined =
    isEditMode && edit?.expenses
      ? {
          items: edit.expenses.items,
          onAdd: edit.expenses.onAdd,
          onUpdate: edit.expenses.onUpdate,
          onDelete: edit.expenses.onDelete,
          onReorder: edit.expenses.onReorder,
        }
      : undefined;
  const expenses = (isEditMode ? edit?.expenses?.items : event.expenses) ?? [];

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
        headerImagePositionY={event.headerImagePositionY}
        activityType={event.activityType}
        title={event.title}
        showBackButton={showBackButton && !!onClose}
        onBack={onClose}
        showHeaderImagePicker={isEditMode && isHost}
        onOpenHeaderImagePicker={() => setShowHeaderImageModal(true)}
        onSaveHeaderImagePositionY={positionY => {
          if (!isEditMode) return;
          edit?.onChange({ headerImagePositionY: positionY });
        }}
      />

      <KeyFactsCard
        host={host}
        dateTime={dateTime}
        isFlexibleStart={event.isFlexibleStart}
        location={{ raw: event.location, locationData: event.locationData }}
        coordinates={event.coordinates}
        seats={seats}
      />

      <HostedByActionsCard host={host} seats={seats} actions={actionsModel} />

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: tabbed content */}
        <div className="space-y-4 min-w-0">
          <TabGroup tabs={tabs} activeTab={activeTab} onChange={tabController.onTabChange} />

          {activeTab === 'details' ? (
            <DetailsTab
              event={event}
              isEditMode={isEditMode}
              isGuest={isGuest}
              onRequireAuth={onRequireAuth}
              currentUserId={currentUser?.id}
              hostId={event.hostId}
              expenses={expenses}
              expenseApi={expenseApi}
              people={expensePeople}
              itineraryItems={itineraryItems}
              hasItinerary={hasItinerary}
              dateTime={dateTime}
              draftStart={draftStart}
              edit={edit}
              showItineraryStartTimeOnly={showItineraryStartTimeOnly}
              onChangeItineraryStartTimeOnly={handleChangeItineraryStartTimeOnly}
              canManageItineraryAttendance={!!canManageItineraryAttendance}
              onOpenItineraryAttendance={() => setShowItineraryAttendanceOverlay(true)}
              hasCurrentAttendance={!!currentAttendance}
              attendanceByItem={attendanceByItem}
            />
          ) : null}

          {activeTab === 'guests' ? (
            <GuestsTab
              event={event}
              attendeesList={attendeesList}
              friendIds={friendIds}
              outgoingRequestIds={outgoingRequestIds}
              incomingRequestMap={incomingRequestMap}
              currentUserId={currentUserId ?? undefined}
              isEditMode={isEditMode}
              itineraryFilterId={guestItineraryFilterId}
              onChangeItineraryFilterId={setGuestItineraryFilterId}
              onChangeAttendees={nextAttendees => edit?.onChange({ attendees: nextAttendees })}
              onChangeMaxSeats={next => edit?.onChange({ maxSeats: next })}
              onChangeVisibility={next => edit?.onChange({ visibilityType: next })}
              onChangeItineraryAttendanceEnabled={next =>
                edit?.onChange({ itineraryAttendanceEnabled: next })
              }
            />
          ) : null}

          {activeTab === 'chat' ? (
            <ChatTab
              event={event}
              commentUsers={commentUsers}
              reactionUsers={reactionUsers}
              currentUserId={currentUserId ?? undefined}
              isEditMode={isEditMode}
              isGuest={isGuest}
              onRequireAuth={onRequireAuth}
              onPostComment={onPostComment}
              onToggleCommentReaction={onToggleCommentReaction}
              onUpdateEvent={onUpdateEvent}
            />
          ) : null}
        </div>

        <HostedByActionsCard host={host} seats={seats} actions={actionsModel} variant="sticky" />
      </div>

      <MobileActionsBar reserveBottomNavSpace={reserveBottomNavSpace} actions={actionsModel} />

      {showHeaderImageModal ? (
        <HeaderImageModal
          defaultQuery={event.title || ''}
          initialSelectedUrl={event.headerImageUrl}
          onClose={() => setShowHeaderImageModal(false)}
          onUpdate={imageUrl => {
            if (isEditMode) {
              edit?.onChange({ headerImageUrl: imageUrl });
              return;
            }
            onUpdateEvent({ ...event, headerImageUrl: imageUrl });
          }}
        />
      ) : null}

      {showItineraryAttendanceOverlay ? (
        <ItineraryAttendanceOverlay
          open={showItineraryAttendanceOverlay}
          title={event.title}
          itineraryItems={itineraryItems}
          expenses={event.expenses ?? []}
          currentUserId={currentUserId ?? undefined}
          hostId={event.hostId}
          initialSelectedIds={currentAttendanceIds}
          mode={pendingJoin ? 'join' : currentAttendance ? 'edit' : 'join'}
          onClose={() => {
            setShowItineraryAttendanceOverlay(false);
            setPendingJoin(false);
          }}
          onSave={handleSaveAttendance}
        />
      ) : null}

      <LeaveEventDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        onConfirm={async () => {
          setLeaveConfirmOpen(false);
          await attendance.onJoinLeave();
        }}
      />
    </div>
  );
};
