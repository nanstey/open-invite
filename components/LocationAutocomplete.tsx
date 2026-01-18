import * as React from 'react'
import type { LocationData } from '../lib/types'

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_id?: number
    osm_type?: string
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
    postcode?: string
  }
}

export type LocationSuggestion = {
  label: string
  lat: number
  lng: number
  locationData: LocationData
}

export type LocationAutocompleteProps = {
  value: string
  onChangeText: (text: string) => void
  onSelect: (selection: LocationSuggestion) => void
  placeholder?: string
  required?: boolean
  className?: string
  disabled?: boolean
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function buildLabel(p: PhotonFeature['properties'] | undefined): string {
  if (!p) return ''
  const name = p.name?.trim()
  const street = p.street?.trim()
  const housenumber = p.housenumber?.trim()
  const city = p.city?.trim()
  const state = p.state?.trim()
  const postcode = p.postcode?.trim()
  const country = p.country?.trim()

  const streetLine = [housenumber, street].filter(Boolean).join(' ').trim()
  const localityLine = [city, state].filter(Boolean).join(', ').trim()

  const parts = [name, streetLine, localityLine, postcode, country].filter(Boolean)
  return parts.join(', ')
}

function toSuggestion(f: PhotonFeature): LocationSuggestion | null {
  const coords = f.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const [lng, lat] = coords
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  const full = buildLabel(f.properties) || 'Selected location'
  const placeName = f.properties?.name?.trim() || undefined
  const addressLine = [f.properties?.housenumber?.trim(), f.properties?.street?.trim()].filter(Boolean).join(' ').trim() || undefined
  const localityLine = [f.properties?.city?.trim(), f.properties?.state?.trim()].filter(Boolean).join(', ').trim() || undefined
  const postcode = f.properties?.postcode?.trim() || undefined
  const country = f.properties?.country?.trim() || undefined

  const locationData: LocationData = {
    provider: 'photon',
    providerId: {
      osm_id: typeof f.properties?.osm_id === 'number' ? f.properties.osm_id : undefined,
      osm_type: f.properties?.osm_type,
    },
    display: {
      full,
      placeName,
      addressLine,
      localityLine,
      postcode,
      country,
    },
    geo: { lat, lng },
    raw: f as unknown as Record<string, unknown>,
  }

  return { label: full, lat, lng, locationData }
}

export function LocationAutocomplete(props: LocationAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<LocationSuggestion[]>([])
  const [highlighted, setHighlighted] = React.useState(0)
  const [focused, setFocused] = React.useState(false)

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  const query = String(props.value ?? '')

  React.useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = null

    const q = query.trim()
    if (props.disabled) {
      setLoading(false)
      setResults([])
      setOpen(false)
      return
    }

    if (q.length < 3) {
      setLoading(false)
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    const t = window.setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const url = new URL('https://photon.komoot.io/api/')
        url.searchParams.set('q', q)
        url.searchParams.set('limit', '6')

        const resp = await fetch(url.toString(), { signal: controller.signal })
        if (!resp.ok) throw new Error(`Photon error: ${resp.status}`)
        const json = (await resp.json()) as { features?: PhotonFeature[] }

        const next = (json.features ?? [])
          .map(toSuggestion)
          .filter((v): v is LocationSuggestion => !!v)

        setResults(next)
        setHighlighted(0)
        setOpen(focused && next.length > 0)
      } catch (e) {
        if ((e as any)?.name === 'AbortError') return
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(t)
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [query, props.disabled, focused])

  React.useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const root = rootRef.current
      if (!root) return
      if (!root.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const selectAt = React.useCallback(
    (idx: number) => {
      const item = results[idx]
      if (!item) return
      props.onSelect(item)
      setOpen(false)
    },
    [props, results],
  )

  return (
    <div ref={rootRef} className="relative w-full">
      <input
        value={query}
        onChange={(e) => props.onChangeText(e.target.value)}
        onFocus={() => {
          setFocused(true)
          if (results.length > 0) setOpen(true)
        }}
        onBlur={() => {
          setFocused(false)
          setOpen(false)
        }}
        onKeyDown={(e) => {
          if (!open) return
          if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
            return
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlighted((h) => Math.min(results.length - 1, h + 1))
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlighted((h) => Math.max(0, h - 1))
            return
          }
          if (e.key === 'Enter') {
            e.preventDefault()
            selectAt(highlighted)
          }
        }}
        placeholder={props.placeholder}
        required={props.required}
        disabled={props.disabled}
        autoComplete="off"
        className={cx(props.className)}
      />

      {open ? (
        <div className="absolute z-[1000] mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
            {results.map((r, idx) => (
              <button
                key={`${r.lat},${r.lng},${idx}`}
                type="button"
                onMouseDown={(e) => {
                  // Prevent input blur before we select.
                  e.preventDefault()
                  selectAt(idx)
                }}
                className={cx(
                  'w-full text-left px-3 py-2 text-sm',
                  idx === highlighted ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-800/70',
                )}
              >
                <div className="truncate">{r.label}</div>
              </button>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-slate-800 text-[11px] text-slate-500">
            {loading ? 'Searching…' : 'Powered by OpenStreetMap (Photon)'}
          </div>
        </div>
      ) : null}
    </div>
  )
}


