import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];

  private readonly callback: ResizeObserverCallback;
  private readonly elements = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }

  observe = (element: Element) => {
    this.elements.add(element);
  };

  unobserve = (element: Element) => {
    this.elements.delete(element);
  };

  disconnect = () => {
    this.elements.clear();
  };

  trigger(width: number, target?: Element) {
    const entries = [...this.elements]
      .filter(element => !target || element === target)
      .map(
        element =>
          ({
            target: element,
            contentRect: {
              width,
              height: 0,
              x: 0,
              y: 0,
              top: 0,
              right: width,
              bottom: 0,
              left: 0,
              toJSON: () => ({}),
            },
          }) as ResizeObserverEntry
      );

    if (entries.length > 0) {
      this.callback(entries, this as unknown as ResizeObserver);
    }
  }

  static triggerAll(width: number, target?: Element) {
    for (const instance of ResizeObserverMock.instances) {
      instance.trigger(width, target);
    }
  }

  static reset() {
    ResizeObserverMock.instances = [];
  }
}

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
  isAllDay: false,
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
    ResizeObserverMock.reset();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.clearAllMocks();
    vi.mocked(fetchUser).mockResolvedValue(hostUser);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the explicit cover image and saved crop position with the going badge', async () => {
    const event = makeEvent();

    render(<EventCard event={event} onClick={vi.fn()} currentUser={currentUser} />);

    expect(screen.getByAltText('Sunset Swim cover')).toHaveAttribute('src', event.headerImageUrl);
    expect(screen.getByTestId('event-card-cover')).toHaveStyle({ objectPosition: 'center 18%' });
    expect(screen.getByTestId('event-card-reveal-panel')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('event-card-metadata')).toHaveAttribute('data-layout', 'narrow');
    expect(screen.getByText('Going')).toBeInTheDocument();
    expect(screen.queryByText(event.activityType)).not.toBeInTheDocument();
    expect(await screen.findByText('Hosted by')).toBeInTheDocument();
    expect(await screen.findByText(hostUser.name)).toBeInTheDocument();
    expect(screen.getByText('6 spots left')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText('(6 left)')).not.toBeInTheDocument();
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

  it('uses the right-side host layout when the card is wide enough', async () => {
    const event = makeEvent({
      attendees: [],
      maxSeats: 5,
    });

    render(<EventCard event={event} onClick={vi.fn()} currentUser={currentUser} />);

    const card = screen.getByRole('button', { name: /sunset swim/i });
    expect(await screen.findByText(hostUser.name)).toBeInTheDocument();

    act(() => {
      ResizeObserverMock.triggerAll(500, card);
    });

    expect(screen.getByTestId('event-card-metadata')).toHaveAttribute('data-layout', 'wide');
    expect(screen.getByText('5 spots left')).toBeInTheDocument();
  });

  it('renders the featured-size card, loads host info, and remains clickable', async () => {
    const event = makeEvent({
      attendees: [],
      maxSeats: 5,
    });
    const onClick = vi.fn();

    render(<EventCard event={event} onClick={onClick} currentUser={currentUser} size="featured" />);

    expect(screen.getByTestId('event-card-metadata')).toHaveAttribute('data-layout', 'narrow');
    expect(screen.getByText('5 spots left')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText(event.activityType)).not.toBeInTheDocument();
    expect(await screen.findByText('Hosted by')).toBeInTheDocument();
    expect(await screen.findByText(hostUser.name)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Sunset Swim'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchUser)).toHaveBeenCalledWith(event.hostId, currentUser.id);
  });

  it('shows full when a seat-limited event has no spots remaining', async () => {
    const event = makeEvent({
      maxSeats: 2,
      attendees: ['user-2', currentUser.id],
    });

    render(<EventCard event={event} onClick={vi.fn()} currentUser={currentUser} />);

    expect(await screen.findByText(hostUser.name)).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
  });

  it('supports keyboard activation on the card root', async () => {
    const event = makeEvent();
    const onClick = vi.fn();

    render(<EventCard event={event} onClick={onClick} currentUser={currentUser} />);

    const card = screen.getByRole('button', { name: /sunset swim/i });
    expect(await screen.findByText(hostUser.name)).toBeInTheDocument();

    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe('event card grid views', () => {
  beforeEach(() => {
    ResizeObserverMock.reset();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.clearAllMocks();
    vi.mocked(fetchUser).mockResolvedValue(hostUser);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps EventsCardView grouped cards clickable', async () => {
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

    await screen.findAllByText(hostUser.name);
    fireEvent.click(screen.getByText('Midnight Bowling'));

    expect(onEventClick).toHaveBeenCalledWith(secondEvent);
  });

  it('keeps MyEventsView cards clickable', async () => {
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

    expect(await screen.findByText(hostUser.name)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Rooftop Dinner'));

    expect(onEventClick).toHaveBeenCalledWith(hostedEvent);
  });
});
