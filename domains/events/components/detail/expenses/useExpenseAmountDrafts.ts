import * as React from 'react'

import { centsToInputValue } from '../../../../../lib/ui/utils/money'

import type { AmountDraftsByExpenseId } from './types'

export function useExpenseAmountDrafts() {
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

  return { amountDrafts, getDraftValue, setDraftValue, normalizeDraftValue }
}


