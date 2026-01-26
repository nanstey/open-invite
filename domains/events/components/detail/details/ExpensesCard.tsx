import * as React from 'react'

import { ChevronDown, ChevronUp, MoreVertical, Trash2 } from 'lucide-react'

import { FormInput, FormSelect } from '../../../../../lib/ui/components/FormControls'
import { centsToInputValue, formatCents, parseMoneyInputToCents } from '../../../../../lib/ui/utils/money'
import { useOutsideClick } from '../hooks/useOutsideClick'

type Person = { id: string; name: string }

type ExpenseSplitType = 'GROUP' | 'PER_PERSON'
type ExpenseTiming = 'UP_FRONT' | 'SETTLED_LATER'
type ExpenseSettledKind = 'EXACT' | 'ESTIMATE'

type ExpenseAppliesTo = 'EVERYONE' | 'HOST_ONLY' | 'GUESTS_ONLY' | 'CUSTOM'

type EventExpense = {
  id: string
  eventId: string
  title: string
  appliesTo: ExpenseAppliesTo
  splitType: ExpenseSplitType
  timing: ExpenseTiming
  settledKind?: ExpenseSettledKind
  amountCents?: number
  currency: string
  participantIds: string[]
}

type ExpenseApi = {
  onAdd: (input: Omit<EventExpense, 'id' | 'eventId'>) => Promise<string> | string
  onUpdate: (id: string, patch: Partial<Omit<EventExpense, 'id' | 'eventId'>>) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
}

type AmountDraftsByExpenseId = Record<
  string,
  Partial<{
    amount: string
  }>
>

function computeParticipantIdsForAppliesTo(args: {
  appliesTo: ExpenseAppliesTo
  peopleIds: string[]
  hostId?: string
  currentUserId?: string
}): string[] {
  const { appliesTo, peopleIds, hostId, currentUserId } = args
  const hostParticipantId = hostId && peopleIds.includes(hostId) ? hostId : currentUserId && peopleIds.includes(currentUserId) ? currentUserId : peopleIds[0]

  if (appliesTo === 'HOST_ONLY') return hostParticipantId ? [hostParticipantId] : peopleIds.slice(0, 1)
  if (appliesTo === 'GUESTS_ONLY') return hostParticipantId ? peopleIds.filter((id) => id !== hostParticipantId) : peopleIds
  // EVERYONE
  return peopleIds
}

function canCommitMoneyInput(s: string): boolean {
  const v = String(s ?? '').trim()
  if (!v) return false
  if (v === '-' || v === '.' || v === '-.') return false
  if (v.endsWith('.')) return false
  // allow numbers with up to 2 decimals
  return /^-?\d+(\.\d{0,2})?$/.test(v)
}

function kindLine(expense: EventExpense): string {
  const split = expense.splitType === 'PER_PERSON' ? 'Per person' : 'Group'
  const timing =
    expense.timing === 'UP_FRONT'
      ? 'Up front'
      : expense.settledKind === 'ESTIMATE'
        ? 'Settled later (estimate)'
        : 'Settled later'
  return `${split} • ${timing}`
}

function isEstimateExpense(expense: EventExpense): boolean {
  return expense.timing === 'SETTLED_LATER' && expense.settledKind === 'ESTIMATE'
}

function formatCentsMaybeEstimate(cents: number, opts: { currency: string; isEstimate: boolean }): string {
  const formatted = formatCents(cents, { currency: opts.currency })
  return opts.isEstimate ? `~${formatted}` : formatted
}

function formatSummaryCents(cents: number, opts: { currency: string; isEstimate: boolean }): string {
  if (cents === 0) return 'FREE'
  return formatCentsMaybeEstimate(cents, opts)
}

function computeTotalCents(expense: EventExpense): number {
  const participantCount = expense.participantIds.length
  const base = expense.amountCents ?? 0

  if (expense.splitType === 'PER_PERSON') {
    return base * participantCount
  }
  return base
}

function computePerPersonCents(expense: EventExpense): number {
  const participantCount = expense.participantIds.length
  if (participantCount === 0) return 0
  const total = computeTotalCents(expense)

  if (expense.splitType === 'PER_PERSON') {
    // per-person is the entered amount, not the total.
    return expense.amountCents ?? 0
  }

  // group split: total divided by participants.
  return Math.round(total / participantCount)
}

function titleForKind(expense: EventExpense): string {
  const split = expense.splitType === 'PER_PERSON' ? 'Per person' : 'Group'
  const timing =
    expense.timing === 'UP_FRONT'
      ? 'Up front'
      : expense.settledKind === 'ESTIMATE'
        ? 'Settled later (estimate)'
        : 'Settled later'
  return `${split} · ${timing}`
}

function ensureExpenseShapeOnTimingChange(timing: ExpenseTiming, current: EventExpense): Partial<Omit<EventExpense, 'id' | 'eventId'>> {
  // Business rule: Group expenses are always settled later.
  if (current.splitType === 'GROUP' && timing === 'UP_FRONT') {
    timing = 'SETTLED_LATER'
  }
  if (timing === 'UP_FRONT') {
    return {
      timing,
      settledKind: undefined,
      amountCents: current.amountCents ?? 0,
    }
  }

  // SETTLED_LATER default to EXACT
  return {
    timing,
    settledKind: (current.settledKind ?? 'EXACT') as ExpenseSettledKind,
    amountCents: current.amountCents ?? 0,
  }
}

