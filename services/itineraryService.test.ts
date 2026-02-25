import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase }));

import {
  createItineraryItem,
  deleteItineraryItem,
  fetchItineraryItems,
  updateItineraryItem,
} from './itineraryService';

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table];
    if (!handler) {
      throw new Error(`Unhandled table ${table}`);
    }
    return handler();
  });
};

const baseRow = {
  id: 'item-1',
  event_id: 'event-1',
  title: 'Arrival',
  start_time: '2026-03-01T10:00:00Z',
  duration_minutes: 30,
  location: null as string | null,
  description: null as string | null,
};

describe('itineraryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchItineraryItems', () => {
    it('queries by event_id and orders by start_time asc', async () => {
      const select = vi.fn();
      const eq = vi.fn();
      const order = vi.fn().mockResolvedValue({ data: [], error: null });

      mockFrom({
        event_itinerary_items: () => ({
          select: select.mockReturnValue({
            eq: eq.mockReturnValue({
              order,
            }),
          }),
        }),
      });

      await fetchItineraryItems('event-1');

      expect(supabase.from).toHaveBeenCalledWith('event_itinerary_items');
      expect(select).toHaveBeenCalledWith('*');
      expect(eq).toHaveBeenCalledWith('event_id', 'event-1');
      expect(order).toHaveBeenCalledWith('start_time', { ascending: true });
    });

    it('transforms DB row with null-to-undefined mapping for location/description', async () => {
      mockFrom({
        event_itinerary_items: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [baseRow],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await fetchItineraryItems('event-1');

      expect(result).toEqual([
        {
          id: 'item-1',
          eventId: 'event-1',
          title: 'Arrival',
          startTime: '2026-03-01T10:00:00Z',
          durationMinutes: 30,
          location: undefined,
          description: undefined,
        },
      ]);
    });

    it('returns [] on DB error', async () => {
      mockFrom({
        event_itinerary_items: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({ data: null, error: new Error('db error') }),
            }),
          }),
        }),
      });

      const result = await fetchItineraryItems('event-1');

      expect(result).toEqual([]);
    });
  });

  describe('createItineraryItem', () => {
    it('builds insert payload with DB column names and null handling for optional fields', async () => {
      const insert = vi.fn((payload: unknown) => ({
        select: () => ({
          single: async () => ({
            data: {
              ...baseRow,
              ...((payload as Record<string, unknown>) ?? {}),
              id: 'item-2',
            },
            error: null,
          }),
        }),
      }));

      mockFrom({
        event_itinerary_items: () => ({ insert }),
      });

      await createItineraryItem({
        eventId: 'event-1',
        title: 'Dinner',
        startTime: '2026-03-01T18:00:00Z',
        durationMinutes: 90,
      });

      expect(insert).toHaveBeenCalledWith({
        event_id: 'event-1',
        title: 'Dinner',
        start_time: '2026-03-01T18:00:00Z',
        duration_minutes: 90,
        location: null,
        description: null,
      });
    });

    it('returns transformed item on success', async () => {
      mockFrom({
        event_itinerary_items: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  ...baseRow,
                  id: 'item-3',
                  location: 'Main Hall',
                  description: 'Meet by the entrance',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await createItineraryItem({
        eventId: 'event-1',
        title: 'Check-in',
        startTime: '2026-03-01T09:30:00Z',
        durationMinutes: 15,
        location: 'Main Hall',
        description: 'Meet by the entrance',
      });

      expect(result).toEqual({
        id: 'item-3',
        eventId: 'event-1',
        title: 'Arrival',
        startTime: '2026-03-01T10:00:00Z',
        durationMinutes: 30,
        location: 'Main Hall',
        description: 'Meet by the entrance',
      });
    });

    it('returns null when insert errors or no row returned', async () => {
      mockFrom({
        event_itinerary_items: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: new Error('insert failed') }),
            }),
          }),
        }),
      });

      const errorResult = await createItineraryItem({
        eventId: 'event-1',
        title: 'Dinner',
        startTime: '2026-03-01T18:00:00Z',
        durationMinutes: 90,
      });

      expect(errorResult).toBeNull();

      mockFrom({
        event_itinerary_items: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      });

      const missingRowResult = await createItineraryItem({
        eventId: 'event-1',
        title: 'Dinner',
        startTime: '2026-03-01T18:00:00Z',
        durationMinutes: 90,
      });

      expect(missingRowResult).toBeNull();
    });
  });

  describe('updateItineraryItem', () => {
    it('maps patch keys and supports explicit clearing of location/description to null', async () => {
      const update = vi.fn(() => ({
        eq: () => ({
          select: () => ({
            single: async () => ({
              data: {
                ...baseRow,
                title: 'Updated title',
                start_time: '2026-03-01T11:00:00Z',
                duration_minutes: 45,
                location: null,
                description: null,
              },
              error: null,
            }),
          }),
        }),
      }));

      mockFrom({
        event_itinerary_items: () => ({ update }),
      });

      await updateItineraryItem('item-1', {
        title: 'Updated title',
        startTime: '2026-03-01T11:00:00Z',
        durationMinutes: 45,
        location: undefined,
        description: undefined,
      });

      expect(update).toHaveBeenCalledWith({
        title: 'Updated title',
        start_time: '2026-03-01T11:00:00Z',
        duration_minutes: 45,
        location: null,
        description: null,
      });
    });

    it('returns transformed row on success', async () => {
      mockFrom({
        event_itinerary_items: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    ...baseRow,
                    title: 'Lunch',
                    location: 'Cafe',
                    description: 'Bring badge',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await updateItineraryItem('item-1', { title: 'Lunch' });

      expect(result).toEqual({
        id: 'item-1',
        eventId: 'event-1',
        title: 'Lunch',
        startTime: '2026-03-01T10:00:00Z',
        durationMinutes: 30,
        location: 'Cafe',
        description: 'Bring badge',
      });
    });

    it('returns null on DB error/missing row', async () => {
      mockFrom({
        event_itinerary_items: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: null, error: new Error('update failed') }),
              }),
            }),
          }),
        }),
      });

      const errorResult = await updateItineraryItem('item-1', { title: 'Updated' });
      expect(errorResult).toBeNull();

      mockFrom({
        event_itinerary_items: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      const missingResult = await updateItineraryItem('item-1', { title: 'Updated' });
      expect(missingResult).toBeNull();
    });
  });

  describe('deleteItineraryItem', () => {
    it('returns true on successful delete', async () => {
      mockFrom({
        event_itinerary_items: () => ({
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      });

      const result = await deleteItineraryItem('item-1');

      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      mockFrom({
        event_itinerary_items: () => ({
          delete: () => ({
            eq: async () => ({ error: new Error('delete failed') }),
          }),
        }),
      });

      const result = await deleteItineraryItem('item-1');

      expect(result).toBe(false);
    });
  });
});
