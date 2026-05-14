import type { SocialEvent } from '../../types';

export function getEventHeaderImageSrc(event: Pick<SocialEvent, 'id' | 'headerImageUrl'>) {
  return event.headerImageUrl || `https://picsum.photos/seed/${event.id}/1200/800`;
}

export function getEventHeaderImagePosition(positionY?: number) {
  return Math.min(100, Math.max(0, positionY ?? 50));
}

export function formatEventDateLabel(dateInput: string | Date) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatEventTimeLabel(dateInput: string | Date, isFlexibleStart = false) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isFlexibleStart ? `${timeLabel} (ish)` : timeLabel;
}
