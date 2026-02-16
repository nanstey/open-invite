export type Person = { id: string; name: string };

export type ExpenseSplitType = 'GROUP' | 'PER_PERSON';
export type ExpenseTiming = 'UP_FRONT' | 'SETTLED_LATER';
export type ExpenseSettledKind = 'EXACT' | 'ESTIMATE';

export type ExpenseAppliesTo = 'EVERYONE' | 'HOST_ONLY' | 'GUESTS_ONLY' | 'CUSTOM';

export type EventExpense = {
  id: string;
  eventId: string;
  /**
   * Stable ordering field for display + drag/drop reordering.
   * Lower numbers appear first.
   */
  sortOrder?: number;
  title: string;
  appliesTo: ExpenseAppliesTo;
  splitType: ExpenseSplitType;
  timing: ExpenseTiming;
  settledKind?: ExpenseSettledKind;
  amountCents?: number;
  currency: string;
  participantIds: string[];
  itineraryItemId?: string | null;
};

export type ExpenseApi = {
  items: EventExpense[];
  onAdd: (input: Omit<EventExpense, 'id' | 'eventId'>) => Promise<string> | string;
  onUpdate: (
    id: string,
    patch: Partial<Omit<EventExpense, 'id' | 'eventId'>>
  ) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onReorder: (orderedExpenseIds: string[]) => void;
};

export type AmountDraftsByExpenseId = Record<
  string,
  Partial<{
    amount: string;
  }>
>;

// ─────────────────────────────────────────────────────────────────────────────
// Expense Calculator Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseDetails = {
  expense: EventExpense;
  /** True if the current user is explicitly listed in participantIds */
  isParticipant: boolean;
  /** True if the current user is included in the effective participant list (explicit or inferred from appliesTo) */
  isEffectiveParticipant: boolean;
  /** Participant IDs adjusted for the current viewer (includes user when appliesTo matches) */
  effectiveParticipantIds: string[];
  totalCents: number;
  perPersonCents: number;
  isEstimate: boolean;
};

export type ExpenseSummary = {
  upFrontCents: number;
  settledAfterCents: number;
  totalCents: number;
  hasEstimate: boolean;
};
