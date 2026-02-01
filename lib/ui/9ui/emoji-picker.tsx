import * as React from 'react'
import { cn } from './utils'
import type { EmojiItem } from './emoji-data'

export type EmojiPickerProps = {
  emojis: EmojiItem[]
  highlightedIndex: number
  onSelect: (emoji: EmojiItem) => void
  onHighlightChange?: (index: number) => void
  className?: string
}

export function EmojiPicker({
  emojis,
  highlightedIndex,
  onSelect,
  onHighlightChange,
  className,
}: EmojiPickerProps) {
  return (
    <div className={cn('rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl', className)}>
      {emojis.length === 0 ? (
        <div className="px-3 py-4 text-sm text-slate-400">No emoji matches.</div>
      ) : (
        <div role="listbox" aria-label="Emoji suggestions" className="grid grid-cols-8 gap-1">
          {emojis.map((item, index) => {
            const isActive = index === highlightedIndex
            return (
              <button
                key={item.shortcodes[0]}
                type="button"
                aria-selected={isActive}
                title={item.shortcodes[0]}
                className={cn(
                  'h-9 w-9 rounded-lg text-lg transition-colors',
                  isActive ? 'bg-slate-700' : 'hover:bg-slate-800',
                )}
                onMouseEnter={() => onHighlightChange?.(index)}
                onClick={() => onSelect(item)}
              >
                {item.emoji}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
