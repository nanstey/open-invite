import type { SocialEvent } from '../types';

export type ExploreSectionId = 'happening-soon' | 'upcoming' | `category:${string}`;

export type ExploreSection = {
  id: ExploreSectionId;
  title: string;
  events: SocialEvent[];
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const CATEGORY_EMOJI: Record<string, string> = {
  entertainment: '🎭',
  errand: '🛒',
  food: '🍽️',
  social: '🥂',
  sport: '⚽',
  travel: '✈️',
  work: '💼',
  other: '✨',
};

function withEmoji(category: string): string {
  const emoji = CATEGORY_EMOJI[category.trim().toLowerCase()];
  return emoji ? `${emoji} ${category}` : category;
}

function compareChronologically(a: SocialEvent, b: SocialEvent) {
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

function matchesSearch(event: SocialEvent, searchTerm: string) {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) return true;

  return (
    event.title.toLowerCase().includes(normalized) ||
    event.description.toLowerCase().includes(normalized) ||
    event.location.toLowerCase().includes(normalized) ||
    event.activityType.toLowerCase().includes(normalized)
  );
}

export function buildExploreSections(
  events: SocialEvent[],
  searchTerm: string,
  now = new Date()
): ExploreSection[] {
  const nowMs = now.getTime();
  const soonCutoff = nowMs + 72 * HOUR_MS;
  const upcomingCutoff = nowMs + 7 * DAY_MS;

  const futureEvents = events
    .filter(event => new Date(event.startTime).getTime() >= nowMs)
    .filter(event => matchesSearch(event, searchTerm))
    .sort(compareChronologically);

  const usedIds = new Set<string>();

  const happeningSoon = futureEvents.filter(event => {
    const startMs = new Date(event.startTime).getTime();
    const isMatch = startMs < soonCutoff;
    if (isMatch) usedIds.add(event.id);
    return isMatch;
  });

  const upcoming = futureEvents.filter(event => {
    if (usedIds.has(event.id)) return false;
    const startMs = new Date(event.startTime).getTime();
    const isMatch = startMs >= soonCutoff && startMs < upcomingCutoff;
    if (isMatch) usedIds.add(event.id);
    return isMatch;
  });

  const remaining = futureEvents.filter(event => !usedIds.has(event.id));
  const groupedByCategory = new Map<string, SocialEvent[]>();

  remaining.forEach(event => {
    const key = event.activityType.trim() || 'Other';
    const bucket = groupedByCategory.get(key);
    if (bucket) {
      bucket.push(event);
      return;
    }
    groupedByCategory.set(key, [event]);
  });

  const sections: ExploreSection[] = [];

  if (happeningSoon.length > 0) {
    sections.push({ id: 'happening-soon', title: '⚡ Happening Soon', events: happeningSoon });
  }

  if (upcoming.length > 0) {
    sections.push({ id: 'upcoming', title: '📅 Upcoming', events: upcoming });
  }

  const categorySections = [...groupedByCategory.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([activityType, categoryEvents]) => ({
      id: `category:${activityType}` as const,
      title: withEmoji(activityType),
      events: [...categoryEvents].sort(compareChronologically),
    }));

  return [...sections, ...categorySections];
}