function ensureExpenseShapeOnSettledKindChange(
  settledKind: ExpenseSettledKind,
): Partial<Omit<EventExpense, 'id' | 'eventId'>> {
  return { settledKind, amountCents: 0 }
}

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
  const [amountDrafts, setAmountDrafts] = React.useState<AmountDraftsByExpenseId>({})
  const [expandedExpenseId, setExpandedExpenseId] = React.useState<string | null>(null)
  const [openMenuExpenseId, setOpenMenuExpenseId] = React.useState<string | null>(null)

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

  const getDraftValue = React.useCallback(
    (expenseId: string, fallbackCents: number | undefined) => {
      const draft = amountDrafts[expenseId]?.amount
      if (typeof draft === 'string') return draft
      return centsToInputValue(fallbackCents)
    },
    [amountDrafts],
  )

  const setDraftValue = React.useCallback((expenseId: string, value: string) => {
    setAmountDrafts((prev) => ({
      ...prev,
      [expenseId]: { ...(prev[expenseId] ?? {}), amount: value },
    }))
  }, [])

  const normalizeDraftValue = React.useCallback(
    (expenseId: string, cents: number | undefined) => {
      setAmountDrafts((prev) => ({
        ...prev,
        [expenseId]: { ...(prev[expenseId] ?? {}), amount: centsToInputValue(cents) },
      }))
    },
    [],
  )

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
  // Note: settledLabel/upFrontLabel previously existed but weren't used in the UI.

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
            const participantNames = participantIdsForView
              .map((id) => peopleById.get(id)?.name ?? 'Unknown')
              .filter(Boolean)
            const isEstimate = isEstimateExpense(e)
            const totalLabel = formatCentsMaybeEstimate(totalCents, { currency: e.currency, isEstimate })
            const perLabel = formatCentsMaybeEstimate(perCentsForView, { currency: e.currency, isEstimate })

            if (!canEditExpenses) {
              return (
                <div key={e.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-bold truncate">{e.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{titleForKind(e)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-extrabold text-lg leading-tight">{perLabel}</div>
                      <div className="text-xs text-slate-400 -mt-0.5">/ person</div>
                      {e.splitType === 'GROUP' ? (
                        <div className="text-xs text-slate-500 mt-1">{totalLabel} total</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {participantIdsForView.length} people{participantNames.length ? ` · ${participantNames.join(', ')}` : ''}
                  </div>
                </div>
              )
            }

            // Edit mode row
            const isExpanded = expandedExpenseId === e.id
            const isMenuOpen = openMenuExpenseId === e.id

            return (
              <div key={e.id} className="rounded-xl border border-slate-800 bg-slate-900/30">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="min-w-0 flex-1 text-left cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedExpenseId((prev) => (prev === e.id ? null : e.id))}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault()
                          setExpandedExpenseId((prev) => (prev === e.id ? null : e.id))
                        }
                      }}
                    >
                      <div className="font-bold text-white truncate">{e.title || 'Untitled expense'}</div>
                      <div className="text-sm text-slate-400">{kindLine(e)}</div>
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
                            setOpenMenuExpenseId((prev) => (prev === e.id ? null : e.id))
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
                                setOpenMenuExpenseId(null)
                                expenseApi?.onDelete(e.id)
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
                        onClick={() => setExpandedExpenseId((prev) => (prev === e.id ? null : e.id))}
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
                        onChange={(ev) => expenseApi?.onUpdate(e.id, ensureExpenseShapeOnTimingChange(ev.target.value as ExpenseTiming, e))}
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
                          onChange={(ev) => expenseApi?.onUpdate(e.id, ensureExpenseShapeOnSettledKindChange(ev.target.value as ExpenseSettledKind))}
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

                    <div className="border-t border-slate-800 pt-3">
                      <div className="text-sm text-white font-bold mb-2">Participants</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <FormSelect
                          value={e.appliesTo}
                          onChange={(ev) => {
                            const appliesTo = ev.target.value as ExpenseAppliesTo
                            if (appliesTo === 'CUSTOM') {
                              expenseApi?.onUpdate(e.id, { appliesTo })
                              return
                            }
                            const participantIds = computeParticipantIdsForAppliesTo({
                              appliesTo,
                              peopleIds: allPeopleIds,
                              hostId,
                              currentUserId,
                            })
                            expenseApi?.onUpdate(e.id, { appliesTo, participantIds })
                          }}
                          variant="surface"
                          size="md"
                        >
                          <option value="EVERYONE">Everyone</option>
                          <option value="HOST_ONLY">Host Only</option>
                          <option value="GUESTS_ONLY">Guests Only</option>
                          <option value="CUSTOM">Custom</option>
                        </FormSelect>
                        <div className="md:col-span-2 text-xs text-slate-500 flex items-center">
                          Pick a preset to quickly set participants. Choose Custom to fine-tune below.
                        </div>
                      </div>
                      {people.length === 0 ? (
                        <div className="text-sm text-slate-500 italic">No participants available.</div>
                      ) : (
                        <>
                          {e.appliesTo === 'CUSTOM' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {people.map((p) => {
                                const checked = e.participantIds.includes(p.id)
                                return (
                                  <label key={p.id} className="flex items-center gap-2 text-sm text-slate-200">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(ev) => {
                                        const nextRaw = ev.target.checked
                                          ? Array.from(new Set([...e.participantIds, p.id]))
                                          : e.participantIds.filter((id) => id !== p.id)
                                        expenseApi?.onUpdate(e.id, { appliesTo: 'CUSTOM', participantIds: nextRaw })
                                      }}
                                    />
                                    <span className="truncate">{p.name}</span>
                                  </label>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-400">
                              {e.participantIds.length} selected
                            </div>
                          )}
                        </>
                      )}
                      {e.appliesTo === 'CUSTOM' ? (
                        <div className="mt-2 text-xs text-slate-500">{e.participantIds.length} selected</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
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
                <div className="text-sm text-white font-bold text-right">{formatSummaryCents(summary.upFrontCents, { currency, isEstimate: false })}</div>
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


