import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase }))

import {
  fetchEventExpenses,
  createEventExpense,
  updateEventExpense,
  deleteEventExpense,
} from './expenseService'
import type { EventExpense, ExpenseAppliesTo, ExpenseSplitType, ExpenseTiming, ExpenseSettledKind } from '../domains/events/types'

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table]
    if (!handler) {
      throw new Error(`Unhandled table ${table}`)
    }
    return handler()
  })
}

const baseExpenseRow = {
  id: 'expense-1',
  event_id: 'event-1',
  sort_order: 1,
  title: 'Catering',
  applies_to: 'EVERYONE' as ExpenseAppliesTo,
  split_type: 'GROUP' as ExpenseSplitType,
  timing: 'UP_FRONT' as ExpenseTiming,
  settled_kind: null as ExpenseSettledKind | null,
  amount_cents: 10000,
  currency: 'USD',
  participant_ids: ['user-1', 'user-2'],
  itinerary_item_id: null,
}

const baseExpense: EventExpense = {
  id: 'expense-1',
  eventId: 'event-1',
  sortOrder: 1,
  title: 'Catering',
  appliesTo: 'EVERYONE',
  splitType: 'GROUP',
  timing: 'UP_FRONT',
  settledKind: undefined,
  amountCents: 10000,
  currency: 'USD',
  participantIds: ['user-1', 'user-2'],
  itineraryItemId: null,
}

