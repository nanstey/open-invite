import * as React from 'react'
import { Calendar, MapPin, Users } from 'lucide-react'

import type { User } from '../../../../../lib/types'
import type { EventDateTimeModel } from '../utils/eventDateTimeModel'
import type { LocationData } from '../../../types'
import { buildGoogleMapsLatLngUrl } from '../maps/maps'
import { openExternalUrl } from '../../../../../lib/ui/utils/openExternalUrl'
import { formatEventLocationForDisplay } from '../utils/locationDisplay'
import { Button } from '../../../../../lib/ui/9ui/button'
import { Card } from '../../../../../lib/ui/9ui/card'

type SeatsSummary = {
  attendeeCount: number
  maxSeats?: number | null
  goingLabel: string
  spotsLeft: number | null
}

export function KeyFactsCard(props: {
  host?: User | null

  dateTime: EventDateTimeModel
  isFlexibleStart: boolean

  location: { raw: string; locationData?: LocationData }
  coordinates?: { lat?: number | null; lng?: number | null } | null
  seats: SeatsSummary
}) {
  const { host, dateTime, isFlexibleStart, location, coordinates, seats } = props

  const wherePrimary = React.useMemo(
    () => formatEventLocationForDisplay({ raw: location.raw, locationData: location.locationData }).primary,
    [location.locationData, location.raw],
  )
  const hasCoordinates = typeof coordinates?.lat === 'number' && typeof coordinates?.lng === 'number'
  const openInMaps = React.useCallback(() => {
    const lat = coordinates?.lat
    const lng = coordinates?.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') return
    openExternalUrl(buildGoogleMapsLatLngUrl(lat, lng))
  }, [coordinates?.lat, coordinates?.lng])

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-6 relative z-10">
      <Card className="bg-surface border border-slate-700 rounded-2xl p-4 md:p-5">
        {/* Mobile: host (left) + datetime (right) */}
        <div className="md:hidden flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {host ? (
              <img src={host.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700 shrink-0" alt={host.name} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse border-2 border-slate-700 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-xs text-slate-400">Hosted by</div>
              <div className="font-bold text-white truncate">{host?.name || 'Loading...'}</div>
            </div>
          </div>

          <div className="text-right shrink-0">
            {dateTime.showMultiDay ? (
              <>
                <div className="leading-tight text-white">
                  <span className="font-bold">{dateTime.startDateText}</span>{' '}
                  <span className="font-normal text-slate-400">{dateTime.startTimeText} -</span>
                </div>
                {dateTime.endDateText && dateTime.endTimeText && (
                  <div className="leading-tight text-white">
                    <span className="font-bold">{dateTime.endDateText}</span>{' '}
                    <span className="font-normal text-slate-400">{dateTime.endTimeText}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="font-bold text-white leading-tight">{dateTime.startDateText}</div>
                <div className="text-sm text-slate-400 leading-tight">
                  {dateTime.timeRangeText}
                  {isFlexibleStart && <span className="italic"> (Flexible)</span>}
                </div>
              </>
            )}
            {dateTime.showMultiDay && isFlexibleStart && (
              <div className="text-sm text-slate-400 leading-tight italic">(Flexible)</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:mt-0 mt-3">
          <div className="hidden md:flex items-start gap-3 p-3 rounded-xl">
            <div className="p-2 bg-slate-800 rounded-lg shrink-0">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">When</div>
              {dateTime.showMultiDay ? (
                <>
                  <div className="text-white leading-tight">
                    <span className="font-bold">{dateTime.startDateText}</span>{' '}
                    <span className="font-normal text-slate-400">{dateTime.startTimeText} -</span>
                  </div>
                  {dateTime.endDateText && dateTime.endTimeText && (
                    <div className="text-white leading-tight">
                      <span className="font-bold">{dateTime.endDateText}</span>{' '}
                      <span className="font-normal text-slate-400">{dateTime.endTimeText}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-bold text-white">{dateTime.startDateText}</div>
                  <div className="text-sm text-slate-400">
                    {dateTime.timeRangeText}
                    {isFlexibleStart && <span className="italic"> (Flexible)</span>}
                  </div>
                </>
              )}
              {dateTime.showMultiDay && isFlexibleStart && <div className="text-sm text-slate-400 italic">(Flexible)</div>}
            </div>
          </div>

          <div className="hidden md:flex items-start gap-3 p-3 rounded-xl">
            <div className="p-2 bg-slate-800 rounded-lg shrink-0">
              <MapPin className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Where</div>
              <div className="font-bold text-white truncate">{wherePrimary}</div>
              {hasCoordinates ? (
                <Button
                  variant="ghost"
                  className="px-0 text-sm text-slate-500 underline decoration-slate-600 decoration-dashed hover:text-slate-300"
                  type="button"
                  onClick={openInMaps}
                >
                  Open in maps
                </Button>
              ) : null}
            </div>
          </div>

          <div className="hidden md:flex items-start gap-3 p-3 rounded-xl">
            <div className="p-2 bg-slate-800 rounded-lg shrink-0">
              <Users className="w-5 h-5 text-slate-300" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seats</div>
              {/* Seats are editable elsewhere; keep this overview read-only. */}
              <>
                <div className="font-bold text-white truncate">
                  {seats.maxSeats ? `${seats.goingLabel} going` : `${seats.attendeeCount} going`}
                </div>
                {seats.spotsLeft !== null ? (
                  <div className="text-sm text-slate-400">{seats.spotsLeft} spots left</div>
                ) : (
                  <div className="text-sm text-slate-500">No limit</div>
                )}
              </>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
