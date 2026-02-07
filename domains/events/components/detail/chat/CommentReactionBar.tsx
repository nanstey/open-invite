import * as React from 'react'

import { SmilePlus } from 'lucide-react'

import type { Reaction } from '../../../types'
import type { User } from '../../../../../lib/types'
import { EMOJI_DATA } from '../../../../../lib/ui/9ui/emoji-data'
import { EmojiPicker } from '../../../../../lib/ui/9ui/emoji-picker'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../../lib/ui/9ui/popover'
import { cn } from '../../../../../lib/ui/9ui/utils'

type CommentReactionBarProps = {
  reactions?: Record<string, Reaction>
  reactionUsers?: Map<string, User>
  onToggle: (emoji: string) => void
  disabled?: boolean
  className?: string
}

const HOVER_DELAY_MS = 300
const LONG_PRESS_DELAY_MS = 450

function usePopoverDismiss(args: {
  open: boolean
  ref: React.RefObject<HTMLElement>
  onClose: () => void
  closeOnEscape?: boolean
  includeTouch?: boolean
}) {
  const { open, ref, onClose, closeOnEscape = false, includeTouch = false } = args

  React.useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (target && ref.current && !ref.current.contains(target)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    if (includeTouch) {
      document.addEventListener('touchstart', handlePointerDown)
    }
    if (closeOnEscape) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      if (includeTouch) {
        document.removeEventListener('touchstart', handlePointerDown)
      }
      if (closeOnEscape) {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [closeOnEscape, includeTouch, onClose, open, ref])
}

function getReactionUserNames(reaction: Reaction, reactionUsers?: Map<string, User>) {
  const reactionUserIds = reaction.userIds ? [...new Set(reaction.userIds)] : []
  const reactionUserNames = reactionUserIds.map((id) => {
    const user = reactionUsers?.get(id)
    if (user?.isCurrentUser) return 'You'
    return user?.name ?? 'Unknown guest'
  })
  return reactionUserNames
}

type ReactionPopoverItemProps = {
  reaction: Reaction
  reactionUsers?: Map<string, User>
  disabled?: boolean
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onToggle: (emoji: string) => void
}

function ReactionPopoverItem({
  reaction,
  reactionUsers,
  disabled,
  isOpen,
  onOpen,
  onClose,
  onToggle,
}: ReactionPopoverItemProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const longPressTimeout = React.useRef<number | null>(null)
  const hoverTimeout = React.useRef<number | null>(null)
  const suppressClickRef = React.useRef(false)

  const reactionUserNames = React.useMemo(
    () => getReactionUserNames(reaction, reactionUsers),
    [reaction, reactionUsers],
  )
  const hasReactionUsers = reactionUserNames.length > 0
  const isUserListLoading = reaction.userIds === undefined && reaction.count > 0

  usePopoverDismiss({
    open: isOpen,
    ref: containerRef,
    onClose,
    includeTouch: true,
  })

  React.useEffect(() => {
    return () => {
      if (longPressTimeout.current) {
        window.clearTimeout(longPressTimeout.current)
      }
      if (hoverTimeout.current) {
        window.clearTimeout(hoverTimeout.current)
      }
    }
  }, [])

  return (
    <Popover open={isOpen}>
      <div
        ref={containerRef}
        onMouseEnter={() => {
          if (hoverTimeout.current) {
            window.clearTimeout(hoverTimeout.current)
          }
          hoverTimeout.current = window.setTimeout(() => {
            onOpen()
          }, HOVER_DELAY_MS)
        }}
        onMouseLeave={() => {
          if (hoverTimeout.current) {
            window.clearTimeout(hoverTimeout.current)
            hoverTimeout.current = null
          }
          onClose()
        }}
        onTouchStart={() => {
          if (disabled) return
          if (longPressTimeout.current) {
            window.clearTimeout(longPressTimeout.current)
          }
          longPressTimeout.current = window.setTimeout(() => {
            suppressClickRef.current = true
            onOpen()
          }, LONG_PRESS_DELAY_MS)
        }}
        onTouchEnd={() => {
          if (longPressTimeout.current) {
            window.clearTimeout(longPressTimeout.current)
            longPressTimeout.current = null
          }
        }}
        onTouchCancel={() => {
          if (longPressTimeout.current) {
            window.clearTimeout(longPressTimeout.current)
            longPressTimeout.current = null
          }
        }}
        className="relative inline-flex"
      >
        <button
          type="button"
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false
              return
            }
            onToggle(reaction.emoji)
          }}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            reaction.userReacted
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500',
          )}
        >
          <span className="text-sm">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
        <PopoverContent align="start" className="bottom-full mb-2 mt-0 w-56 p-2">
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400">
            <span className="text-sm">{reaction.emoji}</span>
            <span>{reaction.count} reacted</span>
          </div>
          {hasReactionUsers ? (
            <div className="max-h-48 space-y-1 overflow-y-auto px-2 pb-2 text-xs text-slate-100">
              {reactionUserNames.map((name, index) => (
                <div key={`${reaction.emoji}-${index}`} className="truncate">
                  {name}
                </div>
              ))}
            </div>
          ) : isUserListLoading ? (
            <div className="px-2 pb-2 text-xs text-slate-400">Loading guests...</div>
          ) : (
            <div className="px-2 pb-2 text-xs text-slate-400">No reactions yet.</div>
          )}
        </PopoverContent>
      </div>
    </Popover>
  )
}

