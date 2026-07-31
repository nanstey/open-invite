import type { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';

export type EmailMessageClass = Database['public']['Enums']['email_message_class'];

type EmailTopicRow = Database['public']['Tables']['email_topics']['Row'];
type EmailSubscriptionRow = Database['public']['Tables']['email_subscriptions']['Row'];

/**
 * A topic joined with the current user's effective preference. `subscribed` is the
 * resolved value the UI should show (the user's row if present, else the topic
 * default); `isDefault` is true when there is no explicit row yet.
 */
export interface EmailPreference {
  topic: string;
  messageClass: EmailMessageClass;
  description: string | null;
  defaultSubscribed: boolean;
  digestible: boolean;
  subscribed: boolean;
  isDefault: boolean;
}

/**
 * Fetch every email topic joined with the current user's effective preference.
 *
 * Topics are public reference data; subscriptions are a sparse per-user overlay
 * (a missing row means "use the topic default"). This mirrors how the delivery
 * worker resolves send/skip, so the Settings UI and the worker agree.
 */
export async function fetchEmailPreferences(): Promise<EmailPreference[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: topics, error: topicsError } = await supabase
    .from('email_topics')
    .select('topic, message_class, description, default_subscribed, digestible')
    .order('message_class', { ascending: true })
    .order('topic', { ascending: true });

  if (topicsError || !topics) {
    console.error('Error fetching email topics:', topicsError);
    return [];
  }

  let subscriptions: Pick<EmailSubscriptionRow, 'topic' | 'subscribed'>[] = [];
  if (user) {
    const { data: subs, error: subsError } = await supabase
      .from('email_subscriptions')
      .select('topic, subscribed')
      .eq('user_id', user.id);
    if (subsError) {
      console.error('Error fetching email subscriptions:', subsError);
    } else {
      subscriptions = subs ?? [];
    }
  }

  const overrides = new Map(subscriptions.map(s => [s.topic, s.subscribed]));

  return (topics as EmailTopicRow[]).map(t => {
    const override = overrides.get(t.topic);
    return {
      topic: t.topic,
      messageClass: t.message_class,
      description: t.description,
      defaultSubscribed: t.default_subscribed,
      digestible: t.digestible,
      subscribed: override ?? t.default_subscribed,
      isDefault: override === undefined,
    };
  });
}

/**
 * Set the current user's preference for a topic (upsert). Returns true on success.
 */
export async function setEmailPreference(topic: string, subscribed: boolean): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('email_subscriptions')
    .upsert({ user_id: user.id, topic, subscribed }, { onConflict: 'user_id,topic' });

  if (error) {
    console.error('Error updating email preference:', error);
    return false;
  }
  return true;
}

/**
 * Unsubscribe the current user from every non-`account` topic — the "turn it all
 * off" control. Account/security topics are intentionally left untouched.
 */
export async function unsubscribeFromAllEmail(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data: topics, error: topicsError } = await supabase
    .from('email_topics')
    .select('topic, message_class')
    .neq('message_class', 'account');

  if (topicsError || !topics) {
    console.error('Error fetching topics for unsubscribe-all:', topicsError);
    return false;
  }

  const rows = (topics as Pick<EmailTopicRow, 'topic' | 'message_class'>[]).map(t => ({
    user_id: user.id,
    topic: t.topic,
    subscribed: false,
  }));

  if (rows.length === 0) {
    return true;
  }

  const { error } = await supabase
    .from('email_subscriptions')
    .upsert(rows, { onConflict: 'user_id,topic' });

  if (error) {
    console.error('Error unsubscribing from all email:', error);
    return false;
  }
  return true;
}
