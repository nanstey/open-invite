import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import type { ItineraryAttendance } from '../domains/events/types'

type AttendanceRow = Database['public']['Tables']['event_itinerary_attendance']['Row']

type AttendanceInsert = Database['public']['Tables']['event_itinerary_attendance']['Insert']

type AttendanceUpdate = Database['public']['Tables']['event_itinerary_attendance']['Update']

function transformRow(row: AttendanceRow): ItineraryAttendance {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    itineraryItemIds: row.itinerary_item_ids ?? [],
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }
}

export async function fetchEventItineraryAttendance(eventId: string): Promise<ItineraryAttendance[]> {
  const result = await supabase
    .from('event_itinerary_attendance')
    .select('*')
    .eq('event_id', eventId)

  const { data, error } = result as unknown as { data: AttendanceRow[] | null; error: any }
  if (error) {
    console.error('Error fetching itinerary attendance:', error)
    return []
  }

  return (data ?? []).map(transformRow)
}

export async function ensureItineraryAttendanceForAllAttendees(args: {
  eventId: string
  attendeeIds: string[]
  itineraryItemIds: string[]
}): Promise<boolean> {
  const { eventId, attendeeIds, itineraryItemIds } = args
  if (attendeeIds.length === 0 || itineraryItemIds.length === 0) return true

  const existing = await fetchEventItineraryAttendance(eventId)
  const existingByUser = new Map(existing.map((row) => [row.userId, row]))

  const toUpsert: AttendanceInsert[] = []
  for (const userId of attendeeIds) {
    const entry = existingByUser.get(userId)
    if (!entry || (entry.itineraryItemIds?.length ?? 0) === 0) {
      toUpsert.push({
        event_id: eventId,
        user_id: userId,
        itinerary_item_ids: itineraryItemIds,
      })
    }
  }

  if (toUpsert.length === 0) return true

  const result = await supabase
    .from('event_itinerary_attendance')
    .upsert(toUpsert as unknown as never, { onConflict: 'event_id,user_id' })

  const { error } = result as unknown as { error: any }
  if (error) {
    console.error('Error ensuring itinerary attendance:', error)
    return false
  }
  return true
}

export async function upsertItineraryAttendance(
  eventId: string,
  itineraryItemIds: string[],
): Promise<ItineraryAttendance | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const input: AttendanceInsert = {
    event_id: eventId,
    user_id: user.id,
    itinerary_item_ids: itineraryItemIds,
  }

  const result = await supabase
    .from('event_itinerary_attendance')
    .upsert(input as unknown as never, { onConflict: 'event_id,user_id' })
    .select()
    .single()

  const { data, error } = result as unknown as { data: AttendanceRow | null; error: any }
  if (error || !data) {
    console.error('Error upserting itinerary attendance:', error)
    return null
  }

  return transformRow(data)
}

export async function deleteItineraryAttendance(eventId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const input: AttendanceUpdate = {
    event_id: eventId,
    user_id: user.id,
  }

  const result = await supabase
    .from('event_itinerary_attendance')
    .delete()
    .match(input as unknown as never)

  const { error } = result as unknown as { error: any }
  if (error) {
    console.error('Error deleting itinerary attendance:', error)
    return false
  }
  return true
}
