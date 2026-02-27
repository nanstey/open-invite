import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn<typeof fetch>()

async function loadSearchPexelsImages() {
  const mod = await import('./pexelsService')
  return mod.searchPexelsImages
}

async function callSearch(query: string, opts?: { pageSize?: number }) {
  const searchPexelsImages = await loadSearchPexelsImages()
  return searchPexelsImages(query, opts)
}

describe('pexelsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_PEXELS_API', 'test-pexels-key')
  })

  describe('preconditions', () => {
    it('returns [] for blank query', async () => {
      const result = await callSearch('   ')

      expect(result).toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws clear error when API key is missing/blank', async () => {
      vi.stubEnv('VITE_PEXELS_API', '  ')

      await expect(callSearch('mountain')).rejects.toThrow(
        'Missing Pexels API key: set VITE_PEXELS_API'
      )
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('request construction', () => {
    it('clamps pageSize to 1..80 and builds request correctly', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ photos: [] }),
      } as Response)

      await callSearch('beach', { pageSize: 999 })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [firstUrl, firstInit] = fetchMock.mock.calls[0]
      const parsed = new URL(String(firstUrl))
      expect(parsed.origin + parsed.pathname).toBe('https://api.pexels.com/v1/search')
      expect(parsed.searchParams.get('query')).toBe('beach')
      expect(parsed.searchParams.get('per_page')).toBe('80')
      expect(parsed.searchParams.get('orientation')).toBe('landscape')
      expect((firstInit as RequestInit | undefined)?.headers).toMatchObject({
        Authorization: 'test-pexels-key',
      })

      fetchMock.mockClear()
      await callSearch('beach', { pageSize: 0 })
      const [secondUrl] = fetchMock.mock.calls[0]
      const secondParsed = new URL(String(secondUrl))
      expect(secondParsed.searchParams.get('per_page')).toBe('1')
    })
  })

  describe('response handling', () => {
    it('throws on non-OK response with status details and optional body text', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'invalid key',
      } as Response)

      await expect(callSearch('desert')).rejects.toThrow(
        'Pexels request failed: 401 Unauthorized - invalid key'
      )

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '',
      } as Response)

      await expect(callSearch('desert')).rejects.toThrow(
        'Pexels request failed: 500 Internal Server Error'
      )
    })

    it('maps valid photos with fallback priority and drops invalid records', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          photos: [
            {
              id: 11,
              url: 'https://pexels.com/photo/11',
              photographer: 'Jane Lens',
              src: {
                medium: 'https://img/11-medium.jpg',
                small: 'https://img/11-small.jpg',
                landscape: 'https://img/11-landscape.jpg',
                large2x: 'https://img/11-large2x.jpg',
                original: 'https://img/11-original.jpg',
              },
            },
            {
              id: 12,
              url: 'https://pexels.com/photo/12',
              photographer: '',
              src: {
                small: 'https://img/12-small.jpg',
                large2x: 'https://img/12-large2x.jpg',
                original: 'https://img/12-original.jpg',
              },
            },
            {
              id: 13,
              url: 'https://pexels.com/photo/13',
              photographer: 'NoThumb',
              src: {
                landscape: 'https://img/13-landscape.jpg',
                original: 'https://img/13-original.jpg',
              },
            },
            {
              id: 14,
              url: 'https://pexels.com/photo/14',
              photographer: 'NoFull',
              src: {
                medium: 'https://img/14-medium.jpg',
              },
            },
          ],
        }),
      } as Response)

      const images = await callSearch('forest')

      expect(images).toEqual([
        {
          id: '11',
          title: 'Photo by Jane Lens',
          thumbnailUrl: 'https://img/11-medium.jpg',
          fullUrl: 'https://img/11-landscape.jpg',
          sourceUrl: 'https://pexels.com/photo/11',
          creator: 'Jane Lens',
          license: 'Pexels',
        },
        {
          id: '12',
          title: 'Photo by Unknown',
          thumbnailUrl: 'https://img/12-small.jpg',
          fullUrl: 'https://img/12-large2x.jpg',
          sourceUrl: 'https://pexels.com/photo/12',
          creator: undefined,
          license: 'Pexels',
        },
      ])
    })
  })
})
