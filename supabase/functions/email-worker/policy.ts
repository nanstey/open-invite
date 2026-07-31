// Delivery policy — the pure decision of whether a claimed outbox row should be
// sent, skipped, or blocked. Kept free of any Deno/runtime dependency so it can be
// unit-tested (policy.test.ts) and reused by any future producer. All producers
// funnel through this same decision; behavior differs only by message_class.

export type EmailMessageClass = 'transactional' | 'marketing' | 'account';

export interface PolicyInput {
  messageClass: EmailMessageClass;
  /** Effective subscription for (user, topic): true/false from a stored row, or
   *  null when the user has no row (fall back to the topic default). */
  subscribed: boolean | null;
  /** The topic's default_subscribed (opt-out for transactional, opt-in for marketing). */
  topicDefaultSubscribed: boolean;
  /** Recipient has an `all`-scope suppression (hard bounce / complaint). */
  suppressedAll: boolean;
  /** Recipient has a `marketing`-scope suppression (marketing unsubscribe). */
  suppressedMarketing: boolean;
  /** No deliverable address could be resolved for the row. */
  hasRecipient: boolean;
}

export type PolicyDecision = { send: true } | { send: false; reason: string };

/**
 * Resolve delivery uniformly across producers.
 *
 * - `all`-scope suppression blocks every class (hard bounce / complaint).
 * - `account`: critical mail — ignores topic preferences; only an `all` suppression stops it.
 * - `transactional`: send unless the user opted out of the topic.
 * - `marketing`: send only on positive opt-in, and never if marketing-suppressed.
 */
export function resolveDelivery(input: PolicyInput): PolicyDecision {
  if (!input.hasRecipient) {
    return { send: false, reason: 'no_recipient' };
  }

  if (input.suppressedAll) {
    return { send: false, reason: 'suppressed:all' };
  }

  const effectiveSubscribed = input.subscribed ?? input.topicDefaultSubscribed;

  switch (input.messageClass) {
    case 'account':
      // Critical account/security mail bypasses topic preferences.
      return { send: true };

    case 'transactional':
      return effectiveSubscribed ? { send: true } : { send: false, reason: 'unsubscribed' };

    case 'marketing':
      if (input.suppressedMarketing) {
        return { send: false, reason: 'suppressed:marketing' };
      }
      return effectiveSubscribed ? { send: true } : { send: false, reason: 'not_opted_in' };

    default: {
      // Exhaustiveness guard: a new class must be handled explicitly.
      const _never: never = input.messageClass;
      return { send: false, reason: `unknown_class:${String(_never)}` };
    }
  }
}
