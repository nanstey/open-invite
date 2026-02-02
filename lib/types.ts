
export interface User {
  id: string;
  name: string;
  avatar: string;
  isCurrentUser?: boolean;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  isOpen: boolean;
  deletedAt?: string;
}

export interface Notification {
  id: string;
  type: 'INVITE' | 'COMMENT' | 'REACTION' | 'REMINDER' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  relatedEventId?: string;
  isRead: boolean;
  actorId?: string; // Who triggered it
}

export type ViewMode = 'EVENTS' | 'FRIENDS' | 'ALERTS' | 'PROFILE';
export type FriendsMode = 'FRIENDS';

// Event-domain types live in `domains/events/types.ts`. Keep these exports to avoid
// breaking existing imports outside the events domain during migration.
export type { Comment, Reaction, ItineraryItem, LocationData, SocialEvent, InvitesMode, MyEventsMode } from '../domains/events/types'
export { EventVisibility } from '../domains/events/types'
