import type { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';

export const EVENT_INVITE_RECIPIENT_LIMIT = 99;

type EventInviteInsert = Database['public']['Tables']['event_invites']['Insert'];
type EventInviteRow = Database['public']['Tables']['event_invites']['Row'];
type EventRow = Database['public']['Tables']['events']['Row'];

export type SendEventInvitesResult = {
  requested: number;
  inserted: number;
  skippedExisting: number;
  recipientIds: string[];
};

export async function sendEventInvites(args: {
  eventId: string;
  recipientIds: string[];
}): Promise<SendEventInvitesResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('Sign in to send invites.');
  }

  const uniqueRecipientIds = Array.from(
    new Set(args.recipientIds.filter(id => id && id !== userId))
  );

  if (uniqueRecipientIds.length === 0) {
    return { requested: 0, inserted: 0, skippedExisting: 0, recipientIds: [] };
  }

  if (uniqueRecipientIds.length > EVENT_INVITE_RECIPIENT_LIMIT) {
    throw new Error(`Choose ${EVENT_INVITE_RECIPIENT_LIMIT} or fewer recipients.`);
  }

  const eventResult = await supabase
    .from('events')
    .select('host_id')
    .eq('id', args.eventId)
    .single();
  const { data: event, error: eventError } = eventResult as unknown as {
    data: Pick<EventRow, 'host_id'> | null;
    error: any;
  };

  if (eventError || !event) {
    throw new Error('Event not found.');
  }
  if (event.host_id !== userId) {
    throw new Error('Only the host can send invites.');
  }

  const existingResult = await supabase
    .from('event_invites')
    .select('user_id')
    .eq('event_id', args.eventId)
    .in('user_id', uniqueRecipientIds);
  const { data: existingRows, error: existingError } = existingResult as unknown as {
    data: Pick<EventInviteRow, 'user_id'>[] | null;
    error: any;
  };

  if (existingError) {
    throw new Error('Could not check existing invites.');
  }

  const existingIds = new Set((existingRows ?? []).map(row => row.user_id));
  const newRecipientIds = uniqueRecipientIds.filter(id => !existingIds.has(id));

  if (newRecipientIds.length > 0) {
    const inserts: EventInviteInsert[] = newRecipientIds.map(recipientId => ({
      event_id: args.eventId,
      user_id: recipientId,
      invited_by: userId,
    }));

    const { error: insertError } = await supabase.from('event_invites').insert(inserts as any);
    if (insertError) {
      throw new Error('Could not send invites.');
    }
  }

  return {
    requested: uniqueRecipientIds.length,
    inserted: newRecipientIds.length,
    skippedExisting: existingIds.size,
    recipientIds: uniqueRecipientIds,
  };
}
