import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase }))

import {
  createNotification,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notificationService'

const mockNotificationsTable = (handler: () => any) => {
  supabase.from.mockImplementation((table: string) => {
    if (table !== 'notifications') {
      throw new Error(`Unhandled table ${table}`)
    }
    return handler()
  })
}

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchNotifications', () => {
    it('returns [] if no current user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await fetchNotifications()

      expect(result).toEqual([])
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('queries current user notifications ordered by timestamp desc', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const eq = vi.fn(() => ({ order }))
      const order = vi.fn(async () => ({ data: [], error: null }))
      const select = vi.fn(() => ({ eq }))

      mockNotificationsTable(() => ({ select }))

      await fetchNotifications()

      expect(select).toHaveBeenCalledWith('*')
      expect(eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(order).toHaveBeenCalledWith('timestamp', { ascending: false })
    })

    it('maps DB shape to domain with undefined optional ids when null', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockNotificationsTable(() => ({
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [
                {
                  id: 'n1',
                  type: 'SYSTEM',
                  title: 'Created',
                  message: 'An event was created',
                  timestamp: '2024-01-01T00:00:00.000Z',
                  related_event_id: null,
                  is_read: false,
                  actor_id: null,
                },
              ],
              error: null,
            }),
          }),
        }),
      }))

      const result = await fetchNotifications()

      expect(result).toEqual([
        {
          id: 'n1',
          type: 'SYSTEM',
          title: 'Created',
          message: 'An event was created',
          timestamp: '2024-01-01T00:00:00.000Z',
          relatedEventId: undefined,
          isRead: false,
          actorId: undefined,
        },
      ])
    })

    it('returns [] on query error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockNotificationsTable(() => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: null, error: new Error('db error') }),
          }),
        }),
      }))

      const result = await fetchNotifications()

      expect(result).toEqual([])
    })
  })

  describe('markNotificationAsRead', () => {
    it('updates is_read=true by notification id', async () => {
      const eq = vi.fn(async () => ({ error: null }))
      const update = vi.fn(() => ({ eq }))
      mockNotificationsTable(() => ({ update }))

      const result = await markNotificationAsRead('notification-1')

      expect(update).toHaveBeenCalledWith({ is_read: true })
      expect(eq).toHaveBeenCalledWith('id', 'notification-1')
      expect(result).toBe(true)
    })

    it('returns false when update returns an error', async () => {
      mockNotificationsTable(() => ({
        update: () => ({
          eq: async () => ({ error: new Error('db error') }),
        }),
      }))

      const result = await markNotificationAsRead('notification-1')

      expect(result).toBe(false)
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('returns false when unauthenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await markAllNotificationsAsRead()

      expect(result).toBe(false)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('updates by user_id and is_read=false', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const secondEq = vi.fn(async () => ({ error: null }))
      const firstEq = vi.fn(() => ({ eq: secondEq }))
      const update = vi.fn(() => ({ eq: firstEq }))
      mockNotificationsTable(() => ({ update }))

      const result = await markAllNotificationsAsRead()

      expect(update).toHaveBeenCalledWith({ is_read: true })
      expect(firstEq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(secondEq).toHaveBeenCalledWith('is_read', false)
      expect(result).toBe(true)
    })

    it('returns false on error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockNotificationsTable(() => ({
        update: () => ({
          eq: () => ({
            eq: async () => ({ error: new Error('db error') }),
          }),
        }),
      }))

      const result = await markAllNotificationsAsRead()

      expect(result).toBe(false)
    })
  })

  describe('createNotification', () => {
    it('inserts required fields and null optional ids when omitted', async () => {
      const single = vi.fn(async () => ({
        data: {
          id: 'n1',
          type: 'SYSTEM',
          title: 'Created',
          message: 'Message',
          timestamp: '2024-01-01T00:00:00.000Z',
          related_event_id: null,
          is_read: false,
          actor_id: null,
        },
        error: null,
      }))
      const select = vi.fn(() => ({ single }))
      const insert = vi.fn(() => ({ select }))
      mockNotificationsTable(() => ({ insert }))

      const result = await createNotification('user-1', 'SYSTEM', 'Created', 'Message')

      expect(insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        type: 'SYSTEM',
        title: 'Created',
        message: 'Message',
        related_event_id: null,
        actor_id: null,
      })
      expect(result).toEqual({
        id: 'n1',
        type: 'SYSTEM',
        title: 'Created',
        message: 'Message',
        timestamp: '2024-01-01T00:00:00.000Z',
        relatedEventId: undefined,
        isRead: false,
        actorId: undefined,
      })
    })

    it('returns mapped notification object on success', async () => {
      mockNotificationsTable(() => ({
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: 'n2',
                type: 'COMMENT',
                title: 'Updated',
                message: 'Updated message',
                timestamp: '2024-01-02T00:00:00.000Z',
                related_event_id: 'event-1',
                is_read: true,
                actor_id: 'actor-1',
              },
              error: null,
            }),
          }),
        }),
      }))

      const result = await createNotification(
        'user-1',
        'COMMENT',
        'Updated',
        'Updated message',
        'event-1',
        'actor-1'
      )

      expect(result).toEqual({
        id: 'n2',
        type: 'COMMENT',
        title: 'Updated',
        message: 'Updated message',
        timestamp: '2024-01-02T00:00:00.000Z',
        relatedEventId: 'event-1',
        isRead: true,
        actorId: 'actor-1',
      })
    })

    it('returns null on insert/select error', async () => {
      mockNotificationsTable(() => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: new Error('db error') }),
          }),
        }),
      }))

      const result = await createNotification('user-1', 'SYSTEM', 'Title', 'Message')

      expect(result).toBeNull()
    })

    it('returns null when row is missing', async () => {
      mockNotificationsTable(() => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }))

      const result = await createNotification('user-1', 'SYSTEM', 'Title', 'Message')

      expect(result).toBeNull()
    })
  })
})
