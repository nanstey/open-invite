import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase }))
vi.mock('./userService', () => ({ fetchUsers: vi.fn(async () => []) }))

import { deleteGroup } from './groupService'

describe('groupService.deleteGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when soft delete succeeds and targets active group rows only', async () => {
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

  it('returns false when soft delete function reports no rows updated', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    supabase.rpc.mockResolvedValue({ data: false, error: null })

    const result = await deleteGroup('group-1')

    expect(result).toBe(false)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
