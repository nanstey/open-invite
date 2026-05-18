import { describe, expect, it } from 'vitest';
import { buildExploreSections } from '../../../domains/events/explore/buildExploreSections';
import { EventVisibility, type SocialEvent } from '../../../domains/events/types';

function makeEvent(overrides: Partial<SocialEvent>): SocialEvent {
  return {
    id: overrides.id ?? 'event-1',
    slug: overrides.slug ?? overrides.id ?? 'event-1',
    hostId: overrides.hostId ?? 'host-1',
    title: overrides.title ?? 'Default Event',
    description: overrides.description ?? 'Description',
    activityType: overrides.activityType ?? 'Social',
    location: overrides.location ?? 'Downtown',
    startTime: overrides.startTime ?? '2026-05-13T10:00:00.000Z',
    isAllDay: overrides.isAllDay ?? false,
    isFlexibleStart: overrides.isFlexibleStart ?? false,
    isFlexibleEnd: overrides.isFlexibleEnd ?? false,
    visibilityType: overrides.visibilityType ?? EventVisibility.INVITE_ONLY,
    groupIds: overrides.groupIds ?? [],
    allowFriendInvites: overrides.allowFriendInvites ?? false,
    attendees: overrides.attendees ?? [],
    noPhones: overrides.noPhones ?? false,
    itineraryTimeDisplay: overrides.itineraryTimeDisplay ?? 'START_AND_END',
    comments: overrides.comments ?? [],
    reactions: overrides.reactions ?? {},
    ...overrides,
  };
}

describe('buildExploreSections', () => {
  const now = new Date('2026-05-13T12:00:00.000Z');

  it('buckets events into happening soon, upcoming, and remaining categories', () => {
    const sections = buildExploreSections(
      [
        makeEvent({
          id: 'soon-1',
          title: 'Tonight',
          activityType: 'Food',
          startTime: '2026-05-13T18:00:00.000Z',
        }),
        makeEvent({
          id: 'soon-2',
          title: 'Tomorrow',
          activityType: 'Work',
          startTime: '2026-05-14T20:00:00.000Z',
        }),
        makeEvent({
          id: 'upcoming-1',
          title: 'Weekend Plan',
          activityType: 'Travel',
          startTime: '2026-05-17T12:00:00.000Z',
        }),
        makeEvent({
          id: 'cat-1',
          title: 'Later Social',
          activityType: 'Social',
          startTime: '2026-05-21T18:00:00.000Z',
        }),
        makeEvent({
          id: 'cat-2',
          title: 'Later Food',
          activityType: 'Food',
          startTime: '2026-05-22T18:00:00.000Z',
        }),
      ],
      '',
      now
    );

    expect(sections.map(section => section.id)).toEqual([
      'happening-soon',
      'upcoming',
      'category:Social',
      'category:Food',
    ]);
    expect(sections[0]?.events.map(event => event.id)).toEqual(['soon-1', 'soon-2']);
    expect(sections[1]?.events.map(event => event.id)).toEqual(['upcoming-1']);
    expect(sections[2]?.events.map(event => event.id)).toEqual(['cat-1']);
    expect(sections[3]?.events.map(event => event.id)).toEqual(['cat-2']);
  });

  it('sorts events chronologically within each section and excludes duplicates', () => {
    const sections = buildExploreSections(
      [
        makeEvent({ id: 'b', activityType: 'Sport', startTime: '2026-05-24T18:00:00.000Z' }),
        makeEvent({ id: 'a', activityType: 'Sport', startTime: '2026-05-23T18:00:00.000Z' }),
        makeEvent({ id: 'soon', activityType: 'Sport', startTime: '2026-05-13T14:00:00.000Z' }),
      ],
      '',
      now
    );

    expect(sections[0]?.events.map(event => event.id)).toEqual(['soon']);
    expect(sections[1]?.id).toBe('category:Sport');
    expect(sections[1]?.events.map(event => event.id)).toEqual(['a', 'b']);
  });

  it('searches title, description, location, and activity type while ignoring past events', () => {
    const sections = buildExploreSections(
      [
        makeEvent({
          id: 'match-location',
          title: 'Sunset Picnic',
          location: 'Ocean View',
          activityType: 'Social',
          startTime: '2026-05-21T18:00:00.000Z',
        }),
        makeEvent({
          id: 'match-type',
          title: 'Run Club',
          activityType: 'Sport',
          startTime: '2026-05-22T18:00:00.000Z',
        }),
        makeEvent({
          id: 'past-match',
          title: 'Past Ocean Dinner',
          location: 'Ocean View',
          activityType: 'Food',
          startTime: '2026-05-10T18:00:00.000Z',
        }),
      ],
      'ocean',
      now
    );

    expect(sections).toHaveLength(1);
    expect(sections[0]?.id).toBe('category:Social');
    expect(sections[0]?.events.map(event => event.id)).toEqual(['match-location']);

    const typeSections = buildExploreSections(
      [
        makeEvent({
          id: 'sport-1',
          title: 'Morning Run',
          activityType: 'Sport',
          startTime: '2026-05-21T12:00:00.000Z',
        }),
      ],
      'sport',
      now
    );

    expect(typeSections[0]?.id).toBe('category:Sport');
  });

  it('omits empty sections entirely', () => {
    const sections = buildExploreSections([], '', now);
    expect(sections).toEqual([]);
  });

  it('orders remaining category sections using the updated shared category order', () => {
    const sections = buildExploreSections(
      [
        makeEvent({ id: 'sport', activityType: 'Sport', startTime: '2026-05-24T18:00:00.000Z' }),
        makeEvent({ id: 'music', activityType: 'Music', startTime: '2026-05-24T18:00:00.000Z' }),
        makeEvent({ id: 'food', activityType: 'Food', startTime: '2026-05-24T18:00:00.000Z' }),
        makeEvent({ id: 'social', activityType: 'Social', startTime: '2026-05-24T18:00:00.000Z' }),
      ],
      '',
      now
    );

    expect(sections.map(section => section.id)).toEqual([
      'category:Social',
      'category:Food',
      'category:Music',
      'category:Sport',
    ]);
    expect(sections[2]?.title).toBe('🎵 Music');
  });
});
