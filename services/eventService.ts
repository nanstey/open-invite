import { supabase } from '../lib/supabase';
import type { SocialEvent, Comment, Reaction, EventVisibility, LocationData } from '../domains/events/types';
import type { Database } from '../lib/database.types';
import { fetchItineraryItems } from './itineraryService'
import { fetchEventExpenses } from './expenseService'
import { isUuid } from '../domains/events/components/detail/route/routing'

type EventRow = Database['public']['Tables']['events']['Row'];
type EventAttendeeRow = Database['public']['Tables']['event_attendees']['Row'];
type CommentRow = Database['public']['Tables']['comments']['Row'];
type ReactionRow = Database['public']['Tables']['reactions']['Row'];
type EventGroupRow = Database['public']['Tables']['event_groups']['Row'];

function isNoRowsError(error: any): boolean {
  return error?.code === 'PGRST116' || error?.message?.includes('No rows');
}

async function markEventViewedById(eventId: string): Promise<boolean> {
  try {
    const result = await (supabase as any).rpc('mark_event_viewed', { event_id_param: eventId });
    const { data, error } = result as { data: boolean | null; error: any };
    if (error) {
      console.error('Error marking event viewed by id:', error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.error('Error marking event viewed by id (exception):', e);
    return false;
  }
}

async function markEventViewedBySlug(slug: string): Promise<string | null> {
  try {
    const result = await (supabase as any).rpc('mark_event_viewed_by_slug', { slug_param: slug });
    const { data, error } = result as { data: string | null; error: any };
    if (error) {
      console.error('Error marking event viewed by slug:', error);
      return null;
    }
    return data ?? null;
  } catch (e) {
    console.error('Error marking event viewed by slug (exception):', e);
    return null;
  }
}

/**
 * Treat "viewing an event" as "invited by link".
 * Safe to call repeatedly (idempotent).
 */
export async function markEventViewedFromRouteParam(slugOrId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (isUuid(slugOrId)) {
    await markEventViewedById(slugOrId);
    return;
  }

  await markEventViewedBySlug(slugOrId);
}

/**
 * Transform database event row to SocialEvent type
 */
function transformEventRow(
  row: any,
  attendees: string[],
  comments: Comment[],
  reactions: Record<string, Reaction>,
  groupIds: string[],
  itineraryItems?: SocialEvent['itineraryItems'],
  expenses?: SocialEvent['expenses'],
): SocialEvent {
  return {
    id: row.id,
    slug: row.slug,
    hostId: row.host_id,
    title: row.title,
    headerImageUrl: row.header_image_url || undefined,
    headerImagePositionY: row.header_image_position_y ?? undefined,
    description: row.description,
    activityType: row.activity_type,
    location: row.location,
    coordinates: row.coordinates ? (row.coordinates as { lat: number; lng: number }) : undefined,
    locationData: row.location_data ? (row.location_data as LocationData) : undefined,
    startTime: row.start_time,
    endTime: row.end_time || undefined,
    isFlexibleStart: row.is_flexible_start,
    isFlexibleEnd: row.is_flexible_end,
    visibilityType: row.visibility_type as EventVisibility,
    groupIds,
    allowFriendInvites: row.allow_friend_invites,
    maxSeats: row.max_seats || undefined,
    attendees,
    noPhones: row.no_phones,
    comments,
    reactions,
    itineraryItems,
    expenses,
  };
}

/**
 * Fetch all events visible to the current user
 */
export async function fetchEvents(currentUserId?: string): Promise<SocialEvent[]> {
  const { data: eventsData, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  const events = (eventsData || []) as EventRow[];

  if (events.length === 0) {
    return [];
  }

  // Fetch attendees, comments, reactions, and event groups for all events
  const eventIds = events.map(e => e.id);
  
  const [attendeesResult, commentsResult, reactionsResult, eventGroupsResult] = await Promise.all([
    supabase.from('event_attendees').select('*').in('event_id', eventIds),
    supabase.from('comments').select('*').in('event_id', eventIds).order('timestamp', { ascending: true }),
    supabase.from('reactions').select('*').in('event_id', eventIds),
    supabase.from('event_groups').select('*').in('event_id', eventIds),
  ]);

  const attendeesData = attendeesResult.data as EventAttendeeRow[] | null;
  const commentsData = commentsResult.data as CommentRow[] | null;
  const reactionsData = reactionsResult.data as ReactionRow[] | null;
  const eventGroupsData = eventGroupsResult.data as EventGroupRow[] | null;

  const attendeesMap = new Map<string, string[]>();
  const commentsMap = new Map<string, Comment[]>();
  const reactionsMap = new Map<string, Map<string, Reaction>>();
  const groupIdsMap = new Map<string, string[]>();

  // Process attendees
  if (attendeesData) {
    attendeesData.forEach(att => {
      if (!attendeesMap.has(att.event_id)) {
        attendeesMap.set(att.event_id, []);
      }
      attendeesMap.get(att.event_id)!.push(att.user_id);
    });
  }

  // Process event groups
  if (eventGroupsData) {
    eventGroupsData.forEach(eg => {
      if (!groupIdsMap.has(eg.event_id)) {
        groupIdsMap.set(eg.event_id, []);
      }
      groupIdsMap.get(eg.event_id)!.push(eg.group_id);
    });
  }

  // Process comments
  if (commentsData) {
    commentsData.forEach(comment => {
      if (!commentsMap.has(comment.event_id)) {
        commentsMap.set(comment.event_id, []);
      }
      commentsMap.get(comment.event_id)!.push({
        id: comment.id,
        userId: comment.user_id,
        text: comment.text,
        timestamp: comment.timestamp,
      });
    });
  }

  // Process reactions
  if (reactionsData) {
    reactionsData.forEach(reaction => {
      if (!reactionsMap.has(reaction.event_id)) {
        reactionsMap.set(reaction.event_id, new Map());
      }
      const eventReactions = reactionsMap.get(reaction.event_id)!;
      
      if (!eventReactions.has(reaction.emoji)) {
        eventReactions.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 0,
          userReacted: false,
        });
      }
      
      const r = eventReactions.get(reaction.emoji)!;
      r.count++;
      if (currentUserId && reaction.user_id === currentUserId) {
        r.userReacted = true;
      }
    });
  }

  // Transform events
  return events.map((event: EventRow) => {
    const attendees = attendeesMap.get(event.id) || [];
    const comments = commentsMap.get(event.id) || [];
    const groupIds = groupIdsMap.get(event.id) || [];
    const reactionsObj: Record<string, Reaction> = {};
    reactionsMap.get(event.id)?.forEach((reaction, emoji) => {
      reactionsObj[emoji] = reaction;
    });

    return transformEventRow(event, attendees, comments, reactionsObj, groupIds);
  });
}

/**
 * Fetch a single event by ID
 */
export async function fetchEventById(eventId: string): Promise<SocialEvent | null> {
  const fetchOnce = async (): Promise<EventRow | null> => {
    const { data: event, error } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (error || !event) {
      console.error('Error fetching event:', error);
      return null;
    }
    return event as EventRow;
  };

  let eventRow = await fetchOnce();
  if (!eventRow) {
    // If authenticated, treat "trying to view by id" as accepting/invited-by-link and retry once.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const marked = await markEventViewedById(eventId);
      if (marked) {
        eventRow = await fetchOnce();
      }
    }
  }

  if (!eventRow) return null;

  // Fetch related data
  const [attendeesResult, commentsResult, reactionsResult, eventGroupsResult, itineraryItems, expenses] = await Promise.all([
    supabase.from('event_attendees').select('*').eq('event_id', eventId),
    supabase.from('comments').select('*').eq('event_id', eventId).order('timestamp', { ascending: true }),
    supabase.from('reactions').select('*').eq('event_id', eventId),
    supabase.from('event_groups').select('*').eq('event_id', eventId),
    fetchItineraryItems(eventId),
    fetchEventExpenses(eventId),
  ]);

  const attendeesData = attendeesResult.data as EventAttendeeRow[] | null;
  const commentsData = commentsResult.data as CommentRow[] | null;
  const reactionsData = reactionsResult.data as ReactionRow[] | null;
  const eventGroupsData = eventGroupsResult.data as EventGroupRow[] | null;

  const attendees = attendeesData?.map(a => a.user_id) || [];
  const comments: Comment[] = commentsData?.map(c => ({
    id: c.id,
    userId: c.user_id,
    text: c.text,
    timestamp: c.timestamp,
  })) || [];
  const groupIds = eventGroupsData?.map(eg => eg.group_id) || [];

  // Process reactions
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;
  const reactions: Record<string, Reaction> = {};
  
  if (reactionsData) {
    reactionsData.forEach(reaction => {
      if (!reactions[reaction.emoji]) {
        reactions[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          userReacted: false,
        };
      }
      reactions[reaction.emoji].count++;
      if (currentUserId && reaction.user_id === currentUserId) {
        reactions[reaction.emoji].userReacted = true;
      }
    });
  }

  return transformEventRow(eventRow, attendees, comments, reactions, groupIds, itineraryItems, expenses);
}

