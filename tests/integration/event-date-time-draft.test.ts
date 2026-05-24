import { describe, expect, it } from 'vitest';

import {
  computeEventDateTimePayload,
  getEventDateTimeValidationError,
} from '../../domains/events/utils/eventDateTimeDraft';

describe('eventDateTimeDraft', () => {
  it('builds all-day payloads using day boundaries', () => {
    const payload = computeEventDateTimePayload({
      startDate: '2026-05-20',
      endDate: '2026-05-21',
      startTime: '',
      endTime: '',
      isAllDay: true,
    });

    expect(payload).toEqual({
      isAllDay: true,
      startTime: new Date('2026-05-20T00:00:00').toISOString(),
      endTime: new Date('2026-05-21T23:59:00').toISOString(),
    });
  });

  it('rejects timed ranges where the end is not after the start', () => {
    expect(
      getEventDateTimeValidationError({
        startDate: '2026-05-20',
        endDate: '2026-05-20',
        startTime: '19:00',
        endTime: '19:00',
        isAllDay: false,
      })
    ).toBe('End time must be after start time.');
  });
});
