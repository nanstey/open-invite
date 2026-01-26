type HasStartAndDuration = {
  startTime: string
  durationMinutes: number
}

export function sortByStartTime<T extends { startTime: string }>(items: T[]): T[] {
  return items
    .slice()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
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


