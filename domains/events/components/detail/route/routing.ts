export type EventTab = 'details' | 'guests' | 'chat'

export function parseEventTab(value: unknown): EventTab | undefined {
  if (typeof value !== 'string') return undefined
  const tab = value.toLowerCase()
  if (tab === 'details' || tab === 'guests' || tab === 'chat') return tab
  return undefined
}

export function coerceEventTab(value: unknown, fallback: EventTab = 'details'): EventTab {
  return parseEventTab(value) ?? fallback
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}


