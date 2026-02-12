import * as React from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

import { cn } from './utils'

type ComboboxContextValue<T> = {
  open: boolean
  setOpen: (next: boolean) => void
  query: string
  setQuery: (next: string) => void
  items: T[]
  filteredItems: T[]
  selectedItem: T | null
  setSelectedItem: (next: T | null) => void
  highlightedIndex: number
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>
  selectItemAtIndex: (index: number) => void
  itemToString: (item: T | null | undefined) => string
}

const ComboboxContext = React.createContext<ComboboxContextValue<unknown> | null>(null)

function useComboboxContext<T>() {
  const context = React.useContext(ComboboxContext)
  if (!context) {
    throw new Error('Combobox components must be used within <Combobox>')
  }
  return context as ComboboxContextValue<T>
}

function defaultItemToString<T>(item: T | null | undefined) {
  if (item == null) {
    return ''
  }
  if (typeof item === 'string') {
    return item
  }
  if (typeof item === 'number' || typeof item === 'boolean') {
    return String(item)
  }
  if (typeof item === 'object') {
    const candidate = item as Record<string, unknown>
    if (typeof candidate.label === 'string') {
      return candidate.label
    }
    if (typeof candidate.value === 'string') {
      return candidate.value
    }
  }
  return String(item)
}

export type ComboboxProps<T> = {
  items: T[]
  value?: T | null
  defaultValue?: T | null
  onValueChange?: (value: T | null) => void
  itemToString?: (item: T | null | undefined) => string
  className?: string
  children: React.ReactNode
}

export function Combobox<T>({
  items,
  value,
  defaultValue = null,
  onValueChange,
  itemToString = defaultItemToString,
  className,
  children,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [uncontrolledValue, setUncontrolledValue] = React.useState<T | null>(defaultValue)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  const isControlled = value !== undefined
  const selectedItem = isControlled ? (value ?? null) : uncontrolledValue

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return items
    }
    return items.filter((item) => itemToString(item).toLowerCase().includes(normalizedQuery))
  }, [itemToString, items, query])

  const setSelectedItem = React.useCallback(
    (next: T | null) => {
      if (!isControlled) {
        setUncontrolledValue(next)
      }
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  const selectItemAtIndex = React.useCallback(
    (index: number) => {
      if (index < 0 || index >= filteredItems.length) {
        return
      }
      const nextItem = filteredItems[index] ?? null
      setSelectedItem(nextItem)
      setQuery('')
      setOpen(false)
      setHighlightedIndex(-1)
    },
    [filteredItems, setSelectedItem],
  )

  const context = React.useMemo<ComboboxContextValue<T>>(
    () => ({
      open,
      setOpen,
      query,
      setQuery,
      items,
      filteredItems,
      selectedItem,
      setSelectedItem,
      highlightedIndex,
      setHighlightedIndex,
      selectItemAtIndex,
      itemToString,
    }),
    [
      filteredItems,
      highlightedIndex,
      itemToString,
      items,
      open,
      query,
      selectItemAtIndex,
      selectedItem,
      setSelectedItem,
    ],
  )

  React.useEffect(() => {
    if (!open || filteredItems.length === 0) {
      setHighlightedIndex(-1)
      return
    }

    setHighlightedIndex((prev) => {
      if (prev >= 0 && prev < filteredItems.length) {
        return prev
      }
      const selectedIndex =
        selectedItem == null ? -1 : filteredItems.findIndex((item) => Object.is(item, selectedItem))
      return selectedIndex >= 0 ? selectedIndex : 0
    })
  }, [filteredItems, open, selectedItem])

  React.useEffect(() => {
    if (!open) {
      return
    }

    const handleDocumentPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!rootRef.current || !target) {
        return
      }
      if (!rootRef.current.contains(target)) {
        setOpen(false)
        setQuery('')
      }
    }

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handleDocumentPointerDown)
    document.addEventListener('touchstart', handleDocumentPointerDown)
    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown)
      document.removeEventListener('touchstart', handleDocumentPointerDown)
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [open])

  return (
    <ComboboxContext.Provider value={context as ComboboxContextValue<unknown>}>
      <div ref={rootRef} className={cn('relative w-full', className)}>
        {children}
      </div>
    </ComboboxContext.Provider>
  )
}

export type ComboboxInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  inputContainerClassName?: string
  showClear?: boolean
  startContent?: React.ReactNode
}

