import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase }))

import type { FeedbackFormData, FeedbackStatus, FeedbackType } from '../domains/feedback/types'
import {
  checkIsAdmin,
  fetchAllFeedback,
  fetchUserFeedback,
  submitFeedback,
  updateFeedbackStatus,
} from './feedbackService'

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table]
    if (!handler) {
      throw new Error(`Unhandled table ${table}`)
    }
    return handler()
  })
}

const baseFeedbackFormData: FeedbackFormData = {
  title: 'Add dark mode controls',
  type: 'feature',
  importance: 'high',
  description: 'Allow users to configure dark mode behavior.',
}

const baseFeedbackRow = {
  id: 'feedback-1',
  user_id: 'user-1',
  title: 'Add dark mode controls',
  type: 'feature' as FeedbackType,
  importance: 'high',
  description: 'Allow users to configure dark mode behavior.',
  status: 'new' as FeedbackStatus,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-02T00:00:00.000Z',
}

describe('feedbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitFeedback', () => {
    it('throws when current user is not available', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      await expect(submitFeedback(baseFeedbackFormData)).rejects.toThrow(
        'User must be authenticated to submit feedback'
      )
    })

    it('inserts expected payload fields from FeedbackFormData', async () => {
      const insertSpy = vi.fn(() => ({
        select: () => ({
          single: async () => ({ data: baseFeedbackRow, error: null }),
        }),
      }))

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_feedback: () => ({
          insert: insertSpy,
        }),
      })

      await submitFeedback(baseFeedbackFormData)

      expect(insertSpy).toHaveBeenCalledWith({
        user_id: 'user-1',
        title: baseFeedbackFormData.title,
        type: baseFeedbackFormData.type,
        importance: baseFeedbackFormData.importance,
        description: baseFeedbackFormData.description,
      })
    })

    it('returns transformed feedback on success', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_feedback: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: baseFeedbackRow, error: null }),
            }),
          }),
        }),
      })

      const result = await submitFeedback(baseFeedbackFormData)

      expect(result).toEqual({
        id: 'feedback-1',
        userId: 'user-1',
        title: 'Add dark mode controls',
        type: 'feature',
        importance: 'high',
        description: 'Allow users to configure dark mode behavior.',
        status: 'new',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        userName: undefined,
        userAvatar: undefined,
      })
    })

    it('returns null on insert error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_feedback: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: new Error('insert failed') }),
            }),
          }),
        }),
      })

      const result = await submitFeedback(baseFeedbackFormData)

      expect(result).toBeNull()
    })

    it('returns null when insert succeeds but row is missing', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_feedback: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      })

      const result = await submitFeedback(baseFeedbackFormData)

      expect(result).toBeNull()
    })
  })

  describe('fetchUserFeedback', () => {
    it('returns an empty array when no current user is available', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await fetchUserFeedback()

      expect(result).toEqual([])
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('queries user_feedback by user_id and orders by created_at descending', async () => {
      const orderSpy = vi.fn(async () => ({ data: [baseFeedbackRow], error: null }))
      const eqSpy = vi.fn(() => ({ order: orderSpy }))
      const selectSpy = vi.fn(() => ({ eq: eqSpy }))

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_feedback: () => ({
          select: selectSpy,
        }),
      })

      await fetchUserFeedback()

      expect(selectSpy).toHaveBeenCalledWith('*')
      expect(eqSpy).toHaveBeenCalledWith('user_id', 'user-1')
      expect(orderSpy).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('maps database fields to feedback domain shape', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_feedback: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [baseFeedbackRow], error: null }),
            }),
          }),
        }),
      })

      const result = await fetchUserFeedback()

      expect(result).toEqual([
        {
          id: 'feedback-1',
          userId: 'user-1',
          title: 'Add dark mode controls',
          type: 'feature',
          importance: 'high',
          description: 'Allow users to configure dark mode behavior.',
          status: 'new',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
          userName: undefined,
          userAvatar: undefined,
        },
      ])
    })

    it('returns empty array on query error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_feedback: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({ data: null, error: new Error('query failed') }),
            }),
          }),
        }),
      })

      const result = await fetchUserFeedback()

      expect(result).toEqual([])
    })
  })

  describe('fetchAllFeedback', () => {
    it('returns empty array when feedback query fails', async () => {
      mockFrom({
        user_feedback: () => ({
          select: () => ({
            order: async () => ({ data: null, error: new Error('query failed') }),
          }),
        }),
      })

      const result = await fetchAllFeedback()

      expect(result).toEqual([])
    })

    it('returns empty array when feedback table is empty', async () => {
      mockFrom({
        user_feedback: () => ({
          select: () => ({
            order: async () => ({ data: [], error: null }),
          }),
        }),
      })

      const result = await fetchAllFeedback()

      expect(result).toEqual([])
    })

    it('fetches related user profiles using deduplicated user IDs', async () => {
      const inSpy = vi.fn(async () => ({ data: [], error: null }))

      mockFrom({
        user_feedback: () => ({
          select: () => ({
            order: async () => ({
              data: [
                baseFeedbackRow,
                { ...baseFeedbackRow, id: 'feedback-2' },
                { ...baseFeedbackRow, id: 'feedback-3', user_id: 'user-2' },
              ],
              error: null,
            }),
          }),
        }),
        user_profiles: () => ({
          select: () => ({
            in: inSpy,
          }),
        }),
      })

      await fetchAllFeedback()

      expect(inSpy).toHaveBeenCalledWith('id', ['user-1', 'user-2'])
    })

    it('enriches feedback with user name and avatar when profile exists', async () => {
      mockFrom({
        user_feedback: () => ({
          select: () => ({
            order: async () => ({ data: [baseFeedbackRow], error: null }),
          }),
        }),
        user_profiles: () => ({
          select: () => ({
            in: async () => ({
              data: [{ id: 'user-1', name: 'Ada', avatar: 'ada.png' }],
              error: null,
            }),
          }),
        }),
      })

      const result = await fetchAllFeedback()

      expect(result[0].userName).toBe('Ada')
      expect(result[0].userAvatar).toBe('ada.png')
    })

    it('returns feedback without enrichment when profile query fails', async () => {
      mockFrom({
        user_feedback: () => ({
          select: () => ({
            order: async () => ({ data: [baseFeedbackRow], error: null }),
          }),
        }),
        user_profiles: () => ({
          select: () => ({
            in: async () => ({
              data: null,
              error: new Error('profile query failed'),
            }),
          }),
        }),
      })

      const result = await fetchAllFeedback()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'feedback-1',
        userId: 'user-1',
        userName: undefined,
        userAvatar: undefined,
      })
    })
  })

  describe('updateFeedbackStatus', () => {
    it('returns true on successful update', async () => {
      mockFrom({
        user_feedback: () => ({
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      })

      const result = await updateFeedbackStatus('feedback-1', 'reviewed')

      expect(result).toBe(true)
    })

    it('returns false on update error', async () => {
      mockFrom({
        user_feedback: () => ({
          update: () => ({
            eq: async () => ({ error: new Error('update failed') }),
          }),
        }),
      })

      const result = await updateFeedbackStatus('feedback-1', 'declined')

      expect(result).toBe(false)
    })
  })

  describe('checkIsAdmin', () => {
    it('returns false when unauthenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await checkIsAdmin()

      expect(result).toBe(false)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('returns false when profile query errors', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: new Error('query failed') }),
            }),
          }),
        }),
      })

      const result = await checkIsAdmin()

      expect(result).toBe(false)
    })

    it('returns false when profile row is missing', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      })

      const result = await checkIsAdmin()

      expect(result).toBe(false)
    })

    it('returns true when is_admin is true', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { is_admin: true }, error: null }),
            }),
          }),
        }),
      })

      const result = await checkIsAdmin()

      expect(result).toBe(true)
    })

    it('returns false when is_admin is false', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { is_admin: false }, error: null }),
            }),
          }),
        }),
      })

      const result = await checkIsAdmin()

      expect(result).toBe(false)
    })
  })
})
