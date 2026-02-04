import * as React from 'react'

import { searchPexelsImages, type PexelsImage } from '../../../services/pexelsService'

export function useHeaderImageSearch(defaultQuery: string) {
  const initialQuery = React.useMemo(() => defaultQuery?.trim() || '', [defaultQuery])
  const [query, setQuery] = React.useState(initialQuery)
  const [results, setResults] = React.useState<PexelsImage[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const runSearch = React.useCallback(async (nextQuery: string) => {
    const q = nextQuery.trim()
    if (!q) {
      setResults([])
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const imgs = await searchPexelsImages(q, { pageSize: 20 })
      setResults(imgs)
    } catch (e: any) {
      setResults([])
      setError(e?.message || 'Search failed.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (initialQuery) {
      runSearch(initialQuery)
    }
  }, [initialQuery, runSearch])

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      runSearch(query)
    }, 500)

    return () => {
      window.clearTimeout(handle)
    }
  }, [query, runSearch])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    runSearch,
  }
}
