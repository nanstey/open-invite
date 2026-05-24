import * as React from 'react';

import type { User } from '../../../../../lib/types';
import { useGuestFriendRequests } from '../../../hooks/useGuestFriendRequests';
import { useGuestsEditActions } from '../../../hooks/useGuestsEditActions';
import type { SocialEvent } from '../../../types';
import { GuestsListCard } from './GuestsListCard';
import {
  getGoingLabel,
  getOpenSpots,
  getSelectedAttendeeIds,
  orderAttendees,
} from './guestFilters';

export function GuestsTab(props: {
  event: SocialEvent;
  attendeesList: User[];
  friendIds: Set<string>;
  outgoingRequestIds: Set<string>;
  incomingRequestMap: Map<string, string>;
  currentUserId?: string;
  isEditMode: boolean;
  itineraryFilterId?: string;
  onChangeItineraryFilterId?: (next: string) => void;
  onChangeAttendees?: (nextAttendees: string[]) => void;
}) {
  const {
    event,
    attendeesList,
    friendIds,
    outgoingRequestIds,
    incomingRequestMap,
    currentUserId,
    isEditMode,
    itineraryFilterId,
    onChangeItineraryFilterId,
    onChangeAttendees,
  } = props;
  const { pendingRequestIds, sendingRequestIds, handleSendFriendRequest } =
    useGuestFriendRequests();

  const guestsEdit = useGuestsEditActions({
    enabled: isEditMode,
    event,
    attendeesList,
    onChangeAttendees,
  });

  const itineraryItems = event.itineraryItems ?? [];
  const activeFilterId = itineraryFilterId ?? '';
  const shouldShowFilter =
    !isEditMode && event.itineraryAttendanceEnabled && itineraryItems.length > 0;

  const selectedAttendeeIds = React.useMemo(() => {
    return getSelectedAttendeeIds({ event, activeFilterId });
  }, [activeFilterId, event.itineraryAttendance, event]);

  const orderedAttendeesList = React.useMemo(() => {
    return orderAttendees({
      attendees: guestsEdit.visibleAttendeesList,
      activeFilterId,
      selectedAttendeeIds,
    });
  }, [activeFilterId, guestsEdit.visibleAttendeesList, selectedAttendeeIds]);

  const attendeeCount = guestsEdit.visibleAttendeesList.length;
  const goingLabel = getGoingLabel({ attendeeCount, maxSeats: event.maxSeats });
  const openSpots = getOpenSpots({ attendeeCount, maxSeats: event.maxSeats });

  return (
    <div className="space-y-4">
      <GuestsListCard
        event={event}
        attendees={orderedAttendeesList}
        currentUserId={currentUserId}
        isEditMode={isEditMode}
        friendIds={friendIds}
        outgoingRequestIds={outgoingRequestIds}
        incomingRequestMap={incomingRequestMap}
        pendingRequestIds={pendingRequestIds}
        sendingRequestIds={sendingRequestIds}
        onSendFriendRequest={handleSendFriendRequest}
        onRemoveAttendee={guestsEdit.onRemoveAttendee}
        activeFilterId={activeFilterId}
        onChangeItineraryFilterId={onChangeItineraryFilterId}
        showFilter={!!shouldShowFilter}
        selectedAttendeeIds={selectedAttendeeIds}
        attendeeCount={attendeeCount}
        goingLabel={goingLabel}
        openSpots={openSpots}
      />
    </div>
  );
}
