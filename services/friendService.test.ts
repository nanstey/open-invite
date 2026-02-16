import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as userService from './userService'

const supabase = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase }))

import {
  fetchFriends,
  fetchPendingFriendRequests,
  fetchOutgoingFriendRequests,
  fetchGroups,
  fetchUserGroups,
  fetchGroupMembers,
  sendFriendRequest,
  addFriend,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  createGroup,
  addUserToGroup,
  removeUserFromGroup,
} from './friendService'

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table]
    if (!handler) {
      throw new Error(`Unhandled table ${table}`)
    }
    return handler()
  })
}

const mockAuthSession = (userId: string | null) => {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: userId ? { user: { id: userId } } : null },
    error: null,
  })
}

const baseUser = (id: string, name: string) => ({
  id,
  name,
  avatar: `avatar-${id}.jpg`,
  isCurrentUser: false,
})

const baseGroupRow = (id: string, userId: string, name: string, color: string, isOpen: boolean = true) => ({
  id,
  created_by: userId,
  name,
  color,
  is_open: isOpen,
  created_at: '2025-01-01T00:00:00Z',
  deleted_at: null,
})

describe('friendService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(userService, 'fetchUsers').mockReset()
    vi.spyOn(userService, 'fetchUsers').mockResolvedValue([])
  })

  describe('fetchFriends', () => {
    it('returns empty array when no session', async () => {
      mockAuthSession(null)
      const result = await fetchFriends()
      expect(result).toEqual([])
    })

    it('returns empty array when no friends', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_friends: () => ({
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        }),
      })

      const result = await fetchFriends()
      expect(result).toEqual([])
    })

    it('returns friends with profile data', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_friends: () => ({
          select: () => ({
            eq: async () => ({
              data: [
                { friend_id: 'user-2' },
                { friend_id: 'user-3' },
              ],
              error: null,
            }),
          }),
        }),
      })
      vi.spyOn(userService, 'fetchUsers').mockResolvedValue([
        baseUser('user-2', 'Bob'),
        baseUser('user-3', 'Charlie'),
      ])

      const result = await fetchFriends()
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ id: 'user-2', name: 'Bob' })
      expect(result[1]).toMatchObject({ id: 'user-3', name: 'Charlie' })
    })

    it('returns empty array when database error occurs', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_friends: () => ({
          select: () => ({
            eq: async () => ({ data: null, error: new Error('db error') }),
          }),
        }),
      })

      const result = await fetchFriends()
      expect(result).toEqual([])
    })
  })

  describe('fetchPendingFriendRequests', () => {
    it('returns empty array when no session', async () => {
      mockAuthSession(null)
      const result = await fetchPendingFriendRequests()
      expect(result).toEqual([])
    })

    it('returns empty array when no pending requests', async () => {
      mockAuthSession('user-1')
      mockFrom({
        friend_requests: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchPendingFriendRequests()
      expect(result).toEqual([])
    })

    it('returns pending requests with requester profiles', async () => {
      mockAuthSession('user-1')
      const requests = [
        { id: 'req-1', requester_id: 'user-2', recipient_id: 'user-1', status: 'PENDING', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        { id: 'req-2', requester_id: 'user-3', recipient_id: 'user-1', status: 'PENDING', created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
      ]

      mockFrom({
        friend_requests: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: requests, error: null }),
              }),
            }),
          }),
        }),
      })
      vi.spyOn(userService, 'fetchUsers').mockResolvedValue([
        baseUser('user-2', 'Bob'),
        baseUser('user-3', 'Charlie'),
      ])

      const result = await fetchPendingFriendRequests()
      expect(result).toHaveLength(2)
      expect(result[0].requesterId).toBe('user-2')
      expect(result[0].status).toBe('PENDING')
    })

    it('returns empty array on database error', async () => {
      mockAuthSession('user-1')
      mockFrom({
        friend_requests: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: null, error: new Error('db error') }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchPendingFriendRequests()
      expect(result).toEqual([])
    })
  })

  describe('fetchOutgoingFriendRequests', () => {
    it('returns empty array when no session', async () => {
      mockAuthSession(null)
      const result = await fetchOutgoingFriendRequests()
      expect(result).toEqual([])
    })

    it('returns outgoing requests with recipient profiles', async () => {
      mockAuthSession('user-1')
      const requests = [
        { id: 'req-1', requester_id: 'user-1', recipient_id: 'user-2', status: 'PENDING', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      ]

      mockFrom({
        friend_requests: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: requests, error: null }),
              }),
            }),
          }),
        }),
      })
      vi.spyOn(userService, 'fetchUsers').mockResolvedValue([baseUser('user-2', 'Bob')])

      const result = await fetchOutgoingFriendRequests()
      expect(result).toHaveLength(1)
      expect(result[0].recipientId).toBe('user-2')
    })
  })

  describe('fetchGroups', () => {
    it('returns empty array when no groups', async () => {
      mockFrom({
        groups: () => ({
          select: () => ({
            or: () => ({
              is: () => ({
                order: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchGroups('user-1')
      expect(result).toEqual([])
    })

    it('returns groups sorted by name', async () => {
      mockFrom({
        groups: () => ({
          select: () => ({
            or: () => ({
              is: () => ({
                order: async () => ({
                  data: [
                    baseGroupRow('group-2', 'user-1', 'Work', '#0000ff'),
                    baseGroupRow('group-1', 'user-1', 'Close Friends', '#ff0000'),
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchGroups('user-1')
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Work')
      expect(result[1].name).toBe('Close Friends')
    })
  })

  describe('fetchUserGroups', () => {
    it('fetches groups for a user including membership', async () => {
      mockFrom({
        user_groups: () => ({
          select: () => ({
            eq: async () => ({
              data: [
                { user_id: 'user-1', group_id: 'group-1', groups: baseGroupRow('group-1', 'user-1', 'My Group', '#ff0000') },
              ],
              error: null,
            }),
          }),
        }),
      })

      const result = await fetchUserGroups('user-1')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('My Group')
    })

    it('returns empty array on database error', async () => {
      mockFrom({
        user_groups: () => ({
          select: () => ({
            eq: async () => ({
              data: null,
              error: new Error('db error'),
            }),
          }),
        }),
      })

      const result = await fetchUserGroups('user-1')
      expect(result).toEqual([])
    })
  })

  describe('fetchGroupMembers', () => {
    it('fetches members of a group', async () => {
      mockFrom({
        user_groups: () => ({
          select: () => ({
            eq: async () => ({
              data: [{ user_id: 'user-2' }],
              error: null,
            }),
          }),
        }),
      })
      vi.spyOn(userService, 'fetchUsers').mockResolvedValue([baseUser('user-2', 'Bob')])

      const result = await fetchGroupMembers('group-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('user-2')
    })

    it('returns empty array on database error', async () => {
      mockFrom({
        user_groups: () => ({
          select: () => ({
            eq: async () => ({
              data: null,
              error: new Error('db error'),
            }),
          }),
        }),
      })

      const result = await fetchGroupMembers('group-1')
      expect(result).toEqual([])
    })
  })

  describe('sendFriendRequest', () => {
    it('returns false when no session', async () => {
      mockAuthSession(null)
      const result = await sendFriendRequest('user-2')
      expect(result).toBe(false)
    })

    it('returns true when request sent successfully', async () => {
      mockAuthSession('user-1')
      mockFrom({
        friend_requests: () => ({
          insert: async () => ({ error: null }),
        }),
      })

      const result = await sendFriendRequest('user-2')
      expect(result).toBe(true)
    })

    it('returns false when insert fails', async () => {
      mockAuthSession('user-1')
      mockFrom({
        friend_requests: () => ({
          insert: async () => ({ error: new Error('duplicate key') }),
        }),
      })

      const result = await sendFriendRequest('user-2')
      expect(result).toBe(false)
    })
  })

  describe('addFriend', () => {
    it('returns false when no session', async () => {
      mockAuthSession(null)
      const result = await addFriend('user-2')
      expect(result).toBe(false)
    })

    it('returns true when friendship created', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_friends: () => ({
          insert: async () => ({ error: null }),
        }),
      })

      const result = await addFriend('user-2')
      expect(result).toBe(true)
    })

    it('returns false when insert fails', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_friends: () => ({
          insert: async () => ({ error: new Error('db error') }),
        }),
      })

      const result = await addFriend('user-2')
      expect(result).toBe(false)
    })
  })

  describe('acceptFriendRequest', () => {
    it('returns false when no session', async () => {
      mockAuthSession(null)
      const result = await acceptFriendRequest('req-1', 'user-2')
      expect(result).toBe(false)
    })

    it('returns true when request accepted and friendship created', async () => {
      mockAuthSession('user-1')
      supabase.rpc.mockResolvedValue({ error: null })

      const result = await acceptFriendRequest('req-1', 'user-2')
      expect(result).toBe(true)
    })

    it('returns false when update fails', async () => {
      mockAuthSession('user-1')
      supabase.rpc.mockResolvedValue({ error: new Error('db error') })

      const result = await acceptFriendRequest('req-1', 'user-2')
      expect(result).toBe(false)
    })
  })

  describe('declineFriendRequest', () => {
    it('returns true when request declined successfully', async () => {
      mockFrom({
        friend_requests: () => ({
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      })

      const result = await declineFriendRequest('req-1')
      expect(result).toBe(true)
    })

    it('returns false when update fails', async () => {
      mockFrom({
        friend_requests: () => ({
          update: () => ({
            eq: async () => ({ error: new Error('db error') }),
          }),
        }),
      })

      const result = await declineFriendRequest('req-1')
      expect(result).toBe(false)
    })
  })

  describe('cancelFriendRequest', () => {
    it('returns true when request deleted successfully', async () => {
      mockFrom({
        friend_requests: () => ({
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      })

      const result = await cancelFriendRequest('req-1')
      expect(result).toBe(true)
    })

    it('returns false when delete fails', async () => {
      mockFrom({
        friend_requests: () => ({
          delete: () => ({
            eq: async () => ({ error: new Error('db error') }),
          }),
        }),
      })

      const result = await cancelFriendRequest('req-1')
      expect(result).toBe(false)
    })
  })

  describe('removeFriend', () => {
    it('returns false when no session', async () => {
      mockAuthSession(null)
      const result = await removeFriend('user-2')
      expect(result).toBe(false)
    })

    it('returns true when bidirectional friendship deleted', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_friends: () => ({
          delete: () => ({
            or: async () => ({ error: null }),
          }),
        }),
        friend_requests: () => ({
          delete: () => ({
            or: async () => ({ error: null }),
          }),
        }),
      })

      const result = await removeFriend('user-2')
      expect(result).toBe(true)
    })

    it('returns false when delete fails', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_friends: () => ({
          delete: () => ({
            or: async () => ({ error: new Error('db error') }),
          }),
        }),
        friend_requests: () => ({
          delete: () => ({
            or: async () => ({ error: null }),
          }),
        }),
      })

      const result = await removeFriend('user-2')
      expect(result).toBe(false)
    })
  })

  describe('createGroup', () => {
    it('returns null when no session', async () => {
      mockAuthSession(null)
      const result = await createGroup('New Group', true)
      expect(result).toBeNull()
    })

    it('creates group and returns it', async () => {
      mockAuthSession('user-1')
      mockFrom({
        groups: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: baseGroupRow('group-1', 'user-1', 'New Group', '#ff0000'),
                error: null,
              }),
            }),
          }),
        }),
        user_groups: () => ({
          insert: async () => ({ error: null }),
        }),
      })

      const result = await createGroup('New Group', true)
      expect(result).toMatchObject({ id: 'group-1', name: 'New Group' })
    })

    it('returns null when insert fails', async () => {
      mockAuthSession('user-1')
      mockFrom({
        groups: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: new Error('db error') }),
            }),
          }),
        }),
      })

      const result = await createGroup('New Group', true)
      expect(result).toBeNull()
    })
  })

  describe('addUserToGroup', () => {
    it('returns true when user added to group', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_groups: () => ({
          insert: async () => ({ error: null }),
        }),
      })

      const result = await addUserToGroup('user-2', 'group-1')
      expect(result).toBe(true)
    })

    it('returns false when insert fails', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_groups: () => ({
          insert: async () => ({ error: new Error('db error') }),
        }),
      })

      const result = await addUserToGroup('user-2', 'group-1')
      expect(result).toBe(false)
    })
  })

  describe('removeUserFromGroup', () => {
    it('returns true when user removed from group', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_groups: () => ({
          delete: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        }),
      })

      const result = await removeUserFromGroup('user-2', 'group-1')
      expect(result).toBe(true)
    })

    it('returns false when delete fails', async () => {
      mockAuthSession('user-1')
      mockFrom({
        user_groups: () => ({
          delete: () => ({
            eq: () => ({
              eq: async () => ({ error: new Error('db error') }),
            }),
          }),
        }),
      })

      const result = await removeUserFromGroup('user-2', 'group-1')
      expect(result).toBe(false)
    })
  })
})
