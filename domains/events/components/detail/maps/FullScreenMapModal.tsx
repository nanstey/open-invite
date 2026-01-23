import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react'

import { buildGoogleMapsLatLngUrl } from './maps'
import { photonReverseOne } from '../../../../../lib/ui/utils/photon'

type LatLng = [number, number]

type FullScreenMapModalProps = {
  points: LatLng[]
  themeHex: string
  title?: string
  onClose: () => void
}

export const FullScreenMapModal: React.FC<FullScreenMapModalProps> = ({
  points,
  themeHex,
  title = 'Map',
  onClose,
}) => {
  const leafletLoaded = typeof window !== 'undefined' && !!(window as any)?.L
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const selectedMarkerIdxRef = useRef<number | null>(null)
  const markerLayerRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)

  const [selectedPoint, setSelectedPoint] = useState<{ idx: number; lat: number; lng: number } | null>(null)
  const [selectedInfo, setSelectedInfo] = useState<{ title?: string; subtitle?: string } | null>(null)
  const [selectedInfoLoading, setSelectedInfoLoading] = useState(false)
  const reverseCacheRef = useRef<Map<string, { title?: string; subtitle?: string }>>(new Map())

  const hasPoints = points.length > 0
  const firstPoint = points[0] ?? null

  const navigateToStop = useCallback(
    (idx: number) => {
      const next = points[idx]
      if (!next) return
      const [lat, lng] = next
      setSelectedPoint({ idx, lat, lng })
      const map = mapInstanceRef.current
      if (map?.panTo) {
        try {
          map.panTo([lat, lng], { animate: true })
        } catch {
          // ignore
        }
      }
    },
    [points],
  )

  const formatCoord = useCallback((n: number) => {
    if (!Number.isFinite(n)) return String(n)
    return n.toFixed(5)
  }, [])

  const markerIconHtml = useMemo(() => {
    const safeHex = String(themeHex || '#22c55e')
    return (label: string, selected: boolean) => {
      const size = selected ? 34 : 30
      const border = selected ? 3 : 2
      const shadow = selected ? '0 14px 30px rgba(0,0,0,0.55)' : '0 10px 24px rgba(0,0,0,0.40)'
      const outline = selected ? `0 0 0 3px rgba(255,255,255,0.18), 0 0 0 6px ${safeHex}55` : 'none'
      return `
      <div style="
        width:${size}px;height:${size}px;border-radius:9999px;
        background:${safeHex};
        border:${border}px solid #ffffff;
        box-shadow: ${shadow};
        outline: ${outline};
        display:flex;align-items:center;justify-content:center;
        font-weight:900;font-size:12px;line-height:1;
        color:#0b1020;
      ">${label}</div>
    `
    }
  }, [themeHex])

  const destroyMap = React.useCallback(() => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove()
      } catch {
        // ignore
      }
      mapInstanceRef.current = null
    }
    markerLayerRef.current = null
    polylineRef.current = null
    markersRef.current = []
    selectedMarkerIdxRef.current = null

    const el = mapContainerRef.current as any
    if (el) {
      try {
        delete el._leaflet_id
      } catch {
        // ignore
      }
      if (typeof el.innerHTML === 'string') el.innerHTML = ''
    }
  }, [])

  const setMarkerSelectedState = useCallback((idx: number, selected: boolean) => {
    if (typeof window === 'undefined') return
    const L = (window as any)?.L
    if (!L) return
    const marker = markersRef.current[idx]
    if (!marker) return
    const icon = L.divIcon({
      className: '',
      iconSize: selected ? [34, 34] : [30, 30],
      iconAnchor: selected ? [17, 17] : [15, 15],
      html: markerIconHtml(String(idx + 1), selected),
    })
    try {
      marker.setIcon(icon)
    } catch {
      // ignore
    }
  }, [markerIconHtml])

  useEffect(() => {
    // Maintain a single highlighted marker that tracks selectedPoint.
    const prevIdx = selectedMarkerIdxRef.current
    const nextIdx = selectedPoint?.idx ?? null

    if (typeof prevIdx === 'number' && prevIdx !== nextIdx) {
      setMarkerSelectedState(prevIdx, false)
    }
    if (typeof nextIdx === 'number') {
      setMarkerSelectedState(nextIdx, true)
    }

    selectedMarkerIdxRef.current = nextIdx
  }, [selectedPoint?.idx, setMarkerSelectedState])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!selectedPoint) {
      setSelectedInfo(null)
      setSelectedInfoLoading(false)
      return
    }

    const key = `${selectedPoint.lat},${selectedPoint.lng}`
    const cached = reverseCacheRef.current.get(key)
    if (cached) {
      setSelectedInfo(cached)
      setSelectedInfoLoading(false)
      return
    }

    const controller = new AbortController()
    setSelectedInfoLoading(true)
    setSelectedInfo(null)

    ;(async () => {
      try {
        const info = (await photonReverseOne(selectedPoint.lat, selectedPoint.lng, { signal: controller.signal })) ?? {
          title: undefined,
          subtitle: undefined,
        }
        reverseCacheRef.current.set(key, info)
        setSelectedInfo(info)
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        const fallback = { title: undefined, subtitle: undefined }
        reverseCacheRef.current.set(key, fallback)
        setSelectedInfo(fallback)
      } finally {
        setSelectedInfoLoading(false)
      }
    })()

    return () => {
      controller.abort()
    }
  }, [selectedPoint])

  useEffect(() => {
    if (!mapContainerRef.current) return
    if (typeof window === 'undefined') return
    const L = (window as any)?.L
    if (!L) return

    if (!hasPoints || !firstPoint) {
      destroyMap()
      return
    }

    if (!mapInstanceRef.current) {
      const el = mapContainerRef.current as any
      if (el) {
        try {
          delete el._leaflet_id
        } catch {
          // ignore
        }
        if (typeof el.innerHTML === 'string') el.innerHTML = ''
      }

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        tap: true,
        touchZoom: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        opacity: 0.95,
      }).addTo(map)

      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current

    if (markerLayerRef.current) {
      try {
        markerLayerRef.current.remove()
      } catch {
        // ignore
      }
      markerLayerRef.current = null
    }
    if (polylineRef.current) {
      try {
        polylineRef.current.remove()
      } catch {
        // ignore
      }
      polylineRef.current = null
    }
    markersRef.current = []
    selectedMarkerIdxRef.current = null

    const layer = L.featureGroup()
    for (let i = 0; i < points.length; i++) {
      const [lat, lng] = points[i]!
      const icon = L.divIcon({
        className: '',
        iconSize: selectedPoint?.idx === i ? [34, 34] : [30, 30],
        iconAnchor: selectedPoint?.idx === i ? [17, 17] : [15, 15],
        html: markerIconHtml(String(i + 1), selectedPoint?.idx === i),
      })
      const marker = L.marker([lat, lng], { icon }).addTo(layer)
      markersRef.current[i] = marker
      marker.on('click', () => {
        setSelectedPoint({ idx: i, lat, lng })
        try {
          map.panTo([lat, lng], { animate: true })
        } catch {
          // ignore
        }
      })
    }
    layer.addTo(map)
    markerLayerRef.current = layer

    if (points.length > 1) {
      polylineRef.current = L.polyline(points, {
        color: themeHex,
        weight: 4,
        opacity: 0.65,
      }).addTo(map)
    }

    const bounds = layer.getBounds?.()
    if (bounds && bounds.isValid?.()) {
      try {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16, animate: false })
      } catch {
        // ignore
      }
    } else {
      const [lat, lng] = firstPoint
      map.setView([lat, lng], 15)
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

    return () => {
      // keep instance while open; destroyed on close/unmount
    }
  }, [destroyMap, firstPoint, hasPoints, markerIconHtml, points, selectedPoint?.idx, themeHex])

  useEffect(() => {
    return () => {
      destroyMap()
    }
  }, [destroyMap])

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-stretch justify-stretch" role="dialog" aria-modal="true">
      <div className="bg-surface w-full h-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/60 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{title}</h2>
            {!hasPoints ? <div className="text-xs text-slate-500">No location coordinates available.</div> : null}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" type="button" aria-label="Close map">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="absolute inset-0" />
          {!leafletLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="text-sm text-slate-300 bg-slate-900/60 border border-slate-700 rounded-2xl px-4 py-3">
                Map library is not loaded.
              </div>
            </div>
          ) : null}

          {selectedPoint ? (
            <div className="absolute left-0 right-0 bottom-0 p-4 sm:p-6 pointer-events-none z-[2000]">
              {/* Add a subtle dark gradient behind the card so it stays readable over bright tiles */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
              <div className="relative max-w-2xl mx-auto pointer-events-auto bg-slate-950/95 backdrop-blur border border-slate-600/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
                {points.length > 1 && selectedPoint.idx > 0 ? (
                  <button
                    type="button"
                    onClick={() => navigateToStop(selectedPoint.idx - 1)}
                    className="w-full flex items-center justify-center py-2 bg-slate-900/40 hover:bg-slate-900/60 transition-colors border-b border-slate-700/60"
                    aria-label="Previous stop"
                  >
                    <ChevronUp className="w-5 h-5 text-white" />
                  </button>
                ) : null}

                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Stop {selectedPoint.idx + 1}</div>
                    <div className="text-base font-bold text-white truncate">
                      {selectedInfoLoading ? 'Loading location…' : selectedInfo?.title || 'Pinned location'}
                    </div>
                    <div className="text-sm text-slate-400 truncate">
                      {selectedInfoLoading
                        ? `${formatCoord(selectedPoint.lat)}, ${formatCoord(selectedPoint.lng)}`
                        : selectedInfo?.subtitle || `${formatCoord(selectedPoint.lat)}, ${formatCoord(selectedPoint.lng)}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPoint(null)}
                    className="shrink-0 text-slate-400 hover:text-white transition-colors"
                    aria-label="Close location info"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-4 pb-4 flex items-center justify-between gap-3">
                  <a
                    href={buildGoogleMapsLatLngUrl(selectedPoint.lat, selectedPoint.lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors text-sm font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Google Maps
                  </a>
                </div>

                {points.length > 1 && selectedPoint.idx < points.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => navigateToStop(selectedPoint.idx + 1)}
                    className="w-full flex items-center justify-center py-2 bg-slate-900/40 hover:bg-slate-900/60 transition-colors border-t border-slate-700/60"
                    aria-label="Next stop"
                  >
                    <ChevronDown className="w-5 h-5 text-white" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}


