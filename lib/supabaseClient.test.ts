import { describe, expect, it, vi, beforeEach } from 'vitest'

type MockSupabase = {
  auth: {
    getSession: ReturnType<typeof vi.fn>
    signInWithOAuth: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
}

const mockSupabase = vi.hoisted<MockSupabase>(() => ({
  auth: {
    getSession: vi.fn(),
    signInWithOAuth: vi.fn(),
  },
  from: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: mockSupabase,
}))

import { getCurrentUser, signInWithGoogle } from './supabaseClient'

function mockProfileQuery(profile: { id: string; name: string; avatar: string } | null) {
  const single = vi.fn().mockResolvedValue({ data: profile, error: null })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  mockSupabase.from.mockReturnValue({ select })
  return { select, eq, single }
}

describe('supabaseClient', () => {
  beforeEach(() => {
    mockSupabase.auth.getSession.mockReset()
    mockSupabase.auth.signInWithOAuth.mockReset()
    mockSupabase.from.mockReset()
  })

  it('returns null when there is no session user', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    await expect(getCurrentUser()).resolves.toBeNull()
  })

  it('returns the profile when a session user exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@example.com' } } },
      error: null,
    })

    mockProfileQuery({ id: 'user-1', name: 'Test User', avatar: 'avatar.png' })

    await expect(getCurrentUser()).resolves.toEqual({
      id: 'user-1',
      name: 'Test User',
      avatar: 'avatar.png',
      isCurrentUser: true,
    })
  })

  it('builds a safe redirect for google oauth', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://open-invite.test' },
      writable: true,
    })

    mockSupabase.auth.signInWithOAuth.mockResolvedValue({ data: null, error: null })

    await signInWithGoogle('/events')

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://open-invite.test/auth/callback?redirect=%2Fevents',
      },
    })
  })
})
