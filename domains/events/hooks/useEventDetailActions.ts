import * as React from 'react'

import type { SocialEvent } from '../types'
import { addComment, fetchEventById, joinEvent, leaveEvent } from '../../../services/eventService'

type SetEvent = React.Dispatch<React.SetStateAction<SocialEvent | null>>

function updateEventById(setEvent: SetEvent, eventId: string, updater: (event: SocialEvent) => SocialEvent) {
  setEvent((prev) => {
    if (!prev) return prev
    if (prev.id !== eventId) return prev
    return updater(prev)
  })
}

async function refreshEventById(setEvent: SetEvent, eventId: string) {
  const refreshed = await fetchEventById(eventId)
  if (refreshed) setEvent(refreshed)
}

export function useEventDetailActions(args: {
  userId: string
  setEvent: React.Dispatch<React.SetStateAction<SocialEvent | null>>
}) {
  const { userId, setEvent } = args

  const onUpdateEvent = React.useCallback((updated: SocialEvent) => {
    setEvent(updated)
  }, [setEvent])

  const addSelfAsAttendee = React.useCallback((event: SocialEvent) => {
    if (event.attendees.includes(userId)) return event
    return { ...event, attendees: [...event.attendees, userId] }
  }, [userId])

  const removeSelfAsAttendee = React.useCallback((event: SocialEvent) => {
    return { ...event, attendees: event.attendees.filter((id) => id !== userId) }
  }, [userId])

  const runOptimisticAttendanceChange = React.useCallback(async (args: {
    eventId: string
    actionLabel: 'joining' | 'leaving'
    optimisticUpdate: (event: SocialEvent) => SocialEvent
    rollbackUpdate: (event: SocialEvent) => SocialEvent
    apiCall: (eventId: string) => Promise<boolean>
  }) => {
    const { eventId, actionLabel, optimisticUpdate, rollbackUpdate, apiCall } = args

    updateEventById(setEvent, eventId, optimisticUpdate)

    try {
      const success = await apiCall(eventId)
      if (success) {
        await refreshEventById(setEvent, eventId)
        return
      }

      updateEventById(setEvent, eventId, rollbackUpdate)
    } catch (error) {
      console.error(`Error ${actionLabel} event:`, error)
      updateEventById(setEvent, eventId, rollbackUpdate)
    }
  }, [setEvent])

  const updateEventComments = React.useCallback(
    (eventId: string, updateComments: (comments: SocialEvent['comments']) => SocialEvent['comments']) => {
      updateEventById(setEvent, eventId, (event) => ({ ...event, comments: updateComments(event.comments) }))
    },
    [setEvent],
  )

  const handleJoinEvent = React.useCallback(
    async (eventId: string) => {
      await runOptimisticAttendanceChange({
        eventId,
        actionLabel: 'joining',
        optimisticUpdate: addSelfAsAttendee,
        rollbackUpdate: removeSelfAsAttendee,
        apiCall: joinEvent,
      })
    },
    [addSelfAsAttendee, removeSelfAsAttendee, runOptimisticAttendanceChange],
  )

  const handleLeaveEvent = React.useCallback(
    async (eventId: string) => {
      await runOptimisticAttendanceChange({
        eventId,
        actionLabel: 'leaving',
        optimisticUpdate: removeSelfAsAttendee,
        rollbackUpdate: addSelfAsAttendee,
        apiCall: leaveEvent,
      })
    },
    [addSelfAsAttendee, removeSelfAsAttendee, runOptimisticAttendanceChange],
  )

  const handlePostComment = React.useCallback(
    async (eventId: string, text: string) => {
      const optimisticId = `optimistic-${Date.now().toString()}`
      const optimistic: SocialEvent['comments'][number] = {
        id: optimisticId,
        userId,
        text,
        timestamp: new Date().toISOString(),
      }

      updateEventComments(eventId, (comments) => [...comments, optimistic])

      try {
        const inserted = await addComment(eventId, text)
        if (!inserted) {
          // Roll back optimistic comment on failure.
          updateEventComments(eventId, (comments) => comments.filter((c) => c.id !== optimisticId))
          return
        }

        // Replace optimistic comment with the real one (real id + server timestamp).
        updateEventComments(eventId, (comments) => {
          const withoutOptimistic = comments.filter((c) => c.id !== optimisticId)
          return [...withoutOptimistic, inserted]
        })
      } catch (error) {
        console.error('Error posting comment:', error)
        updateEventComments(eventId, (comments) => comments.filter((c) => c.id !== optimisticId))
      }
    },
    [updateEventComments, userId],
  )

  return { onUpdateEvent, handleJoinEvent, handleLeaveEvent, handlePostComment }
}


