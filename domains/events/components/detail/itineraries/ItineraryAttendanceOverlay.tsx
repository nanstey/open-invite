import * as React from 'react'
import { Check, X } from 'lucide-react'

import type { EventExpense, ItineraryItem } from '../../../types'
import { Checkbox } from '../../../../../lib/ui/9ui/checkbox'
import { formatDateLongEnUS, formatTime12h } from '../../../../../lib/ui/utils/datetime'
import { computeExpenseSummaryForExpenses } from '../expenses/useExpenseCalculator'
import { filterExpensesForItinerarySelection, formatSummaryCents } from '../expenses/utils'
import { sortByStartTime } from './itinerary'

export function ItineraryAttendanceOverlay(props: {
  open: boolean
  title: string
  itineraryItems: ItineraryItem[]
  expenses: EventExpense[]
  currentUserId?: string
  hostId?: string
  initialSelectedIds: string[]
  mode?: 'join' | 'edit'
  onClose: () => void
  onSave: (selectedIds: string[]) => Promise<boolean> | boolean
}) {
  const {
    open,
    title,
    itineraryItems,
    expenses,
    currentUserId,
    hostId,
    initialSelectedIds,
    mode = 'edit',
    onClose,
    onSave,
  } = props

  const [selectedIds, setSelectedIds] = React.useState<string[]>(initialSelectedIds)
  const [ackUpFront, setAckUpFront] = React.useState(false)
  const [ackSettled, setAckSettled] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const wasOpenRef = React.useRef(false)

  React.useEffect(() => {
    const wasOpen = wasOpenRef.current
    wasOpenRef.current = open
    if (!open) return
    if (wasOpen) return

    if (mode === 'join') {
      setSelectedIds(itineraryItems.map((item) => item.id))
    } else {
      setSelectedIds(initialSelectedIds)
    }
    setAckUpFront(false)
    setAckSettled(false)
    setError(null)
  }, [open, initialSelectedIds, itineraryItems, mode])

  React.useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const orderedItems = React.useMemo(() => sortByStartTime(itineraryItems), [itineraryItems])

  const filteredExpenses = React.useMemo(
    () => filterExpensesForItinerarySelection(expenses, selectedIds),
    [expenses, selectedIds],
  )
  const currency = expenses[0]?.currency ?? 'USD'

  const summary = React.useMemo(
    () => computeExpenseSummaryForExpenses(filteredExpenses, currentUserId, hostId),
    [filteredExpenses, currentUserId, hostId],
  )

  const requiresUpFrontAck = summary.upFrontCents > 0
  const requiresSettledAck = summary.settledAfterCents > 0
  const hasSelection = selectedIds.length > 0
  const canSave =
    hasSelection &&
    (!requiresUpFrontAck || ackUpFront) &&
    (!requiresSettledAck || ackSettled) &&
    !isSaving

  React.useEffect(() => {
    if (!open) return
    if (requiresUpFrontAck) setAckUpFront(false)
    if (requiresSettledAck) setAckSettled(false)
  }, [open, requiresUpFrontAck, requiresSettledAck, selectedIds])

  const toggleSelection = (itemId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(itemId)) return prev.filter((id) => id !== itemId)
      return [...prev, itemId]
    })
  }

  const handleSave = async () => {
    if (isSaving) return
    if (!hasSelection) return

    setIsSaving(true)
    setError(null)
    try {
      const saved = await onSave(selectedIds)
      if (!saved) {
        setError('Could not save your selections. Please try again.')
        return
      }
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Could not save your selections. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-stretch md:items-center justify-center md:px-6 md:py-10">
      <div className="bg-surface w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-3xl md:border md:border-slate-700 md:shadow-2xl md:shadow-black/60 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/60 shrink-0">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Select itinerary items</div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" type="button">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
          <div className="text-sm text-slate-400">
            Choose the itinerary items you plan to attend. Expense totals update as you select items.
          </div>

          {orderedItems.length === 0 ? (
            <div className="text-sm text-slate-500 italic">No itinerary items yet.</div>
          ) : (
            <div className="space-y-3">
              {orderedItems.map((item) => {
                const start = new Date(item.startTime)
                const end = new Date(start.getTime() + item.durationMinutes * 60_000)
                const time = `${formatTime12h(start)} - ${formatTime12h(end)}`
                const date = formatDateLongEnUS(start)
                const isSelected = selectedIds.includes(item.id)
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelection(item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleSelection(item.id)
                      }
                    }}
                    className={`w-full text-left rounded-xl border p-4 transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleSelection(item.id)
                      }}
                      className={`self-center inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-colors ${
                        isSelected
                          ? 'bg-primary text-white border-primary'
                          : 'bg-slate-900/60 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{item.title}</div>
                      <div className="text-sm text-slate-400">{date} • {time}</div>
                      {item.description ? (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <div className="text-sm font-bold text-white">Expense summary</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Up Front</div>
                <div className="text-lg text-white font-bold">
                  {formatSummaryCents(summary.upFrontCents, { currency, isEstimate: false })}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Settled Later</div>
                <div className="text-lg text-white font-bold">
                  {formatSummaryCents(summary.settledAfterCents, { currency, isEstimate: summary.hasEstimate })}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total</div>
                <div className="text-lg text-white font-bold">
                  {formatSummaryCents(summary.totalCents, { currency, isEstimate: summary.hasEstimate })}
                </div>
              </div>
            </div>

            {requiresUpFrontAck ? (
              <label className="flex items-start gap-3 text-sm text-slate-200">
                <Checkbox checked={ackUpFront} onChange={(e) => setAckUpFront(e.target.checked)} />
                <span>I acknowledge I owe {formatSummaryCents(summary.upFrontCents, { currency, isEstimate: false })} up front.</span>
              </label>
            ) : null}

            {requiresSettledAck ? (
              <label className="flex items-start gap-3 text-sm text-slate-200">
                <Checkbox checked={ackSettled} onChange={(e) => setAckSettled(e.target.checked)} />
                <span>I acknowledge I will owe {formatSummaryCents(summary.settledAfterCents, { currency, isEstimate: summary.hasEstimate })} after the event.</ span>
              </label>
            ) : null}
          </div>

          {error ? (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</div>
          ) : null}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/60 flex justify-end items-center shrink-0">
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-5 py-3 rounded-xl text-slate-200 hover:bg-slate-800 text-base font-semibold"
              type="button"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`w-1/2 sm:w-auto px-5 py-3 rounded-xl text-base font-semibold transition-colors ${
                canSave ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-700 text-slate-300'
              }`}
              type="button"
              disabled={!canSave}
            >
              {isSaving ? 'joining...' : 'Join event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
