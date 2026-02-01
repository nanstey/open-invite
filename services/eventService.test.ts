import { describe, expect, it, vi, beforeEach } from 'vitest'

type MockSupabase = {
  auth: {
    getSession: ReturnType<typeof vi.fn>
    getUser: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
}

const mockSupabase = vi.hoisted<MockSupabase>(() => ({
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
}))

import { addComment, joinEvent, toggleReaction } from './eventService'

describe('eventService.joinEvent', () => {
  beforeEach(() => {
    mockSupabase.auth.getSession.mockReset()
    mockSupabase.auth.getUser.mockReset()
    mockSupabase.from.mockReset()
  })

  it('returns false when there is no session user', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    await expect(joinEvent('event-1')).resolves.toBe(false)
  })

  it('upserts the attendee when a session user exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })

    const upsert = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValue({ upsert })

    await expect(joinEvent('event-1')).resolves.toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('event_attendees')
    expect(upsert).toHaveBeenCalledWith(
      { event_id: 'event-1', user_id: 'user-1' },
      { onConflict: 'event_id,user_id', ignoreDuplicates: true }
    )
  })
})

describe('eventService.toggleReaction', () => {
  beforeEach(() => {
    mockSupabase.auth.getSession.mockReset()
    mockSupabase.auth.getUser.mockReset()
    mockSupabase.from.mockReset()
  })

  it('returns false when there is no current user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(toggleReaction('event-1', '🎉')).resolves.toBe(false)
  })

  it('deletes an existing reaction when it exists', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({ data: { id: 'reaction-1' }, error: null })
    const deleteFn = vi.fn().mockReturnThis()
    const deleteEq = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockReturnValue({
      select,
      eq,
      single,
      delete: deleteFn,
    })
    deleteFn.mockReturnValue({ eq: deleteEq })

    await expect(toggleReaction('event-1', '🎉')).resolves.toBe(true)
    expect(deleteFn).toHaveBeenCalled()
    expect(deleteEq).toHaveBeenCalledWith('id', 'reaction-1')
  })

  it('inserts a reaction when none exists', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null })

    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    const insert = vi.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockReturnValue({
      select,
      eq,
      single,
      insert,
    })

    await expect(toggleReaction('event-2', '🔥')).resolves.toBe(true)
    expect(insert).toHaveBeenCalledWith({ event_id: 'event-2', user_id: 'user-2', emoji: '🔥' })
  })
})

describe('eventService.addComment', () => {
  beforeEach(() => {
    mockSupabase.auth.getSession.mockReset()
    mockSupabase.auth.getUser.mockReset()
    mockSupabase.from.mockReset()
  })

  it('returns null when there is no current user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(addComment('event-1', 'Hello')).resolves.toBeNull()
  })

  it('returns the created comment when insert succeeds', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'comment-1',
        user_id: 'user-1',
        text: 'Hello',
        timestamp: '2025-01-01T00:00:00Z',
      },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      insert,
      select,
      single,
    })

    await expect(addComment('event-1', 'Hello')).resolves.toEqual({
      id: 'comment-1',
      userId: 'user-1',
      text: 'Hello',
      timestamp: '2025-01-01T00:00:00Z',
    })
  })
})
