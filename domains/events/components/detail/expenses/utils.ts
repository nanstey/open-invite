import { formatCents } from '../../../../../lib/ui/utils/money'

import type { EventExpense, ExpenseAppliesTo, ExpenseSettledKind, ExpenseTiming } from './types'

export function computeParticipantIdsForAppliesTo(args: {
  appliesTo: ExpenseAppliesTo
  peopleIds: string[]
  hostId?: string
  currentUserId?: string
}): string[] {
  const { appliesTo, peopleIds, hostId, currentUserId } = args
  const hostParticipantId =
    hostId && peopleIds.includes(hostId)
      ? hostId
      : currentUserId && peopleIds.includes(currentUserId)
        ? currentUserId
        : peopleIds[0]

  if (appliesTo === 'HOST_ONLY') return hostParticipantId ? [hostParticipantId] : peopleIds.slice(0, 1)
  if (appliesTo === 'GUESTS_ONLY')
    return hostParticipantId ? peopleIds.filter((id) => id !== hostParticipantId) : peopleIds
  // EVERYONE
  return peopleIds
}

export function canCommitMoneyInput(s: string): boolean {
  const v = String(s ?? '').trim()
  if (!v) return false
  if (v === '-' || v === '.' || v === '-.') return false
  if (v.endsWith('.')) return false
  // allow numbers with up to 2 decimals
  return /^-?\d+(\.\d{0,2})?$/.test(v)
}

export function kindLine(expense: EventExpense): string {
  const split = expense.splitType === 'PER_PERSON' ? 'Per person' : 'Group'
  const timing =
    expense.timing === 'UP_FRONT'
      ? 'Up front'
      : expense.settledKind === 'ESTIMATE'
        ? 'Settled later (estimate)'
        : 'Settled later'
  return `${split} • ${timing}`
}

export function isEstimateExpense(expense: EventExpense): boolean {
  return expense.timing === 'SETTLED_LATER' && expense.settledKind === 'ESTIMATE'
}

export function formatCentsMaybeEstimate(cents: number, opts: { currency: string; isEstimate: boolean }): string {
  const formatted = formatCents(cents, { currency: opts.currency })
  return opts.isEstimate ? `~${formatted}` : formatted
}

export function formatSummaryCents(cents: number, opts: { currency: string; isEstimate: boolean }): string {
  if (cents === 0) return 'FREE'
  return formatCentsMaybeEstimate(cents, opts)
}

export function computeTotalCents(expense: EventExpense): number {
  const participantCount = expense.participantIds.length
  const base = expense.amountCents ?? 0

  if (expense.splitType === 'PER_PERSON') {
    return base * participantCount
  }
  return base
}

export function computePerPersonCents(expense: EventExpense): number {
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

export function titleForKind(expense: EventExpense): string {
  const split = expense.splitType === 'PER_PERSON' ? 'Per person' : 'Group'
  const timing =
    expense.timing === 'UP_FRONT'
      ? 'Up front'
      : expense.settledKind === 'ESTIMATE'
        ? 'Settled later (estimate)'
        : 'Settled later'
  return `${split} · ${timing}`
}

export function ensureExpenseShapeOnTimingChange(
  timing: ExpenseTiming,
  current: EventExpense,
): Partial<Omit<EventExpense, 'id' | 'eventId'>> {
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

export function ensureExpenseShapeOnSettledKindChange(
  settledKind: ExpenseSettledKind,
): Partial<Omit<EventExpense, 'id' | 'eventId'>> {
  return { settledKind, amountCents: 0 }
}


