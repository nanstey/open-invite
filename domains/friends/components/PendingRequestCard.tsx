import * as React from 'react'
import { Check, X } from 'lucide-react'
import { UserAvatar } from '../../../lib/ui/components/UserAvatar'
import type { PendingFriendRequest } from '../../../services/friendService'

export interface PendingRequestCardProps {
  request: PendingFriendRequest
  isProcessing: boolean
  onAccept: () => void
  onDecline: () => void
}

export const PendingRequestCard: React.FC<PendingRequestCardProps> = ({
  request,
  isProcessing,
  onAccept,
  onDecline,
}) => (
  <div className="bg-surface border border-slate-700 p-4 rounded-xl flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <UserAvatar src={request.requester.avatar} alt={request.requester.name} />
      <div>
        <div className="font-bold text-white">{request.requester.name}</div>
        <div className="text-xs text-slate-500">Wants to connect</div>
      </div>
    </div>
    <div className="flex gap-2 shrink-0">
      <button
        className="p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
        onClick={onAccept}
        disabled={isProcessing}
        title="Accept"
      >
        <Check className="w-4 h-4 sm:hidden" />
        <span className="hidden sm:inline">Accept</span>
      </button>
      <button
        className="p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-red-400 hover:border-red-400/30 transition-colors disabled:opacity-50"
        onClick={onDecline}
        disabled={isProcessing}
        title="Decline"
      >
        <X className="w-4 h-4 sm:hidden" />
        <span className="hidden sm:inline">Decline</span>
      </button>
    </div>
  </div>
)