export function CommentReactionBar({ reactions, reactionUsers, onToggle, disabled, className }: CommentReactionBarProps) {
  const [activeEmoji, setActiveEmoji] = React.useState<string | null>(null)

  const reactionItems = React.useMemo(() => {
    if (!reactions) return []
    return Object.values(reactions).sort((a, b) => a.emoji.localeCompare(b.emoji))
  }, [reactions])

  return (
    <div className={cn('mt-3 flex flex-wrap items-center gap-2', className)}>
      {reactionItems.map((reaction) => (
        <React.Fragment key={reaction.emoji}>
          <ReactionPopoverItem
            reaction={reaction}
            reactionUsers={reactionUsers}
            disabled={disabled}
            isOpen={activeEmoji === reaction.emoji}
            onOpen={() => setActiveEmoji(reaction.emoji)}
            onClose={() => setActiveEmoji((prev) => (prev === reaction.emoji ? null : prev))}
            onToggle={onToggle}
          />
        </React.Fragment>
      ))}
    </div>
  )
}

type CommentReactionPickerProps = {
  onToggle: (emoji: string) => void
  disabled?: boolean
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  popoverAlign?: 'start' | 'center' | 'end'
  addButtonContainerClassName?: string
  addButtonWrapperClassName?: string
  showTrigger?: boolean
}

export function CommentReactionPicker({
  onToggle,
  disabled,
  className,
  open,
  onOpenChange,
  popoverAlign = 'start',
  addButtonContainerClassName,
  addButtonWrapperClassName,
  showTrigger = true,
}: CommentReactionPickerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = typeof open === 'boolean'
  const isOpen = isControlled ? open : internalOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0)
    }
  }, [isOpen])

  usePopoverDismiss({
    open: isOpen,
    ref: popoverRef,
    onClose: () => setOpen(false),
    closeOnEscape: true,
  })

  const handleSelect = React.useCallback(
    (item: { emoji: string }) => {
      onToggle(item.emoji)
      setOpen(false)
    },
    [onToggle, setOpen],
  )

  return (
    <div className={cn('mt-3 flex flex-wrap items-center gap-2', className)}>
      <div ref={popoverRef} className={cn('relative', addButtonContainerClassName)}>
        <Popover open={isOpen} onOpenChange={setOpen} className={cn('w-full', addButtonContainerClassName)}>
          <div className={cn('flex', addButtonWrapperClassName)}>
            {showTrigger ? (
              <PopoverTrigger
                aria-label="Add reaction"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-600 text-slate-400 transition-opacity hover:text-slate-200',
                  'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                )}
                disabled={disabled}
              >
                <SmilePlus className="h-4 w-4" />
              </PopoverTrigger>
            ) : (
              <span className="block h-0 w-full" aria-hidden="true" />
            )}
          </div>
          <PopoverContent align={popoverAlign} className="w-[320px] p-0">
            <EmojiPicker
              emojis={EMOJI_DATA}
              highlightedIndex={highlightedIndex}
              onHighlightChange={setHighlightedIndex}
              onSelect={handleSelect}
              className="border-none"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
