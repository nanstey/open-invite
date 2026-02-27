import { beforeEach, describe, expect, it, vi } from 'vitest'

import { searchOpenverseImages } from './openverseService'

type MockApiImage = {
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

type MockApiResponse = {
  page_count?: number
  results?: MockApiImage[]
}

const makeImage = (id: string, overrides: Partial<MockApiImage> = {}): MockApiImage => ({
  id,
  title: `Title ${id}`,
  url: `https://img.example.com/${id}.jpg`,
  thumbnail: `https://img.example.com/${id}-thumb.jpg`,
  ...overrides,
})

const mockJsonResponse = (payload: MockApiResponse, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  statusText: ok ? 'OK' : 'Server Error',
  json: vi.fn().mockResolvedValue(payload),
  text: vi.fn().mockResolvedValue(''),
})

describe('searchOpenverseImages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  describe('input/options behavior', () => {
    it('returns [] for blank query', async () => {
      const result = await searchOpenverseImages('   ')

      expect(result).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('clamps pageSize to max 20 and maxPages to valid range', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockJsonResponse({
          page_count: 10,
          results: [makeImage('1')],
        }) as unknown as Response
      )

      const result = await searchOpenverseImages('flowers', { pageSize: 100, maxPages: 0 })

      expect(result).toHaveLength(1)
      expect(fetch).toHaveBeenCalledTimes(1)
      const firstUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
      expect(firstUrl.searchParams.get('page')).toBe('1')
      expect(firstUrl.searchParams.get('page_size')).toBe('20')
    })
  })

  describe('mapping/filtering', () => {
    it('filters Flickr entries, drops invalid items, and maps valid fields with fallbacks', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockJsonResponse({
          page_count: 1,
          results: [
            makeImage('flickr-source', { source: 'flickr' }),
            makeImage('flickr-provider', { source: undefined, provider: 'Flickr' }),
            makeImage('no-id', { id: undefined }),
            makeImage('no-url', { url: undefined }),
            makeImage('no-thumbnail', { thumbnail: undefined }),
            makeImage('fallback-title', {
              title: '',
              foreign_landing_url: 'https://source.example.com/landing',
              creator: 'Alice',
              license: 'cc-by',
            }),
            makeImage('optional-missing', {
              title: 'Given title',
              foreign_landing_url: undefined,
              creator: undefined,
              license: undefined,
            }),
          ],
        }) as unknown as Response
      )

      const result = await searchOpenverseImages('nature', { pageSize: 10 })

      expect(result).toEqual([
        {
          id: 'fallback-title',
          title: 'Untitled',
          fullUrl: 'https://img.example.com/fallback-title.jpg',
          thumbnailUrl: 'https://img.example.com/fallback-title-thumb.jpg',
          sourceUrl: 'https://source.example.com/landing',
          creator: 'Alice',
          license: 'cc-by',
        },
        {
          id: 'optional-missing',
          title: 'Given title',
          fullUrl: 'https://img.example.com/optional-missing.jpg',
          thumbnailUrl: 'https://img.example.com/optional-missing-thumb.jpg',
          sourceUrl: undefined,
          creator: undefined,
          license: undefined,
        },
      ])
    })
  })

  describe('paging logic', () => {
    it('fetches page 1 first and continues only until enough non-Flickr images are collected', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockJsonResponse({
            page_count: 5,
            results: [makeImage('p1-flickr-1', { source: 'flickr' }), makeImage('p1-valid-1')],
          }) as unknown as Response
        )
        .mockResolvedValueOnce(
          mockJsonResponse({
            page_count: 5,
            results: [
              makeImage('p2-flickr-1', { provider: 'flickr' }),
              makeImage('p2-valid-1'),
              makeImage('p2-valid-2'),
            ],
          }) as unknown as Response
        )
        .mockResolvedValueOnce(
          mockJsonResponse({
            page_count: 5,
            results: [makeImage('p3-valid-1')],
          }) as unknown as Response
        )

      const result = await searchOpenverseImages('sunset', { pageSize: 3, maxPages: 5 })

      expect(result).toHaveLength(3)
      expect(result.map(x => x.id)).toEqual(['p1-valid-1', 'p2-valid-1', 'p2-valid-2'])
      expect(fetch).toHaveBeenCalledTimes(2)

      const firstUrl = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
      const secondUrl = new URL(vi.mocked(fetch).mock.calls[1][0] as string)
      expect(firstUrl.searchParams.get('page')).toBe('1')
      expect(secondUrl.searchParams.get('page')).toBe('2')
    })

    it('stops at page/maxPages cap and returns exactly desiredCount when enough are available', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockJsonResponse({
            page_count: 2,
            results: [makeImage('a1'), makeImage('a2')],
          }) as unknown as Response
        )
        .mockResolvedValueOnce(
          mockJsonResponse({
            page_count: 2,
            results: [makeImage('b1'), makeImage('b2'), makeImage('b3')],
          }) as unknown as Response
        )

      const result = await searchOpenverseImages('ocean', { pageSize: 4, maxPages: 20 })

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(4)
      expect(result.map(x => x.id)).toEqual(['a1', 'a2', 'b1', 'b2'])
    })
  })

  describe('error handling', () => {
    it('throws with status/statusText when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: vi.fn().mockResolvedValue(''),
      } as unknown as Response)

      await expect(searchOpenverseImages('clouds')).rejects.toThrow(
        'Openverse request failed: 503 Service Unavailable'
      )
    })

    it('includes response text in thrown error when available', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: vi.fn().mockResolvedValue('Rate limit exceeded'),
      } as unknown as Response)

      await expect(searchOpenverseImages('city')).rejects.toThrow(
        'Openverse request failed: 429 Too Many Requests - Rate limit exceeded'
      )
    })
  })
})