export const ComboboxInput = React.forwardRef<HTMLInputElement, ComboboxInputProps>(
  ({ className, inputContainerClassName, showClear = true, startContent, placeholder = 'Search...', ...props }, ref) => {
    const {
      open,
      query,
      setQuery,
      selectedItem,
      setSelectedItem,
      setOpen,
      highlightedIndex,
      setHighlightedIndex,
      selectItemAtIndex,
      itemToString,
      filteredItems,
    } = useComboboxContext<unknown>()
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const disabled = !!props.disabled

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node
        if (typeof ref === 'function') {
          ref(node)
          return
        }
        if (ref) {
          ref.current = node
        }
      },
      [ref],
    )

    return (
      <div
        className={cn(
          'flex min-h-12 w-full flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus-within:border-primary',
          disabled && 'cursor-not-allowed opacity-60',
          inputContainerClassName,
        )}
        onClick={(event) => {
          if (disabled) {
            return
          }
          if ((event.target as HTMLElement).closest('button')) {
            return
          }
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        {startContent}
        <input
          ref={setRefs}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setHighlightedIndex(0)
          }}
          onKeyDown={(event) => {
            props.onKeyDown?.(event)
            if (event.defaultPrevented) {
              return
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault()
              if (!open) {
                setOpen(true)
                return
              }
              if (filteredItems.length === 0) {
                return
              }
              setHighlightedIndex((prev) => (prev + 1 + filteredItems.length) % filteredItems.length)
              return
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault()
              if (!open) {
                setOpen(true)
                return
              }
              if (filteredItems.length === 0) {
                return
              }
              setHighlightedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
              return
            }

            if (event.key === 'Enter' && open && highlightedIndex >= 0) {
              event.preventDefault()
              selectItemAtIndex(highlightedIndex)
            }
          }}
          onFocus={(event) => {
            props.onFocus?.(event)
            if (!event.defaultPrevented) {
              setOpen(true)
            }
          }}
          placeholder={placeholder}
          className={cn(
            'min-w-20 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500',
            className,
          )}
          {...props}
        />
        {showClear && (query.length > 0 || selectedItem !== null) ? (
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200"
            disabled={disabled}
            onClick={() => {
              setQuery('')
              setSelectedItem(null)
              setOpen(false)
            }}
            aria-label="Clear value"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          className="text-slate-400 hover:text-slate-200"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          aria-label="Toggle combobox"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <span className="sr-only">{itemToString(selectedItem)}</span>
      </div>
    )
  },
)

ComboboxInput.displayName = 'ComboboxInput'

export type ComboboxTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export const ComboboxTrigger = React.forwardRef<HTMLButtonElement, ComboboxTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useComboboxContext<unknown>()
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'w-full inline-flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:border-slate-500',
          className,
        )}
        onClick={(event) => {
          props.onClick?.(event)
          if (!event.defaultPrevented) {
            setOpen(!open)
          }
        }}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
    )
  },
)

ComboboxTrigger.displayName = 'ComboboxTrigger'

export type ComboboxValueProps = React.HTMLAttributes<HTMLSpanElement> & {
  placeholder?: string
}

export const ComboboxValue = React.forwardRef<HTMLSpanElement, ComboboxValueProps>(
  ({ className, placeholder = 'Select...', ...props }, ref) => {
    const { selectedItem, itemToString } = useComboboxContext<unknown>()
    const label = itemToString(selectedItem)
    return (
      <span
        ref={ref}
        className={cn('truncate text-left', !label && 'text-slate-500', className)}
        {...props}
      >
        {label || placeholder}
      </span>
    )
  },
)

ComboboxValue.displayName = 'ComboboxValue'

export type ComboboxContentProps = React.HTMLAttributes<HTMLDivElement>

export const ComboboxContent = React.forwardRef<HTMLDivElement, ComboboxContentProps>(
  ({ className, ...props }, ref) => {
    const { open } = useComboboxContext<unknown>()
    if (!open) {
      return null
    }
    return (
      <div
        ref={ref}
        className={cn(
          'absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl',
          className,
        )}
        {...props}
      />
    )
  },
)

ComboboxContent.displayName = 'ComboboxContent'

export type ComboboxListProps<T> = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: React.ReactNode | ((item: T) => React.ReactNode)
}

export function ComboboxList<T>({ className, children, ...props }: ComboboxListProps<T>) {
  const { filteredItems } = useComboboxContext<T>()
  return (
    <div className={cn('space-y-0.5', className)} {...props}>
      {typeof children === 'function' ? filteredItems.map((item) => children(item)) : children}
    </div>
  )
}

export type ComboboxItemProps<T> = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: T
}

export function ComboboxItem<T>({ className, value, children, ...props }: ComboboxItemProps<T>) {
  const { filteredItems, highlightedIndex, setHighlightedIndex, selectedItem, setSelectedItem, setQuery, setOpen } =
    useComboboxContext<T>()
  const isSelected = Object.is(selectedItem, value)
  const itemIndex = filteredItems.findIndex((item) => Object.is(item, value))
  const isHighlighted = itemIndex >= 0 && itemIndex === highlightedIndex
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-white hover:bg-slate-800/60',
        isHighlighted && 'bg-slate-800/60',
        className,
      )}
      onMouseEnter={() => {
        if (itemIndex >= 0) {
          setHighlightedIndex(itemIndex)
        }
      }}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) {
          setSelectedItem(value)
          setQuery('')
          setOpen(false)
        }
      }}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected ? <Check className="h-4 w-4 shrink-0 text-slate-300" /> : null}
    </button>
  )
}

export type ComboboxEmptyProps = React.HTMLAttributes<HTMLDivElement>

export function ComboboxEmpty({ className, children = 'No result found.', ...props }: ComboboxEmptyProps) {
  const { filteredItems } = useComboboxContext<unknown>()
  if (filteredItems.length > 0) {
    return null
  }
  return (
    <div className={cn('px-4 py-3 text-sm text-slate-400', className)} {...props}>
      {children}
    </div>
  )
}

export type ComboboxChipsProps = React.HTMLAttributes<HTMLDivElement>

export function ComboboxChips({ className, ...props }: ComboboxChipsProps) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)} {...props} />
}

export type ComboboxChipProps = React.HTMLAttributes<HTMLSpanElement>

export function ComboboxChip({ className, ...props }: ComboboxChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/40 px-3 py-1 text-sm text-slate-100',
        className,
      )}
      {...props}
    />
  )
}

export type ComboboxChipRemoveProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export function ComboboxChipRemove({ className, children, ...props }: ComboboxChipRemoveProps) {
  return (
    <button
      type="button"
      className={cn('inline-flex items-center text-slate-400 transition-colors hover:text-slate-100', className)}
      {...props}
    >
      {children ?? <X className="h-4 w-4" />}
    </button>
  )
}
