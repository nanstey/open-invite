import * as React from 'react'
import { EMOJI_DATA, EMOJI_SHORTCODE_MAP, type EmojiItem } from '../ui/9ui/emoji-data'

type EmojiTriggerMatch = {
  start: number
  end: number
  query: string
  isComplete: boolean
}

const findEmojiTrigger = (text: string, cursor: number): EmojiTriggerMatch | null => {
  const uptoCursor = text.slice(0, cursor)
  const colonIndex = uptoCursor.lastIndexOf(':')
  if (colonIndex === -1) return null

  const before = colonIndex === 0 ? '' : uptoCursor[colonIndex - 1]
  if (before && !/\s/.test(before)) return null

  const after = uptoCursor.slice(colonIndex + 1)
  if (!after || after[0] === ' ' || /\s/.test(after)) return null

  const isComplete = after.endsWith(':')
  const query = isComplete ? after.slice(0, -1) : after

  if (!query) return null

  return { start: colonIndex, end: cursor, query, isComplete }
}

const normalizeQuery = (query: string) => query.trim().toLowerCase()

const filterEmojis = (query: string): EmojiItem[] => {
  if (!query) return []
  const normalized = normalizeQuery(query)

  return EMOJI_DATA.filter((item) => {
    const matchesShortcode = item.shortcodes.some((shortcode) => shortcode.includes(normalized))
    const matchesKeyword = item.keywords?.some((keyword) => keyword.includes(normalized))
    return matchesShortcode || matchesKeyword
  })
}

export type UseEmojiAutocompleteOptions = {
  value: string
  onChange: (next: string) => void
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
}

type CaretCoords = { left: number; top: number; height: number }

const getCaretCoordinates = (
  input: HTMLInputElement | HTMLTextAreaElement,
  position: number,
): CaretCoords => {
  const style = window.getComputedStyle(input)
  const div = document.createElement('div')

  const properties = [
    'boxSizing',
    'width',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
  ] as const

  properties.forEach((prop) => {
    ;const styleRecord = style as unknown as Record<string, string>; (div.style as unknown as Record<string, string>)[prop] = styleRecord[prop]
  })

  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.top = '0'
  div.style.left = '-9999px'
  div.style.whiteSpace = input instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre'
  div.style.wordWrap = 'break-word'
  div.style.height = 'auto'
  div.style.overflow = 'visible'

  // Create a marker span at the cursor position
  const beforeText = document.createTextNode(input.value.slice(0, position))
  const marker = document.createElement('span')
  marker.textContent = '\u200B' // zero-width space as cursor marker
  const afterText = document.createTextNode(input.value.slice(position) || '.')
  
  div.appendChild(beforeText)
  div.appendChild(marker)
  div.appendChild(afterText)

  document.body.appendChild(div)

  const markerRect = marker.getBoundingClientRect()
  const divRect = div.getBoundingClientRect()
  // Calculate content position (not affected by scroll)
  const left = markerRect.left - divRect.left
  const top = markerRect.top - divRect.top
  const height = markerRect.height || parseFloat(style.lineHeight || '0') || 16

  document.body.removeChild(div)

  // Return content-relative positions; scroll will be handled by the caller
  return { left, top, height }
}

export function useEmojiAutocomplete({ value, onChange, inputRef }: UseEmojiAutocompleteOptions) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const [popoverPosition, setPopoverPosition] = React.useState({ left: 0, top: 0 })
  const activeRangeRef = React.useRef<{ start: number; end: number } | null>(null)
  const debounceRef = React.useRef<number | null>(null)

  const emojis = React.useMemo(() => filterEmojis(search), [search])
  const gridColumns = 8

  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [search])

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const updatePopoverPosition = React.useCallback(
    (cursor: number) => {
      const input = inputRef.current
      if (!input) return
      const caret = getCaretCoordinates(input, cursor)
      const offset = 6

      // Get the input's bounding rect to calculate position relative to its container
      const inputRect = input.getBoundingClientRect()
      const parent = input.offsetParent as HTMLElement | null
      const parentRect = parent?.getBoundingClientRect() ?? { left: 0, top: 0 }

      // Calculate position relative to the positioned parent
      const inputOffsetLeft = inputRect.left - parentRect.left
      const inputOffsetTop = inputRect.top - parentRect.top

      setPopoverPosition({
        left: inputOffsetLeft + caret.left - input.scrollLeft,
        top: inputOffsetTop + caret.top + caret.height + offset - input.scrollTop,
      })
    },
    [inputRef],
  )

  const closePicker = React.useCallback(() => {
    setIsOpen(false)
    setSearch('')
    setHighlightedIndex(0)
    activeRangeRef.current = null
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
  }, [])

  const scheduleSearch = React.useCallback(
    (query: string, cursor: number) => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
      updatePopoverPosition(cursor)
      debounceRef.current = window.setTimeout(() => {
        setSearch(normalizeQuery(query))
        setIsOpen(true)
      }, 300)
    },
    [setSearch, updatePopoverPosition],
  )

  const replaceRange = React.useCallback(
    (text: string, range: { start: number; end: number }, emoji: string) => {
      const next = text.slice(0, range.start) + emoji + text.slice(range.end)
      onChange(next)
      requestAnimationFrame(() => {
        const input = inputRef.current
        if (input) {
          const cursor = range.start + emoji.length
          input.focus()
          input.setSelectionRange(cursor, cursor)
        }
      })
    },
    [inputRef, onChange],
  )

  const handleEmojiSelect = React.useCallback(
    (item: EmojiItem) => {
      const input = inputRef.current
      const cursor = input?.selectionStart ?? value.length
      const range = activeRangeRef.current ?? { start: cursor, end: cursor }
      replaceRange(value, range, item.emoji)
      closePicker()
    },
    [closePicker, inputRef, replaceRange, value],
  )

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value
      const cursor = event.target.selectionStart ?? nextValue.length
      const trigger = findEmojiTrigger(nextValue, cursor)

      if (trigger?.isComplete) {
        const emoji = EMOJI_SHORTCODE_MAP.get(trigger.query)
        if (emoji) {
          replaceRange(nextValue, { start: trigger.start, end: trigger.end }, emoji)
          closePicker()
          return
        }
      }

      onChange(nextValue)

      if (trigger && !trigger.isComplete) {
        activeRangeRef.current = { start: trigger.start, end: trigger.end }
        scheduleSearch(trigger.query, cursor)
      } else {
        closePicker()
      }
    },
    [closePicker, onChange, replaceRange, scheduleSearch],
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!isOpen || emojis.length === 0) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % emojis.length)
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + emojis.length) % emojis.length)
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightedIndex((prev) => (prev + gridColumns) % emojis.length)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightedIndex((prev) => (prev - gridColumns + emojis.length) % emojis.length)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const emoji = emojis[highlightedIndex]
        if (emoji) {
          handleEmojiSelect(emoji)
        }
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        closePicker()
      }
    },
    [closePicker, emojis, gridColumns, handleEmojiSelect, highlightedIndex, isOpen],
  )

  return {
    emojis,
    highlightedIndex,
    isOpen,
    popoverPosition,
    search,
    setHighlightedIndex,
    setIsOpen,
    handleChange,
    handleEmojiSelect,
    handleKeyDown,
  }
}
