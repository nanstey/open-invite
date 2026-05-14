import { describe, expect, it } from 'vitest';

import { getActiveSection, getPageTitle } from '../../../domains/app/routing';

describe('app routing helpers', () => {
  it('maps the explore section and my invites labels', () => {
    expect(getActiveSection('/explore')).toBe('EXPLORE');
    expect(getPageTitle('/explore')).toBe('Explore');
    expect(getActiveSection('/events')).toBe('EVENTS');
    expect(getPageTitle('/events')).toBe('My Invites');
  });
});
