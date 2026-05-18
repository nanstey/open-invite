import type { SocialEvent } from '../types';

type EventScheduleFields = Pick<SocialEvent, 'endTime' | 'startTime'>;

export function getEventStartDate(event: EventScheduleFields): Date | null {
  return new Date(event.startTime);
}

export function getEventEndDate(event: EventScheduleFields): Date | null {
  return event.endTime ? new Date(event.endTime) : null;
}

export function getEventSortTime(event: EventScheduleFields): number {
  return getEventStartDate(event)?.getTime() ?? Number.POSITIVE_INFINITY;
}

export function isPastEventSchedule(event: EventScheduleFields, now: Date): boolean {
  const comparisonDate = getEventEndDate(event) ?? getEventStartDate(event);
  return comparisonDate ? comparisonDate < now : false;
}
