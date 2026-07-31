export type ProfileVisibility = 'public' | 'private';

/** Whitelisted social platforms ("the usual suspects"). */
export const SOCIAL_PLATFORMS = [
  'instagram',
  'x',
  'tiktok',
  'linkedin',
  'facebook',
  'website',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export interface User {
  id: string;
  name: string;
  avatar: string;
  username?: string;
  bio?: string;
  location?: string;
  pronouns?: string;
  socialLinks?: SocialLinks;
  profileVisibility?: ProfileVisibility;
  isCurrentUser?: boolean;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  allowMembersCreateEvents: boolean;
  allowMembersAddMembers: boolean;
  newMembersRequireAdminApproval: boolean;
  deletedAt?: string;
}

export type GroupRole = 'ADMIN' | 'MEMBER';

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

export type ViewMode = 'EXPLORE' | 'EVENTS' | 'FRIENDS' | 'ALERTS' | 'PROFILE';
export type FriendsMode = 'FRIENDS' | 'GROUPS';

// Event-domain types live in `domains/events/types.ts`. Keep these exports to avoid
// breaking existing imports outside the events domain during migration.
export type {
  Comment,
  InvitesMode,
  ItineraryItem,
  LocationData,
  MyEventsMode,
  Reaction,
  SocialEvent,
} from '../domains/events/types';
export { EventVisibility } from '../domains/events/types';
