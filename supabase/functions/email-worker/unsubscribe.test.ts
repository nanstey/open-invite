// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  signUnsubscribeToken,
  type UnsubscribeClaims,
  verifyUnsubscribeToken,
} from './unsubscribe';

const SECRET = 'test-signing-key';

describe('unsubscribe tokens', () => {
  it('round-trips claims through sign/verify', async () => {
    const claims: UnsubscribeClaims = {
      scope: 'topic',
      userId: 'user-1',
      topic: 'notif.invite',
    };
    const token = await signUnsubscribeToken(claims, SECRET);
    expect(await verifyUnsubscribeToken(token, SECRET)).toEqual(claims);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signUnsubscribeToken({ scope: 'all', email: 'a@b.com' }, SECRET);
    expect(await verifyUnsubscribeToken(token, 'other-secret')).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signUnsubscribeToken({ scope: 'marketing', userId: 'u' }, SECRET);
    const [, sig] = token.split('.');
    const forged = `${btoa('{"scope":"all"}').replaceAll('=', '')}.${sig}`;
    expect(await verifyUnsubscribeToken(forged, SECRET)).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifyUnsubscribeToken('garbage', SECRET)).toBeNull();
    expect(await verifyUnsubscribeToken('.sig', SECRET)).toBeNull();
  });

  it('honors expiry', async () => {
    const token = await signUnsubscribeToken({ scope: 'all', email: 'a@b.com', exp: 1000 }, SECRET);
    expect(await verifyUnsubscribeToken(token, SECRET, 999)).not.toBeNull();
    expect(await verifyUnsubscribeToken(token, SECRET, 1001)).toBeNull();
  });
});
