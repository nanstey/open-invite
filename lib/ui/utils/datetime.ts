/**
 * Format a date string for display in short format (e.g., "Jan 30, 2026")
 */
export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string with time (e.g., "Jan 30, 2026, 2:30 PM")
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "yesterday")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDateShort(dateString);
}

/**
 * Format a date in long US English format (e.g., "January 30, 2026")
 */
export function formatDateLongEnUS(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time in 12-hour format (e.g., "2:30 PM")
 */
export function formatTime12h(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

type ParsedTimeParts = {
  hour: number;
  minute: number;
};

function isValidTimeParts(hour: number, minute: number) {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function parseTimeValue(value: string): ParsedTimeParts | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return isValidTimeParts(hour, minute) ? { hour, minute } : undefined;
}

export function formatTimeValue12h(value: string): string {
  const parsed = parseTimeValue(value);
  if (!parsed) return '';

  return formatTime12h(new Date(2000, 0, 1, parsed.hour, parsed.minute));
}

export function formatTimePartsValue(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Parses flexible user-entered time strings into an HH:mm value.
 * Supports inputs like "3", "3p", "12:30", "3:45pm", "823", "1234", and "14:00".
 */
export function parseUserTimeInput(input: string): string | undefined {
  const trimmed = input.trim();
  if (trimmed === '') return undefined;

  const normalizedInput = trimmed
    .replace(/\s/g, '')
    .toLowerCase()
    .replace(/[^0-9amp:]/g, '');

  const amPmMatch = normalizedInput.match(/^(\d{1,2})(:?(\d{2}))?(a|p|am|pm)?$/);
  if (amPmMatch?.[1]) {
    let hour = Number(amPmMatch[1]);
    const minute = amPmMatch[3] ? Number(amPmMatch[3]) : 0;
    const amPmIndicator = amPmMatch[4];

    if (amPmIndicator) {
      if ((amPmIndicator === 'p' || amPmIndicator === 'pm') && hour < 12) hour += 12;
      if ((amPmIndicator === 'a' || amPmIndicator === 'am') && hour === 12) hour = 0;
    } else if (!amPmMatch[3] && hour >= 1 && hour <= 6) {
      hour += 12;
    }

    if (isValidTimeParts(hour, minute)) {
      return formatTimePartsValue(hour, minute);
    }
  }

  const directMatch = normalizedInput.match(/^(\d{3,4})$/);
  if (directMatch?.[1]) {
    const time = Number(directMatch[1]);
    const hour = Math.floor(time / 100);
    const minute = time % 100;

    if (isValidTimeParts(hour, minute)) {
      return formatTimePartsValue(hour, minute);
    }
  }

  return undefined;
}

/**
 * Build an array of time options in quarter-hour increments for time selectors.
 * Returns options from 00:00 to 23:45 with labels like "12:00 AM", "12:15 AM", etc.
 */
export function buildQuarterHourTimeOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const value = formatTimePartsValue(hour, minute);
      options.push({ value, label: formatTimeValue12h(value) });
    }
  }
  return options;
}

/**
 * Convert an ISO date string to a local datetime input value (YYYY-MM-DDTHH:mm).
 */
export function toLocalDateTimeInputValue(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Split a local datetime input value (YYYY-MM-DDTHH:mm) into separate date and time parts.
 */
export function splitLocalDateTime(dateTimeValue: string): { date: string; time: string } {
  const [date, time] = dateTimeValue.split('T');
  return { date: date ?? '', time: time ?? '' };
}