/**
 * Fetch a single event by slug
 * (Resolve slug -> id, then hydrate with existing fetchEventById logic)
 */
export async function fetchEventBySlug(slug: string): Promise<SocialEvent | null> {
  // Supabase select typing can fall back to `never` for narrow selects; cast to the row shape we need.
  const tryDirect = async (): Promise<string | null> => {
    const result = await supabase.from('events').select('id').eq('slug', slug).single();
    const { data, error } = result as unknown as { data: Pick<EventRow, 'id'> | null; error: any };
    if (error) {
      // This can be either "not found" OR "blocked by RLS (returns 0 rows)".
      if (!isNoRowsError(error)) {
        console.error('Error fetching event by slug:', error);
      }
      return null;
    }
    return data?.id ?? null;
  };

  let id = await tryDirect();

  if (!id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Treat "view by link" as invited-by-link and resolve via SECURITY DEFINER RPC.
      id = await markEventViewedBySlug(slug);
    }
  }

  if (!id) return null;
  return fetchEventById(id);
}

/**
 * Create a new event
 */
export async function createEvent(
  eventData: Omit<SocialEvent, 'id' | 'slug' | 'hostId' | 'attendees' | 'comments' | 'reactions'>,
): Promise<SocialEvent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create events');
  }

  type EventInsert = Database['public']['Tables']['events']['Insert'];
  
  const insertData: EventInsert = {
    host_id: user.id,
    title: eventData.title,
    description: eventData.description,
    activity_type: eventData.activityType,
    header_image_url: eventData.headerImageUrl ?? null,
    header_image_position_y: eventData.headerImagePositionY ?? null,
    location: eventData.location,
    coordinates: (eventData.coordinates ?? null) as any,
    location_data: (eventData.locationData ?? null) as any,
    start_time: eventData.startTime,
    end_time: eventData.endTime || null,
    is_flexible_start: eventData.isFlexibleStart,
    is_flexible_end: eventData.isFlexibleEnd,
    visibility_type: eventData.visibilityType,
    allow_friend_invites: eventData.allowFriendInvites,
    max_seats: eventData.maxSeats || null,
    no_phones: eventData.noPhones,
  };
  
  const result = await supabase
    .from('events')
    .insert(insertData as unknown as never)
    .select()
    .single();
  const { data: event, error } = result as unknown as { data: EventRow | null; error: any };

  if (error || !event) {
    console.error('Error creating event:', error);
    return null;
  }

  const eventRow = event as EventRow;

  // Add host as attendee
  type EventAttendeeInsert = Database['public']['Tables']['event_attendees']['Insert'];
  const attendeeData: EventAttendeeInsert = {
    event_id: eventRow.id,
    user_id: user.id,
  };
  await supabase.from('event_attendees').insert(attendeeData as unknown as never);

  // Add event groups if visibility is GROUPS
  if (eventData.visibilityType === 'GROUPS' && eventData.groupIds && eventData.groupIds.length > 0) {
    type EventGroupInsert = Database['public']['Tables']['event_groups']['Insert'];
    const groupData: EventGroupInsert[] = eventData.groupIds.map(groupId => ({
      event_id: eventRow.id,
      group_id: groupId,
    }));
    await supabase.from('event_groups').insert(groupData as unknown as never);
  }

  return fetchEventById(eventRow.id);
}

