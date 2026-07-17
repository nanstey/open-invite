import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase }));

import {
  createSystemNotification,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notificationService';

const mockNotificationsTable = (handler: () => any) => {
  supabase.from.mockImplementation((table: string) => {
    if (table !== 'notifications') {
      throw new Error(`Unhandled table ${table}`);
    }
    return handler();
  });
};

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNotifications', () => {
    it('returns [] if no current user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await fetchNotifications();

      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('queries current user notifications ordered by timestamp desc', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const eq = vi.fn(() => ({ order }));
      const order = vi.fn(async () => ({ data: [], error: null }));
      const select = vi.fn(() => ({ eq }));

      mockNotificationsTable(() => ({ select }));

      await fetchNotifications();

      expect(select).toHaveBeenCalledWith('*');
      expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(order).toHaveBeenCalledWith('timestamp', { ascending: false });
    });

    it('maps DB shape to domain with undefined optional ids when null', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
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
      }));

      const result = await fetchNotifications();

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
      ]);
    });

    it('returns [] on query error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockNotificationsTable(() => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: null, error: new Error('db error') }),
          }),
        }),
      }));

      const result = await fetchNotifications();

      expect(result).toEqual([]);
    });
  });

  describe('markNotificationAsRead', () => {
    it('updates is_read=true by notification id', async () => {
      const eq = vi.fn(async () => ({ error: null }));
      const update = vi.fn(() => ({ eq }));
      mockNotificationsTable(() => ({ update }));

      const result = await markNotificationAsRead('notification-1');

      expect(update).toHaveBeenCalledWith({ is_read: true });
      expect(eq).toHaveBeenCalledWith('id', 'notification-1');
      expect(result).toBe(true);
    });

    it('returns false when update returns an error', async () => {
      mockNotificationsTable(() => ({
        update: () => ({
          eq: async () => ({ error: new Error('db error') }),
        }),
      }));

      const result = await markNotificationAsRead('notification-1');

      expect(result).toBe(false);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('returns false when unauthenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await markAllNotificationsAsRead();

      expect(result).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('updates by user_id and is_read=false', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const secondEq = vi.fn(async () => ({ error: null }));
      const firstEq = vi.fn(() => ({ eq: secondEq }));
      const update = vi.fn(() => ({ eq: firstEq }));
      mockNotificationsTable(() => ({ update }));

      const result = await markAllNotificationsAsRead();

      expect(update).toHaveBeenCalledWith({ is_read: true });
      expect(firstEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(secondEq).toHaveBeenCalledWith('is_read', false);
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockNotificationsTable(() => ({
        update: () => ({
          eq: () => ({
            eq: async () => ({ error: new Error('db error') }),
          }),
        }),
      }));

      const result = await markAllNotificationsAsRead();

      expect(result).toBe(false);
    });
  });

  describe('createSystemNotification', () => {
    it('calls the authorized RPC with mapped params and returns true on success', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await createSystemNotification({
        userId: 'user-1',
        title: 'Heads up',
        message: 'Scheduled maintenance tonight',
        relatedEventId: 'event-1',
        dedupKey: 'system:maint-2026-07-17',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('create_system_notification', {
        p_user_id: 'user-1',
        p_title: 'Heads up',
        p_message: 'Scheduled maintenance tonight',
        p_related_event_id: 'event-1',
        p_dedup_key: 'system:maint-2026-07-17',
      });
      expect(result).toBe(true);
    });

    it('passes null for omitted optional params', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await createSystemNotification({
        userId: 'user-1',
        title: 'Title',
        message: 'Message',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('create_system_notification', {
        p_user_id: 'user-1',
        p_title: 'Title',
        p_message: 'Message',
        p_related_event_id: null,
        p_dedup_key: null,
      });
      expect(result).toBe(true);
    });

    it('returns false when the RPC errors (e.g. caller is not an admin)', async () => {
      supabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Only admins may create system notifications'),
      });

      const result = await createSystemNotification({
        userId: 'user-1',
        title: 'Title',
        message: 'Message',
      });

      expect(result).toBe(false);
    });

    it('does not perform a direct table insert', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      await createSystemNotification({ userId: 'user-1', title: 'T', message: 'M' });

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
