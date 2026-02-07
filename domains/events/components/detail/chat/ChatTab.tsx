import * as React from 'react'

import type { User } from '../../../../../lib/types'
import type { Comment, SocialEvent } from '../../../types'
import { Send } from 'lucide-react'
import { useEmojiAutocomplete } from '../../../../../lib/hooks/useEmojiAutocomplete'
import { EmojiPicker } from '../../../../../lib/ui/9ui/emoji-picker'
import { Popover, PopoverContent } from '../../../../../lib/ui/9ui/popover'
import { CommentReactionBar, CommentReactionPicker } from './CommentReactionBar'

const LONG_PRESS_DELAY_MS = 450

type ChatMessageBubbleProps = {
  comment: Comment
  user?: User
  isEditMode: boolean
  reactionUsers: Map<string, User>
  isPickerOpen: boolean
  onToggleReaction: (emoji: string) => void
  onOpenPicker: (nextOpen: boolean) => void
  showReactions: boolean
}

function ChatMessageBubble({
  comment,
  user,
  isEditMode,
  reactionUsers,
  isPickerOpen,
  onToggleReaction,
  onOpenPicker,
  showReactions,
}: ChatMessageBubbleProps) {
  const longPressTimeout = React.useRef<number | null>(null)
  const suppressClickRef = React.useRef(false)

  React.useEffect(() => {
    return () => {
      if (longPressTimeout.current) {
        window.clearTimeout(longPressTimeout.current)
      }
    }
  }, [])

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      const target = event.target as HTMLElement | null
      if (target?.closest('button')) return
      onOpenPicker(!isPickerOpen)
    },
    [isPickerOpen, onOpenPicker],
  )

  const handleTouchStart = React.useCallback(() => {
    if (longPressTimeout.current) {
      window.clearTimeout(longPressTimeout.current)
    }
    longPressTimeout.current = window.setTimeout(() => {
      suppressClickRef.current = true
      onOpenPicker(true)
    }, LONG_PRESS_DELAY_MS)
  }, [onOpenPicker])

  const handleTouchEnd = React.useCallback(() => {
    if (longPressTimeout.current) {
      window.clearTimeout(longPressTimeout.current)
      longPressTimeout.current = null
    }
  }, [])

  return (
    <div className="flex-1">
      <div
        className="bg-slate-800 rounded-2xl rounded-tl-none p-4 cursor-pointer"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="flex justify-between items-baseline mb-0">
          <span className="text-sm font-bold text-slate-200">{user?.name || 'Loading...'}</span>
          <span className="text-[10px] text-slate-500">
            {new Date(comment.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-slate-300 leading-normal flex-1">{comment.text}</p>
          <CommentReactionPicker
            disabled={isEditMode}
            onToggle={onToggleReaction}
            className="mt-0"
            addButtonWrapperClassName="justify-end"
            popoverAlign="end"
            open={isPickerOpen}
            onOpenChange={onOpenPicker}
            showTrigger={false}
            />
        </div>
      </div>
      {showReactions ? (
        <CommentReactionBar
          reactions={comment.reactions}
          reactionUsers={reactionUsers}
          disabled={isEditMode}
          onToggle={onToggleReaction}
          className="mt-1"
        />
      ) : null}
    </div>
  )
}

export function ChatTab(props: {
  event: SocialEvent
  commentUsers: Map<string, User>
  reactionUsers: Map<string, User>
  currentUserId?: string
  isEditMode: boolean
  isGuest: boolean
  onRequireAuth?: () => void
  onPostComment?: (eventId: string, text: string) => Promise<void> | void
  onToggleCommentReaction?: (eventId: string, commentId: string, emoji: string) => Promise<void> | void
  onUpdateEvent: (updated: SocialEvent) => void
}) {
  const {
    event,
    commentUsers,
    reactionUsers,
    currentUserId,
    isEditMode,
    isGuest,
    onRequireAuth,
    onPostComment,
    onToggleCommentReaction,
    onUpdateEvent,
  } = props

  const [commentText, setCommentText] = React.useState('')
  const [activePickerCommentId, setActivePickerCommentId] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const emojiAutocomplete = useEmojiAutocomplete({ value: commentText, onChange: setCommentText, inputRef })
  const today = React.useMemo(() => new Date(), [])

  const formatChatDate = React.useCallback(
    (timestamp: string) => {
      const messageDate = new Date(timestamp)
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const startOfMessage = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())
      const diffMs = startOfToday.getTime() - startOfMessage.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays >= 0 && diffDays < 7) {
        return messageDate.toLocaleDateString([], { weekday: 'short' })
      }

      if (messageDate.getFullYear() === today.getFullYear()) {
        return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }

      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    },
    [today],
  )

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditMode) return
    if (isGuest) {
      onRequireAuth?.()
      return
    }
    const text = commentText.trim()
    if (!text) return

    if (onPostComment) {
      setCommentText('')
      await onPostComment(event.id, text)
      return
    }

    const newComment: Comment = {
      id: `optimistic-${Date.now().toString()}`,
      userId: currentUserId!,
      text,
      timestamp: new Date().toISOString(),
    }

    onUpdateEvent({ ...event, comments: [...event.comments, newComment] })
    setCommentText('')
  }

  const applyLocalReactionUpdate = React.useCallback(
    (comment: Comment, emoji: string) => {
      const existingReactions = comment.reactions ?? {}
      const updated = Object.fromEntries(
        Object.entries(existingReactions).map(([key, reaction]) => [
          key,
          { ...reaction, userIds: reaction.userIds ? [...reaction.userIds] : undefined },
        ]),
      )
      const currentEmoji = Object.keys(updated).find((key) => updated[key]?.userReacted)

      if (currentEmoji && updated[currentEmoji]) {
        updated[currentEmoji].count -= 1
        updated[currentEmoji].userReacted = false
        if (updated[currentEmoji].userIds && currentUserId) {
          updated[currentEmoji].userIds = updated[currentEmoji].userIds.filter((id) => id !== currentUserId)
        }
        if (updated[currentEmoji].count <= 0) {
          delete updated[currentEmoji]
        }
      }

      if (currentEmoji !== emoji) {
        if (!updated[emoji]) {
          updated[emoji] = { emoji, count: 0, userReacted: false, userIds: [] }
        }
        updated[emoji].count += 1
        updated[emoji].userReacted = true
        if (updated[emoji].userIds && currentUserId && !updated[emoji].userIds.includes(currentUserId)) {
          updated[emoji].userIds.push(currentUserId)
        }
      }

      return Object.keys(updated).length ? updated : undefined
    },
    [currentUserId],
  )

  const handleToggleReaction = React.useCallback(
    (commentId: string, emoji: string) => {
      if (isEditMode) return
      if (isGuest) {
        onRequireAuth?.()
        return
      }

      if (onToggleCommentReaction) {
        void onToggleCommentReaction(event.id, commentId, emoji)
        return
      }

      const updatedComments = event.comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, reactions: applyLocalReactionUpdate(comment, emoji) }
          : comment,
      )
      onUpdateEvent({ ...event, comments: updatedComments })
    },
    [applyLocalReactionUpdate, event, isEditMode, isGuest, onRequireAuth, onToggleCommentReaction, onUpdateEvent],
  )

  const cardClassName = isEditMode
    ? 'bg-surface border border-slate-700 rounded-2xl p-5'
    : 'bg-background border border-transparent rounded-2xl p-5'

  return (
    <div className={cardClassName}>
      <h2 className="text-lg font-bold text-white mb-4">Chat</h2>

      <div className="space-y-4 mb-4">
        {event.comments.length === 0 && (
          <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-800">
            <p className="text-slate-500 italic">No comments yet.</p>
          </div>
        )}

        {event.comments.map((c, index) => {
          const u = commentUsers.get(c.userId)
          const prev = index > 0 ? event.comments[index - 1] : null
          const currentDayKey = new Date(c.timestamp).toDateString()
          const prevDayKey = prev ? new Date(prev.timestamp).toDateString() : null
          const showDateHeader = currentDayKey !== prevDayKey
          const hasReactions = !!c.reactions && Object.keys(c.reactions).length > 0
          const isPickerOpen = activePickerCommentId === c.id
          return (
            <React.Fragment key={c.id}>
              {showDateHeader ? (
                <div className="text-[11px] tracking-[0.2em] text-slate-500 text-center uppercase">
                  {formatChatDate(c.timestamp)}
                </div>
              ) : null}
              <div className="flex gap-4 group">
                {u ? (
                  <img src={u.avatar} className="w-10 h-10 rounded-full" alt={u.name} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
                )}
                <ChatMessageBubble
                  comment={c}
                  user={u}
                  isEditMode={isEditMode}
                  reactionUsers={reactionUsers}
                  isPickerOpen={isPickerOpen}
                  onToggleReaction={(emoji) => handleToggleReaction(c.id, emoji)}
                  onOpenPicker={(nextOpen) =>
                    setActivePickerCommentId(nextOpen ? c.id : null)
                  }
                  showReactions={hasReactions}
                />
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {isEditMode ? (
        <div className="mt-4 text-sm text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          Chat is read-only while editing. Save your changes to return to normal interaction.
        </div>
      ) : (
        <form onSubmit={handlePostComment} className="relative">
          <Popover open={emojiAutocomplete.isOpen} onOpenChange={emojiAutocomplete.setIsOpen} className="w-full">
            <div className="relative w-full">
              <input
                ref={inputRef}
                value={commentText}
                onChange={emojiAutocomplete.handleChange}
                onKeyDown={emojiAutocomplete.handleKeyDown}
                placeholder="Ask a question or say hi..."
                className="w-full bg-slate-900 border border-slate-700 rounded-full py-3.5 pl-5 pr-14 text-white focus:border-primary outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="absolute right-2 top-2 p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:bg-slate-700 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
              <PopoverContent
                align="start"
                className="mt-0 w-[320px] p-0"
                style={{
                  left: emojiAutocomplete.popoverPosition.left,
                  top: emojiAutocomplete.popoverPosition.top,
                }}
              >
                <EmojiPicker
                  emojis={emojiAutocomplete.emojis}
                  highlightedIndex={emojiAutocomplete.highlightedIndex}
                  onHighlightChange={emojiAutocomplete.setHighlightedIndex}
                  onSelect={emojiAutocomplete.handleEmojiSelect}
                />
              </PopoverContent>
            </div>
          </Popover>
        </form>
      )}
    </div>
  )
}
