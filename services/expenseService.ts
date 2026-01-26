import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import type { EventExpense, ExpenseSettledKind, ExpenseSplitType, ExpenseTiming } from '../domains/events/types'

type ExpenseRow = Database['public']['Tables']['event_expenses']['Row']

function transformRow(row: ExpenseRow): EventExpense {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    splitType: row.split_type as ExpenseSplitType,
    timing: row.timing as ExpenseTiming,
    settledKind: (row.settled_kind ?? undefined) as ExpenseSettledKind | undefined,
    amountCents: row.amount_cents ?? undefined,
    currency: row.currency,
    participantIds: row.participant_ids,
  }
}

export async function fetchEventExpenses(eventId: string): Promise<EventExpense[]> {
  const result = await supabase
    .from('event_expenses')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  const { data, error } = result as unknown as { data: ExpenseRow[] | null; error: any }
  if (error) {
    console.error('Error fetching event expenses:', error)
    return []
  }
  return (data ?? []).map(transformRow)
}

export async function createEventExpense(input: Omit<EventExpense, 'id'>): Promise<EventExpense | null> {
  type Insert = Database['public']['Tables']['event_expenses']['Insert']

  const insert: Insert = {
    event_id: input.eventId,
    title: input.title,
    split_type: input.splitType,
    timing: input.timing,
    settled_kind: input.settledKind ?? null,
    amount_cents: input.amountCents ?? null,
    currency: input.currency,
    participant_ids: input.participantIds,
  }

  const result = await supabase.from('event_expenses').insert(insert as unknown as never).select().single()
  const { data, error } = result as unknown as { data: ExpenseRow | null; error: any }
  if (error || !data) {
    console.error('Error creating event expense:', error)
    return null
  }
  return transformRow(data)
}

export async function updateEventExpense(
  expenseId: string,
  patch: Partial<Omit<EventExpense, 'id' | 'eventId'>>,
): Promise<EventExpense | null> {
  const update: any = {}
  if (patch.title !== undefined) update.title = patch.title
  if (patch.splitType !== undefined) update.split_type = patch.splitType
  if (patch.timing !== undefined) update.timing = patch.timing
  if ('settledKind' in patch) update.settled_kind = patch.settledKind ?? null
  if ('amountCents' in patch) update.amount_cents = patch.amountCents ?? null
  if (patch.currency !== undefined) update.currency = patch.currency
  if (patch.participantIds !== undefined) update.participant_ids = patch.participantIds

  const result = await supabase.from('event_expenses').update(update as unknown as never).eq('id', expenseId).select().single()
  const { data, error } = result as unknown as { data: ExpenseRow | null; error: any }
  if (error || !data) {
    console.error('Error updating event expense:', error)
    return null
  }
  return transformRow(data)
}

export async function deleteEventExpense(expenseId: string): Promise<boolean> {
  const result = await supabase.from('event_expenses').delete().eq('id', expenseId)
  const { error } = result as unknown as { error: any }
  if (error) {
    console.error('Error deleting event expense:', error)
    return false
  }
  return true
}


