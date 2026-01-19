export type OpenverseImage = {
  id: string
  title: string
  thumbnailUrl: string
  fullUrl: string
  sourceUrl?: string
  creator?: string
  license?: string
}

type OpenverseApiImage = {
  id?: string
  title?: string
  url?: string
  thumbnail?: string
  foreign_landing_url?: string
  source?: string
  provider?: string
  creator?: string
  license?: string
}

type OpenverseApiResponse = {
  result_count?: number
  page_count?: number
  page_size?: number
  page?: number
  results?: OpenverseApiImage[]
}

export async function searchOpenverseImages(
  query: string,
  opts?: { pageSize?: number; maxPages?: number },
): Promise<OpenverseImage[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  // Openverse enforces `page_size <= 20` for anonymous requests.
  const desiredCount = Math.max(1, Math.min(opts?.pageSize ?? 20, 20))
  const maxPages = Math.max(1, Math.min(opts?.maxPages ?? 5, 20))

  const mapImages = (results: OpenverseApiImage[]): OpenverseImage[] => {
    return results
      .filter((r) => {
        const source = (r.source ?? r.provider ?? '').toString().toLowerCase()
        return source !== 'flickr'
      })
      .map((r): OpenverseImage | null => {
        const id = r.id?.toString() ?? ''
        const fullUrl = r.url ?? ''
        const thumbnailUrl = r.thumbnail ?? ''
        if (!id || !fullUrl || !thumbnailUrl) return null
        return {
          id,
          title: r.title?.toString() || 'Untitled',
          fullUrl,
          thumbnailUrl,
          sourceUrl: r.foreign_landing_url ?? undefined,
          creator: r.creator ?? undefined,
          license: r.license ?? undefined,
        }
      })
      .filter((x): x is OpenverseImage => !!x)
  }

  const fetchPage = async (page: number): Promise<OpenverseApiResponse> => {
    const url = new URL('https://api.openverse.org/v1/images/')
    url.searchParams.set('q', trimmed)
    url.searchParams.set('page_size', String(20))
    url.searchParams.set('page', String(page))

    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`Openverse request failed: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`)
    }

    return (await resp.json()) as OpenverseApiResponse
  }

  const collected: OpenverseImage[] = []

  const first = await fetchPage(1)
  const pageCount = Math.max(1, Number(first.page_count ?? 1))
  collected.push(...mapImages(first.results ?? []))

  // If the first page is all Flickr, keep paging (up to maxPages) until we have enough non-Flickr.
  const cap = Math.min(pageCount, maxPages)
  for (let page = 2; collected.length < desiredCount && page <= cap; page++) {
    const next = await fetchPage(page)
    collected.push(...mapImages(next.results ?? []))
  }

  return collected.slice(0, desiredCount)
}


