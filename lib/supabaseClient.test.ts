import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentUser, onAuthStateChange, signUp } from './supabaseClient'

const supabase = {
  auth: {
    getSession: vi.fn(),
    signUp: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('./supabase', () => ({ supabase }))

const userProfilesBuilder = (options: {
  selectResult: any
  insertResult?: any
}) => {
  const select = vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(async () => options.selectResult),
    })),
  }))

  const insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => options.insertResult ?? { data: null, error: null }),
    })),
  }))

  return { select, insert }
}

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('getCurrentUser returns null when no session user', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    const result = await getCurrentUser()

    expect(result).toBeNull()
  })

  it('getCurrentUser creates default profile when missing', async () => {
    const sessionUser = {
      id: 'user-1',
      email: 'hello@example.com',
      user_metadata: {},
    }
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: sessionUser } },
      error: null,
    })

    supabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return userProfilesBuilder({
          selectResult: { data: null, error: { code: 'PGRST116', message: 'No rows' } },
          insertResult: { data: { id: 'user-1', name: 'hello', avatar: 'avatar' }, error: null },
        })
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const result = await getCurrentUser()

    expect(result).toEqual({
      id: 'user-1',
      name: 'hello',
      avatar: 'avatar',
      isCurrentUser: true,
    })
  })

  it('getCurrentUser returns fallback user when profile fetch times out', async () => {
    vi.useFakeTimers()
    const sessionUser = {
      id: 'user-2',
      email: 'timer@example.com',
      user_metadata: { full_name: 'Timer User' },
    }
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: sessionUser } },
      error: null,
    })

    supabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => new Promise(() => {})),
            })),
          })),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const promise = getCurrentUser()
    await vi.advanceTimersByTimeAsync(2000)

    const result = await promise

    expect(result).toEqual({
      id: 'user-2',
      name: 'Timer User',
      avatar: expect.stringContaining('Timer%20User'),
      isCurrentUser: true,
    })
  })

  it('signUp returns user when auth and profile insert succeed', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-3' } },
      error: null,
    })

    supabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          insert: vi.fn(async () => ({ error: null })),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const result = await signUp('a@b.com', 'password', 'Name', 'avatar')

    expect(result).toEqual({ user: { id: 'user-3' } })
  })

  it('signUp returns error when profile insert fails', async () => {
    const profileError = new Error('profile failed')
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-4' } },
      error: null,
    })
    supabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          insert: vi.fn(async () => ({ error: profileError })),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const result = await signUp('a@b.com', 'password', 'Name', 'avatar')

    expect(result).toEqual({ error: profileError })
  })

  it('onAuthStateChange calls callback with user when session exists', async () => {
    const sessionUser = {
      id: 'user-5',
      email: 'user@example.com',
      user_metadata: { full_name: 'User Five' },
    }
    supabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return userProfilesBuilder({
          selectResult: { data: { id: 'user-5', name: 'User Five', avatar: 'avatar' }, error: null },
        })
      }
      throw new Error(`Unexpected table ${table}`)
    })

    let authCallback: any
    supabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
      authCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const handler = vi.fn()
    onAuthStateChange(handler)

    await authCallback('SIGNED_IN', { user: sessionUser })

    expect(handler).toHaveBeenCalledWith({
      id: 'user-5',
      name: 'User Five',
      avatar: 'avatar',
      isCurrentUser: true,
    })
  })

  it('onAuthStateChange falls back to default user on timeout', async () => {
    vi.useFakeTimers()
    const sessionUser = {
      id: 'user-6',
      email: 'slow@example.com',
      user_metadata: {},
    }

    supabase.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => new Promise(() => {})),
            })),
          })),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    let authCallback: any
    supabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
      authCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const handler = vi.fn()
    onAuthStateChange(handler)

    const promise = authCallback('SIGNED_IN', { user: sessionUser })
    await vi.advanceTimersByTimeAsync(3100)
    await promise

    expect(handler).toHaveBeenCalledWith({
      id: 'user-6',
      name: 'slow',
      avatar: expect.stringContaining('slow'),
      isCurrentUser: true,
    })
  })
})
