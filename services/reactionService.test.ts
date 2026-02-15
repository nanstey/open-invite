import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase }))

import { fetchReactions, toggleReaction } from './reactionService'

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table]
    if (!handler) {
      throw new Error(`Unhandled table ${table}`)
    }
    return handler()
  })
}

describe('reactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchReactions', () => {
    it('returns empty object when no reactions found', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        }),
      })

      const result = await fetchReactions('event-1')

      expect(result).toEqual({})
    })

    it('aggregates reactions by emoji with counts', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: async () => ({
              data: [
                { id: 'r1', event_id: 'event-1', user_id: 'user-1', emoji: '🎉' },
                { id: 'r2', event_id: 'event-1', user_id: 'user-2', emoji: '🎉' },
                { id: 'r3', event_id: 'event-1', user_id: 'user-3', emoji: '🔥' },
              ],
              error: null,
            }),
          }),
        }),
      })

      const result = await fetchReactions('event-1')

      expect(result['🎉']).toMatchObject({ emoji: '🎉', count: 2, userReacted: true })
      expect(result['🔥']).toMatchObject({ emoji: '🔥', count: 1, userReacted: false })
    })

    it('marks userReacted true when current user reacted', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: async () => ({
              data: [
                { id: 'r1', event_id: 'event-1', user_id: 'user-1', emoji: '🎉' },
              ],
              error: null,
            }),
          }),
        }),
      })

      const result = await fetchReactions('event-1')

      expect(result['🎉'].userReacted).toBe(true)
    })

    it('marks userReacted false when current user did not react', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: async () => ({
              data: [
                { id: 'r1', event_id: 'event-1', user_id: 'user-2', emoji: '🎉' },
              ],
              error: null,
            }),
          }),
        }),
      })

      const result = await fetchReactions('event-1')

      expect(result['🎉'].userReacted).toBe(false)
    })

    it('marks userReacted false when user is not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })
      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: async () => ({
              data: [
                { id: 'r1', event_id: 'event-1', user_id: 'user-2', emoji: '🎉' },
              ],
              error: null,
            }),
          }),
        }),
      })

      const result = await fetchReactions('event-1')

      expect(result['🎉'].userReacted).toBe(false)
    })

    it('returns empty object when database error occurs', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: async () => ({ data: null, error: new Error('db error') }),
          }),
        }),
      })

      const result = await fetchReactions('event-1')

      expect(result).toEqual({})
    })
  })

  describe('toggleReaction', () => {
    it('returns false when user is not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await toggleReaction('event-1', '🎉')

      expect(result).toBe(false)
    })

    it('removes existing reaction and returns true', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const eqFn = vi.fn(async () => ({ error: null }))

      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({ data: { id: 'reaction-1' }, error: null }),
                }),
              }),
            }),
          }),
          delete: () => ({ eq: eqFn }),
        }),
      })

      const result = await toggleReaction('event-1', '🎉')

      expect(result).toBe(true)
      expect(eqFn).toHaveBeenCalledWith('id', 'reaction-1')
    })

    it('adds new reaction when not existing and returns true', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const insertFn = vi.fn(async () => ({ error: null }))

      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: insertFn,
        }),
      })

      const result = await toggleReaction('event-1', '🎉')

      expect(result).toBe(true)
      expect(insertFn).toHaveBeenCalledWith({
        event_id: 'event-1',
        user_id: 'user-1',
        emoji: '🎉',
      })
    })

    it('returns false when delete fails', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const eqFn = vi.fn(async () => ({ error: new Error('db error') }))

      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({ data: { id: 'reaction-1' }, error: null }),
                }),
              }),
            }),
          }),
          delete: () => ({ eq: eqFn }),
        }),
      })

      const result = await toggleReaction('event-1', '🎉')

      expect(result).toBe(false)
    })

    it('returns false when insert fails', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const insertFn = vi.fn(async () => ({ error: new Error('db error') }))

      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: insertFn,
        }),
      })

      const result = await toggleReaction('event-1', '🎉')

      expect(result).toBe(false)
    })

    it('handles different emojis independently', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const insertFn = vi.fn(async () => ({ error: null }))

      mockFrom({
        reactions: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: insertFn,
        }),
      })

      await toggleReaction('event-1', '🎉')
      await toggleReaction('event-1', '🔥')
      await toggleReaction('event-1', '👍')

      expect(insertFn).toHaveBeenCalledTimes(3)
      expect(insertFn).toHaveBeenNthCalledWith(1, {
        event_id: 'event-1',
        user_id: 'user-1',
        emoji: '🎉',
      })
      expect(insertFn).toHaveBeenNthCalledWith(2, {
        event_id: 'event-1',
        user_id: 'user-1',
        emoji: '🔥',
      })
      expect(insertFn).toHaveBeenNthCalledWith(3, {
        event_id: 'event-1',
        user_id: 'user-1',
        emoji: '👍',
      })
    })
  })
})
