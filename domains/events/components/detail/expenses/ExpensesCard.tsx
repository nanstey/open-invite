import * as React from 'react'

import { ChevronDown, ChevronUp } from 'lucide-react'

import { useOutsideClick } from '../hooks/useOutsideClick'

import type { EventExpense, ExpenseApi, Person } from './types'
import { computePerPersonCents, computeTotalCents, formatCentsMaybeEstimate, formatSummaryCents, isEstimateExpense } from './utils'
import { ExpenseEditRow } from './components/ExpenseEditRow'
import { ExpenseReadOnlyRow } from './components/ExpenseReadOnlyRow'
import { useExpenseAmountDrafts } from './useExpenseAmountDrafts'

export function ExpensesCard(props: {
  isEditMode: boolean
  isGuest: boolean
  onRequireAuth?: () => void
  currentUserId?: string
  hostId?: string

  expenses: EventExpense[]
  people: Person[]
  expenseApi?: ExpenseApi
}) {
  const { isEditMode, isGuest, onRequireAuth, currentUserId, hostId, expenses, people, expenseApi } = props
  const [expanded, setExpanded] = React.useState(false)
  const [expandedExpenseId, setExpandedExpenseId] = React.useState<string | null>(null)
  const [openMenuExpenseId, setOpenMenuExpenseId] = React.useState<string | null>(null)

  const { getDraftValue, setDraftValue, normalizeDraftValue } = useExpenseAmountDrafts()

  const peopleById = React.useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const allPeopleIds = React.useMemo(() => people.map((p) => p.id), [people])

  const expenseParticipantIdsForViewer = React.useCallback(
    (expense: EventExpense) => {
      if (!currentUserId) return expense.participantIds
      if (expense.participantIds.includes(currentUserId)) return expense.participantIds
      if (expense.appliesTo === 'EVERYONE') return [...expense.participantIds, currentUserId]
      if (expense.appliesTo === 'GUESTS_ONLY' && currentUserId !== hostId) return [...expense.participantIds, currentUserId]
      return expense.participantIds
    },
    [currentUserId, hostId],
  )

  const perPersonCentsForViewer = React.useCallback(
    (expense: EventExpense) => {
      const participantCount = expenseParticipantIdsForViewer(expense).length
      if (participantCount === 0) return 0
      const total = computeTotalCents(expense) // group: fixed total; per-person: total isn't used for per-person figure

      if (expense.splitType === 'PER_PERSON') return expense.amountCents ?? 0
      return Math.round(total / participantCount)
    },
    [expenseParticipantIdsForViewer],
  )

  useOutsideClick({
    enabled: !!openMenuExpenseId,
    onOutsideClick: () => setOpenMenuExpenseId(null),
  })

  const summary = React.useMemo(() => {
    let upFrontCents = 0
    let settledAfterCents = 0
    let hasEstimate = false

    for (const e of expenses) {
      // Per-person summary for the current viewer, estimated as if they're participating when authenticated.
      const perCents = perPersonCentsForViewer(e)
      if (e.timing === 'UP_FRONT') {
        upFrontCents += perCents
      } else {
        if (isEstimateExpense(e)) hasEstimate = true
        settledAfterCents += perCents
      }
    }

    return { upFrontCents, settledAfterCents, hasEstimate }
  }, [expenses, perPersonCentsForViewer])

  if (isGuest) {
    return (
      <div className="bg-surface border border-slate-700 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-2">Expenses</h2>
        <div className="text-sm text-slate-400">Sign in to see expenses and cost splitting.</div>
        {onRequireAuth ? (
          <button
            type="button"
            onClick={onRequireAuth}
            className="mt-3 px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
          >
            Sign in
          </button>
        ) : null}
      </div>
    )
  }

  const currency = expenses[0]?.currency ?? 'USD'

  const canEditExpenses = isEditMode && !!expenseApi
  const showExpenseList = canEditExpenses ? true : expanded

  const handleAdd = () => {
    if (!expenseApi) return
    const participantIds = people.map((p) => p.id) // default: Everyone
    const created = expenseApi.onAdd({
      title: 'New expense',
      appliesTo: 'EVERYONE',
      splitType: 'GROUP',
      timing: 'SETTLED_LATER',
      settledKind: 'EXACT',
      amountCents: 0,
      currency: 'USD',
      participantIds,
    })
    setExpanded(true)
    Promise.resolve(created).then((id) => {
      if (typeof id === 'string') setExpandedExpenseId(id)
    })
  }

  return (
    <div className="bg-surface border border-slate-700 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Expenses</h2>
        </div>
      </div>

      {showExpenseList ? (
        <div className="mt-4 space-y-3">
          {!canEditExpenses && expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors font-semibold"
              aria-expanded={expanded}
            >
              <span className="flex items-center gap-3">
                <span className="shrink-0">{expenses.length} expense items</span>
                <span className="flex-1 border-b border-slate-700/80" aria-hidden="true" />
                <span className="shrink-0 inline-flex items-center gap-1">
                  <span>hide details</span>
                  <ChevronUp className="w-4 h-4" />
                </span>
              </span>
            </button>
          ) : null}

          {expenses.length === 0 ? <div className="text-sm text-slate-500 italic">No expenses yet.</div> : null}

          {expenses.map((e) => {
            const totalCents = computeTotalCents(e)
            const perCentsForView = canEditExpenses ? computePerPersonCents(e) : perPersonCentsForViewer(e)
            const participantIdsForView = canEditExpenses ? e.participantIds : expenseParticipantIdsForViewer(e)
            const isEstimate = isEstimateExpense(e)

            if (!canEditExpenses) {
              return (
                <React.Fragment key={e.id}>
                  <ExpenseReadOnlyRow
                    expense={e}
                    peopleById={peopleById}
                    participantIdsForView={participantIdsForView}
                    perCentsForView={perCentsForView}
                    totalCents={totalCents}
                    isEstimate={isEstimate}
                  />
                </React.Fragment>
              )
            }

            const isExpanded = expandedExpenseId === e.id
            const isMenuOpen = openMenuExpenseId === e.id

            return (
              <React.Fragment key={e.id}>
                <ExpenseEditRow
                  expense={e}
                  people={people}
                  allPeopleIds={allPeopleIds}
                  hostId={hostId}
                  currentUserId={currentUserId}
                  expenseApi={expenseApi}
                  isExpanded={isExpanded}
                  onToggleExpanded={() => setExpandedExpenseId((prev) => (prev === e.id ? null : e.id))}
                  isMenuOpen={isMenuOpen}
                  onToggleMenu={() => setOpenMenuExpenseId((prev) => (prev === e.id ? null : e.id))}
                  onCloseMenu={() => setOpenMenuExpenseId(null)}
                  onDelete={() => expenseApi?.onDelete(e.id)}
                  getDraftValue={getDraftValue}
                  setDraftValue={setDraftValue}
                  normalizeDraftValue={normalizeDraftValue}
                />
              </React.Fragment>
            )
          })}

          {canEditExpenses ? (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full py-3 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
            >
              Add Expense
            </button>
          ) : null}
        </div>
      ) : null}

      {!canEditExpenses ? (
        <div className="mt-4">
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors font-semibold"
              aria-expanded={expanded}
            >
              <span className="flex items-center gap-3">
                <span className="shrink-0">{expenses.length} expense items</span>
                <span className="flex-1 border-b border-slate-700/80" aria-hidden="true" />
                <span className="shrink-0 inline-flex items-center gap-1">
                  <span>see details</span>
                  <ChevronDown className="w-4 h-4" />
                </span>
              </span>
            </button>
          ) : null}
          <hr className="border-slate-800" />
          <div className="pt-3">
            <div className="text-sm font-bold text-white mb-2">You pay</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-300 font-bold">Up Front</div>
                <div className="text-sm text-white font-bold text-right">
                  {formatSummaryCents(summary.upFrontCents, { currency, isEstimate: false })}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-300 font-bold">Settled After</div>
                <div className="text-sm text-white font-bold text-right">
                  {formatSummaryCents(summary.settledAfterCents, { currency, isEstimate: summary.hasEstimate })}
                </div>
              </div>
              <hr className="border-slate-800 my-2" />
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-300 font-bold">Total</div>
                <div className="text-sm text-white font-bold text-right">
                  {formatSummaryCents(summary.upFrontCents + summary.settledAfterCents, {
                    currency,
                    isEstimate: summary.hasEstimate,
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


