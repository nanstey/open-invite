export interface Comment {
  id: string
  userId: string
  text: string
  timestamp: string
  reactions?: Record<string, Reaction>
}

export interface Reaction {
  emoji: string
  count: number
  userReacted: boolean
  userIds?: string[]
}

export interface ItineraryItem {
  id: string
  eventId: string
  title: string
  startTime: string // ISO
  durationMinutes: number
  location?: string // defaults to event.location when omitted
  description?: string
}

export interface ItineraryAttendance {
  id: string
  eventId: string
  userId: string
  itineraryItemIds: string[]
  createdAt?: string
  updatedAt?: string
}

export type ExpenseSplitType = 'GROUP' | 'PER_PERSON'
export type ExpenseTiming = 'UP_FRONT' | 'SETTLED_LATER'
export type ExpenseSettledKind = 'EXACT' | 'ESTIMATE'
export type ExpenseAppliesTo = 'EVERYONE' | 'HOST_ONLY' | 'GUESTS_ONLY' | 'CUSTOM'

export interface EventExpense {
  id: string
  eventId: string
  sortOrder?: number
  title: string
  appliesTo: ExpenseAppliesTo
  splitType: ExpenseSplitType
  timing: ExpenseTiming
  /**
   * Only present when `timing === 'SETTLED_LATER'`.
   */
  settledKind?: ExpenseSettledKind
  /**
   * Stored value for the expense:
   * - UP_FRONT
   * - SETTLED_LATER + EXACT
   * - SETTLED_LATER + ESTIMATE (displayed with a "~" prefix)
   */
  amountCents?: number
  currency: string
  participantIds: string[]
  itineraryItemId?: string | null
}

export enum EventVisibility {
  ALL_FRIENDS = 'ALL_FRIENDS',
  GROUPS = 'GROUPS',
  INVITE_ONLY = 'INVITE_ONLY',
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

export type ItineraryTimeDisplay = 'START_ONLY' | 'START_AND_END'

export interface SocialEvent {
  id: string
  slug: string
  hostId: string
  title: string
  headerImageUrl?: string
  headerImagePositionY?: number
  description: string
  activityType: string // e.g., "Dining", "Sport", "Travel"
  location: string
  coordinates?: { lat: number; lng: number } // Optional until a place is selected
  locationData?: LocationData
  startTime: string // ISO String
  endTime?: string
  isFlexibleStart: boolean
  isFlexibleEnd: boolean
  visibilityType: EventVisibility
  groupIds: string[] // Array of group UUIDs (for GROUPS visibility)
  allowFriendInvites: boolean
  maxSeats?: number
  attendees: string[] // User IDs
  itineraryAttendanceEnabled?: boolean
  noPhones: boolean
  itineraryTimeDisplay: ItineraryTimeDisplay
  comments: Comment[]
  reactions: Record<string, Reaction> // key is emoji
  itineraryItems?: ItineraryItem[] // optional to keep list fetch lightweight
  itineraryAttendance?: ItineraryAttendance[] // optional to keep list fetch lightweight
  expenses?: EventExpense[] // optional to keep list fetch lightweight
}

// UI-only modes used within events domain
export type InvitesMode = 'LIST' | 'MAP' | 'CALENDAR'
export type MyEventsMode = 'HOSTING' | 'ATTENDING'

// Re-export EventsView from the navigation hook for convenience
export { type EventsView } from './hooks/useEventNavigation'
