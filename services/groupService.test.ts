import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase }))
vi.mock('./userService', () => ({ fetchUsers: vi.fn(async () => []) }))

import {
  addUserToGroup,
  approveGroupMemberRequest,
  createGroup,
  createGroupMemberRequest,
  deleteGroup,
  removeUserFromGroup,
  updateGroup,
} from './groupService'

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table]
    if (!handler) {
      throw new Error(`Unhandled table ${table}`)
    }
    return handler()
  })
}

describe('groupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createGroup', () => {
    it('creates a group and adds creator as admin', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
        error: null,
      })

      const groupInsert = vi.fn().mockReturnThis()
      const groupSelect = vi.fn().mockReturnThis()
      const groupSingle = vi.fn(async () => ({
        data: { id: 'group-1', name: 'Test Group', created_by: 'user-1' },
        error: null,
      }))
      const memberInsert = vi.fn(async () => ({ error: null }))

      mockFrom({
        groups: () => ({
          insert: groupInsert,
          select: groupSelect,
          single: groupSingle,
        }),
        user_groups: () => ({ insert: memberInsert }),
      })

      const result = await createGroup('Test Group')

      expect(result?.id).toBe('group-1')
      expect(result?.name).toBe('Test Group')
      expect(groupInsert).toHaveBeenCalledWith({
        name: 'Test Group',
        created_by: 'user-1',
        allow_members_create_events: true,
        allow_members_add_members: true,
        new_members_require_admin_approval: false,
      })
      expect(memberInsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        group_id: 'group-1',
        role: 'ADMIN',
      })
    })

    it('returns null when user is not authenticated', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: null } },
        error: null,
      })

      const result = await createGroup('Test Group')

      expect(result).toBeNull()
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('returns null when group creation fails', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
        error: null,
      })

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const groupInsert = vi.fn().mockReturnThis()
      const groupSelect = vi.fn().mockReturnThis()
      const groupSingle = vi.fn(async () => ({ data: null, error: new Error('failed') }))

      mockFrom({
        groups: () => ({
          insert: groupInsert,
          select: groupSelect,
          single: groupSingle,
        }),
      })

      const result = await createGroup('Test Group')

      expect(result).toBeNull()
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })

  describe('updateGroup', () => {
    it('updates group fields successfully', async () => {
      const update = vi.fn().mockReturnThis()
      const eq = vi.fn().mockReturnThis()
      const select = vi.fn().mockReturnThis()
      const single = vi.fn(async () => ({
        data: {
          id: 'group-1',
          name: 'Updated Group',
          created_by: 'user-1',
          allow_members_create_events: false,
          allow_members_add_members: true,
          new_members_require_admin_approval: false,
        },
        error: null,
      }))

      mockFrom({
        groups: () => ({ update, select }),
      })

      update.mockReturnValue({ eq })
      eq.mockReturnValue({ select })
      select.mockReturnValue({ single })

      const result = await updateGroup('group-1', {
        name: 'Updated Group',
        allowMembersCreateEvents: false,
      })

      expect(result?.name).toBe('Updated Group')
      expect(result?.allowMembersCreateEvents).toBe(false)
      expect(update).toHaveBeenCalledWith({
        name: 'Updated Group',
        allow_members_create_events: false,
      })
    })

    it('returns null when update fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const update = vi.fn().mockReturnThis()
      const eq = vi.fn().mockReturnThis()
      const select = vi.fn().mockReturnThis()
      const single = vi.fn(async () => ({ data: null, error: new Error('failed') }))

      mockFrom({
        groups: () => ({ update, select }),
      })

      update.mockReturnValue({ eq })
      eq.mockReturnValue({ select })
      select.mockReturnValue({ single })

      const result = await updateGroup('group-1', { name: 'New Name' })

      expect(result).toBeNull()
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })

  describe('addUserToGroup', () => {
    it('adds a user to a group successfully', async () => {
      const upsert = vi.fn(async () => ({ error: null }))

      mockFrom({
        user_groups: () => ({ upsert }),
      })

      const result = await addUserToGroup('user-1', 'group-1')

      expect(result).toBe(true)
      expect(upsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          group_id: 'group-1',
          role: 'MEMBER',
        },
        { onConflict: 'user_id,group_id', ignoreDuplicates: true }
      )
    })

    it('returns false when adding member fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const upsert = vi.fn(async () => ({ error: new Error('failed') }))

      mockFrom({
        user_groups: () => ({ upsert }),
      })

      const result = await addUserToGroup('user-1', 'group-1')

      expect(result).toBe(false)
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })

  describe('removeUserFromGroup', () => {
    it('removes a user from a group successfully', async () => {
      const deleteFn = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      }))

      mockFrom({
        user_groups: () => ({ delete: deleteFn }),
      })

      const result = await removeUserFromGroup('user-1', 'group-1')

      expect(result).toBe(true)
      expect(deleteFn).toHaveBeenCalled()
    })

    it('returns false when removal fails', async () => {
      const deleteFn = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: new Error('failed') })),
        })),
      }))

      mockFrom({
        user_groups: () => ({ delete: deleteFn }),
      })

      const result = await removeUserFromGroup('user-1', 'group-1')

      expect(result).toBe(false)
    })
  })

  describe('createGroupMemberRequest', () => {
    it('uses authenticated user id as requester id', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'auth-user-1' } } },
        error: null,
      })

      const insert = vi.fn(async () => ({ error: null }))
      mockFrom({
        group_member_requests: () => ({ insert }),
      })

      const result = await createGroupMemberRequest('group-1')

      expect(result).toBe(true)
      expect(insert).toHaveBeenCalledWith({
        group_id: 'group-1',
        requester_id: 'auth-user-1',
        status: 'PENDING',
      })
    })

    it('returns false when user is not authenticated', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: null } },
        error: null,
      })

      const result = await createGroupMemberRequest('group-1')

      expect(result).toBe(false)
      expect(supabase.from).not.toHaveBeenCalled()
    })
  })

  describe('approveGroupMemberRequest', () => {
    it('returns true when approval RPC succeeds', async () => {
      supabase.rpc.mockResolvedValue({ data: true, error: null })

      const result = await approveGroupMemberRequest('request-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('approve_group_member_request', {
        request_id_param: 'request-1',
      })
    })

    it('returns false when approval RPC fails', async () => {
      const error = new Error('boom')
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      supabase.rpc.mockResolvedValue({ data: null, error })

      const result = await approveGroupMemberRequest('request-1')

      expect(result).toBe(false)
      expect(consoleError).toHaveBeenCalledWith('Error approving group member request:', error)
      consoleError.mockRestore()
    })

    it('returns false when approval RPC returns false', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      supabase.rpc.mockResolvedValue({ data: false, error: null })

      const result = await approveGroupMemberRequest('request-1')

      expect(result).toBe(false)
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })

  describe('deleteGroup', () => {
    it('returns true when soft delete succeeds', async () => {
      supabase.rpc.mockResolvedValue({ data: true, error: null })

      const result = await deleteGroup('group-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('soft_delete_group', { group_id_param: 'group-1' })
    })

    it('returns false when soft delete fails', async () => {
      const error = new Error('boom')
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      supabase.rpc.mockResolvedValue({ data: null, error })

      const result = await deleteGroup('group-1')

      expect(result).toBe(false)
      expect(consoleError).toHaveBeenCalledWith('Error deleting group:', error)
      consoleError.mockRestore()
    })

    it('returns false when soft delete reports no rows updated', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      supabase.rpc.mockResolvedValue({ data: false, error: null })

      const result = await deleteGroup('group-1')

      expect(result).toBe(false)
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })
})
