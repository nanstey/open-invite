import * as React from 'react'

import type { SocialEvent } from '../types'
import { addComment, fetchEventById, joinEvent, leaveEvent } from '../../services/eventService'

export function useEventDetailActions(args: {
  userId: string
  setEvent: React.Dispatch<React.SetStateAction<SocialEvent | null>>
}) {
  const { userId, setEvent } = args

  const onUpdateEvent = React.useCallback((updated: SocialEvent) => {
    setEvent(updated)
  }, [setEvent])

  const handleJoinEvent = React.useCallback(
    async (eventId: string) => {
      // Optimistic UI: update immediately so the user sees the join.
      setEvent((prev) => {
        if (!prev) return prev
        if (prev.id !== eventId) return prev
        if (prev.attendees.includes(userId)) return prev
        return { ...prev, attendees: [...prev.attendees, userId] }
      })

      try {
        const success = await joinEvent(eventId)
        if (success) {
          const refreshed = await fetchEventById(eventId)
          if (refreshed) setEvent(refreshed)
        } else {
          // Roll back optimistic update on failure.
          setEvent((prev) => {
            if (!prev) return prev
            if (prev.id !== eventId) return prev
            return { ...prev, attendees: prev.attendees.filter((id) => id !== userId) }
          })
        }
      } catch (error) {
        console.error('Error joining event:', error)
        // Roll back optimistic update on exception.
        setEvent((prev) => {
          if (!prev) return prev
          if (prev.id !== eventId) return prev
          return { ...prev, attendees: prev.attendees.filter((id) => id !== userId) }
        })
      }
    },
    [setEvent, userId],
  )

  const handleLeaveEvent = React.useCallback(
    async (eventId: string) => {
      // Optimistic UI.
      setEvent((prev) => {
        if (!prev) return prev
        if (prev.id !== eventId) return prev
        return { ...prev, attendees: prev.attendees.filter((id) => id !== userId) }
      })

      try {
        const success = await leaveEvent(eventId)
        if (success) {
          const refreshed = await fetchEventById(eventId)
          if (refreshed) setEvent(refreshed)
        } else {
          // Roll back (re-add self) on failure.
          setEvent((prev) => {
            if (!prev) return prev
            if (prev.id !== eventId) return prev
            if (prev.attendees.includes(userId)) return prev
            return { ...prev, attendees: [...prev.attendees, userId] }
          })
        }
      } catch (error) {
        console.error('Error leaving event:', error)
        // Roll back (re-add self) on exception.
        setEvent((prev) => {
          if (!prev) return prev
          if (prev.id !== eventId) return prev
          if (prev.attendees.includes(userId)) return prev
          return { ...prev, attendees: [...prev.attendees, userId] }
        })
      }
    },
    [setEvent, userId],
  )

  const handlePostComment = React.useCallback(
    async (eventId: string, text: string) => {
      const optimisticId = `optimistic-${Date.now().toString()}`
      const optimistic = {
        id: optimisticId,
        userId,
        text,
        timestamp: new Date().toISOString(),
      }

      setEvent((prev) => {
        if (!prev) return prev
        if (prev.id !== eventId) return prev
        return { ...prev, comments: [...prev.comments, optimistic] }
      })

      const inserted = await addComment(eventId, text)
      if (!inserted) {
        // Roll back optimistic comment on failure.
        setEvent((prev) => {
          if (!prev) return prev
          if (prev.id !== eventId) return prev
          return { ...prev, comments: prev.comments.filter((c) => c.id !== optimisticId) }
        })
        return
      }

      // Replace optimistic comment with the real one (real id + server timestamp).
      setEvent((prev) => {
        if (!prev) return prev
        if (prev.id !== eventId) return prev
        const withoutOptimistic = prev.comments.filter((c) => c.id !== optimisticId)
        return { ...prev, comments: [...withoutOptimistic, inserted] }
      })
    },
    [setEvent, userId],
  )

  return { onUpdateEvent, handleJoinEvent, handleLeaveEvent, handlePostComment }
}


