import * as React from 'react'
import { Clock, X } from 'lucide-react'
import { UserAvatar } from '../../../lib/ui/components/UserAvatar'
import type { OutgoingFriendRequest } from '../../../services/friendService'

export interface OutgoingRequestCardProps {
  request: OutgoingFriendRequest
  isProcessing: boolean
  onCancel: () => void
}

export const OutgoingRequestCard: React.FC<OutgoingRequestCardProps> = ({
  request,
  isProcessing,
  onCancel,
}) => (
  <div className="bg-surface border border-slate-700 p-4 rounded-xl flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <UserAvatar src={request.recipient.avatar} alt={request.recipient.name} />
      <div>
        <div className="font-bold text-white">{request.recipient.name}</div>
        <div className="text-xs text-slate-500">Request sent</div>
      </div>
    </div>
    <div className="flex gap-2 shrink-0">
      <div className="p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400/60 border border-amber-500/20 flex items-center justify-center cursor-default">
        <Clock className="w-4 h-4 sm:hidden" />
        <span className="hidden sm:inline">Pending</span>
      </div>
      <button
        className="p-2 sm:px-3 sm:py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-red-400 hover:border-red-400/30 transition-colors disabled:opacity-50"
        onClick={onCancel}
        disabled={isProcessing}
        title="Cancel request"
      >
        <X className="w-4 h-4 sm:hidden" />
        <span className="hidden sm:inline">Cancel</span>
      </button>
    </div>
  </div>
)
