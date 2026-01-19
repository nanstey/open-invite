export type PexelsImage = {
  id: string
  title: string
  thumbnailUrl: string
  fullUrl: string
  sourceUrl?: string
  creator?: string
  license?: string
}

type PexelsPhoto = {
  id: number
  url: string
  photographer: string
  src: {
    original: string
    large2x?: string
    large?: string
    landscape?: string
    medium?: string
    small?: string
    tiny?: string
  }
}

type PexelsSearchResponse = {
  photos?: PexelsPhoto[]
}

function getPexelsApiKey(): string {
  // Vite exposes env vars via import.meta.env.*
  const key = (import.meta as any).env?.VITE_PEXELS_API as string | undefined
  return (key ?? '').trim()
}

export async function searchPexelsImages(query: string, opts?: { pageSize?: number }): Promise<PexelsImage[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const apiKey = getPexelsApiKey()
  if (!apiKey) {
    throw new Error('Missing Pexels API key: set VITE_PEXELS_API')
  }

  const pageSize = Math.max(1, Math.min(opts?.pageSize ?? 20, 80))
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', trimmed)
  url.searchParams.set('per_page', String(pageSize))
  // best for hero-ish covers
  url.searchParams.set('orientation', 'landscape')

  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: apiKey,
      accept: 'application/json',
    },
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Pexels request failed: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`)
  }

  const json = (await resp.json()) as PexelsSearchResponse
  const photos = json.photos ?? []

  return photos
    .map((p): PexelsImage | null => {
      const id = String(p.id ?? '')
      const thumbnailUrl = p.src?.medium || p.src?.small || p.src?.tiny || ''
      const fullUrl = p.src?.landscape || p.src?.large2x || p.src?.large || p.src?.original || ''
      if (!id || !thumbnailUrl || !fullUrl) return null
      return {
        id,
        title: `Photo by ${p.photographer || 'Unknown'}`,
        thumbnailUrl,
        fullUrl,
        sourceUrl: p.url || undefined,
        creator: p.photographer || undefined,
        license: 'Pexels',
      }
    })
    .filter((x): x is PexelsImage => !!x)
}


