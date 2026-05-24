import { describe, expect, it } from 'vitest';

import { validateEventEditor } from '../../domains/events/components/detail/utils/validateEventEditor';
import { EventVisibility } from '../../domains/events/types';

const baseValues = {
  title: 'Board Game Night',
  description: 'Bring snacks',
  location: 'Downtown',
  activityType: 'Social',
  startDate: '2026-02-28',
  endDate: '2026-02-28',
  startTime: '19:00',
  endTime: '21:00',
  isAllDay: false,
};

describe('EventEditor integration: group visibility validation', () => {
  it('does not require a top-level event location', () => {
    const errors = validateEventEditor(
      {
        ...baseValues,
        location: '',
      },
      false
    );

    expect(errors.location).toBeUndefined();
  });

  it('requires at least one group when visibilityType=GROUPS', () => {
    const errors = validateEventEditor(
      {
        ...baseValues,
        visibilityType: EventVisibility.GROUPS,
        groupIds: [],
      },
      false,
      true
    );

    expect(errors.groupIds).toBe('Select at least one group');
  });

  it('passes validation when at least one group is selected', () => {
    const errors = validateEventEditor(
      {
        ...baseValues,
        visibilityType: EventVisibility.GROUPS,
        groupIds: ['group-1'],
      },
      false,
      true
    );

    expect(errors.groupIds).toBeUndefined();
  });

  it('does not require groups when the feature flag is off', () => {
    const errors = validateEventEditor(
      {
        ...baseValues,
        visibilityType: EventVisibility.GROUPS,
        groupIds: [],
      },
      false,
      false
    );

    expect(errors.groupIds).toBeUndefined();
  });

  it('requires end time to be after start time for timed events', () => {
    const errors = validateEventEditor(
      {
        ...baseValues,
        endTime: '18:30',
      },
      false
    );

    expect(errors.startTime).toBe('End time must be after start time.');
    expect(errors.endTime).toBe('End time must be after start time.');
  });

  it('allows all-day events with an end date on or after the start date', () => {
    const errors = validateEventEditor(
      {
        ...baseValues,
        isAllDay: true,
        startTime: '',
        endTime: '',
        endDate: '2026-03-01',
      },
      false
    );

    expect(errors.startTime).toBeUndefined();
    expect(errors.endTime).toBeUndefined();
  });
});
