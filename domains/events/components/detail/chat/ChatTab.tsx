import * as React from 'react'

import type { User } from '../../../../../lib/types'
import type { Comment, SocialEvent } from '../../../types'
import { Send } from 'lucide-react'

export function ChatTab(props: {
  event: SocialEvent
  commentUsers: Map<string, User>
  currentUserId?: string
  isEditMode: boolean
  isGuest: boolean
  onRequireAuth?: () => void
  onPostComment?: (eventId: string, text: string) => Promise<void> | void
  onUpdateEvent: (updated: SocialEvent) => void
}) {
  const { event, commentUsers, currentUserId, isEditMode, isGuest, onRequireAuth, onPostComment, onUpdateEvent } = props

  const [commentText, setCommentText] = React.useState('')

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

  const cardClassName = isEditMode
    ? 'bg-surface border border-slate-700 rounded-2xl p-5'
    : 'bg-background border border-transparent rounded-2xl p-5'

  return (
    <div className={cardClassName}>
      <h2 className="text-lg font-bold text-white mb-4">Chat</h2>

      <div className="space-y-6 mb-6">
        {event.comments.length === 0 && (
          <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-800">
            <p className="text-slate-500 italic">No comments yet.</p>
          </div>
        )}

        {event.comments.map((c) => {
          const u = commentUsers.get(c.userId)
          return (
            <div key={c.id} className="flex gap-4">
              {u ? (
                <img src={u.avatar} className="w-10 h-10 rounded-full" alt={u.name} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
              )}
              <div className="bg-slate-800 rounded-2xl rounded-tl-none p-4 flex-1">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold text-slate-200">{u?.name || 'Loading...'}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-300 leading-normal">{c.text}</p>
              </div>
            </div>
          )
        })}
      </div>

      {isEditMode ? (
        <div className="mt-4 text-sm text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          Chat is read-only while editing. Save your changes to return to normal interaction.
        </div>
      ) : (
        <form onSubmit={handlePostComment} className="relative">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
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
        </form>
      )}
    </div>
  )
}

