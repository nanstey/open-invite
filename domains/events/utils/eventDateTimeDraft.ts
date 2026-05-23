export type EventDateTimeDraftValues = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
};

export function combineLocalDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function combineAllDayEndDateTime(date: string): string {
  return new Date(`${date}T23:59:00`).toISOString();
}

export function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

export function getEventDateTimeValidationError(values: EventDateTimeDraftValues): string | null {
  const { startDate, endDate, startTime, endTime, isAllDay } = values;

  if (!startDate || !endDate) {
    return 'Add a start date and end date.';
  }

  if (isAllDay) {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Choose valid start and end dates.';
    }
    if (end < start) {
      return 'End date must be on or after start date.';
    }
    return null;
  }

  if (!startTime || !endTime) {
    return 'Add a start time and end time.';
  }

  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Choose valid start and end times.';
  }
  if (end <= start) {
    return 'End time must be after start time.';
  }
  return null;
}

export function computeEventDateTimePayload(
  values: EventDateTimeDraftValues
): { startTime: string; endTime: string; isAllDay: boolean } | null {
  if (getEventDateTimeValidationError(values)) return null;

  return {
    isAllDay: values.isAllDay,
    startTime: values.isAllDay
      ? combineLocalDateTime(values.startDate, '00:00')
      : combineLocalDateTime(values.startDate, values.startTime),
    endTime: values.isAllDay
      ? combineAllDayEndDateTime(values.endDate)
      : combineLocalDateTime(values.endDate, values.endTime),
  };
}