/**
 * Update an existing event
 */
export async function updateEvent(eventId: string, updates: Partial<SocialEvent>): Promise<SocialEvent | null> {
  const updateData: any = {};
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.activityType !== undefined) updateData.activity_type = updates.activityType;
  if (updates.headerImageUrl !== undefined) updateData.header_image_url = updates.headerImageUrl;
  if (updates.headerImagePositionY !== undefined) updateData.header_image_position_y = updates.headerImagePositionY;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.coordinates !== undefined) updateData.coordinates = updates.coordinates;
  if (updates.locationData !== undefined) updateData.location_data = updates.locationData;
  if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
  if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
  if (updates.isFlexibleStart !== undefined) updateData.is_flexible_start = updates.isFlexibleStart;
  if (updates.isFlexibleEnd !== undefined) updateData.is_flexible_end = updates.isFlexibleEnd;
  if (updates.visibilityType !== undefined) updateData.visibility_type = updates.visibilityType;
  if (updates.allowFriendInvites !== undefined) updateData.allow_friend_invites = updates.allowFriendInvites;
  if (updates.maxSeats !== undefined) updateData.max_seats = updates.maxSeats;
  if (updates.noPhones !== undefined) updateData.no_phones = updates.noPhones;

  type EventUpdate = Database['public']['Tables']['events']['Update'];
  const result = await supabase
    .from('events')
    .update(updateData as unknown as never)
    .eq('id', eventId);
  const { error } = result as unknown as { error: any };

  if (error) {
    console.error('Error updating event:', error);
    return null;
  }

  // Update event groups if groupIds is provided
  if (updates.groupIds !== undefined) {
    // Delete existing event groups
    await supabase.from('event_groups').delete().eq('event_id', eventId);
    
    // Insert new event groups if visibility is GROUPS and groupIds are provided
    if (updates.visibilityType === 'GROUPS' && updates.groupIds.length > 0) {
      type EventGroupInsert = Database['public']['Tables']['event_groups']['Insert'];
      const groupData: EventGroupInsert[] = updates.groupIds.map(groupId => ({
        event_id: eventId,
        group_id: groupId,
      }));
      await supabase.from('event_groups').insert(groupData as unknown as never);
    }
  }

  return fetchEventById(eventId);
}

