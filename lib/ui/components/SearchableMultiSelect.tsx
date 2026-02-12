import * as React from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '../9ui/popover'
import { Input } from '../9ui/input'
import { cn } from '../9ui/utils'

export type MultiSelectOption = {
  id: string
  label: string
  description?: string
  disabled?: boolean
}

type SearchableMultiSelectProps = {
  options: MultiSelectOption[]
  selectedIds: string[]
  onChange: (nextIds: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

export function SearchableMultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select options',
  searchPlaceholder = 'Search...',
  isLoading = false,
  disabled = false,
  className,
}: SearchableMultiSelectProps) {
  const [searchTerm, setSearchTerm] = React.useState('')

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds])

  const sortedOptions = React.useMemo(() => {
    const filtered = options.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm.trim().toLowerCase()),
    )
    return filtered.sort((a, b) => {
      const aSelected = selectedSet.has(a.id)
      const bSelected = selectedSet.has(b.id)
      if (aSelected !== bSelected) return aSelected ? -1 : 1
      return a.label.localeCompare(b.label)
    })
  }, [options, searchTerm, selectedSet])

  const selectedOptions = React.useMemo(
    () => options.filter((opt) => selectedSet.has(opt.id)),
    [options, selectedSet],
  )

  const displayLabel = React.useMemo(() => {
    if (selectedOptions.length === 0) return placeholder
    if (selectedOptions.length <= 2) {
      return selectedOptions.map((opt) => opt.label).join(', ')
    }
    return `${selectedOptions[0].label}, ${selectedOptions[1].label} +${selectedOptions.length - 2}`
  }, [placeholder, selectedOptions])

  const toggleOption = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <Popover className={cn('w-full', className)}>
      <PopoverTrigger
        className={cn(
          'w-full flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:border-slate-500',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
        disabled={disabled}
      >
        <span className={cn(selectedOptions.length === 0 ? 'text-slate-500' : 'text-slate-100')}>{displayLabel}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-full p-0">
        <div className="border-b border-slate-800 px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder}
              className="border-none bg-transparent px-0 py-0 text-sm focus-visible:ring-0"
              disabled={disabled}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-slate-400">Loading...</div>
          ) : sortedOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">No matches found.</div>
          ) : (
            <div className="py-2">
              {sortedOptions.map((option) => {
                const isSelected = selectedSet.has(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-slate-800',
                      option.disabled && 'opacity-50 cursor-not-allowed',
                    )}
                    onClick={() => !option.disabled && toggleOption(option.id)}
                    disabled={option.disabled}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 items-center justify-center rounded border',
                        isSelected ? 'border-primary bg-primary text-white' : 'border-slate-600 text-transparent',
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm text-slate-100">{option.label}</span>
                      {option.description ? (
                        <span className="text-xs text-slate-400">{option.description}</span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
