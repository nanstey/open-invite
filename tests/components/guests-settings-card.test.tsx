import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GuestsSettingsCard } from '../../domains/events/components/detail/guests/GuestsSettingsCard';
import { EventVisibility, type SocialEvent } from '../../domains/events/types';

const baseEvent: SocialEvent = {
  id: 'event-1',
  slug: 'board-game-night',
  hostId: 'user-1',
  title: 'Board Game Night',
  description: 'Bring snacks',
  activityType: 'Social',
  location: 'Downtown',
  startTime: '2026-02-28T19:00:00.000Z',
  isAllDay: false,
  isFlexibleStart: false,
  isFlexibleEnd: false,
  visibilityType: EventVisibility.ALL_FRIENDS,
  groupIds: [],
  allowFriendInvites: false,
  attendees: [],
  noPhones: false,
  itineraryTimeDisplay: 'START_AND_END',
  comments: [],
  reactions: {},
};

describe('GuestsSettingsCard', () => {
  it('hides groups visibility affordances when the flag is off', () => {
    render(
      <GuestsSettingsCard
        event={{ ...baseEvent, visibilityType: EventVisibility.GROUPS }}
        groupsEnabled={false}
        onChangeVisibility={vi.fn()}
      />
    );

    expect(screen.queryByRole('option', { name: 'Groups' })).not.toBeInTheDocument();
    expect(screen.queryByText('Group visibility')).not.toBeInTheDocument();
  });

  it('shows the groups visibility option when the flag is on', () => {
    render(<GuestsSettingsCard event={baseEvent} groupsEnabled onChangeVisibility={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'Groups' })).toBeInTheDocument();
  });
});
