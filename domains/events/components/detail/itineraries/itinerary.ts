type HasStartAndDuration = {
  startTime: string
  durationMinutes: number
}

export function sortByStartTime<T extends { startTime: string }>(items: T[]): T[] {
  return items
    .slice()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

export function getItineraryItemEndDate(item: HasStartAndDuration): Date {
  return addMinutes(new Date(item.startTime), item.durationMinutes)
}

export function getNextItineraryItemStartIso(
  items: HasStartAndDuration[],
  fallbackIso: string = new Date().toISOString(),
): string {
  if (!items || items.length === 0) return fallbackIso
  const ordered = sortByStartTime(items)
  const last = ordered[ordered.length - 1]
  return getItineraryItemEndDate(last).toISOString()
}

export function durationHoursToMinutes(
  durationHours: number | '' | null | undefined,
  defaultMinutes: number = 60,
): number {
  if (typeof durationHours === 'number' && Number.isFinite(durationHours) && durationHours > 0) {
    return Math.max(1, Math.round(durationHours * 60))
  }
  return defaultMinutes
}

export function minutesToQuarterHourHours(durationMinutes: number | null | undefined): number {
  const minutes = Number(durationMinutes ?? 0)
  if (!Number.isFinite(minutes) || minutes <= 0) return 0
  return Math.round((minutes / 60) * 4) / 4
}

export function deriveRangeFromItinerary(items: HasStartAndDuration[]): { start: Date; end: Date } | null {
  if (!items || items.length === 0) return null

  let minStart: Date | null = null
  let maxEnd: Date | null = null

  for (const item of items) {
    const start = new Date(item.startTime)
    if (Number.isNaN(start.getTime())) continue
    const end = new Date(start.getTime() + item.durationMinutes * 60 * 1000)

    if (!minStart || start.getTime() < minStart.getTime()) minStart = start
    if (!maxEnd || end.getTime() > maxEnd.getTime()) maxEnd = end
  }

  if (!minStart || !maxEnd) return null
  return { start: minStart, end: maxEnd }
}

export function deriveEventTimesFromItinerary(items: HasStartAndDuration[]): { startTime: string; endTime: string } | null {
  const range = deriveRangeFromItinerary(items)
  if (!range) return null
  return { startTime: range.start.toISOString(), endTime: range.end.toISOString() }
}

export function extractUniqueLocations(items: Array<{ location?: string }>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const q = String(item.location ?? '').trim()
    if (!q) continue
    if (seen.has(q)) continue
    seen.add(q)
    out.push(q)
  }
  return out
}


