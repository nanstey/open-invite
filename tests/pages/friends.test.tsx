import { describe, expect, it } from 'vitest';

import { resolveFriendsTab } from '../../domains/friends/types';
import { getFriendsTabs } from '../../pages/friends';

describe('friends route helpers', () => {
  it('coerces the groups tab back to friends when the flag is off', () => {
    expect(resolveFriendsTab('groups', false)).toBe('friends');
  });

  it('includes the groups tab when the flag is on', () => {
    expect(getFriendsTabs(true).map(tab => tab.id)).toEqual(['friends', 'groups']);
  });

  it('omits the groups tab when the flag is off', () => {
    expect(getFriendsTabs(false).map(tab => tab.id)).toEqual(['friends']);
  });
});
