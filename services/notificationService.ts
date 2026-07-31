import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/types';

/**
 * Fetch notifications for the current user
 */
export async function fetchNotifications(): Promise<Notification[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
 * Count unread notifications for the current user.
 *
 * This is the authoritative source for the nav unread badge: a `COUNT` against the
 * server rather than a tally of whatever the client happens to have loaded, so the
 * badge stays correct even if the alerts list is ever paginated or capped.
 */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }

  return count ?? 0;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
 * Create a SYSTEM notification for a user.
 *
 * Activity notifications (INVITE/COMMENT/REACTION/REMINDER) are created server-side
 * by database triggers and the reminder scanner — clients never insert those. The
 * only client-initiated case is an admin SYSTEM broadcast, which goes through the
 * `create_system_notification` RPC. That RPC authorizes the caller (admin only) and
 * delegates to the trusted server-side helper, so a non-admin call is rejected and
 * the notifications table's insert path stays closed to direct client writes.
 *
 * Returns true on success, false if the RPC errors (e.g. caller is not an admin).
 */
export async function createSystemNotification(args: {
  userId: string;
  title: string;
  message: string;
  relatedEventId?: string;
  dedupKey?: string;
}): Promise<boolean> {
  const { error } = await supabase.rpc('create_system_notification', {
    p_user_id: args.userId,
    p_title: args.title,
    p_message: args.message,
    p_related_event_id: args.relatedEventId ?? null,
    p_dedup_key: args.dedupKey ?? null,
  });

  if (error) {
    console.error('Error creating system notification:', error);
    return false;
  }

  return true;
}