/**
 * Join an event
 */
export async function joinEvent(eventId: string): Promise<boolean> {
  // Prefer session (no network) vs auth.getUser() (network). This also avoids
  // transient "no user" cases where the app has user state but getUser fails.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    console.warn('joinEvent: no session user:', sessionError);
    return false;
  }

  type EventAttendeeInsert = Database['public']['Tables']['event_attendees']['Insert'];
  const attendeeData: EventAttendeeInsert = {
    event_id: eventId,
    user_id: user.id,
  };
  // Make join idempotent: if the row already exists, do nothing and treat it as success.
  // (This avoids requiring UPDATE permissions/policies for the conflict path.)
  const result = await supabase
    .from('event_attendees')
    .upsert(attendeeData as any, { onConflict: 'event_id,user_id', ignoreDuplicates: true });
  const { error } = result as unknown as { error: any };
  if (error) {
    console.error('Error joining event:', error);
    return false;
  }

  return true;
}

/**
 * Leave an event
 */
export async function leaveEvent(eventId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('event_attendees')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  return !error;
}

/**
 * Add a comment to an event
 */
export async function addComment(eventId: string, text: string): Promise<Comment | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  type CommentInsert = Database['public']['Tables']['comments']['Insert'];
  const commentData: CommentInsert = {
    event_id: eventId,
    user_id: user.id,
    text,
  };
  const result = await supabase
    .from('comments')
    .insert(commentData as unknown as never)
    .select()
    .single();
  const { data: comment, error } = result as unknown as { data: CommentRow | null; error: any };

  if (error || !comment) {
    console.error('Error adding comment:', error);
    return null;
  }

  const commentRow = comment as CommentRow;

  return {
    id: commentRow.id,
    userId: commentRow.user_id,
    text: commentRow.text,
    timestamp: commentRow.timestamp,
  };
}

/**
 * Add or remove a reaction to an event
 */
export async function toggleReaction(eventId: string, emoji: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  // Check if reaction exists
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .single();

  if (existing) {
    const existingRow = existing as Pick<ReactionRow, 'id'>;
    // Remove reaction
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existingRow.id);
    return !error;
  } else {
    // Add reaction
    type ReactionInsert = Database['public']['Tables']['reactions']['Insert'];
    const reactionData: ReactionInsert = {
      event_id: eventId,
      user_id: user.id,
      emoji,
    };
    const result = await supabase
      .from('reactions')
      .insert(reactionData as unknown as never);
    const { error } = result as unknown as { error: any };
    return !error;
  }
}
