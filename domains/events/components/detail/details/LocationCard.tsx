import * as React from 'react'

import { MapPin } from 'lucide-react'

import { LeafletMiniMapPreview } from '../maps/LeafletMiniMapPreview'
import { FullScreenMapModal } from '../maps/FullScreenMapModal'
import { LocationAutocomplete, type LocationSuggestion } from '../../../../../lib/ui/components/LocationAutocomplete'
import { useItineraryGeocoding } from '../../../hooks/useItineraryGeocoding'
import type { LocationData } from '../../../types'
import { formatEventLocationForDisplay } from '../utils/locationDisplay'
import type { ItineraryItem } from '../../../types'
import { extractUniqueLocations, sortByStartTime } from '../itineraries/itinerary'
import { getTheme } from '../../../../../lib/constants'

type DisplayLocation = { primary: string; secondary?: string }
type ItineraryLocDisplay = { full: string; label: string; isReal: boolean }

export function LocationCard(props: {
  itineraryItems: ItineraryItem[]
  formatRawLocationForDisplay: (raw: string) => DisplayLocation
  formatItineraryLocationForDisplay: (location: string | undefined) => ItineraryLocDisplay
  onOpenItineraryLocationInMaps: (locationFull: string) => void

  activityType: string
  title?: string
  eventLocation: string
  eventLocationData?: LocationData
  eventCoordinates?: { lat?: number | null; lng?: number | null } | null

  isEditMode: boolean
  locationValue: string
  onChangeLocationText?: (text: string) => void
  onSelectLocation?: (selection: LocationSuggestion) => void
  locationError?: string
}) {
  const [showMapModal, setShowMapModal] = React.useState(false)
  const themeHex = getTheme(props.activityType).hex

  const hasItinerary = props.itineraryItems.length > 0
  const orderedItineraryItems = React.useMemo(() => sortByStartTime(props.itineraryItems), [props.itineraryItems])
  const itineraryLocationList = React.useMemo(() => {
    return orderedItineraryItems
      .map((item) => String(item.location ?? '').trim())
      .filter(Boolean)
  }, [orderedItineraryItems])
  const uniqueItineraryLocations = React.useMemo(() => extractUniqueLocations(orderedItineraryItems), [orderedItineraryItems])

  const { geoByLocation: itineraryGeo, loading: itineraryGeoLoading } = useItineraryGeocoding({
    enabled: hasItinerary,
    uniqueLocations: uniqueItineraryLocations,
    eventLocation: props.eventLocation,
    eventCoordinates: props.eventCoordinates,
  })

  const miniMapPoints = React.useMemo(() => {
    if (hasItinerary) {
      const pts: Array<[number, number]> = []
      for (const loc of itineraryLocationList) {
        const q = String(loc ?? '').trim()
        if (!q) continue
        const p = itineraryGeo[q]
        if (!p) continue
        pts.push([p.lat, p.lng])
      }
      return pts
    }

    const lat = props.eventCoordinates?.lat
    const lng = props.eventCoordinates?.lng
    if (typeof lat === 'number' && typeof lng === 'number') return [[lat, lng] as [number, number]]
    return []
  }, [hasItinerary, itineraryGeo, itineraryLocationList, props.eventCoordinates?.lat, props.eventCoordinates?.lng])

  const hasMiniMapPoints = miniMapPoints.length > 0

  const openMap = React.useCallback(() => {
    if (!hasMiniMapPoints) return
    setShowMapModal(true)
  }, [hasMiniMapPoints])

  const displayLocation = React.useMemo(() => {
    return formatEventLocationForDisplay({ raw: props.locationValue, locationData: props.eventLocationData })
  }, [props.eventLocationData, props.locationValue])

  return (
    <div className="bg-surface border border-slate-700 rounded-2xl p-5">
      <h2 className="text-lg font-bold text-white mb-3">Location</h2>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-800 rounded-lg shrink-0">
          <MapPin className="w-5 h-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          {hasItinerary ? (
            itineraryLocationList.length > 0 ? (
              <ol className="space-y-2">
                {itineraryLocationList.map((raw, idx) => {
                  const { primary, secondary } = props.formatRawLocationForDisplay(raw)
                  const loc = props.formatItineraryLocationForDisplay(raw)

                  return (
                    <li key={`${idx}-${raw}`} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => props.onOpenItineraryLocationInMaps(loc.full)}
                        className="w-full text-left min-w-0 group"
                        aria-label="Open location in maps"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="text-xs font-bold text-slate-500 mt-[2px] shrink-0">{idx + 1}</div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate group-hover:underline decoration-slate-600 decoration-dashed">
                              {primary}
                            </div>
                            {secondary ? <div className="text-sm text-slate-400 truncate">{secondary}</div> : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <div className="text-sm text-slate-500 italic">No itinerary locations yet.</div>
            )
          ) : props.isEditMode ? (
            <LocationAutocomplete
              value={props.locationValue}
              onChangeText={(text) => props.onChangeLocationText?.(text)}
              onSelect={(selection) => props.onSelectLocation?.(selection)}
              placeholder="Location"
              required
              className={`w-full bg-slate-900 border rounded-lg py-2 px-3 text-white outline-none ${
                props.locationError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
              }`}
            />
          ) : displayLocation.secondary ? (
            <div className="min-w-0">
              <div className="font-bold text-white truncate">{displayLocation.primary}</div>
              <div className="text-sm text-slate-400 truncate">{displayLocation.secondary}</div>
            </div>
          ) : (
            <div className="font-bold text-white">{displayLocation.primary}</div>
          )}

          {!hasItinerary ? (
            <>
              {props.isEditMode && props.locationError ? (
                <div className="text-xs text-red-400 mt-1">{props.locationError}</div>
              ) : null}
              {hasMiniMapPoints ? (
                <button
                  className="text-sm text-slate-500 underline decoration-slate-600 decoration-dashed hover:text-slate-300 transition-colors"
                  type="button"
                  onClick={openMap}
                >
                  Open map
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <LeafletMiniMapPreview
        points={miniMapPoints}
        themeHex={themeHex}
        hasItinerary={hasItinerary}
        itineraryGeoLoading={itineraryGeoLoading}
        onOpen={openMap}
      />

      {showMapModal ? (
        <FullScreenMapModal
          points={miniMapPoints}
          themeHex={themeHex}
          title={props.title || 'Map'}
          onClose={() => setShowMapModal(false)}
      />
      ) : null}
    </div>
  )
}


