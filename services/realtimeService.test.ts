import { describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  channel: vi.fn(),
}))

const eventService = vi.hoisted(() => ({
  fetchEventById: vi.fn(),
  fetchEvents: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase }))
vi.mock('./eventService', () => eventService)

import { realtimeService } from './realtimeService'

describe('realtimeService', () => {
  it('subscribeToEvent fetches event on update and calls onDelete on delete', async () => {
    const callbacks = {
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
    }
    const listeners: Array<(payload: any) => void> = []
    const subscription = { unsubscribe: vi.fn() }

    const channel = {
      on: (_type: string, _filter: any, handler: (payload: any) => void) => {
        listeners.push(handler)
        return channel
      },
      subscribe: () => subscription,
    }
    supabase.channel.mockReturnValue(channel)

    eventService.fetchEventById.mockResolvedValue({ id: 'event-1', reactions: {}, attendees: [], comments: [] })

    const unsubscribe = realtimeService.subscribeToEvent('event-1', callbacks)

    await listeners[0]({ eventType: 'UPDATE' })
    await listeners[0]({ eventType: 'INSERT' })
    await listeners[0]({ eventType: 'DELETE' })

    expect(callbacks.onUpdate).toHaveBeenCalledTimes(2)
    expect(callbacks.onDelete).toHaveBeenCalledWith('event-1')

    unsubscribe()
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })

  it('subscribeToReactions refetches event and calls callback', async () => {
    const listeners: Array<() => void> = []
    const subscription = { unsubscribe: vi.fn() }

    const channel = {
      on: (_type: string, _filter: any, handler: () => void) => {
        listeners.push(handler)
        return channel
      },
      subscribe: () => subscription,
    }
    supabase.channel.mockReturnValue(channel)

    eventService.fetchEventById.mockResolvedValue({ id: 'event-1', reactions: { '🎉': { emoji: '🎉', count: 1, userReacted: false } } })

    const callback = vi.fn()
    const unsubscribe = realtimeService.subscribeToReactions('event-1', callback)

    await listeners[0]()

    expect(callback).toHaveBeenCalledWith({ '🎉': { emoji: '🎉', count: 1, userReacted: false } })

    unsubscribe()
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })

  it('subscribeToNotifications returns no-op when no user', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const unsubscribe = await realtimeService.subscribeToNotifications(vi.fn())

    expect(typeof unsubscribe).toBe('function')
  })

  it('subscribeToNotifications passes shaped notification on insert', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    let handler: ((payload: any) => void) | undefined
    const subscription = { unsubscribe: vi.fn() }

    const channel = {
      on: (_type: string, _filter: any, cb: (payload: any) => void) => {
        handler = cb
        return channel
      },
      subscribe: () => subscription,
    }
    supabase.channel.mockReturnValue(channel)

    const callback = vi.fn()
    const unsubscribe = await realtimeService.subscribeToNotifications(callback)

    handler?.({
      new: {
        id: 'notif-1',
        type: 'event',
        title: 'New event',
        message: 'Hello',
        timestamp: '2025-01-01',
        related_event_id: 'event-1',
        is_read: false,
        actor_id: 'user-2',
      },
    })

    expect(callback).toHaveBeenCalledWith({
      id: 'notif-1',
      type: 'event',
      title: 'New event',
      message: 'Hello',
      timestamp: '2025-01-01',
      relatedEventId: 'event-1',
      isRead: false,
      actorId: 'user-2',
    })

    unsubscribe()
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })
})
