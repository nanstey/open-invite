export type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: Record<string, unknown>
}

type PhotonSearchResponse = { features?: PhotonFeature[] }

export async function photonSearch(
  query: string,
  opts?: { limit?: number; signal?: AbortSignal },
): Promise<PhotonFeature[]> {
  const q = String(query ?? '').trim()
  if (!q) return []

  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', String(opts?.limit ?? 6))

  const resp = await fetch(url.toString(), { signal: opts?.signal })
  if (!resp.ok) throw new Error(`Photon error: ${resp.status}`)
  const json = (await resp.json()) as PhotonSearchResponse
  return json.features ?? []
}

export async function photonGeocodeOne(
  query: string,
  opts?: { signal?: AbortSignal },
): Promise<{ lat: number; lng: number } | null> {
  const features = await photonSearch(query, { limit: 1, signal: opts?.signal })
  const coords = features?.[0]?.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const [lng, lat] = coords
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return { lat, lng }
}

export async function photonReverseOne(
  lat: number,
  lng: number,
  opts?: { signal?: AbortSignal },
): Promise<{ title?: string; subtitle?: string } | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const url = new URL('https://photon.komoot.io/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('limit', '1')

  const resp = await fetch(url.toString(), { signal: opts?.signal })
  if (!resp.ok) throw new Error('Reverse geocode failed')

  const json = (await resp.json()) as any
  const props = json?.features?.[0]?.properties ?? null

  const title =
    String(props?.name ?? props?.street ?? props?.housenumber ?? props?.city ?? props?.locality ?? '').trim() || undefined

  const subtitleParts = [
    props?.housenumber && props?.street ? `${props.housenumber} ${props.street}` : props?.street,
    props?.city,
    props?.state,
    props?.postcode,
    props?.country,
  ]
    .map((p: any) => String(p ?? '').trim())
    .filter(Boolean)

  const subtitle = subtitleParts.length ? subtitleParts.join(', ') : undefined
  return { title, subtitle }
}


