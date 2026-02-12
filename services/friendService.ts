import { supabase } from '../lib/supabase';
import type { User } from '../lib/types';
import type { Database } from '../lib/database.types';
import { fetchUsers } from './userService';

type UserFriendRow = Database['public']['Tables']['user_friends']['Row'];
type UserFriendInsert = Database['public']['Tables']['user_friends']['Insert'];
type FriendRequestRow = Database['public']['Tables']['friend_requests']['Row'];

export type PendingFriendRequest = {
  id: string;
  requester: User;
  requesterId: string;
  recipientId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
};

export type OutgoingFriendRequest = {
  id: string;
  recipient: User;
  requesterId: string;
  recipientId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
};

/**
 * Fetch friends for the current user, sorted alphabetically by name
 */
export async function fetchFriends(): Promise<User[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data: friendships, error } = await supabase
    .from('user_friends')
    .select('friend_id')
    .eq('user_id', userId);

  if (error || !friendships) {
    console.error('Error fetching friends:', error);
    return [];
  }

  const friendIds = (friendships as Pick<UserFriendRow, 'friend_id'>[]).map(f => f.friend_id);
  const friends = await fetchUsers(friendIds, userId);
  
  // Sort alphabetically by name
  return friends.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch pending friend requests for the current user
 */
export async function fetchPendingFriendRequests(): Promise<PendingFriendRequest[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('recipient_id', userId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error || !requests) {
    console.error('Error fetching friend requests:', error);
    return [];
  }

  const rows = requests as FriendRequestRow[];
  const requesterIds = rows.map((r) => r.requester_id);
  const requesters = await fetchUsers(requesterIds, userId);
  const requesterMap = new Map(requesters.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const requester = requesterMap.get(row.requester_id);
      if (!requester) return null;
      return {
        id: row.id,
        requester,
        requesterId: row.requester_id,
        recipientId: row.recipient_id,
        status: row.status as PendingFriendRequest['status'],
        createdAt: row.created_at,
      };
    })
    .filter((r): r is PendingFriendRequest => !!r);
}

/**
 * Fetch outgoing friend requests sent by the current user
 */
export async function fetchOutgoingFriendRequests(): Promise<OutgoingFriendRequest[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('requester_id', userId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error || !requests) {
    console.error('Error fetching outgoing friend requests:', error);
    return [];
  }

  const rows = requests as FriendRequestRow[];
  const recipientIds = rows.map((r) => r.recipient_id);
  const recipients = await fetchUsers(recipientIds, userId);
  const recipientMap = new Map(recipients.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const recipient = recipientMap.get(row.recipient_id);
      if (!recipient) return null;
      return {
        id: row.id,
        recipient,
        requesterId: row.requester_id,
        recipientId: row.recipient_id,
        status: row.status as OutgoingFriendRequest['status'],
        createdAt: row.created_at,
      };
    })
    .filter((r): r is OutgoingFriendRequest => !!r);
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(recipientId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }

  const { error } = await supabase
    .from('friend_requests')
    .insert({ requester_id: userId, recipient_id: recipientId });

  if (error) {
    console.error('Error sending friend request:', error);
    return false;
  }

  return true;
}

/**
 * Add a friend
 */
export async function addFriend(friendId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }

  // Add bidirectional friendship
  const inserts: UserFriendInsert[] = [
    { user_id: userId, friend_id: friendId },
    { user_id: friendId, friend_id: userId },
  ];
  const { error } = await (supabase
    .from('user_friends') as any)
    .insert(inserts);

  return !error;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(requestId: string, _requesterId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }

  // Use the database function that handles both the bidirectional friendship
  // creation and status update atomically with SECURITY DEFINER
  const { error } = await supabase.rpc('accept_friend_request', {
    request_id: requestId,
  });

  if (error) {
    console.error('Error accepting friend request:', error);
    return false;
  }

  return true;
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'DECLINED' })
    .eq('id', requestId);

  if (error) {
    console.error('Error declining friend request:', error);
  }

  return !error;
}

/**
 * Cancel an outgoing friend request (delete it)
 */
export async function cancelFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error('Error canceling friend request:', error);
  }

  return !error;
}

/**
 * Remove a friend
 */
export async function removeFriend(friendId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }

  // Remove bidirectional friendship
  const { error: friendError } = await supabase
    .from('user_friends')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

  if (friendError) {
    console.error('Error removing friendship:', friendError);
    return false;
  }

  // Also clean up any friend request records between the two users
  // This allows either user to send a new friend request in the future
  const { error: requestError } = await supabase
    .from('friend_requests')
    .delete()
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${friendId}),and(requester_id.eq.${friendId},recipient_id.eq.${userId})`);

  if (requestError) {
    console.error('Error cleaning up friend requests:', requestError);
    // Don't fail the operation if cleanup fails - friendship was already removed
  }

  return true;
}
