import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventCard } from '../../domains/events/components/list/EventCard';
import { EventsCardView } from '../../domains/events/components/list/EventsCardView';
import { MyEventsView } from '../../domains/events/components/list/MyEventsView';
import { EventVisibility, type SocialEvent } from '../../domains/events/types';
import type { User } from '../../lib/types';
import { fetchUser } from '../../services/userService';

vi.mock('../../services/userService', () => ({
  fetchUser: vi.fn(),
}));

const currentUser: User = {
  id: 'user-1',
  name: 'Noel',
  avatar: 'https://example.com/noel.jpg',
};

const hostUser: User = {
  id: 'host-1',
  name: 'Morgan',
  avatar: 'https://example.com/morgan.jpg',
};

const makeEvent = (overrides: Partial<SocialEvent> = {}): SocialEvent => ({
  id: 'event-1',
  slug: 'sunset-swim',
  hostId: hostUser.id,
  title: 'Sunset Swim',
  headerImageUrl: 'https://example.com/cover.jpg',
  headerImagePositionY: 18,
  description: 'Bring snacks.',
  activityType: 'Social',
  location: 'Kits Beach',
  startTime: '2026-08-05T18:30:00.000Z',
  isFlexibleStart: false,
  isFlexibleEnd: false,
  visibilityType: EventVisibility.ALL_FRIENDS,
  groupIds: [],
  allowFriendInvites: true,
  maxSeats: 8,
  attendees: ['user-2', currentUser.id],
  noPhones: false,
  itineraryTimeDisplay: 'START_ONLY',
  comments: [],
  reactions: {},
  ...overrides,
});

describe('EventCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUser).mockResolvedValue(hostUser);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the explicit cover image and saved crop position with the going badge', async () => {
    const event = makeEvent();

    render(<EventCard event={event} onClick={vi.fn()} currentUser={currentUser} />);

    expect(screen.getByAltText('Sunset Swim cover')).toHaveAttribute('src', event.headerImageUrl);
    expect(screen.getByTestId('event-card-cover')).toHaveStyle({ objectPosition: 'center 18%' });
    expect(screen.getByText('Going')).toBeInTheDocument();
    expect(screen.queryByText(event.activityType)).not.toBeInTheDocument();
    expect(await screen.findByText('Hosted by')).toBeInTheDocument();
    expect(await screen.findByText(hostUser.name)).toBeInTheDocument();
  });

  it('falls back to the seeded placeholder image and shows the hosting badge', async () => {
    const event = makeEvent({
      headerImageUrl: undefined,
      headerImagePositionY: undefined,
      hostId: currentUser.id,
      attendees: [currentUser.id],
    });

    vi.mocked(fetchUser).mockResolvedValue(currentUser);

    render(<EventCard event={event} onClick={vi.fn()} currentUser={currentUser} />);

    expect(screen.getByAltText('Sunset Swim cover')).toHaveAttribute(
      'src',
      'https://picsum.photos/seed/event-1/1200/800'
    );
    expect(screen.getByTestId('event-card-cover')).toHaveStyle({ objectPosition: 'center 50%' });
    expect(screen.getByText('Hosting')).toBeInTheDocument();
    expect(screen.queryByText(event.activityType)).not.toBeInTheDocument();
    expect(await screen.findByText('Hosted by')).toBeInTheDocument();
    expect(await screen.findByText(currentUser.name)).toBeInTheDocument();
  });

  it('renders the explore appearance as a view-only card, loads host info, and remains clickable', async () => {
    const event = makeEvent({
      attendees: [],
      maxSeats: 5,
    });
    const onClick = vi.fn();

    render(
      <EventCard
        event={event}
        onClick={onClick}
        currentUser={currentUser}
        appearance="exploreFeatured"
      />
    );

    expect(screen.getByText('5 spots left')).toBeInTheDocument();
    expect(screen.queryByText(event.activityType)).not.toBeInTheDocument();
    expect(await screen.findByText('Hosted by')).toBeInTheDocument();
    expect(await screen.findByText(hostUser.name)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Sunset Swim'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchUser)).toHaveBeenCalledWith(event.hostId, currentUser.id);
  });
});

describe('event card grid views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUser).mockResolvedValue(hostUser);
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps EventsCardView grouped cards clickable', () => {
    const firstEvent = makeEvent();
    const secondEvent = makeEvent({
      id: 'event-2',
      slug: 'midnight-bowling',
      title: 'Midnight Bowling',
    });
    const onEventClick = vi.fn();

    render(
      <EventsCardView
        groupedEvents={[{ title: 'This Week', events: [firstEvent, secondEvent] }]}
        currentUser={currentUser}
        statusFilter="ALL"
        onEventClick={onEventClick}
        onRestore={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Midnight Bowling'));

    expect(onEventClick).toHaveBeenCalledWith(secondEvent);
  });

  it('keeps MyEventsView cards clickable', () => {
    const hostedEvent = makeEvent({
      id: 'event-3',
      slug: 'rooftop-dinner',
      title: 'Rooftop Dinner',
      hostId: currentUser.id,
      attendees: [currentUser.id],
    });
    const onEventClick = vi.fn();

    render(
      <MyEventsView
        events={[hostedEvent]}
        currentUser={currentUser}
        activeTab="HOSTING"
        onEventClick={onEventClick}
      />
    );

    fireEvent.click(screen.getByText('Rooftop Dinner'));

    expect(onEventClick).toHaveBeenCalledWith(hostedEvent);
  });
});
