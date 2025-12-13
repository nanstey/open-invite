import { supabase } from '../lib/supabase';
import type { SocialEvent, Comment, Reaction, EventPrivacy, EventGroup } from '../types';

/**
 * Transform database event row to SocialEvent type
 */
function transformEventRow(row: any, attendees: string[], comments: Comment[], reactions: Record<string, Reaction>): SocialEvent {
  return {
    id: row.id,
    hostId: row.host_id,
    title: row.title,
    description: row.description,
    activityType: row.activity_type,
    location: row.location,
    coordinates: row.coordinates as { lat: number; lng: number },
    startTime: row.start_time,
    endTime: row.end_time || undefined,
    isFlexibleStart: row.is_flexible_start,
    isFlexibleEnd: row.is_flexible_end,
    privacy: row.privacy as EventPrivacy,
    targetGroup: row.target_group as EventGroup,
    maxSeats: row.max_seats || undefined,
    attendees,
    noPhones: row.no_phones,
    comments,
    reactions,
  };
}

/**
 * Fetch all events visible to the current user
 */
export async function fetchEvents(): Promise<SocialEvent[]> {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  if (!events || events.length === 0) {
    return [];
  }

  // Fetch attendees, comments, and reactions for all events
  const eventIds = events.map(e => e.id);
  
  const [attendeesData, commentsData, reactionsData] = await Promise.all([
    supabase.from('event_attendees').select('*').in('event_id', eventIds),
    supabase.from('comments').select('*').in('event_id', eventIds).order('timestamp', { ascending: true }),
    supabase.from('reactions').select('*').in('event_id', eventIds),
  ]);

  const attendeesMap = new Map<string, string[]>();
  const commentsMap = new Map<string, Comment[]>();
  const reactionsMap = new Map<string, Map<string, Reaction>>();

  // Process attendees
  if (attendeesData.data) {
    attendeesData.data.forEach(att => {
      if (!attendeesMap.has(att.event_id)) {
        attendeesMap.set(att.event_id, []);
      }
      attendeesMap.get(att.event_id)!.push(att.user_id);
    });
  }

  // Process comments
  if (commentsData.data) {
    commentsData.data.forEach(comment => {
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
  if (reactionsData.data) {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    reactionsData.data.forEach(reaction => {
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
  return events.map(event => {
    const attendees = attendeesMap.get(event.id) || [];
    const comments = commentsMap.get(event.id) || [];
    const reactionsObj: Record<string, Reaction> = {};
    reactionsMap.get(event.id)?.forEach((reaction, emoji) => {
      reactionsObj[emoji] = reaction;
    });

    return transformEventRow(event, attendees, comments, reactionsObj);
  });
}

/**
 * Fetch a single event by ID
 */
export async function fetchEventById(eventId: string): Promise<SocialEvent | null> {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    console.error('Error fetching event:', error);
    return null;
  }

  // Fetch related data
  const [attendeesData, commentsData, reactionsData] = await Promise.all([
    supabase.from('event_attendees').select('*').eq('event_id', eventId),
    supabase.from('comments').select('*').eq('event_id', eventId).order('timestamp', { ascending: true }),
    supabase.from('reactions').select('*').eq('event_id', eventId),
  ]);

  const attendees = attendeesData.data?.map(a => a.user_id) || [];
  const comments: Comment[] = commentsData.data?.map(c => ({
    id: c.id,
    userId: c.user_id,
    text: c.text,
    timestamp: c.timestamp,
  })) || [];

  // Process reactions
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;
  const reactions: Record<string, Reaction> = {};
  
  if (reactionsData.data) {
    reactionsData.data.forEach(reaction => {
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

  return transformEventRow(event, attendees, comments, reactions);
}

/**
 * Create a new event
 */
export async function createEvent(eventData: Omit<SocialEvent, 'id' | 'hostId' | 'attendees' | 'comments' | 'reactions'>): Promise<SocialEvent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create events');
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      host_id: user.id,
      title: eventData.title,
      description: eventData.description,
      activity_type: eventData.activityType,
      location: eventData.location,
      coordinates: eventData.coordinates,
      start_time: eventData.startTime,
      end_time: eventData.endTime || null,
      is_flexible_start: eventData.isFlexibleStart,
      is_flexible_end: eventData.isFlexibleEnd,
      privacy: eventData.privacy,
      target_group: eventData.targetGroup,
      max_seats: eventData.maxSeats || null,
      no_phones: eventData.noPhones,
    })
    .select()
    .single();

  if (error || !event) {
    console.error('Error creating event:', error);
    return null;
  }

  // Add host as attendee
  await supabase.from('event_attendees').insert({
    event_id: event.id,
    user_id: user.id,
  });

  return fetchEventById(event.id);
}

/**
 * Update an existing event
 */
export async function updateEvent(eventId: string, updates: Partial<SocialEvent>): Promise<SocialEvent | null> {
  const updateData: any = {};
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.activityType !== undefined) updateData.activity_type = updates.activityType;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.coordinates !== undefined) updateData.coordinates = updates.coordinates;
  if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
  if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
  if (updates.isFlexibleStart !== undefined) updateData.is_flexible_start = updates.isFlexibleStart;
  if (updates.isFlexibleEnd !== undefined) updateData.is_flexible_end = updates.isFlexibleEnd;
  if (updates.privacy !== undefined) updateData.privacy = updates.privacy;
  if (updates.targetGroup !== undefined) updateData.target_group = updates.targetGroup;
  if (updates.maxSeats !== undefined) updateData.max_seats = updates.maxSeats;
  if (updates.noPhones !== undefined) updateData.no_phones = updates.noPhones;

  const { error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId);

  if (error) {
    console.error('Error updating event:', error);
    return null;
  }

  return fetchEventById(eventId);
}

/**
 * Join an event
 */
export async function joinEvent(eventId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('event_attendees')
    .insert({
      event_id: eventId,
      user_id: user.id,
    });

  return !error;
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

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      event_id: eventId,
      user_id: user.id,
      text,
    })
    .select()
    .single();

  if (error || !comment) {
    console.error('Error adding comment:', error);
    return null;
  }

  return {
    id: comment.id,
    userId: comment.user_id,
    text: comment.text,
    timestamp: comment.timestamp,
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
    // Remove reaction
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);
    return !error;
  } else {
    // Add reaction
    const { error } = await supabase
      .from('reactions')
      .insert({
        event_id: eventId,
        user_id: user.id,
        emoji,
      });
    return !error;
  }
}

