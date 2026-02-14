import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase }))

import { fetchComments, addComment, deleteComment } from './commentService'

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table]
    if (!handler) {
      throw new Error(`Unhandled table ${table}`)
    }
    return handler()
  })
}

describe('commentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchComments', () => {
    it('returns empty array when no comments found', async () => {
      mockFrom({
        comments: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      })

      const result = await fetchComments('event-1')

      expect(result).toEqual([])
    })

    it('returns comments ordered by timestamp', async () => {
      mockFrom({
        comments: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  { id: 'comment-1', event_id: 'event-1', user_id: 'user-1', text: 'First', timestamp: '2025-01-01T10:00:00Z' },
                  { id: 'comment-2', event_id: 'event-1', user_id: 'user-2', text: 'Second', timestamp: '2025-01-01T11:00:00Z' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await fetchComments('event-1')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ id: 'comment-1', userId: 'user-1', text: 'First', timestamp: '2025-01-01T10:00:00Z' })
      expect(result[1]).toMatchObject({ id: 'comment-2', userId: 'user-2', text: 'Second', timestamp: '2025-01-01T11:00:00Z' })
    })

    it('returns empty array when database error occurs', async () => {
      mockFrom({
        comments: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({ data: null, error: new Error('db error') }),
            }),
          }),
        }),
      })

      const result = await fetchComments('event-1')

      expect(result).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      mockFrom({
        comments: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      })

      const result = await fetchComments('event-1')

      expect(result).toEqual([])
    })
  })

  describe('addComment', () => {
    it('returns null when user is not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await addComment('event-1', 'Test comment')

      expect(result).toBeNull()
    })

    it('adds comment and returns comment object', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        comments: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'comment-1',
                  event_id: 'event-1',
                  user_id: 'user-1',
                  text: 'Test comment',
                  timestamp: '2025-01-01T10:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await addComment('event-1', 'Test comment')

      expect(result).toMatchObject({
        id: 'comment-1',
        userId: 'user-1',
        text: 'Test comment',
        timestamp: '2025-01-01T10:00:00Z',
      })
    })

    it('returns null when insert fails', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        comments: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: new Error('db error') }),
            }),
          }),
        }),
      })

      const result = await addComment('event-1', 'Test comment')

      expect(result).toBeNull()
    })

    it('returns null when no data returned', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        comments: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      })

      const result = await addComment('event-1', 'Test comment')

      expect(result).toBeNull()
    })
  })

  describe('deleteComment', () => {
    it('returns true when comment is deleted successfully', async () => {
      const deleteFn = vi.fn(() => ({
        eq: async () => ({ error: null }),
      }))

      mockFrom({
        comments: () => ({ delete: deleteFn }),
      })

      const result = await deleteComment('comment-1')

      expect(result).toBe(true)
    })

    it('returns false when delete fails', async () => {
      const deleteFn = vi.fn(() => ({
        eq: async () => ({ error: new Error('db error') }),
      }))

      mockFrom({
        comments: () => ({ delete: deleteFn }),
      })

      const result = await deleteComment('comment-1')

      expect(result).toBe(false)
    })

    it('returns true when comment does not exist (idempotent delete)', async () => {
      const deleteFn = vi.fn(() => ({
        eq: async () => ({ error: null }), // No error when row doesn't exist
      }))

      mockFrom({
        comments: () => ({ delete: deleteFn }),
      })

      const result = await deleteComment('non-existent-comment')

      expect(result).toBe(true)
    })
  })
})
