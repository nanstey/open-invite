import * as React from 'react'

import { fetchFriends, fetchOutgoingFriendRequests, fetchPendingFriendRequests } from '../../../services/friendService'

export function useFriendsForGuests(args: { enabled: boolean }) {
  const { enabled } = args
  const [friendIds, setFriendIds] = React.useState<Set<string>>(new Set())
  const [outgoingRequestIds, setOutgoingRequestIds] = React.useState<Set<string>>(new Set())
  // Map from requester user ID to the request ID (needed for accepting)
  const [incomingRequestMap, setIncomingRequestMap] = React.useState<Map<string, string>>(new Map())

  React.useEffect(() => {
    if (!enabled) return
    let cancelled = false

    ;(async () => {
      try {
        const [friends, outgoingRequests, incomingRequests] = await Promise.all([
          fetchFriends(),
          fetchOutgoingFriendRequests(),
          fetchPendingFriendRequests(),
        ])
        if (cancelled) return
        setFriendIds(new Set(friends.map((f) => f.id)))
        setOutgoingRequestIds(new Set(outgoingRequests.map((r) => r.recipientId)))
        setIncomingRequestMap(new Map(incomingRequests.map((r) => [r.requesterId, r.id])))
      } catch (err) {
        console.error('Error loading friends:', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { friendIds, outgoingRequestIds, incomingRequestMap }
}


