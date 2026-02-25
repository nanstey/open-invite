

import { Check } from 'lucide-react'

import type { User } from '../../../../../lib/types'

type GuestRowProps = {
  user: User
  isHost: boolean
  isMe: boolean
  isFriend: boolean
  isEditMode: boolean
  canRemove: boolean
  isFiltered: boolean
  isAttendingItem: boolean
  hasIncomingRequest: boolean
  hasOutgoingRequest: boolean
  isPendingRequest: boolean
  isSendingRequest: boolean
  onRemove: () => void
  onSendFriendRequest: () => void
}

export function GuestRow(props: GuestRowProps) {
  const {
    user,
    isHost,
    isMe,
    isFriend,
    isEditMode,
    canRemove,
    isFiltered,
    isAttendingItem,
    hasIncomingRequest,
    hasOutgoingRequest,
    isPendingRequest,
    isSendingRequest,
    onRemove,
    onSendFriendRequest,
  } = props

  const shouldDim = isFiltered && !isAttendingItem
  const showPending = hasIncomingRequest || hasOutgoingRequest || isPendingRequest

  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 transition-colors ${
        shouldDim ? 'opacity-50 grayscale' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <img
            src={user.avatar}
            className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800"
            alt={user.name}
          />
          {isHost ? (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-surface">
              ★
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{user.name}</div>
          {isHost ? (
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
            onClick={onRemove}
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
          <button
            type="button"
            disabled
            className="px-3 py-2 rounded-xl text-xs font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/20 flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Friends
          </button>
        ) : showPending ? (
          <button
            type="button"
            disabled
            className="px-3 py-2 rounded-xl text-xs font-bold border bg-amber-500/20 text-amber-400 border-amber-500/20"
          >
            Pending
          </button>
        ) : (
          <button
            type="button"
            onClick={onSendFriendRequest}
            disabled={isSendingRequest}
            className="px-3 py-2 rounded-xl text-xs font-bold border bg-violet-500/20 text-violet-400 border-violet-500/30 hover:bg-violet-500/30 transition-colors disabled:opacity-50"
          >
            {isSendingRequest ? 'Sending...' : 'Add Friend'}
          </button>
        )}
      </div>
    </div>
  )
}