describe('expenseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchEventExpenses', () => {
    it('returns empty array when no expenses found', async () => {
      mockFrom({
        event_expenses: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchEventExpenses('event-1')

      expect(result).toEqual([])
    })

    it('returns expenses sorted by sort_order and created_at', async () => {
      mockFrom({
        event_expenses: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({
                  data: [
                    baseExpenseRow,
                    { ...baseExpenseRow, id: 'expense-2', title: 'Venue', sort_order: 2 },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchEventExpenses('event-1')

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Catering')
      expect(result[1].title).toBe('Venue')
    })

    it('transforms settled expenses correctly', async () => {
      mockFrom({
        event_expenses: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({
                  data: [
                    { ...baseExpenseRow, timing: 'SETTLED_LATER', settled_kind: 'EXACT', amount_cents: 5000 },
                    { ...baseExpenseRow, timing: 'SETTLED_LATER', settled_kind: 'ESTIMATE', amount_cents: 3000 },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchEventExpenses('event-1')

      expect(result[0].timing).toBe('SETTLED_LATER')
      expect(result[0].settledKind).toBe('EXACT')
      expect(result[1].settledKind).toBe('ESTIMATE')
    })

    it('handles undefined values correctly', async () => {
      mockFrom({
        event_expenses: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({
                  data: [
                    { ...baseExpenseRow, sort_order: null, amount_cents: null },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchEventExpenses('event-1')

      expect(result[0].sortOrder).toBeUndefined()
      expect(result[0].amountCents).toBeUndefined()
    })

    it('returns empty array when database error occurs', async () => {
      mockFrom({
        event_expenses: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({ data: null, error: new Error('db error') }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchEventExpenses('event-1')

      expect(result).toEqual([])
    })
  })

  describe('createEventExpense', () => {
    it('creates expense and returns expense object', async () => {
      mockFrom({
        event_expenses: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: baseExpenseRow,
                error: null,
              }),
            }),
          }),
        }),
      })

      const input = {
        eventId: 'event-1',
        title: 'Catering',
        appliesTo: 'EVERYONE' as ExpenseAppliesTo,
        splitType: 'GROUP' as ExpenseSplitType,
        timing: 'UP_FRONT' as ExpenseTiming,
        amountCents: 10000,
        currency: 'USD',
        participantIds: ['user-1', 'user-2'],
        itineraryItemId: null,
      }

      const result = await createEventExpense(input)

      expect(result).toMatchObject({
        id: 'expense-1',
        eventId: 'event-1',
        title: 'Catering',
        appliesTo: 'EVERYONE',
        splitType: 'GROUP',
        timing: 'UP_FRONT',
        amountCents: 10000,
        currency: 'USD',
        participantIds: ['user-1', 'user-2'],
      })
    })

    it('creates expense without optional fields', async () => {
      mockFrom({
        event_expenses: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'expense-2',
                  event_id: 'event-1',
                  sort_order: null,
                  title: 'Drinks',
                  applies_to: 'GUESTS_ONLY',
                  split_type: 'PER_PERSON',
                  timing: 'SETTLED_LATER',
                  settled_kind: 'ESTIMATE',
                  amount_cents: null,
                  currency: 'EUR',
                  participant_ids: ['user-1'],
                  itinerary_item_id: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const input = {
        eventId: 'event-1',
        title: 'Drinks',
        appliesTo: 'GUESTS_ONLY' as ExpenseAppliesTo,
        splitType: 'PER_PERSON' as ExpenseSplitType,
        timing: 'SETTLED_LATER' as ExpenseTiming,
        settledKind: 'ESTIMATE' as ExpenseSettledKind,
        currency: 'EUR',
        participantIds: ['user-1'],
        itineraryItemId: null,
      }

      const result = await createEventExpense(input)

      expect(result).toMatchObject({
        title: 'Drinks',
        appliesTo: 'GUESTS_ONLY',
        splitType: 'PER_PERSON',
        timing: 'SETTLED_LATER',
        settledKind: 'ESTIMATE',
        currency: 'EUR',
      })
      expect(result?.amountCents).toBeUndefined()
    })

    it('returns null when insert fails', async () => {
      mockFrom({
        event_expenses: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: new Error('db error') }),
            }),
          }),
        }),
      })

      const result = await createEventExpense(baseExpense)

      expect(result).toBeNull()
    })

    it('returns null when no data returned', async () => {
      mockFrom({
        event_expenses: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      })

      const result = await createEventExpense(baseExpense)

      expect(result).toBeNull()
    })
  })

  describe('updateEventExpense', () => {
    it('updates expense with partial fields', async () => {
      mockFrom({
        event_expenses: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { ...baseExpenseRow, title: 'Updated Catering', amount_cents: 15000 },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await updateEventExpense('expense-1', { title: 'Updated Catering', amountCents: 15000 })

      expect(result).toMatchObject({
        id: 'expense-1',
        title: 'Updated Catering',
        amountCents: 15000,
      })
    })

    it('updates settled kind to null when explicitly cleared', async () => {
      mockFrom({
        event_expenses: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { ...baseExpenseRow, settled_kind: null },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await updateEventExpense('expense-1', { settledKind: undefined })

      expect(result).toBeDefined()
    })

    it('updates itinerary item id', async () => {
      mockFrom({
        event_expenses: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { ...baseExpenseRow, itinerary_item_id: 'item-1' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await updateEventExpense('expense-1', { itineraryItemId: 'item-1' })

      expect(result?.itineraryItemId).toBe('item-1')
    })

    it('returns null when update fails', async () => {
      mockFrom({
        event_expenses: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: null, error: new Error('db error') }),
              }),
            }),
          }),
        }),
      })

      const result = await updateEventExpense('expense-1', { title: 'New Title' })

      expect(result).toBeNull()
    })

    it('returns null when expense not found', async () => {
      mockFrom({
        event_expenses: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      })

      const result = await updateEventExpense('non-existent', { title: 'New Title' })

      expect(result).toBeNull()
    })
  })

  describe('deleteEventExpense', () => {
    it('returns true when expense is deleted successfully', async () => {
      mockFrom({
        event_expenses: () => ({
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      })

      const result = await deleteEventExpense('expense-1')

      expect(result).toBe(true)
    })

    it('returns false when delete fails', async () => {
      mockFrom({
        event_expenses: () => ({
          delete: () => ({
            eq: async () => ({ error: new Error('db error') }),
          }),
        }),
      })

      const result = await deleteEventExpense('expense-1')

      expect(result).toBe(false)
    })

    it('returns true when expense does not exist (idempotent delete)', async () => {
      mockFrom({
        event_expenses: () => ({
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      })

      const result = await deleteEventExpense('non-existent')

      expect(result).toBe(true)
    })
  })
})
