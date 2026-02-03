import * as React from 'react'

import { centsToInputValue } from '../../../../../lib/ui/utils/money'

import type { AmountDraftsByExpenseId, EventExpense, ExpenseDetails, ExpenseSummary } from './types'
import { computeTotalCents, isEstimateExpense } from './utils'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseCalculatorContext = {
  expenses: EventExpense[]
  currentUserId?: string
  hostId?: string
}

// Re-export for convenience
export type { ExpenseDetails, ExpenseSummary } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Core calculation logic (pure functions)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes effective participant IDs for a given expense from the viewer's perspective.
 *
 * Handles:
 * - User explicitly in participantIds → as-is
 * - User not in list, but appliesTo=EVERYONE → includes user (estimate)
 * - User not in list, appliesTo=GUESTS_ONLY and user is not host → includes user (estimate)
 * - Otherwise → as-is (user not included)
 */
export function computeEffectiveParticipantIds(
  expense: EventExpense,
  currentUserId: string | undefined,
  hostId: string | undefined,
): string[] {
  if (!currentUserId) return expense.participantIds

  // User is already an explicit participant
  if (expense.participantIds.includes(currentUserId)) {
    return expense.participantIds
  }

  // User should be included based on appliesTo rules
  if (expense.appliesTo === 'EVERYONE') {
    return [...expense.participantIds, currentUserId]
  }

  if (expense.appliesTo === 'GUESTS_ONLY' && currentUserId !== hostId) {
    return [...expense.participantIds, currentUserId]
  }

  return expense.participantIds
}

/**
 * Computes per-person cost for a given expense based on effective participants.
 */
function computePerPersonCentsForViewer(expense: EventExpense, effectiveParticipantCount: number): number {
  if (effectiveParticipantCount === 0) return 0

  if (expense.splitType === 'PER_PERSON') {
    return expense.amountCents ?? 0
  }

  // GROUP split: total divided by participant count
  const total = computeTotalCents(expense)
  return Math.round(total / effectiveParticipantCount)
}

/**
 * Computes full expense details for a single expense.
 */
export function computeExpenseDetails(
  expense: EventExpense,
  currentUserId: string | undefined,
  hostId: string | undefined,
): ExpenseDetails {
  const effectiveParticipantIds = computeEffectiveParticipantIds(expense, currentUserId, hostId)
  const isParticipant = currentUserId ? expense.participantIds.includes(currentUserId) : false
  const isEffectiveParticipant = currentUserId ? effectiveParticipantIds.includes(currentUserId) : false
  const totalCents = computeTotalCents(expense)
  const perPersonCents = computePerPersonCentsForViewer(expense, effectiveParticipantIds.length)
  const isEstimate = isEstimateExpense(expense)

  return {
    expense,
    isParticipant,
    isEffectiveParticipant,
    effectiveParticipantIds,
    totalCents,
    perPersonCents,
    isEstimate,
  }
}

/**
 * Computes summary totals across all expenses for the current viewer.
 * Only includes expenses where the user is an effective participant.
 */
export function computeExpenseSummary(allDetails: ExpenseDetails[]): ExpenseSummary {
  let upFrontCents = 0
  let settledAfterCents = 0
  let hasEstimate = false

  for (const details of allDetails) {
    // Only include expenses where the user is an effective participant
    if (!details.isEffectiveParticipant) continue

    if (details.expense.timing === 'UP_FRONT') {
      upFrontCents += details.perPersonCents
    } else {
      settledAfterCents += details.perPersonCents
      if (details.isEstimate) hasEstimate = true
    }
  }

  return {
    upFrontCents,
    settledAfterCents,
    totalCents: upFrontCents + settledAfterCents,
    hasEstimate,
  }
}

export function computeExpenseSummaryForExpenses(
  expenses: EventExpense[],
  currentUserId: string | undefined,
  hostId: string | undefined,
): ExpenseSummary {
  const details = expenses.map((expense) => computeExpenseDetails(expense, currentUserId, hostId))
  return computeExpenseSummary(details)
}

// ─────────────────────────────────────────────────────────────────────────────
// React Hook
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseCalculator = {
  /** Get computed details for a specific expense by ID */
  getExpenseDetails: (expenseId: string) => ExpenseDetails | undefined
  /** Get computed details for all expenses */
  getAllExpenseDetails: () => ExpenseDetails[]
  /** Get summary totals (up front, settled after, total) */
  getSummary: () => ExpenseSummary

  // Draft state management for editing
  /** Get draft input value for an expense, falling back to formatted cents */
  getDraftValue: (expenseId: string, fallbackCents: number | undefined) => string
  /** Set draft input value for an expense */
  setDraftValue: (expenseId: string, value: string) => void
  /** Normalize draft value to formatted cents */
  normalizeDraftValue: (expenseId: string, cents: number | undefined) => void
}

/**
 * Hook that provides memoized expense calculations for the current viewer.
 *
 * Handles three participation cases:
 * - User participates in every expense
 * - User participates in a subset of expenses
 * - User is not a participant (shows estimates where applicable)
 */
export function useExpenseCalculator(context: ExpenseCalculatorContext): ExpenseCalculator {
  const { expenses, currentUserId, hostId } = context

  // Compute all expense details once
  const allDetails = React.useMemo(() => {
    return expenses.map((expense) => computeExpenseDetails(expense, currentUserId, hostId))
  }, [expenses, currentUserId, hostId])

  // Index by expense ID for fast lookup
  const detailsById = React.useMemo(() => {
    return new Map(allDetails.map((d) => [d.expense.id, d]))
  }, [allDetails])

  // Compute summary
  const summary = React.useMemo(() => {
    return computeExpenseSummary(allDetails)
  }, [allDetails])

  const getExpenseDetails = React.useCallback(
    (expenseId: string) => detailsById.get(expenseId),
    [detailsById],
  )

  const getAllExpenseDetails = React.useCallback(() => allDetails, [allDetails])

  const getSummary = React.useCallback(() => summary, [summary])

  // ─────────────────────────────────────────────────────────────────────────────
  // Draft state management for editing
  // ─────────────────────────────────────────────────────────────────────────────

  const [amountDrafts, setAmountDrafts] = React.useState<AmountDraftsByExpenseId>({})

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

  const normalizeDraftValue = React.useCallback((expenseId: string, cents: number | undefined) => {
    setAmountDrafts((prev) => ({
      ...prev,
      [expenseId]: { ...(prev[expenseId] ?? {}), amount: centsToInputValue(cents) },
    }))
  }, [])

  return {
    getExpenseDetails,
    getAllExpenseDetails,
    getSummary,
    getDraftValue,
    setDraftValue,
    normalizeDraftValue,
  }
}
