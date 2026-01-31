import * as React from 'react'

import { Users } from 'lucide-react'

import type { User } from '../../../../../lib/types'
import type { SocialEvent } from '../../../types'
import { EventVisibility } from '../../../types'
import { FormSelect } from '../../../../../lib/ui/components/FormControls'
import { ComingSoonPopover, useComingSoonPopover } from '../../../../../lib/ui/components/ComingSoonPopover'
import { useGuestsEditActions } from '../hooks/useGuestsEditActions'

export function GuestsTab(props: {
  event: SocialEvent
  attendeesList: User[]
  friendIds: Set<string>
  currentUserId?: string
  isEditMode: boolean
  onChangeAttendees?: (nextAttendees: string[]) => void
  onChangeMaxSeats?: (next: number | undefined) => void
}) {
  const { event, attendeesList, friendIds, currentUserId, isEditMode, onChangeAttendees, onChangeMaxSeats } = props
  const comingSoon = useComingSoonPopover()
  const guestsEdit = useGuestsEditActions({
    enabled: isEditMode,
    event,
    attendeesList,
    onChangeAttendees,
  })

  const attendeeCount = guestsEdit.visibleAttendeesList.length
  const goingLabel = event.maxSeats ? `${attendeeCount}/${event.maxSeats}` : `${attendeeCount}`

  return (
    <div className="space-y-4">
      {isEditMode ? (
        <div className="bg-surface border border-slate-700 rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-bold text-white">Attendance & visibility</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seats</div>
              <input
                type="number"
                min={0}
                step={1}
                value={event.maxSeats ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  const n = raw === '' ? undefined : Number(raw)
                  onChangeMaxSeats?.(n && n > 0 ? n : undefined)
                }}
                placeholder="Unlimited"
                className="w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none border-slate-700 focus:border-primary"
              />
              <div className="text-xs text-slate-500 mt-1">Leave blank for unlimited.</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Visibility</div>
              <FormSelect value={EventVisibility.INVITE_ONLY} size="lg" disabled>
                <option value={EventVisibility.INVITE_ONLY}>Invite only</option>
              </FormSelect>
            </div>
          </div>
        </div>
      ) : null}

      <div className={isEditMode ? 'bg-surface border border-slate-700 rounded-2xl p-5' : 'bg-background border border-transparent rounded-2xl p-5'}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" /> Guests
          </h2>
          <div className="text-sm text-slate-400 font-medium">{event.maxSeats ? goingLabel : `${attendeeCount}`}</div>
        </div>

        {guestsEdit.visibleAttendeesList.length === 0 ? (
          <div className="text-sm text-slate-500 italic">No guests yet.</div>
        ) : (
          <div className="space-y-2">
            {guestsEdit.visibleAttendeesList.map((u) => {
              const isThisHost = u.id === event.hostId
              const isMe = !!currentUserId && u.id === currentUserId
              const isFriend = friendIds.has(u.id)
              const canRemove = isEditMode && !isThisHost

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={u.avatar}
                        className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800"
                        alt={u.name}
                      />
                      {isThisHost ? (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-surface">
                          ★
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{u.name}</div>
                      {isThisHost ? (
                        <div className="text-xs text-yellow-400 font-semibold">Host</div>
                      ) : isMe ? (
                        <div className="text-xs text-slate-500 font-semibold">You</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isEditMode ? (
                      <button
                        type="button"
                        onClick={() => guestsEdit.onRemoveAttendee(u.id)}
                        disabled={!canRemove}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                          canRemove
                            ? 'bg-red-500/10 text-red-300 border-red-500/40 hover:bg-red-500/20'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        Remove
                      </button>
                    ) : isMe ? null : isFriend ? (
                      <button type="button" disabled className="px-3 py-2 rounded-xl text-xs font-bold border bg-slate-800 text-slate-300 border-slate-700">
                        Friends
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-disabled="true"
                        onClick={(e) => comingSoon.show(e, 'Coming Soon!')}
                        className="px-3 py-2 rounded-xl text-xs font-bold border bg-slate-900 text-slate-500 border-slate-700 opacity-60 cursor-not-allowed"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {event.maxSeats && guestsEdit.visibleAttendeesList.length < event.maxSeats ? (
          <div className="mt-3 text-xs text-slate-500">
            {event.maxSeats - guestsEdit.visibleAttendeesList.length} spot
            {event.maxSeats - guestsEdit.visibleAttendeesList.length === 1 ? '' : 's'} open
          </div>
        ) : null}
      </div>

      <ComingSoonPopover state={comingSoon.state} />
    </div>
  )
}

