import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import type { ItineraryItem } from '../lib/types'

type ItineraryRow = Database['public']['Tables']['event_itinerary_items']['Row']

function transformRow(row: ItineraryRow): ItineraryItem {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    location: row.location || undefined,
    description: row.description || undefined,
  }
}

export async function fetchItineraryItems(eventId: string): Promise<ItineraryItem[]> {
  const result = await supabase
    .from('event_itinerary_items')
    .select('*')
    .eq('event_id', eventId)
    .order('start_time', { ascending: true })

  const { data, error } = result as unknown as { data: ItineraryRow[] | null; error: any }
  if (error) {
    console.error('Error fetching itinerary items:', error)
    return []
  }
  return (data ?? []).map(transformRow)
}

export async function createItineraryItem(input: Omit<ItineraryItem, 'id'>): Promise<ItineraryItem | null> {
  type Insert = Database['public']['Tables']['event_itinerary_items']['Insert']
  const insert: Insert = {
    event_id: input.eventId,
    title: input.title,
    start_time: input.startTime,
    duration_minutes: input.durationMinutes,
    location: input.location ?? null,
    description: input.description ?? null,
  }

  const result = await supabase.from('event_itinerary_items').insert(insert as unknown as never).select().single()
  const { data, error } = result as unknown as { data: ItineraryRow | null; error: any }
  if (error || !data) {
    console.error('Error creating itinerary item:', error)
    return null
  }
  return transformRow(data)
}

export async function updateItineraryItem(
  itemId: string,
  patch: Partial<Omit<ItineraryItem, 'id' | 'eventId'>>,
): Promise<ItineraryItem | null> {
  const update: any = {}
  if (patch.title !== undefined) update.title = patch.title
  if (patch.startTime !== undefined) update.start_time = patch.startTime
  if (patch.durationMinutes !== undefined) update.duration_minutes = patch.durationMinutes
  if ('location' in patch) update.location = patch.location ?? null
  if ('description' in patch) update.description = patch.description ?? null

  const result = await supabase.from('event_itinerary_items').update(update as unknown as never).eq('id', itemId).select().single()
  const { data, error } = result as unknown as { data: ItineraryRow | null; error: any }
  if (error || !data) {
    console.error('Error updating itinerary item:', error)
    return null
  }
  return transformRow(data)
}

export async function deleteItineraryItem(itemId: string): Promise<boolean> {
  const result = await supabase.from('event_itinerary_items').delete().eq('id', itemId)
  const { error } = result as unknown as { error: any }
  if (error) {
    console.error('Error deleting itinerary item:', error)
    return false
  }
  return true
}


