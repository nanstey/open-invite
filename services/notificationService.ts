import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/types';

/**
 * Fetch notifications for the current user
 */
export async function fetchNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false });

  if (error || !notifications) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return notifications.map(n => ({
    id: n.id,
    type: n.type as Notification['type'],
    title: n.title,
    message: n.message,
    timestamp: n.timestamp ?? '',
    relatedEventId: n.related_event_id || undefined,
    isRead: n.is_read,
    actorId: n.actor_id || undefined,
  }));
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  return !error;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return !error;
}

/**
 * Create a notification (typically called by backend/triggers)
 */
export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  relatedEventId?: string,
  actorId?: string
): Promise<Notification | null> {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      related_event_id: relatedEventId || null,
      actor_id: actorId || null,
    })
    .select()
    .single();

  if (error || !notification) {
    console.error('Error creating notification:', error);
    return null;
  }

  return {
    id: notification.id,
    type: notification.type as Notification['type'],
    title: notification.title,
    message: notification.message,
    timestamp: notification.timestamp ?? '',
    relatedEventId: notification.related_event_id || undefined,
    isRead: notification.is_read,
    actorId: notification.actor_id || undefined,
  };
}

