

import { ChevronDown, ChevronUp, MoreVertical, Trash2 } from 'lucide-react'

import { FormInput, FormSelect } from '../../../../../../lib/ui/components/FormControls'
import { parseMoneyInputToCents } from '../../../../../../lib/ui/utils/money'

import type { ItineraryItem } from '../../../../types'
import type { EventExpense, ExpenseApi, ExpenseSettledKind, ExpenseSplitType, ExpenseTiming, Person } from '../types'
import {
  canCommitMoneyInput,
  computePerPersonCents,
  computeTotalCents,
  ensureExpenseShapeOnSettledKindChange,
  ensureExpenseShapeOnTimingChange,
  formatCentsMaybeEstimate,
  isEstimateExpense,
  titleForKind,
} from '../utils'
import { ExpenseParticipantsEditor } from './ExpenseParticipantsEditor'

export function ExpenseEditRow(props: {
  expense: EventExpense
  people: Person[]
  allPeopleIds: string[]
  hostId?: string
  currentUserId?: string
  expenseApi?: ExpenseApi
  itineraryItems: ItineraryItem[]

  isExpanded: boolean
  onToggleExpanded: () => void

  isMenuOpen: boolean
  onToggleMenu: () => void
  onCloseMenu: () => void
  onDelete: () => void

  getDraftValue: (expenseId: string, fallbackCents: number | undefined) => string
  setDraftValue: (expenseId: string, value: string) => void
  normalizeDraftValue: (expenseId: string, cents: number | undefined) => void
}) {
  const {
    expense: e,
    people,
    allPeopleIds,
    hostId,
    currentUserId,
    expenseApi,
    itineraryItems,
    isExpanded,
    onToggleExpanded,
    isMenuOpen,
    onToggleMenu,
    onCloseMenu,
    onDelete,
    getDraftValue,
    setDraftValue,
    normalizeDraftValue,
  } = props

  const totalCents = computeTotalCents(e)
  const perCents = computePerPersonCents(e)
  const isEstimate = isEstimateExpense(e)
  const totalLabel = formatCentsMaybeEstimate(totalCents, { currency: e.currency, isEstimate })
  const perLabel = formatCentsMaybeEstimate(perCents, { currency: e.currency, isEstimate })

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div
            className="min-w-0 flex-1 text-left cursor-pointer"
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onClick={onToggleExpanded}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault()
                onToggleExpanded()
              }
            }}
          >
            <div className="font-bold text-white truncate">{e.title || 'Untitled expense'}</div>
            <div className="text-sm text-slate-400">{titleForKind(e)}</div>
            <div className="text-sm text-slate-400 truncate">
              {totalLabel} total • {perLabel} / person • {e.participantIds.length} people
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation()
                  onToggleMenu()
                }}
                className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                aria-label="Expense menu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen ? (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-lg z-[2000] overflow-hidden"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onCloseMenu()
                      onDelete()
                    }}
                    className="w-full px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onToggleExpanded}
              className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
              aria-label={isExpanded ? 'Collapse expense' : 'Expand expense'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="px-4 pb-4 space-y-3">
          <FormInput
            value={e.title}
            onChange={(ev) => expenseApi?.onUpdate(e.id, { title: ev.target.value })}
            placeholder="Expense title"
            variant="surface"
            size="md"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormSelect
              value={e.splitType}
              onChange={(ev) => {
                const nextSplitType = ev.target.value as ExpenseSplitType
                if (nextSplitType === 'GROUP') {
                  expenseApi?.onUpdate(e.id, {
                    splitType: nextSplitType,
                    ...ensureExpenseShapeOnTimingChange('SETTLED_LATER', e),
                  })
                } else {
                  expenseApi?.onUpdate(e.id, { splitType: nextSplitType })
                }
              }}
              variant="surface"
              size="md"
            >
              <option value="PER_PERSON">Per person</option>
              <option value="GROUP">Group</option>
            </FormSelect>

            <FormSelect
              value={e.timing}
              onChange={(ev) =>
                expenseApi?.onUpdate(e.id, ensureExpenseShapeOnTimingChange(ev.target.value as ExpenseTiming, e))
              }
              disabled={e.splitType === 'GROUP'}
              variant="surface"
              size="md"
            >
              {e.splitType === 'GROUP' ? (
                <option value="SETTLED_LATER">Settled later</option>
              ) : (
                <>
                  <option value="UP_FRONT">Up front</option>
                  <option value="SETTLED_LATER">Settled later</option>
                </>
              )}
            </FormSelect>

            {e.timing === 'SETTLED_LATER' ? (
              <FormSelect
                value={e.settledKind ?? 'EXACT'}
                onChange={(ev) =>
                  expenseApi?.onUpdate(e.id, ensureExpenseShapeOnSettledKindChange(ev.target.value as ExpenseSettledKind))
                }
                variant="surface"
                size="md"
              >
                <option value="EXACT">Exact</option>
                <option value="ESTIMATE">Estimate</option>
              </FormSelect>
            ) : (
              <div />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormInput
              type="text"
              inputMode="decimal"
              value={getDraftValue(e.id, e.amountCents)}
              onChange={(ev) => {
                const nextText = ev.target.value
                setDraftValue(e.id, nextText)
                if (canCommitMoneyInput(nextText)) {
                  const cents = parseMoneyInputToCents(nextText)
                  if (typeof cents === 'number') expenseApi?.onUpdate(e.id, { amountCents: cents })
                }
              }}
              onBlur={() => {
                const text = getDraftValue(e.id, e.amountCents)
                const cents = parseMoneyInputToCents(text) ?? 0
                expenseApi?.onUpdate(e.id, { amountCents: cents })
                normalizeDraftValue(e.id, cents)
              }}
              placeholder={
                e.timing === 'SETTLED_LATER' && e.settledKind === 'ESTIMATE'
                  ? 'Estimate amount (e.g. 12.34)'
                  : 'Amount (e.g. 12.34)'
              }
              variant="surface"
              size="md"
            />
            <div className="text-sm text-slate-400 flex items-center">Total: {totalLabel}</div>
            <div className="text-sm text-slate-400 flex items-center">Per: {perLabel}</div>
          </div>

          <ExpenseParticipantsEditor
            expense={e}
            people={people}
            allPeopleIds={allPeopleIds}
            hostId={hostId}
            currentUserId={currentUserId}
            expenseApi={expenseApi}
            itineraryItems={itineraryItems}
          />
        </div>
      ) : null}
    </div>
  )
}
