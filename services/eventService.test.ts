import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase }));
vi.mock('./itineraryService', () => ({ fetchItineraryItems: vi.fn(async () => []) }));
vi.mock('./expenseService', () => ({ fetchEventExpenses: vi.fn(async () => []) }));
vi.mock('./itineraryAttendanceService', () => ({
  fetchEventItineraryAttendance: vi.fn(async () => []),
  deleteItineraryAttendance: vi.fn(async () => true),
}));
vi.mock('./pexelsService', () => ({
  searchPexelsImages: vi.fn(async () => [{ fullUrl: 'https://example.com/header.jpg' }]),
}));
vi.mock('../domains/events/components/detail/route/routing', () => ({ isUuid: vi.fn(() => true) }));

import { isUuid } from '../domains/events/components/detail/route/routing';
import {
  addComment,
  createDraftEvent,
  createEvent,
  fetchEventById,
  fetchEventBySlug,
  fetchEvents,
  joinEvent,
  leaveEvent,
  markEventViewedFromRouteParam,
  publishEvent,
  toggleCommentReaction,
  toggleReaction,
  updateEvent,
} from './eventService';
import { deleteItineraryAttendance } from './itineraryAttendanceService';
import { searchPexelsImages } from './pexelsService';

const baseEventRow = {
  id: 'event-1',
  slug: 'event-1',
  host_id: 'host-1',
  published_at: '2025-01-01T00:00:00.000Z',
  title: 'Event 1',
  header_image_url: null,
  header_image_position_y: null,
  description: 'desc',
  activity_type: 'party',
  location: 'place',
  coordinates: null,
  location_data: null,
  start_time: '2025-01-01',
  end_time: null,
  is_flexible_start: false,
  is_flexible_end: false,
  visibility_type: 'PUBLIC',
  allow_friend_invites: true,
  max_seats: null,
  no_phones: false,
  itinerary_time_display: 'START_AND_END',
};

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table];
    if (!handler) {
      throw new Error(`Unhandled table ${table}`);
    }
    return handler();
  });
};

