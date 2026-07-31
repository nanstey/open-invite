import { describe, expect, it } from 'vitest';
import { type PolicyInput, resolveDelivery } from './policy';

const base: PolicyInput = {
  messageClass: 'transactional',
  subscribed: null,
  topicDefaultSubscribed: true,
  suppressedAll: false,
  suppressedMarketing: false,
  hasRecipient: true,
};

describe('resolveDelivery', () => {
  it('blocks when there is no recipient address', () => {
    expect(resolveDelivery({ ...base, hasRecipient: false })).toEqual({
      send: false,
      reason: 'no_recipient',
    });
  });

  it('an all-scope suppression blocks every class', () => {
    for (const messageClass of ['transactional', 'marketing', 'account'] as const) {
      expect(resolveDelivery({ ...base, messageClass, suppressedAll: true })).toEqual({
        send: false,
        reason: 'suppressed:all',
      });
    }
  });

  describe('transactional', () => {
    it('sends by default (topic default subscribed, no row)', () => {
      expect(resolveDelivery({ ...base, subscribed: null, topicDefaultSubscribed: true })).toEqual({
        send: true,
      });
    });

    it('respects an explicit opt-out even when the topic defaults on', () => {
      expect(resolveDelivery({ ...base, subscribed: false, topicDefaultSubscribed: true })).toEqual(
        { send: false, reason: 'unsubscribed' }
      );
    });

    it('an explicit opt-in overrides a default-off topic', () => {
      expect(resolveDelivery({ ...base, subscribed: true, topicDefaultSubscribed: false })).toEqual(
        { send: true }
      );
    });

    it('is NOT blocked by a marketing-scope suppression', () => {
      expect(resolveDelivery({ ...base, suppressedMarketing: true })).toEqual({ send: true });
    });
  });

  describe('marketing', () => {
    const mkt: PolicyInput = { ...base, messageClass: 'marketing', topicDefaultSubscribed: false };

    it('requires positive opt-in (default off => not sent)', () => {
      expect(resolveDelivery({ ...mkt, subscribed: null })).toEqual({
        send: false,
        reason: 'not_opted_in',
      });
    });

    it('sends once opted in', () => {
      expect(resolveDelivery({ ...mkt, subscribed: true })).toEqual({ send: true });
    });

    it('a marketing-scope suppression blocks even an opted-in user', () => {
      expect(resolveDelivery({ ...mkt, subscribed: true, suppressedMarketing: true })).toEqual({
        send: false,
        reason: 'suppressed:marketing',
      });
    });
  });

  describe('account', () => {
    it('sends regardless of topic preference (opt-out ignored)', () => {
      expect(
        resolveDelivery({
          ...base,
          messageClass: 'account',
          subscribed: false,
          topicDefaultSubscribed: false,
        })
      ).toEqual({ send: true });
    });

    it('is still blocked by a hard-bounce (all) suppression', () => {
      expect(resolveDelivery({ ...base, messageClass: 'account', suppressedAll: true })).toEqual({
        send: false,
        reason: 'suppressed:all',
      });
    });
  });
});
