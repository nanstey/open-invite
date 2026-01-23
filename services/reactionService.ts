import { supabase } from '../lib/supabase';
import type { Reaction } from '../domains/events/types';

/**
 * Fetch reactions for an event
 */
export async function fetchReactions(eventId: string): Promise<Record<string, Reaction>> {
  const { data: reactions, error } = await supabase
    .from('reactions')
    .select('*')
    .eq('event_id', eventId);

  if (error || !reactions) {
    console.error('Error fetching reactions:', error);
    return {};
  }

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  const reactionsMap: Record<string, Reaction> = {};

  reactions.forEach(reaction => {
    if (!reactionsMap[reaction.emoji]) {
      reactionsMap[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        userReacted: false,
      };
    }
    reactionsMap[reaction.emoji].count++;
    if (currentUserId && reaction.user_id === currentUserId) {
      reactionsMap[reaction.emoji].userReacted = true;
    }
  });

  return reactionsMap;
}

/**
 * Toggle a reaction on an event
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