describe('eventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchEvents returns [] when no events', async () => {
    mockFrom({
      events: () => ({
        select: () => {
          const query = {
            or: vi.fn(() => query),
            not: vi.fn(() => query),
            order: async () => ({ data: [], error: null }),
          };
          return query;
        },
      }),
      event_attendees: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }),
      comments: () => ({
        select: () => ({ in: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
      reactions: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }),
      event_groups: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }),
    });

    const result = await fetchEvents('user-1');

    expect(result).toEqual([]);
  });

  it('fetchEvents aggregates attendees, comments, reactions, and userReacted', async () => {
    mockFrom({
      events: () => ({
        select: () => {
          const query = {
            or: vi.fn(() => query),
            not: vi.fn(() => query),
            order: async () => ({ data: [baseEventRow], error: null }),
          };
          return query;
        },
      }),
      event_attendees: () => ({
        select: () => ({
          in: async () => ({ data: [{ event_id: 'event-1', user_id: 'user-1' }], error: null }),
        }),
      }),
      comments: () => ({
        select: () => ({
          in: () => ({
            order: async () => ({
              data: [
                {
                  id: 'comment-1',
                  event_id: 'event-1',
                  user_id: 'user-2',
                  text: 'hi',
                  timestamp: '2025-01-01',
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
      reactions: () => ({
        select: () => ({
          in: async () => ({
            data: [
              { id: 'r1', event_id: 'event-1', user_id: 'user-1', emoji: '🎉' },
              { id: 'r2', event_id: 'event-1', user_id: 'user-2', emoji: '🎉' },
            ],
            error: null,
          }),
        }),
      }),
      event_groups: () => ({
        select: () => ({
          in: async () => ({ data: [{ event_id: 'event-1', group_id: 'group-1' }], error: null }),
        }),
      }),
      comment_reactions: () => ({
        select: () => ({ in: async () => ({ data: [], error: null }) }),
      }),
    });

    const result = await fetchEvents('user-1');

    expect(result[0].attendees).toEqual(['user-1']);
    expect(result[0].comments).toEqual([
      { id: 'comment-1', userId: 'user-2', text: 'hi', timestamp: '2025-01-01' },
    ]);
    expect(result[0].reactions['🎉']).toEqual({ emoji: '🎉', count: 2, userReacted: true });
    expect(result[0].groupIds).toEqual(['group-1']);
  });

  it('fetchEventById returns null when event missing and no user', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    mockFrom({
      events: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: new Error('missing') }) }),
        }),
      }),
      event_attendees: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      comments: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
      reactions: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      event_groups: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    });

    const result = await fetchEventById('missing');

    expect(result).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('fetchEventById marks viewed and refetches when user exists', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    let callCount = 0;

    mockFrom({
      events: () => ({
        select: () => ({
          eq: () => ({
            single: async () => {
              callCount += 1;
              if (callCount === 1) return { data: null, error: new Error('missing') };
              return { data: baseEventRow, error: null };
            },
          }),
        }),
      }),
      event_attendees: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      comments: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
      reactions: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      event_groups: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    });
    supabase.rpc.mockResolvedValue({ data: true, error: null });

    const result = await fetchEventById('event-1');

    expect(result?.id).toBe('event-1');
    expect(supabase.rpc).toHaveBeenCalledWith('mark_event_viewed', { event_id_param: 'event-1' });
  });

  it('fetchEventById hydrates comments with reactions and aggregates event reactions', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    mockFrom({
      events: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: baseEventRow, error: null }) }),
        }),
      }),
      event_attendees: () => ({
        select: () => ({
          eq: async () => ({ data: [{ user_id: 'user-1' }, { user_id: 'user-2' }], error: null }),
        }),
      }),
      comments: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [
                {
                  id: 'comment-1',
                  user_id: 'user-2',
                  text: 'hi',
                  timestamp: '2025-01-01',
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
      reactions: () => ({
        select: () => ({
          eq: async () => ({
            data: [
              { id: 'r1', event_id: 'event-1', user_id: 'user-1', emoji: '🎉' },
              { id: 'r2', event_id: 'event-1', user_id: 'user-2', emoji: '🎉' },
            ],
            error: null,
          }),
        }),
      }),
      event_groups: () => ({
        select: () => ({
          eq: async () => ({ data: [{ group_id: 'group-1' }], error: null }),
        }),
      }),
      comment_reactions: () => ({
        select: () => ({
          in: async () => ({
            data: [
              { comment_id: 'comment-1', user_id: 'user-1', emoji: '👍' },
              { comment_id: 'comment-1', user_id: 'user-2', emoji: '👍' },
            ],
            error: null,
          }),
        }),
      }),
    });

    const result = await fetchEventById('event-1');

    expect(result?.attendees).toEqual(['user-1', 'user-2']);
    expect(result?.groupIds).toEqual(['group-1']);
    expect(result?.reactions['🎉']).toEqual({ emoji: '🎉', count: 2, userReacted: true });
    expect(result?.comments[0].reactions?.['👍']).toEqual({
      emoji: '👍',
      count: 2,
      userReacted: true,
      userIds: ['user-1', 'user-2'],
    });
  });

  it('fetchEventById returns null when the event is missing and there is no user', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    mockFrom({
      events: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: { code: 'PGRST116' } }) }),
        }),
      }),
    });

    const result = await fetchEventById('missing');

    expect(result).toBeNull();
  });

  it('fetchEventBySlug uses RPC when direct fetch blocked and authenticated', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    supabase.rpc.mockResolvedValue({ data: 'event-1', error: null });

    mockFrom({
      events: () => ({
        select: (columns?: string) => ({
          eq: () => ({
            single: async () =>
              columns === 'id'
                ? { data: null, error: { code: 'PGRST116', message: 'No rows' } }
                : { data: baseEventRow, error: null },
          }),
        }),
      }),
      event_attendees: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      comments: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
      reactions: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      event_groups: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    });

    const result = await fetchEventBySlug('slug-1');

    expect(result?.id).toBe('event-1');
    expect(supabase.rpc).toHaveBeenCalledWith('mark_event_viewed_by_slug', {
      slug_param: 'slug-1',
    });
  });

  it('createEvent inserts event, adds host attendee, and groups only for GROUPS visibility', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'host-1' } } });
    const attendeeInsert = vi.fn(async () => ({ error: null }));
    const groupInsert = vi.fn(async () => ({ error: null }));
    const eventInsert = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: { id: 'event-1', slug: 'event-1' }, error: null }),
      }),
    }));

    mockFrom({
      events: () => ({
        insert: eventInsert,
        select: () => ({
          eq: () => ({ single: async () => ({ data: baseEventRow, error: null }) }),
        }),
      }),
      event_attendees: () => ({
        insert: attendeeInsert,
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }),
      event_groups: () => ({
        insert: groupInsert,
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }),
      comments: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
      reactions: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    });

    const result = await createEvent({
      title: 'Event 1',
      description: 'desc',
      activityType: 'party',
      headerImageUrl: null,
      headerImagePositionY: null,
      location: 'place',
      coordinates: null,
      locationData: null,
      startTime: '2025-01-01',
      endTime: null,
      isFlexibleStart: false,
      isFlexibleEnd: false,
      visibilityType: 'GROUPS',
      groupIds: ['group-1'],
      allowFriendInvites: true,
      maxSeats: null,
      noPhones: false,
      attendees: [],
      comments: [],
      reactions: {},
    } as any);

    expect(result?.id).toBe('event-1');
    expect(eventInsert).toHaveBeenCalledWith(
      expect.objectContaining({ published_at: expect.any(String) })
    );
    expect(attendeeInsert).toHaveBeenCalled();
    expect(groupInsert).toHaveBeenCalled();
  });

  it('createDraftEvent creates an unpublished invite-only draft with a header image', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'host-1' } } });
    const eventInsert = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: { id: 'event-1', slug: 'event-1' }, error: null }),
      }),
    }));

    mockFrom({
      events: () => ({
        insert: eventInsert,
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { ...baseEventRow, published_at: null }, error: null }),
          }),
        }),
      }),
      event_attendees: () => ({
        insert: vi.fn(async () => ({ error: null })),
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }),
      event_groups: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      comments: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
      reactions: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    });

    const draft = await createDraftEvent({
      title: 'Board games',
      activityType: 'Social',
      startTime: '2026-02-01T18:00:00.000Z',
      endTime: '2026-02-01T20:00:00.000Z',
    });

    expect(draft?.publishedAt).toBeNull();
    expect(eventInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        published_at: null,
        visibility_type: 'INVITE_ONLY',
        header_image_url: 'https://example.com/header.jpg',
      })
    );
  });

  it('createDraftEvent falls back to the Music header image when search returns nothing', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'host-1' } } });
    vi.mocked(searchPexelsImages).mockResolvedValueOnce([]);
    const eventInsert = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: { id: 'event-1', slug: 'event-1' }, error: null }),
      }),
    }));

    mockFrom({
      events: () => ({
        insert: eventInsert,
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { ...baseEventRow, published_at: null }, error: null }),
          }),
        }),
      }),
      event_attendees: () => ({
        insert: vi.fn(async () => ({ error: null })),
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }),
      event_groups: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      comments: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
      reactions: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    });

    await createDraftEvent({
      title: 'House set',
      activityType: 'Music',
      startTime: '2026-02-01T18:00:00.000Z',
      endTime: '2026-02-01T20:00:00.000Z',
    });

    expect(eventInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        header_image_url:
          'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1600',
      })
    );
  });

  it('updateEvent updates fields and replaces groups only when groupIds provided', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    const deleteGroups = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    const insertGroups = vi.fn(async () => ({ error: null }));

    mockFrom({
      events: () => ({
        update,
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { ...baseEventRow, title: 'Updated' }, error: null }),
          }),
        }),
      }),
      event_groups: () => ({
        delete: deleteGroups,
        insert: insertGroups,
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }),
      event_attendees: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      comments: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
      reactions: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    });

    await updateEvent('event-1', { title: 'Updated' });

    expect(deleteGroups).not.toHaveBeenCalled();

    await updateEvent('event-1', { visibilityType: 'GROUPS', groupIds: ['group-1'] } as any);

    expect(deleteGroups).toHaveBeenCalled();
    expect(insertGroups).toHaveBeenCalled();
  });

  it('publishEvent stamps published_at', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'host-1' } } });
    const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    mockFrom({
      events: () => ({
        update,
        select: () => ({
          eq: () => ({ single: async () => ({ data: baseEventRow, error: null }) }),
        }),
      }),
      event_groups: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      event_attendees: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      comments: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
      reactions: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
    });

    await publishEvent('event-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ published_at: expect.any(String) })
    );
  });

  it('joinEvent uses upsert and is idempotent', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
    const upsert = vi.fn(async () => ({ error: null }));
    mockFrom({
      event_attendees: () => ({ upsert }),
    });

    const result = await joinEvent('event-1');

    expect(result).toBe(true);
    expect(upsert).toHaveBeenCalledWith(expect.any(Object), {
      onConflict: 'event_id,user_id',
      ignoreDuplicates: true,
    });
  });

  it('toggleReaction removes existing reactions and inserts when missing', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const deleteFn = vi.fn(async () => ({ error: null }));
    const insertFn = vi.fn(async () => ({ error: null }));
    let hasExisting = true;

    mockFrom({
      reactions: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: hasExisting ? { id: 'reaction-1' } : null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        delete: () => ({ eq: deleteFn }),
        insert: insertFn,
      }),
    });

    const removed = await toggleReaction('event-1', '🎉');
    expect(removed).toBe(true);
    expect(deleteFn).toHaveBeenCalled();

    hasExisting = false;
    const added = await toggleReaction('event-1', '🎉');
    expect(added).toBe(true);
    expect(insertFn).toHaveBeenCalled();
  });

  describe('markEventViewedFromRouteParam', () => {
    it('does nothing when there is no authenticated user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await markEventViewedFromRouteParam('event-1');

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('marks viewed by id when the param is a UUID', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      vi.mocked(isUuid).mockReturnValueOnce(true);
      supabase.rpc.mockResolvedValue({ data: true, error: null });

      await markEventViewedFromRouteParam('uuid-1');

      expect(supabase.rpc).toHaveBeenCalledWith('mark_event_viewed', { event_id_param: 'uuid-1' });
    });

    it('marks viewed by slug when the param is not a UUID', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      vi.mocked(isUuid).mockReturnValueOnce(false);
      supabase.rpc.mockResolvedValue({ data: 'event-1', error: null });

      await markEventViewedFromRouteParam('some-slug');

      expect(supabase.rpc).toHaveBeenCalledWith('mark_event_viewed_by_slug', {
        slug_param: 'some-slug',
      });
    });
  });

  describe('leaveEvent', () => {
    it('returns false when there is no authenticated user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await leaveEvent('event-1');

      expect(result).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns false when the delete fails', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockFrom({
        event_attendees: () => ({
          delete: () => ({ eq: () => ({ eq: async () => ({ error: new Error('nope') }) }) }),
        }),
      });

      const result = await leaveEvent('event-1');

      expect(result).toBe(false);
      expect(deleteItineraryAttendance).not.toHaveBeenCalled();
    });

    it('deletes attendance and returns true on success', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      vi.mocked(deleteItineraryAttendance).mockResolvedValueOnce(true);
      mockFrom({
        event_attendees: () => ({
          delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        }),
      });

      const result = await leaveEvent('event-1');

      expect(result).toBe(true);
      expect(deleteItineraryAttendance).toHaveBeenCalledWith('event-1');
    });

    it('still returns true when clearing itinerary attendance fails', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      vi.mocked(deleteItineraryAttendance).mockResolvedValueOnce(false);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockFrom({
        event_attendees: () => ({
          delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        }),
      });

      const result = await leaveEvent('event-1');

      expect(result).toBe(true);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('addComment', () => {
    it('returns null when there is no authenticated user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await addComment('event-1', 'hello');

      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns null when the insert fails', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockFrom({
        comments: () => ({
          insert: () => ({
            select: () => ({ single: async () => ({ data: null, error: new Error('boom') }) }),
          }),
        }),
      });

      const result = await addComment('event-1', 'hello');

      expect(result).toBeNull();
    });

    it('returns the mapped comment on success', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockFrom({
        comments: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'comment-1',
                  user_id: 'user-1',
                  text: 'hello',
                  timestamp: '2025-01-01',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await addComment('event-1', 'hello');

      expect(result).toEqual({
        id: 'comment-1',
        userId: 'user-1',
        text: 'hello',
        timestamp: '2025-01-01',
      });
    });
  });

  describe('toggleCommentReaction', () => {
    it('returns false when there is no authenticated user', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await toggleCommentReaction('comment-1', '🎉');

      expect(result).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('inserts a new reaction when none exists', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const insertFn = vi.fn(async () => ({ error: null }));
      mockFrom({
        comment_reactions: () => ({
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          }),
          insert: insertFn,
        }),
      });

      const result = await toggleCommentReaction('comment-1', '🎉');

      expect(result).toBe(true);
      expect(insertFn).toHaveBeenCalled();
    });

    it('removes the reaction and does not re-insert when toggling the same emoji', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const deleteEq = vi.fn(async () => ({ error: null }));
      const insertFn = vi.fn(async () => ({ error: null }));
      mockFrom({
        comment_reactions: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'cr-1', emoji: '🎉' }, error: null }),
              }),
            }),
          }),
          delete: () => ({ eq: deleteEq }),
          insert: insertFn,
        }),
      });

      const result = await toggleCommentReaction('comment-1', '🎉');

      expect(result).toBe(true);
      expect(deleteEq).toHaveBeenCalled();
      expect(insertFn).not.toHaveBeenCalled();
    });

    it('replaces the reaction when toggling a different emoji', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const deleteEq = vi.fn(async () => ({ error: null }));
      const insertFn = vi.fn(async () => ({ error: null }));
      mockFrom({
        comment_reactions: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'cr-1', emoji: '👍' }, error: null }),
              }),
            }),
          }),
          delete: () => ({ eq: deleteEq }),
          insert: insertFn,
        }),
      });

      const result = await toggleCommentReaction('comment-1', '🎉');

      expect(result).toBe(true);
      expect(deleteEq).toHaveBeenCalled();
      expect(insertFn).toHaveBeenCalled();
    });

    it('returns false when deleting the existing reaction fails', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockFrom({
        comment_reactions: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'cr-1', emoji: '👍' }, error: null }),
              }),
            }),
          }),
          delete: () => ({ eq: async () => ({ error: new Error('fail') }) }),
        }),
      });

      const result = await toggleCommentReaction('comment-1', '🎉');

      expect(result).toBe(false);
    });
  });
});
