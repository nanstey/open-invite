import { formatDateLongEnUS, formatTime12h } from '../../../../../lib/ui/utils/datetime'

import type { ItineraryItem } from '../../../types'
import { deriveRangeFromItinerary } from '../itineraries/itinerary'

export type EventDateTimeModel = {
  startDate: Date
  endDate: Date | null
  showMultiDay: boolean
  showItineraryTimesOnly: boolean
  startDateText: string
  startTimeText: string
  endDateText: string | null
  endTimeText: string | null
  timeRangeText: string
}

export function buildEventDateTimeModel(input: {
  eventStartTime: string
  eventEndTime?: string | null
  itineraryItems?: ItineraryItem[] | null
}): EventDateTimeModel {
  const itineraryItems = input.itineraryItems ?? []
  const hasItinerary = itineraryItems.length > 0

  const derivedRange = hasItinerary ? deriveRangeFromItinerary(itineraryItems) : null

  const startDate = derivedRange?.start ?? new Date(input.eventStartTime)
  const endDate = derivedRange?.end ?? (input.eventEndTime ? new Date(input.eventEndTime) : null)

  const durationMs = endDate ? endDate.getTime() - startDate.getTime() : null
  // Display rule:
  // - If duration < 24h: show single date line + time range (even if it crosses midnight)
  // - If duration >= 24h: show multi-day (start date+time, end date+time)
  const showMultiDay = !!endDate && typeof durationMs === 'number' && durationMs >= 24 * 60 * 60 * 1000
  const showItineraryTimesOnly = !!endDate && typeof durationMs === 'number' && durationMs <= 24 * 60 * 60 * 1000

  const startDateText = formatDateLongEnUS(startDate)
  const startTimeText = formatTime12h(startDate)
  const endDateText = endDate ? formatDateLongEnUS(endDate) : null
  const endTimeText = endDate ? formatTime12h(endDate) : null
  const timeRangeText = endTimeText ? `${startTimeText} - ${endTimeText}` : startTimeText

  return {
    startDate,
    endDate,
    showMultiDay,
    showItineraryTimesOnly,
    startDateText,
    startTimeText,
    endDateText,
    endTimeText,
    timeRangeText,
  }
}


