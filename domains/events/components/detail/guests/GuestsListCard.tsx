

import { Users } from 'lucide-react'

import type { User } from '../../../../../lib/types'
import type { SocialEvent } from '../../../types'
import { FormSelect } from '../../../../../lib/ui/components/FormControls'
import { GuestRow } from './GuestRow'

type GuestsListCardProps = {
  event: SocialEvent
  attendees: User[]
  currentUserId?: string
  isEditMode: boolean
  friendIds: Set<string>
  outgoingRequestIds: Set<string>
  incomingRequestMap: Map<string, string>
  pendingRequestIds: Set<string>
  sendingRequestIds: Set<string>
  onSendFriendRequest: (userId: string) => void
  onRemoveAttendee: (userId: string) => void
  activeFilterId: string
  onChangeItineraryFilterId?: (next: string) => void
  showFilter: boolean
  selectedAttendeeIds: Set<string>
  attendeeCount: number
  goingLabel: string
  openSpots: number | null
}

export function GuestsListCard(props: GuestsListCardProps) {
  const {
    event,
    attendees,
    currentUserId,
    isEditMode,
    friendIds,
    outgoingRequestIds,
    incomingRequestMap,
    pendingRequestIds,
    sendingRequestIds,
    onSendFriendRequest,
    onRemoveAttendee,
    activeFilterId,
    onChangeItineraryFilterId,
    showFilter,
    selectedAttendeeIds,
    attendeeCount,
    goingLabel,
    openSpots,
  } = props

  return (
    <div
      className={
        isEditMode
          ? 'bg-surface border border-slate-700 rounded-2xl p-5'
          : 'bg-background border border-transparent rounded-2xl p-5'
      }
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400" /> Guests
        </h2>
        <div className="text-sm text-slate-400 font-medium">
          {event.maxSeats ? goingLabel : `${attendeeCount}`}
        </div>
      </div>

      {showFilter ? (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filter by itinerary</div>
          <FormSelect
            value={activeFilterId}
            size="md"
            onChange={(e) => onChangeItineraryFilterId?.(e.target.value)}
          >
            <option value="">All guests</option>
            {(event.itineraryItems ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </FormSelect>
        </div>
      ) : null}

      {attendees.length === 0 ? (
        <div className="text-sm text-slate-500 italic">No guests yet.</div>
      ) : (
        <div className="space-y-2">
          {attendees.map((u) => {
            const isHost = u.id === event.hostId
            const isMe = !!currentUserId && u.id === currentUserId
            const isFriend = friendIds.has(u.id)
            const canRemove = isEditMode && !isHost
            const isFiltered = !!activeFilterId
            const isAttendingItem = !isFiltered || selectedAttendeeIds.has(u.id)
            const hasIncomingRequest = incomingRequestMap.has(u.id)
            const hasOutgoingRequest = outgoingRequestIds.has(u.id)
            const isPendingRequest = pendingRequestIds.has(u.id)
            const isSendingRequest = sendingRequestIds.has(u.id)

            return (
              <GuestRow
                key={u.id}
                user={u}
                isHost={isHost}
                isMe={isMe}
                isFriend={isFriend}
                isEditMode={isEditMode}
                canRemove={canRemove}
                isFiltered={isFiltered}
                isAttendingItem={isAttendingItem}
                hasIncomingRequest={hasIncomingRequest}
                hasOutgoingRequest={hasOutgoingRequest}
                isPendingRequest={isPendingRequest}
                isSendingRequest={isSendingRequest}
                onRemove={() => onRemoveAttendee(u.id)}
                onSendFriendRequest={() => onSendFriendRequest(u.id)}
              />
            )
          })}
        </div>
      )}

      {openSpots !== null && openSpots > 0 ? (
        <div className="mt-3 text-xs text-slate-500">
          {openSpots} spot{openSpots === 1 ? '' : 's'} open
        </div>
      ) : null}
    </div>
  )
}
