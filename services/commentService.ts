import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import type { Comment } from '../domains/events/types';

type CommentRow = Database['public']['Tables']['comments']['Row'];
type CommentInsert = Database['public']['Tables']['comments']['Insert'];

/**
 * Fetch comments for an event
 */
export async function fetchComments(eventId: string): Promise<Comment[]> {
  const result = await supabase
    .from('comments')
    .select('*')
    .eq('event_id', eventId)
    .order('timestamp', { ascending: true });
  const { data, error } = result as unknown as { data: CommentRow[] | null; error: any };

  if (error || !data) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data.map(c => ({
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

  const insertData: CommentInsert = {
    event_id: eventId,
    user_id: user.id,
    text,
  };

  const result = await supabase
    .from('comments')
    .insert(insertData as unknown as never)
    .select()
    .single();
  const { data: comment, error } = result as unknown as { data: CommentRow | null; error: any };

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

