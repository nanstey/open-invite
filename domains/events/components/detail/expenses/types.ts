export type Person = { id: string; name: string }

export type ExpenseSplitType = 'GROUP' | 'PER_PERSON'
export type ExpenseTiming = 'UP_FRONT' | 'SETTLED_LATER'
export type ExpenseSettledKind = 'EXACT' | 'ESTIMATE'

export type ExpenseAppliesTo = 'EVERYONE' | 'HOST_ONLY' | 'GUESTS_ONLY' | 'CUSTOM'

export type EventExpense = {
  id: string
  eventId: string
  /**
   * Stable ordering field for display + drag/drop reordering.
   * Lower numbers appear first.
   */
  sortOrder?: number
  title: string
  appliesTo: ExpenseAppliesTo
  splitType: ExpenseSplitType
  timing: ExpenseTiming
  settledKind?: ExpenseSettledKind
  amountCents?: number
  currency: string
  participantIds: string[]
}

export type ExpenseApi = {
  onAdd: (input: Omit<EventExpense, 'id' | 'eventId'>) => Promise<string> | string
  onUpdate: (id: string, patch: Partial<Omit<EventExpense, 'id' | 'eventId'>>) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
  onReorder?: (orderedExpenseIds: string[]) => Promise<void> | void
}

export type AmountDraftsByExpenseId = Record<
  string,
  Partial<{
    amount: string
  }>
>


