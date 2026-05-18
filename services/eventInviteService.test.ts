import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase }));

import { EVENT_INVITE_RECIPIENT_LIMIT, sendEventInvites } from './eventInviteService';

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table];
    if (!handler) throw new Error(`Unhandled table ${table}`);
    return handler();
  });
};

describe('eventInviteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'host-1' } } },
    });
  });

  it('deduplicates recipients, skips existing invites, and inserts only new rows', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    mockFrom({
      events: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { host_id: 'host-1' }, error: null }) }),
        }),
      }),
      event_invites: () => ({
        select: () => ({
          eq: () => ({
            in: async () => ({ data: [{ user_id: 'user-2' }], error: null }),
          }),
        }),
        insert,
      }),
    });

    const result = await sendEventInvites({
      eventId: 'event-1',
      recipientIds: ['user-2', 'user-3', 'user-3', 'host-1'],
    });

    expect(result).toEqual({
      requested: 2,
      inserted: 1,
      skippedExisting: 1,
      recipientIds: ['user-2', 'user-3'],
    });
    expect(insert).toHaveBeenCalledWith([
      { event_id: 'event-1', user_id: 'user-3', invited_by: 'host-1' },
    ]);
  });

  it('enforces the 99 recipient cap before writing', async () => {
    const insert = vi.fn();
    mockFrom({
      events: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { host_id: 'host-1' }, error: null }) }),
        }),
      }),
      event_invites: () => ({
        select: () => ({
          eq: () => ({ in: async () => ({ data: [], error: null }) }),
        }),
        insert,
      }),
    });

    await expect(
      sendEventInvites({
        eventId: 'event-1',
        recipientIds: Array.from(
          { length: EVENT_INVITE_RECIPIENT_LIMIT + 1 },
          (_, index) => `user-${index}`
        ),
      })
    ).rejects.toThrow('Choose 99 or fewer recipients.');

    expect(insert).not.toHaveBeenCalled();
  });

  it('requires the current user to be the host', async () => {
    mockFrom({
      events: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { host_id: 'someone-else' }, error: null }) }),
        }),
      }),
    });

    await expect(
      sendEventInvites({ eventId: 'event-1', recipientIds: ['user-2'] })
    ).rejects.toThrow('Only the host can send invites.');
  });
});
