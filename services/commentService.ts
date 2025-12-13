import { supabase } from '../lib/supabase';
import type { Comment } from '../types';

/**
 * Fetch comments for an event
 */
export async function fetchComments(eventId: string): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*')
    .eq('event_id', eventId)
    .order('timestamp', { ascending: true });

  if (error || !comments) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return comments.map(c => ({
    id: c.id,
    userId: c.user_id,
    text: c.text,
    timestamp: c.timestamp,
  }));
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
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  return !error;
}

