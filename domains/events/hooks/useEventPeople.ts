import * as React from 'react'

import type { User } from '../../../lib/types'
import type { SocialEvent } from '../types'
import { fetchUser, fetchUsers } from '../../../services/userService'

export function useEventPeople(args: { event: SocialEvent; currentUserId?: string }) {
  const { event, currentUserId } = args

  const [host, setHost] = React.useState<User | null>(null)
  const [attendeesList, setAttendeesList] = React.useState<User[]>([])
  const [commentUsers, setCommentUsers] = React.useState<Map<string, User>>(new Map())

  React.useEffect(() => {
    let cancelled = false

    const loadUsers = async () => {
      // Host
      const fetchedHost = await fetchUser(event.hostId, currentUserId)
      if (cancelled) return
      if (fetchedHost) setHost(fetchedHost)

      // Attendees
      if (event.attendees.length > 0) {
        const fetchedAttendees = await fetchUsers(event.attendees, currentUserId)
        if (cancelled) return
        setAttendeesList(fetchedAttendees)
      } else {
        setAttendeesList([])
      }

      // Comment authors
      const commentUserIds: string[] = event.comments.map((c) => c.userId)
      if (commentUserIds.length > 0) {
        const uniqueCommentUserIds: string[] = [...new Set(commentUserIds)]
        const fetchedCommentUsers = await fetchUsers(uniqueCommentUserIds, currentUserId)
        if (cancelled) return
        setCommentUsers(new Map(fetchedCommentUsers.map((u) => [u.id, u])))
      } else {
        setCommentUsers(new Map())
      }
    }

    loadUsers()

    return () => {
      cancelled = true
    }
  }, [event.hostId, event.attendees, event.comments, currentUserId])

  return { host, attendeesList, commentUsers }
}


