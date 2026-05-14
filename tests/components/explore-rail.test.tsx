import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExploreRail } from '../../domains/events/components/explore/ExploreRail';
import { EventVisibility, type SocialEvent } from '../../domains/events/types';
import type { User } from '../../lib/types';

function makeEvent(id: string): SocialEvent {
  return {
    id,
    slug: id,
    hostId: 'host-1',
    title: `Event ${id}`,
    description: 'Description',
    activityType: 'Social',
    location: 'Downtown',
    startTime: '2026-05-20T18:00:00.000Z',
    isFlexibleStart: false,
    isFlexibleEnd: false,
    visibilityType: EventVisibility.INVITE_ONLY,
    groupIds: [],
    allowFriendInvites: false,
    attendees: [],
    noPhones: false,
    itineraryTimeDisplay: 'START_AND_END',
    comments: [],
    reactions: {},
  };
}

const currentUser: User = {
  id: 'user-1',
  name: 'Alex',
  avatar: '/avatar.png',
};

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe('ExploreRail', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps cards view-only in featured explore rails', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });

    render(
      <ExploreRail
        title="Happening Soon"
        events={[makeEvent('1')]}
        currentUser={currentUser}
        onEventClick={vi.fn()}
        variant="featured"
      />
    );

    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('advances by viewport page with caret controls', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });

    render(
      <ExploreRail
        title="Upcoming"
        events={[makeEvent('1'), makeEvent('2'), makeEvent('3'), makeEvent('4')]}
        currentUser={currentUser}
        onEventClick={vi.fn()}
      />
    );

    const viewport = screen
      .getByText('Upcoming')
      .closest('section')
      ?.querySelector('[data-page-count]');
    expect(viewport).not.toBeNull();
    expect(viewport?.getAttribute('data-page-count')).toBe('2');

    const previous = screen.getByRole('button', { name: 'Upcoming previous page' });
    const next = screen.getByRole('button', { name: 'Upcoming next page' });
    const track = viewport?.querySelector('[data-page-index]');

    expect(previous).toBeDisabled();
    expect(next).not.toBeDisabled();
    expect(track?.getAttribute('data-page-index')).toBe('0');

    fireEvent.click(next);

    expect(track?.getAttribute('data-page-index')).toBe('1');
    expect(next).toBeDisabled();
    expect(previous).not.toBeDisabled();
  });

  it('uses single-card paging on mobile widths', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

    render(
      <ExploreRail
        title="Happening Soon"
        events={[makeEvent('1'), makeEvent('2'), makeEvent('3')]}
        currentUser={currentUser}
        onEventClick={vi.fn()}
        variant="featured"
      />
    );

    const viewport = screen
      .getByText('Happening Soon')
      .closest('section')
      ?.querySelector('[data-page-count]');
    expect(viewport?.getAttribute('data-page-count')).toBe('3');
  });
});
