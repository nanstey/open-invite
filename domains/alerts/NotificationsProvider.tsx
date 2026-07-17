import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import type { Notification } from '../../lib/types';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../services/notificationService';
import { realtimeService } from '../../services/realtimeService';
import { useAuth } from '../auth/AuthProvider';

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const sortByNewest = (list: Notification[]): Notification[] =>
  [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fetched = await fetchNotifications();
      setNotifications(sortByNewest(fetched));
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load and reload whenever the signed-in user changes.
  useEffect(() => {
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
      // Reconcile with the server if the optimistic update didn't stick.
      void refresh();
    }
  }, [refresh]);

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
      const ok = await markNotificationAsRead(id);
      if (!ok) {
        void refresh();
      }
    },
    [refresh]
  );

  const unreadCount = notifications.reduce((count, n) => (n.isRead ? count : count + 1), 0);

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    markAsRead,
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
