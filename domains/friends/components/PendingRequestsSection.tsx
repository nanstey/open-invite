import * as React from 'react'
import { SectionHeader } from '../../../lib/ui/components/SectionHeader'
import { PendingRequestCard } from './PendingRequestCard'
import { OutgoingRequestCard } from './OutgoingRequestCard'
import type { OutgoingFriendRequest, PendingFriendRequest } from '../../../services/friendService'

export interface PendingRequestsSectionProps {
  incomingRequests: PendingFriendRequest[]
  outgoingRequests: OutgoingFriendRequest[]
  isLoadingIncoming: boolean
  isLoadingOutgoing: boolean
  processingIds: Set<string>
  onAccept: (request: PendingFriendRequest) => void
  onDecline: (request: PendingFriendRequest) => void
  onCancel: (request: OutgoingFriendRequest) => void
}

export const PendingRequestsSection: React.FC<PendingRequestsSectionProps> = ({
  incomingRequests,
  outgoingRequests,
  isLoadingIncoming,
  isLoadingOutgoing,
  processingIds,
  onAccept,
  onDecline,
  onCancel,
}) => {
  const isLoading = isLoadingIncoming || isLoadingOutgoing
  const totalCount = incomingRequests.length + outgoingRequests.length
  const hasRequests = totalCount > 0

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Friend Requests"
        count={isLoading ? 'Loading...' : `${totalCount} Pending`}
        className="mb-1"
      />

      {isLoading ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
          Loading friend requests...
        </div>
      ) : !hasRequests ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-sm text-slate-500">
          No pending friend requests.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {incomingRequests.map((request) => (
            <PendingRequestCard
              key={request.id}
              request={request}
              isProcessing={processingIds.has(request.id)}
              onAccept={() => onAccept(request)}
              onDecline={() => onDecline(request)}
            />
          ))}
          {outgoingRequests.map((request) => (
            <OutgoingRequestCard
              key={request.id}
              request={request}
              isProcessing={processingIds.has(request.id)}
              onCancel={() => onCancel(request)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
