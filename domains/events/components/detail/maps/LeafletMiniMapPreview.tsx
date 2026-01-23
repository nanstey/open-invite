import * as React from 'react'

type LatLng = [number, number]

export function LeafletMiniMapPreview(props: {
  points: LatLng[]
  themeHex: string
  hasItinerary: boolean
  itineraryGeoLoading: boolean
  onOpen: () => void
}) {
  const { points, themeHex, hasItinerary, itineraryGeoLoading, onOpen } = props

  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapInstanceRef = React.useRef<any>(null)
  const markerRef = React.useRef<any>(null)
  const markerLayerRef = React.useRef<any>(null)
  const polylineRef = React.useRef<any>(null)

  const hasPoints = points.length > 0

  const destroyMap = React.useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
    markerRef.current = null
    markerLayerRef.current = null
    polylineRef.current = null

    const el = containerRef.current as any
    if (el) {
      try {
        delete el._leaflet_id
      } catch {
        // ignore
      }
      if (typeof el.innerHTML === 'string') el.innerHTML = ''
    }
  }, [])

  React.useEffect(() => {
    if (!containerRef.current) return

    const L = (window as any)?.L
    if (!L) return

    if (!hasPoints) {
      destroyMap()
      return
    }

    const [lat0, lng0] = points[0]!

    if (!mapInstanceRef.current) {
      const el = containerRef.current as any
      if (el) {
        try {
          delete el._leaflet_id
        } catch {
          // ignore
        }
        if (typeof el.innerHTML === 'string') el.innerHTML = ''
      }

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        touchZoom: false,
      }).setView([lat0, lng0], 13)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        opacity: 0.95,
      }).addTo(map)

      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current

    // Clear old layers
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    if (markerLayerRef.current) {
      markerLayerRef.current.remove()
      markerLayerRef.current = null
    }
    if (polylineRef.current) {
      polylineRef.current.remove()
      polylineRef.current = null
    }

    if (points.length === 1) {
      const [lat, lng] = points[0]!
      map.setView([lat, lng], 15)
      const icon = L.divIcon({
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        html: `
          <div style="
            width:26px;height:26px;border-radius:9999px;
            background:${themeHex};
            border:2px solid #ffffff;
            box-shadow: 0 6px 18px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;
            font-weight:800;font-size:12px;line-height:1;
            color:#0b1020;
          ">1</div>
        `,
      })
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map)
    } else {
      const layer = L.featureGroup()
      for (let i = 0; i < points.length; i++) {
        const [lat, lng] = points[i]!
        const icon = L.divIcon({
          className: '',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          html: `
            <div style="
              width:26px;height:26px;border-radius:9999px;
              background:${themeHex};
              border:2px solid #ffffff;
              box-shadow: 0 6px 18px rgba(0,0,0,0.35);
              display:flex;align-items:center;justify-content:center;
              font-weight:800;font-size:12px;line-height:1;
              color:#0b1020;
            ">${i + 1}</div>
          `,
        })
        L.marker([lat, lng], { icon }).addTo(layer)
      }
      layer.addTo(map)
      markerLayerRef.current = layer

      polylineRef.current = L.polyline(points, {
        color: themeHex,
        weight: 3,
        opacity: 0.55,
      }).addTo(map)

      const bounds = layer.getBounds?.()
      if (bounds && bounds.isValid?.()) {
        try {
          map.fitBounds(bounds, { padding: [18, 18], maxZoom: 15, animate: false })
        } catch {
          // ignore
        }
      }
    }

    if (map?.invalidateSize) {
      requestAnimationFrame(() => {
        try {
          map.invalidateSize(true)
        } catch {
          // ignore
        }
      })
    }
  }, [destroyMap, hasPoints, points, themeHex])

  React.useEffect(() => {
    return () => destroyMap()
  }, [destroyMap])

  return (
    <div className="mt-4 relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
      <div ref={containerRef} className="w-full h-44 md:h-56" />

      {!hasPoints ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-4">
            <div className="text-sm font-semibold text-slate-300">
              {hasItinerary ? 'Add itinerary locations to preview the map' : 'Pick a place to preview the map'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {hasItinerary
                ? itineraryGeoLoading
                  ? 'Finding places…'
                  : 'Set a location on each itinerary item.'
                : 'Type a location, then select a suggestion.'}
            </div>
          </div>
        </div>
      ) : null}

      {hasPoints ? (
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label="Open map"
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpen()
            }
          }}
        />
      ) : null}

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      {hasPoints ? (
        <div className="absolute bottom-3 right-3 pointer-events-auto z-20">
          <button
            onClick={onOpen}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-700 text-white hover:bg-slate-800 transition-colors"
            type="button"
          >
            Open map
          </button>
        </div>
      ) : null}
    </div>
  )
}


