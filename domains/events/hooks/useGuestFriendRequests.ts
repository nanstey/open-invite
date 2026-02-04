import * as React from 'react'

import { sendFriendRequest } from '../../../services/friendService'

export function useGuestFriendRequests() {
  const [pendingRequestIds, setPendingRequestIds] = React.useState<Set<string>>(new Set())
  const [sendingRequestIds, setSendingRequestIds] = React.useState<Set<string>>(new Set())

  const handleSendFriendRequest = React.useCallback(async (userId: string) => {
    setSendingRequestIds((prev) => new Set(prev).add(userId))
    const success = await sendFriendRequest(userId)
    if (success) {
      setPendingRequestIds((prev) => new Set(prev).add(userId))
    }
    setSendingRequestIds((prev) => {
      const next = new Set(prev)
      next.delete(userId)
      return next
    })
  }, [])

  return { pendingRequestIds, sendingRequestIds, handleSendFriendRequest }
}
