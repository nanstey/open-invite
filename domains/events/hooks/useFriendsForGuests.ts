import * as React from 'react'

import { fetchFriends } from '../../../services/friendService'

export function useFriendsForGuests(args: { enabled: boolean }) {
  const { enabled } = args
  const [friendIds, setFriendIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    if (!enabled) return
    let cancelled = false

    ;(async () => {
      try {
        const friends = await fetchFriends()
        if (cancelled) return
        setFriendIds(new Set(friends.map((f) => f.id)))
      } catch (err) {
        console.error('Error loading friends:', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { friendIds }
}


