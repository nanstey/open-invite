
export interface User {
  id: string;
  name: string;
  avatar: string;
  isCurrentUser?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export enum EventVisibility {
  ALL_FRIENDS = 'ALL_FRIENDS',
  GROUPS = 'GROUPS',
  INVITE_ONLY = 'INVITE_ONLY',
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  isOpen: boolean;
  deletedAt?: string;
}

export type LocationData = {
  provider: 'photon'
  providerId?: {
    osm_id?: number
    osm_type?: string
  }
  display: {
    full: string
    placeName?: string
    addressLine?: string
    localityLine?: string
    postcode?: string
    country?: string
  }
  geo: { lat: number; lng: number }
  raw?: Record<string, unknown>
}

export interface SocialEvent {
  id: string;
  slug: string;
  hostId: string;
  title: string;
  description: string;
  activityType: string; // e.g., "Dining", "Sport", "Travel"
  location: string;
  coordinates?: { lat: number; lng: number }; // Optional until a place is selected
  locationData?: LocationData;
  startTime: string; // ISO String
  endTime?: string;
  isFlexibleStart: boolean;
  isFlexibleEnd: boolean;
  visibilityType: EventVisibility;
  groupIds: string[]; // Array of group UUIDs (for GROUPS visibility)
  allowFriendInvites: boolean;
  maxSeats?: number;
  attendees: string[]; // User IDs
  noPhones: boolean;
  comments: Comment[];
  reactions: Record<string, Reaction>; // key is emoji
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
export type InvitesMode = 'LIST' | 'MAP' | 'CALENDAR';
export type FriendsMode = 'FRIENDS' | 'GROUPS';
export type MyEventsMode = 'HOSTING' | 'ATTENDING';
