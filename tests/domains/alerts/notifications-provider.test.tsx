import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotificationsProvider,
  useNotifications,
} from '../../../domains/alerts/NotificationsProvider';
import type { Notification } from '../../../lib/types';

const fetchNotifications = vi.fn();
const markAllNotificationsAsRead = vi.fn();
const markNotificationAsRead = vi.fn();
const subscribeToNotifications = vi.fn();
const useAuth = vi.fn();

vi.mock('../../../services/notificationService', () => ({
  fetchNotifications: () => fetchNotifications(),
  markAllNotificationsAsRead: () => markAllNotificationsAsRead(),
  markNotificationAsRead: (id: string) => markNotificationAsRead(id),
}));

vi.mock('../../../services/realtimeService', () => ({
  realtimeService: {
    subscribeToNotifications: (cb: (n: Notification) => void) => subscribeToNotifications(cb),
  },
}));

vi.mock('../../../domains/auth/AuthProvider', () => ({
  useAuth: () => useAuth(),
}));

const notif = (over: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  type: 'COMMENT',
  title: 'New comment',
  message: 'Hi',
  timestamp: '2026-07-17T10:00:00.000Z',
  isRead: false,
  ...over,
});

function Harness() {
  const { notifications, unreadCount, loading, markAllAsRead } = useNotifications();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{notifications.length}</span>
      <span data-testid="unread">{unreadCount}</span>
      <button type="button" onClick={() => markAllAsRead()}>
        mark all
      </button>
    </div>
  );
}

const renderProvider = () =>
  render(
    <NotificationsProvider>
      <Harness />
    </NotificationsProvider>
  );

describe('NotificationsProvider', () => {
  let realtimeCb: (n: Notification) => void = () => {};

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCb = () => {};
    useAuth.mockReturnValue({ user: { id: 'user-1' } });
    markAllNotificationsAsRead.mockResolvedValue(true);
    markNotificationAsRead.mockResolvedValue(true);
    subscribeToNotifications.mockImplementation((cb: (n: Notification) => void) => {
      realtimeCb = cb;
      return Promise.resolve(() => {});
    });
  });

  it('loads notifications and derives the unread count', async () => {
    fetchNotifications.mockResolvedValue([
      notif({ id: 'a', isRead: false }),
      notif({ id: 'b', isRead: true }),
    ]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('count').textContent).toBe('2');
    expect(screen.getByTestId('unread').textContent).toBe('1');
  });

  it('prepends realtime inserts and bumps the unread count, de-duping by id', async () => {
    fetchNotifications.mockResolvedValue([notif({ id: 'a', isRead: true })]);

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    await waitFor(() => expect(subscribeToNotifications).toHaveBeenCalled());

    await act(async () => {
      realtimeCb(notif({ id: 'z', isRead: false }));
    });
    expect(screen.getByTestId('count').textContent).toBe('2');
    expect(screen.getByTestId('unread').textContent).toBe('1');

    // Same id again is ignored.
    await act(async () => {
      realtimeCb(notif({ id: 'z', isRead: false }));
    });
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('keeps a realtime insert that races the initial fetch (merge, not overwrite)', async () => {
    let resolveFetch: (value: Notification[]) => void = () => {};
    fetchNotifications.mockReturnValue(
      new Promise<Notification[]>(resolve => {
        resolveFetch = resolve;
      })
    );

    renderProvider();

    // Subscription is live before the initial fetch resolves.
    await waitFor(() => expect(subscribeToNotifications).toHaveBeenCalled());

    // A new notification arrives while the initial fetch is still in flight.
    await act(async () => {
      realtimeCb(notif({ id: 'live', isRead: false }));
    });
    expect(screen.getByTestId('count').textContent).toBe('1');

    // The fetch now resolves with an older snapshot that predates the live insert.
    await act(async () => {
      resolveFetch([notif({ id: 'old', isRead: true })]);
    });

    // Both rows survive — the live insert was merged in, not clobbered.
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    expect(screen.getByTestId('unread').textContent).toBe('1');
  });

  it('marks all as read optimistically and calls the service', async () => {
    fetchNotifications.mockResolvedValue([
      notif({ id: 'a', isRead: false }),
      notif({ id: 'b', isRead: false }),
    ]);

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('unread').textContent).toBe('2'));

    await act(async () => {
      screen.getByText('mark all').click();
    });

    expect(markAllNotificationsAsRead).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('unread').textContent).toBe('0');
  });

  it('stays empty and does not subscribe when signed out', async () => {
    useAuth.mockReturnValue({ user: null });
    fetchNotifications.mockResolvedValue([]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(subscribeToNotifications).not.toHaveBeenCalled();
  });
});
