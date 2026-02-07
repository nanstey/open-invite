import * as React from 'react'

import type { SocialEvent } from '../types'
import { addComment, fetchEventById, joinEvent, leaveEvent, toggleCommentReaction } from '../../../services/eventService'

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

  const cloneReactions = React.useCallback((reactions: SocialEvent['comments'][number]['reactions']) => {
    if (!reactions) return undefined
    return Object.fromEntries(
      Object.entries(reactions).map(([emoji, reaction]) => [
        emoji,
        { ...reaction, userIds: reaction.userIds ? [...reaction.userIds] : undefined },
      ]),
    )
  }, [])

  const applyCommentReaction = React.useCallback(
    (reactions: NonNullable<SocialEvent['comments'][number]['reactions']>, emoji: string) => {
      const next = cloneReactions(reactions) ?? {}
      const currentEmoji = Object.keys(next).find((key) => next[key]?.userReacted)

      if (currentEmoji && next[currentEmoji]) {
        next[currentEmoji].count -= 1
        next[currentEmoji].userReacted = false
        if (next[currentEmoji].userIds) {
          next[currentEmoji].userIds = next[currentEmoji].userIds.filter((id) => id !== userId)
        }
        if (next[currentEmoji].count <= 0) {
          delete next[currentEmoji]
        }
      }

      if (currentEmoji === emoji) {
        return next
      }

      if (!next[emoji]) {
        next[emoji] = { emoji, count: 0, userReacted: false, userIds: [] }
      }
      next[emoji].count += 1
      next[emoji].userReacted = true
      if (next[emoji].userIds && !next[emoji].userIds.includes(userId)) {
        next[emoji].userIds.push(userId)
      }

      return next
    },
    [cloneReactions],
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

  const handleToggleCommentReaction = React.useCallback(
    async (eventId: string, commentId: string, emoji: string) => {
      let previousReactions: SocialEvent['comments'][number]['reactions'] | undefined

      updateEventComments(eventId, (comments) =>
        comments.map((comment) => {
          if (comment.id !== commentId) return comment
          previousReactions = cloneReactions(comment.reactions)
          const updated = applyCommentReaction(comment.reactions ?? {}, emoji)
          return { ...comment, reactions: Object.keys(updated).length ? updated : undefined }
        }),
      )

      try {
        const success = await toggleCommentReaction(commentId, emoji)
        if (!success) {
          throw new Error('Failed to toggle comment reaction')
        }
      } catch (error) {
        console.error('Error toggling comment reaction:', error)
        updateEventComments(eventId, (comments) =>
          comments.map((comment) =>
            comment.id === commentId
              ? { ...comment, reactions: previousReactions }
              : comment,
          ),
        )
      }
    },
    [applyCommentReaction, cloneReactions, updateEventComments],
  )

  return { onUpdateEvent, handleJoinEvent, handleLeaveEvent, handlePostComment, handleToggleCommentReaction }
}
