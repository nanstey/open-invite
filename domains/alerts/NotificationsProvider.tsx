import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import type { Notification } from '../../lib/types';
import { fetchNotifications, markAllNotificationsAsRead } from '../../services/notificationService';
import { realtimeService } from '../../services/realtimeService';
import { useAuth } from '../auth/AuthProvider';

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

// Rows can carry a null/empty timestamp; treat those as the oldest so a bad value
// can't produce a NaN comparator and scramble the ordering.
const toTime = (timestamp: string): number => {
  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortByNewest = (list: Notification[]): Notification[] =>
  [...list].sort((a, b) => toTime(b.timestamp) - toTime(a.timestamp));

// Merge a freshly-fetched snapshot into what we already hold. The server copy wins
// for ids it contains (authoritative read state), but any row we already have that
// the snapshot predates — e.g. a realtime insert that raced the fetch — is preserved.
const mergeById = (current: Notification[], fetched: Notification[]): Notification[] => {
  const byId = new Map<string, Notification>();
  for (const n of current) {
    byId.set(n.id, n);
  }
  for (const n of fetched) {
    byId.set(n.id, n);
  }
  return sortByNewest([...byId.values()]);
};

/**
 * Owns the current user's notification stream for the whole authenticated shell:
 * an initial fetch, a realtime subscription that prepends new rows as they arrive,
 * and optimistic read-state updates. Both the nav unread badge and the alerts list
 * read from here so they stay in sync.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!userId) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
      }
      try {
        const fetched = await fetchNotifications();
        // Merge rather than replace so a realtime insert that arrived while this
        // fetch was in flight isn't clobbered by the older snapshot.
        setNotifications(prev => mergeById(prev, fetched));
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications([]);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [userId]
  );

  // Initial load and reload whenever the signed-in user changes (refresh's identity
  // is keyed on userId). Clear first so the merge in refresh() can't retain a
  // previous account's notifications when switching users.
  useEffect(() => {
    setNotifications(prev => (prev.length === 0 ? prev : []));
    void refresh();
  }, [refresh]);

  // Live updates: prepend inserts, de-duplicating against what we already hold.
  useEffect(() => {
    if (!userId) {
      return;
    }
    let active = true;
    let unsubscribe = () => {};

    void realtimeService
      .subscribeToNotifications(incoming => {
        setNotifications(prev => {
          if (prev.some(n => n.id === incoming.id)) {
            return prev;
          }
          return sortByNewest([incoming, ...prev]);
        });
      })
      .then(fn => {
        if (active) {
          unsubscribe = fn;
        } else {
          fn();
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => (n.isRead ? n : { ...n, isRead: true })));
    const ok = await markAllNotificationsAsRead();
    if (!ok) {
      // Reconcile with the server if the optimistic update didn't stick. Reconcile
      // silently so the already-rendered list doesn't flash the loading spinner.
      void refresh({ silent: true });
    }
  }, [refresh]);

  const unreadCount = notifications.reduce((count, n) => (n.isRead ? count : count + 1), 0);

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    refresh,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
