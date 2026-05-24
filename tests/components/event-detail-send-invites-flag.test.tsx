import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventDetail } from '../../domains/events/components/detail/EventDetail';
import { EventVisibility, type SocialEvent } from '../../domains/events/types';
import type { User } from '../../lib/types';

const useFeatureFlagMock = vi.fn();
const sendInvitesDialogMock = vi.fn<(props: { open: boolean }) => void>();

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: {
      location: { pathname: string; state: { fromEventsView: string } };
    }) => unknown;
  }) =>
    select({ location: { pathname: '/events/event-1', state: { fromEventsView: 'upcoming' } } }),
}));

vi.mock('../../lib/featureFlags', () => ({
  useFeatureFlag: (key: string) => useFeatureFlagMock(key),
}));

vi.mock('../../domains/events/hooks/useAttendanceToggle', () => ({
  useAttendanceToggle: () => ({
    isJoinDisabled: false,
    onJoinLeave: vi.fn(),
  }),
}));

vi.mock('../../domains/events/hooks/useEventPeople', () => ({
  useEventPeople: () => ({
    host: { id: 'host-1', name: 'Host', avatar: '' },
    attendeesList: [],
    commentUsers: new Map(),
    reactionUsers: new Map(),
  }),
}));

vi.mock('../../domains/events/hooks/useEventTabsController', () => ({
  useEventTabsController: () => ({
    activeTab: 'details',
    onTabChange: vi.fn(),
  }),
}));

vi.mock('../../domains/events/hooks/useFriendsForGuests', () => ({
  useFriendsForGuests: () => ({
    friendIds: [],
    outgoingRequestIds: [],
    incomingRequestMap: new Map(),
  }),
}));

vi.mock('../../domains/events/hooks/useInviteShare', () => ({
  useInviteShare: () => ({
    inviteCopied: false,
    shareInvite: vi.fn(),
  }),
}));

vi.mock('../../services/eventService', () => ({
  fetchEventById: vi.fn(),
}));

vi.mock('../../services/itineraryAttendanceService', () => ({
  upsertItineraryAttendance: vi.fn(),
}));

vi.mock('../../domains/events/components/detail/actions/HostedByActionsCard', () => ({
  HostedByActionsCard: ({ actions }: { actions: { onSendInvites?: () => void } }) => (
    <div>{actions.onSendInvites ? <button type="button">Send Invites</button> : null}</div>
  ),
}));

vi.mock('../../domains/events/components/detail/actions/MobileActionsBar', () => ({
  MobileActionsBar: ({ actions }: { actions: { onSendInvites?: () => void } }) => (
    <div>{actions.onSendInvites ? <button type="button">Send Invites</button> : null}</div>
  ),
}));

vi.mock('../../domains/events/components/detail/actions/LeaveEventDialog', () => ({
  LeaveEventDialog: () => null,
}));

vi.mock('../../domains/events/components/detail/chat/ChatTab', () => ({
  ChatTab: () => null,
}));

vi.mock('../../domains/events/components/detail/details/DetailsTab', () => ({
  DetailsTab: () => <div>Details</div>,
}));

vi.mock('../../domains/events/components/detail/guests/GuestsTab', () => ({
  GuestsTab: () => null,
}));

vi.mock('../../domains/events/components/detail/header/HeroHeader', () => ({
  HeroHeader: () => <div>Hero</div>,
}));

vi.mock('../../domains/events/components/detail/header/KeyFactsCard', () => ({
  KeyFactsCard: () => <div>Facts</div>,
}));

vi.mock('../../domains/events/components/detail/images/HeaderImageModal', () => ({
  HeaderImageModal: () => null,
}));

vi.mock('../../domains/events/components/detail/invites/SendInvitesDialog', () => ({
  SendInvitesDialog: (props: { open: boolean }) => {
    sendInvitesDialogMock(props);
    return props.open ? <div>Send Invites Dialog</div> : null;
  },
}));

vi.mock('../../domains/events/components/detail/itineraries/ScheduleAttendanceOverlay', () => ({
  ScheduleAttendanceOverlay: () => null,
}));

vi.mock('../../lib/ui/components/TabGroup', () => ({
  TabGroup: () => null,
}));

const currentUser: User = {
  id: 'host-1',
  name: 'Host',
  avatar: '',
};

const event: SocialEvent = {
  id: 'event-1',
  slug: 'board-game-night',
  hostId: currentUser.id,
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

describe('EventDetail send invites flag', () => {
  beforeEach(() => {
    useFeatureFlagMock.mockReset();
    sendInvitesDialogMock.mockClear();
  });

  it('hides the send invites UI while the flag is off', () => {
    useFeatureFlagMock.mockReturnValue(false);

    render(
      <EventDetail
        event={event}
        currentUser={currentUser}
        onUpdateEvent={vi.fn()}
        autoOpenSendInvites
        onAutoOpenSendInvitesHandled={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Send Invites' })).not.toBeInTheDocument();
    expect(sendInvitesDialogMock).not.toHaveBeenCalled();
  });

  it('shows the send invites UI when the flag is on', () => {
    useFeatureFlagMock.mockReturnValue(true);

    render(<EventDetail event={event} currentUser={currentUser} onUpdateEvent={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: 'Send Invites' }).length).toBeGreaterThan(0);
  });
});
