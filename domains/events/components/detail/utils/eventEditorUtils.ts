import type { ItineraryItem } from '../../../types';
import {
  computeEventDateTimePayload,
  type EventDateTimeDraftValues,
} from '../../../utils/eventDateTimeDraft';

export type DraftItineraryItem = {
  id: string;
  title: string;
  startTime: string; // ISO
  durationMinutes: number;
  location?: string;
  description?: string;
};

export function computeEventTimes(args: {
  hasItinerary: boolean;
  itineraryItems: Array<{ startTime: string; durationMinutes: number }>;
  dateTimeDraft: EventDateTimeDraftValues;
  fallbackStartIso: string;
}): { startTime: string; endTime?: string } | null {
  void args.hasItinerary;
  void args.itineraryItems;
  return (
    computeEventDateTimePayload(args.dateTimeDraft) ?? {
      startTime: args.fallbackStartIso,
      endTime: undefined,
    }
  );
}

export function mapDraftItineraryItems(
  drafts: DraftItineraryItem[],
  eventId: string
): ItineraryItem[] {
  return drafts.map(i => ({
    id: i.id,
    eventId,
    title: i.title,
    startTime: i.startTime,
    durationMinutes: i.durationMinutes,
    location: i.location,
    description: i.description,
  }));
}

type ItineraryCreate = {
  title: string;
  startTime: string;
  durationMinutes: number;
  location?: string;
  description?: string;
};

type ItineraryUpdate = {
  id: string;
  patch: Partial<ItineraryCreate>;
};

function normalizeOptionalText(value: unknown): string | undefined {
  const s = String(value ?? '').trim();
  return s ? s : undefined;
}

export function diffItineraryItems(
  initial: ItineraryItem[],
  current: DraftItineraryItem[]
): {
  deletes: string[];
  creates: ItineraryCreate[];
  updates: ItineraryUpdate[];
} {
  const initialById = new Map(initial.map(i => [i.id, i] as const));
  const currentById = new Map(current.map(i => [i.id, i] as const));

  const deletes = initial.filter(i => !currentById.has(i.id)).map(i => i.id);

  const creates = current
    .filter(i => !initialById.has(i.id))
    .map(i => ({
      title: i.title,
      startTime: i.startTime,
      durationMinutes: i.durationMinutes,
      location: normalizeOptionalText(i.location),
      description: normalizeOptionalText(i.description),
    }));

  const updates: ItineraryUpdate[] = [];
  for (const cur of current) {
    const prev = initialById.get(cur.id);
    if (!prev) continue;

    const prevLocation = normalizeOptionalText(prev.location);
    const prevDescription = normalizeOptionalText(prev.description);
    const nextLocation = normalizeOptionalText(cur.location);
    const nextDescription = normalizeOptionalText(cur.description);

    const patch: Partial<ItineraryCreate> = {};
    if (prev.title !== cur.title) patch.title = cur.title;
    if (prev.startTime !== cur.startTime) patch.startTime = cur.startTime;
    if (prev.durationMinutes !== cur.durationMinutes) patch.durationMinutes = cur.durationMinutes;
    if (prevLocation !== nextLocation) patch.location = nextLocation;
    if (prevDescription !== nextDescription) patch.description = nextDescription;

    if (Object.keys(patch).length > 0) {
      updates.push({ id: cur.id, patch });
    }
  }

  return { deletes, creates, updates };
}
