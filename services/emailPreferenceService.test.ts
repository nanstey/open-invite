import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase }));

import {
  fetchEmailPreferences,
  setEmailPreference,
  unsubscribeFromAllEmail,
} from './emailPreferenceService';

/**
 * A thenable query builder whose chainable methods return itself and which
 * resolves to `result` when awaited — matching how the supabase client chains.
 * `upsert` is recorded so tests can assert on the payload.
 */
function builder(result: { data?: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq', 'neq']) {
    b[m] = vi.fn(() => b);
  }
  b.upsert = vi.fn(() => b);
  // biome-ignore lint/suspicious/noThenProperty: supabase's query builder is thenable; the mock must be too.
  b.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return b;
}

function mockTables(results: Record<string, { data?: unknown; error?: unknown }>) {
  const builders: Record<string, ReturnType<typeof builder>> = {};
  supabase.from.mockImplementation((table: string) => {
    if (!(table in results)) {
      throw new Error(`Unhandled table ${table}`);
    }
    builders[table] ??= builder(results[table]);
    return builders[table];
  });
  return builders;
}

describe('emailPreferenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchEmailPreferences', () => {
    const topics = [
      {
        topic: 'notif.invite',
        message_class: 'transactional',
        description: 'Invites',
        default_subscribed: true,
        digestible: false,
      },
      {
        topic: 'notif.reaction',
        message_class: 'transactional',
        description: 'Reactions',
        default_subscribed: false,
        digestible: true,
      },
    ];

    it('applies the topic default when the user has no override', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockTables({
        email_topics: { data: topics, error: null },
        email_subscriptions: { data: [], error: null },
      });

      const prefs = await fetchEmailPreferences();

      expect(prefs).toHaveLength(2);
      expect(prefs[0]).toMatchObject({ topic: 'notif.invite', subscribed: true, isDefault: true });
      expect(prefs[1]).toMatchObject({
        topic: 'notif.reaction',
        subscribed: false,
        isDefault: true,
      });
    });

    it('a stored subscription overrides the default and flips isDefault', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockTables({
        email_topics: { data: topics, error: null },
        email_subscriptions: { data: [{ topic: 'notif.invite', subscribed: false }], error: null },
      });

      const prefs = await fetchEmailPreferences();

      expect(prefs[0]).toMatchObject({ subscribed: false, isDefault: false });
      // untouched topic still resolves to its default
      expect(prefs[1]).toMatchObject({ subscribed: false, isDefault: true });
    });

    it('still returns topics (defaults) when signed out', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const builders = mockTables({ email_topics: { data: topics, error: null } });

      const prefs = await fetchEmailPreferences();

      expect(prefs).toHaveLength(2);
      expect(builders.email_topics.select).toHaveBeenCalled();
      // never queries subscriptions without a user
      expect(supabase.from).not.toHaveBeenCalledWith('email_subscriptions');
    });

    it('returns [] when the topics query errors', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      mockTables({ email_topics: { data: null, error: { message: 'boom' } } });

      expect(await fetchEmailPreferences()).toEqual([]);
    });
  });

  describe('setEmailPreference', () => {
    it('returns false when signed out', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      expect(await setEmailPreference('notif.invite', false)).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('upserts the preference for the current user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      const builders = mockTables({ email_subscriptions: { error: null } });

      const ok = await setEmailPreference('notif.invite', false);

      expect(ok).toBe(true);
      expect(builders.email_subscriptions.upsert).toHaveBeenCalledWith(
        { user_id: 'u1', topic: 'notif.invite', subscribed: false },
        { onConflict: 'user_id,topic' }
      );
    });
  });

  describe('unsubscribeFromAllEmail', () => {
    it('turns off every non-account topic in one upsert', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      const builders = mockTables({
        email_topics: {
          data: [
            { topic: 'notif.invite', message_class: 'transactional' },
            { topic: 'notif.reminder', message_class: 'transactional' },
          ],
          error: null,
        },
        email_subscriptions: { error: null },
      });

      const ok = await unsubscribeFromAllEmail();

      expect(ok).toBe(true);
      expect(builders.email_topics.neq).toHaveBeenCalledWith('message_class', 'account');
      expect(builders.email_subscriptions.upsert).toHaveBeenCalledWith(
        [
          { user_id: 'u1', topic: 'notif.invite', subscribed: false },
          { user_id: 'u1', topic: 'notif.reminder', subscribed: false },
        ],
        { onConflict: 'user_id,topic' }
      );
    });
  });
});
