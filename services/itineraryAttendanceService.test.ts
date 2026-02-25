import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase }));

import {
  deleteItineraryAttendance,
  ensureItineraryAttendanceForAllAttendees,
  fetchEventItineraryAttendance,
  upsertItineraryAttendance,
} from './itineraryAttendanceService';

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table];
    if (!handler) {
      throw new Error(`Unhandled table ${table}`);
    }
    return handler();
  });
};

describe('itineraryAttendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchEventItineraryAttendance', () => {
    it('filters by event_id and transforms rows', async () => {
      const eq = vi.fn(async () => ({
        data: [
          {
            id: 'attendance-1',
            event_id: 'event-1',
            user_id: 'user-1',
            itinerary_item_ids: ['item-1'],
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T01:00:00Z',
          },
          {
            id: 'attendance-2',
            event_id: 'event-1',
            user_id: 'user-2',
            itinerary_item_ids: null,
            created_at: null,
            updated_at: null,
          },
        ],
        error: null,
      }));

      mockFrom({
        event_itinerary_attendance: () => ({
          select: () => ({ eq }),
        }),
      });

      const result = await fetchEventItineraryAttendance('event-1');

      expect(eq).toHaveBeenCalledWith('event_id', 'event-1');
      expect(result).toEqual([
        {
          id: 'attendance-1',
          eventId: 'event-1',
          userId: 'user-1',
          itineraryItemIds: ['item-1'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T01:00:00Z',
        },
        {
          id: 'attendance-2',
          eventId: 'event-1',
          userId: 'user-2',
          itineraryItemIds: [],
          createdAt: undefined,
          updatedAt: undefined,
        },
      ]);
    });

    it('returns empty array on query error', async () => {
      mockFrom({
        event_itinerary_attendance: () => ({
          select: () => ({
            eq: async () => ({ data: null, error: new Error('db error') }),
          }),
        }),
      });

      const result = await fetchEventItineraryAttendance('event-1');

      expect(result).toEqual([]);
    });
  });

  describe('ensureItineraryAttendanceForAllAttendees', () => {
    it('short-circuits true when attendee list is empty', async () => {
      const result = await ensureItineraryAttendanceForAllAttendees({
        eventId: 'event-1',
        attendeeIds: [],
        itineraryItemIds: ['item-1'],
      });

      expect(result).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('short-circuits true when itinerary list is empty', async () => {
      const result = await ensureItineraryAttendanceForAllAttendees({
        eventId: 'event-1',
        attendeeIds: ['user-1'],
        itineraryItemIds: [],
      });

      expect(result).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('upserts only missing users or users with empty itineraryItemIds', async () => {
      const upsert = vi.fn(async () => ({ error: null }));

      mockFrom({
        event_itinerary_attendance: () => ({
          select: () => ({
            eq: async () => ({
              data: [
                {
                  id: 'attendance-1',
                  event_id: 'event-1',
                  user_id: 'user-1',
                  itinerary_item_ids: ['existing-item'],
                  created_at: null,
                  updated_at: null,
                },
                {
                  id: 'attendance-2',
                  event_id: 'event-1',
                  user_id: 'user-2',
                  itinerary_item_ids: [],
                  created_at: null,
                  updated_at: null,
                },
              ],
              error: null,
            }),
          }),
          upsert,
        }),
      });

      const result = await ensureItineraryAttendanceForAllAttendees({
        eventId: 'event-1',
        attendeeIds: ['user-1', 'user-2', 'user-3'],
        itineraryItemIds: ['item-a', 'item-b'],
      });

      expect(result).toBe(true);
      expect(upsert).toHaveBeenCalledWith(
        [
          {
            event_id: 'event-1',
            user_id: 'user-2',
            itinerary_item_ids: ['item-a', 'item-b'],
          },
          {
            event_id: 'event-1',
            user_id: 'user-3',
            itinerary_item_ids: ['item-a', 'item-b'],
          },
        ],
        { onConflict: 'event_id,user_id' }
      );
    });

    it('returns false when upsert errors', async () => {
      mockFrom({
        event_itinerary_attendance: () => ({
          select: () => ({
            eq: async () => ({
              data: [],
              error: null,
            }),
          }),
          upsert: async () => ({ error: new Error('db error') }),
        }),
      });

      const result = await ensureItineraryAttendanceForAllAttendees({
        eventId: 'event-1',
        attendeeIds: ['user-1'],
        itineraryItemIds: ['item-a'],
      });

      expect(result).toBe(false);
    });
  });

  describe('upsertItineraryAttendance', () => {
    it('returns null when user is not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await upsertItineraryAttendance('event-1', ['item-1']);

      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('upserts current user attendance and returns transformed row on success', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const upsert = vi.fn(() => ({
        select: () => ({
          single: async () => ({
            data: {
              id: 'attendance-1',
              event_id: 'event-1',
              user_id: 'user-1',
              itinerary_item_ids: ['item-1', 'item-2'],
              created_at: null,
              updated_at: '2025-01-02T00:00:00Z',
            },
            error: null,
          }),
        }),
      }));

      mockFrom({
        event_itinerary_attendance: () => ({
          upsert,
        }),
      });

      const result = await upsertItineraryAttendance('event-1', ['item-1', 'item-2']);

      expect(upsert).toHaveBeenCalledWith(
        {
          event_id: 'event-1',
          user_id: 'user-1',
          itinerary_item_ids: ['item-1', 'item-2'],
        },
        { onConflict: 'event_id,user_id' }
      );
      expect(result).toEqual({
        id: 'attendance-1',
        eventId: 'event-1',
        userId: 'user-1',
        itineraryItemIds: ['item-1', 'item-2'],
        createdAt: undefined,
        updatedAt: '2025-01-02T00:00:00Z',
      });
    });

    it('returns null on DB error or missing row', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockFrom({
        event_itinerary_attendance: () => ({
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: new Error('db error') }),
            }),
          }),
        }),
      });

      const dbErrorResult = await upsertItineraryAttendance('event-1', ['item-1']);
      expect(dbErrorResult).toBeNull();

      mockFrom({
        event_itinerary_attendance: () => ({
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      });

      const missingRowResult = await upsertItineraryAttendance('event-1', ['item-1']);
      expect(missingRowResult).toBeNull();
    });
  });

  describe('deleteItineraryAttendance', () => {
    it('returns false when unauthenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await deleteItineraryAttendance('event-1');

      expect(result).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('deletes via match({ event_id, user_id }) and returns true on success', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      const match = vi.fn(async () => ({ error: null }));

      mockFrom({
        event_itinerary_attendance: () => ({
          delete: () => ({ match }),
        }),
      });

      const result = await deleteItineraryAttendance('event-1');

      expect(match).toHaveBeenCalledWith({ event_id: 'event-1', user_id: 'user-1' });
      expect(result).toBe(true);
    });

    it('returns false on delete error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      mockFrom({
        event_itinerary_attendance: () => ({
          delete: () => ({
            match: async () => ({ error: new Error('db error') }),
          }),
        }),
      });

      const result = await deleteItineraryAttendance('event-1');

      expect(result).toBe(false);
    });
  });
});
