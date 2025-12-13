import { supabase } from '../lib/supabase';
import type { SocialEvent, Comment, Reaction, Notification } from '../types';
import { fetchEventById, fetchEvents } from './eventService';
import { fetchNotifications } from './notificationService';

type EventCallback = (event: SocialEvent) => void;
type CommentCallback = (comment: Comment, eventId: string) => void;
type ReactionCallback = (reaction: Reaction, eventId: string, emoji: string) => void;
type NotificationCallback = (notification: Notification) => void;

class RealtimeService {
  private eventSubscriptions: Map<string, any> = new Map();
  private commentSubscriptions: Map<string, any> = new Map();
  private reactionSubscriptions: Map<string, any> = new Map();
  private notificationSubscription: any = null;

  /**
   * Subscribe to changes for a specific event
   */
  subscribeToEvent(
    eventId: string,
    callbacks: {
      onUpdate?: EventCallback;
      onDelete?: (eventId: string) => void;
    }
  ): () => void {
    // Unsubscribe if already subscribed
    if (this.eventSubscriptions.has(eventId)) {
      this.eventSubscriptions.get(eventId)?.unsubscribe();
    }

    const subscription = supabase
      .channel(`event:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedEvent = await fetchEventById(eventId);
            if (updatedEvent && callbacks.onUpdate) {
              callbacks.onUpdate(updatedEvent);
            }
          } else if (payload.eventType === 'DELETE' && callbacks.onDelete) {
            callbacks.onDelete(eventId);
          }
        }
      )
      .subscribe();

    this.eventSubscriptions.set(eventId, subscription);

    return () => {
      subscription.unsubscribe();
      this.eventSubscriptions.delete(eventId);
    };
  }

  /**
   * Subscribe to all events (for new events)
   */
  subscribeToAllEvents(callback: EventCallback): () => void {
    const subscription = supabase
      .channel('events:all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
        },
        async (payload) => {
          const newEvent = await fetchEventById(payload.new.id);
          if (newEvent) {
            callback(newEvent);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Subscribe to comments for an event
   */
  subscribeToComments(
    eventId: string,
    callback: CommentCallback
  ): () => void {
    // Unsubscribe if already subscribed
    if (this.commentSubscriptions.has(eventId)) {
      this.commentSubscriptions.get(eventId)?.unsubscribe();
    }

    const subscription = supabase
      .channel(`comments:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const comment: Comment = {
            id: payload.new.id,
            userId: payload.new.user_id,
            text: payload.new.text,
            timestamp: payload.new.timestamp,
          };
          callback(comment, eventId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // On delete, refetch comments or handle as needed
          // For now, we'll just trigger a refetch
        }
      )
      .subscribe();

    this.commentSubscriptions.set(eventId, subscription);

    return () => {
      subscription.unsubscribe();
      this.commentSubscriptions.delete(eventId);
    };
  }

  /**
   * Subscribe to reactions for an event
   */
  subscribeToReactions(
    eventId: string,
    callback: (reactions: Record<string, Reaction>) => void
  ): () => void {
    // Unsubscribe if already subscribed
    if (this.reactionSubscriptions.has(eventId)) {
      this.reactionSubscriptions.get(eventId)?.unsubscribe();
    }

    const subscription = supabase
      .channel(`reactions:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `event_id=eq.${eventId}`,
        },
        async () => {
          // Refetch reactions to get accurate counts
          const event = await fetchEventById(eventId);
          if (event) {
            callback(event.reactions);
          }
        }
      )
      .subscribe();

    this.reactionSubscriptions.set(eventId, subscription);

    return () => {
      subscription.unsubscribe();
      this.reactionSubscriptions.delete(eventId);
    };
  }

  /**
   * Subscribe to attendees for an event
   */
  subscribeToAttendees(
    eventId: string,
    callback: (attendees: string[]) => void
  ): () => void {
    const subscription = supabase
      .channel(`attendees:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        async () => {
          const event = await fetchEventById(eventId);
          if (event) {
            callback(event.attendees);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Subscribe to notifications for the current user
   */
  async subscribeToNotifications(callback: NotificationCallback): Promise<() => void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return () => {}; // No-op unsubscribe
    }

    // Unsubscribe if already subscribed
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }

    const subscription = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification: Notification = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            timestamp: payload.new.timestamp,
            relatedEventId: payload.new.related_event_id || undefined,
            isRead: payload.new.is_read,
            actorId: payload.new.actor_id || undefined,
          };
          callback(notification);
        }
      )
      .subscribe();

    this.notificationSubscription = subscription;

    return () => {
      subscription.unsubscribe();
      this.notificationSubscription = null;
    };
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    this.eventSubscriptions.forEach(sub => sub.unsubscribe());
    this.eventSubscriptions.clear();
    this.commentSubscriptions.forEach(sub => sub.unsubscribe());
    this.commentSubscriptions.clear();
    this.reactionSubscriptions.forEach(sub => sub.unsubscribe());
    this.reactionSubscriptions.clear();
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
      this.notificationSubscription = null;
    }
  }
}

export const realtimeService = new RealtimeService();

