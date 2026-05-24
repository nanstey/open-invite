import { useForm, useStore } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import React from 'react';

import { useFeatureFlag } from '../../../lib/featureFlags';
import type { Group, GroupRole, User } from '../../../lib/types';
import { splitLocalDateTime, toLocalDateTimeInputValue } from '../../../lib/ui/utils/datetime';
import { createEvent, fetchEventById, updateEvent } from '../../../services/eventService';
import {
  createEventExpense,
  deleteEventExpense,
  updateEventExpense,
} from '../../../services/expenseService';
import { fetchGroupMembershipsForCurrentUser } from '../../../services/groupService';
import { ensureItineraryAttendanceForAllAttendees } from '../../../services/itineraryAttendanceService';
import {
  createItineraryItem,
  deleteItineraryItem,
  updateItineraryItem,
} from '../../../services/itineraryService';
import {
  computeEventTimes,
  type DraftItineraryItem,
  diffItineraryItems,
  mapDraftItineraryItems,
} from '../components/detail/utils/eventEditorUtils';
import { validateEventEditor } from '../components/detail/utils/validateEventEditor';
import type {
  EventExpense,
  ItineraryItem,
  ItineraryTimeDisplay,
  LocationData,
  SocialEvent,
} from '../types';
import { EventVisibility } from '../types';

type EditorMode = 'create' | 'update';

const EMPTY_STRING_ARR: string[] = [];
const EMPTY_REACTIONS: SocialEvent['reactions'] = {};
const EMPTY_COMMENTS: SocialEvent['comments'] = [];

type EventEditorValues = {
  title: string;
  headerImageUrl: string;
  headerImagePositionY: number;
  location: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  activityType: string;
  isFlexibleStart: boolean;
  isFlexibleEnd: boolean;
  itineraryAttendanceEnabled: boolean;
  noPhones: boolean;
  maxSeats: number | '';
  coordinates: { lat: number; lng: number } | undefined;
  locationData: LocationData | undefined;
  itineraryTimeDisplay: ItineraryTimeDisplay;
  visibilityType: EventVisibility;
  groupIds: string[];
};

type DraftExpense = Omit<EventExpense, 'eventId'>;

async function persistItineraryChanges(args: {
  eventId: string;
  initialItems: ItineraryItem[];
  currentDrafts: DraftItineraryItem[];
}): Promise<void> {
  const { deletes, creates, updates } = diffItineraryItems(args.initialItems, args.currentDrafts);

  await Promise.all([
    ...deletes.map(id => deleteItineraryItem(id)),
    ...updates.map(u => updateItineraryItem(u.id, u.patch)),
    ...creates.map(c =>
      createItineraryItem({
        eventId: args.eventId,
        title: c.title,
        startTime: c.startTime,
        durationMinutes: c.durationMinutes,
        location: c.location,
        description: c.description,
      })
    ),
  ]);
}

function mapDraftExpenses(drafts: DraftExpense[], eventId: string): EventExpense[] {
  return drafts.map(e => ({ ...e, eventId }));
}

type ExpenseCreate = Omit<EventExpense, 'id'>;
type ExpenseUpdate = { id: string; patch: Partial<Omit<EventExpense, 'id' | 'eventId'>> };

export function diffExpenses(
  initial: EventExpense[],
  current: DraftExpense[]
): {
  deletes: string[];
  creates: ExpenseCreate[];
  updates: ExpenseUpdate[];
} {
  const initialById = new Map(initial.map(e => [e.id, e] as const));
  const currentById = new Map(current.map(e => [e.id, e] as const));

  const deletes = initial.filter(e => !currentById.has(e.id)).map(e => e.id);

  const creates: ExpenseCreate[] = current
    .filter(e => !initialById.has(e.id))
    .map(e => ({
      eventId: '', // filled by caller
      sortOrder: e.sortOrder,
      title: e.title,
      appliesTo: e.appliesTo,
      splitType: e.splitType,
      timing: e.timing,
      settledKind: e.settledKind,
      amountCents: e.amountCents,
      currency: e.currency,
      participantIds: e.participantIds,
      itineraryItemId: e.itineraryItemId ?? null,
    }));

  const updates: ExpenseUpdate[] = [];
  for (const cur of current) {
    const prev = initialById.get(cur.id);
    if (!prev) continue;

    const patch: Partial<Omit<EventExpense, 'id' | 'eventId'>> = {};
    if (prev.sortOrder !== cur.sortOrder) patch.sortOrder = cur.sortOrder;
    if (prev.title !== cur.title) patch.title = cur.title;
    if (prev.appliesTo !== cur.appliesTo) patch.appliesTo = cur.appliesTo;
    if (prev.splitType !== cur.splitType) patch.splitType = cur.splitType;
    if (prev.timing !== cur.timing) patch.timing = cur.timing;
    if (prev.settledKind !== cur.settledKind) patch.settledKind = cur.settledKind;
    if (prev.amountCents !== cur.amountCents) patch.amountCents = cur.amountCents;
    if (prev.currency !== cur.currency) patch.currency = cur.currency;
    if (prev.participantIds.join(',') !== cur.participantIds.join(','))
      patch.participantIds = cur.participantIds;
    if ((prev.itineraryItemId ?? null) !== (cur.itineraryItemId ?? null))
      patch.itineraryItemId = cur.itineraryItemId ?? null;

    if (Object.keys(patch).length > 0) updates.push({ id: cur.id, patch });
  }

  return { deletes, creates, updates };
}

async function persistExpenseChanges(args: {
  eventId: string;
  initialItems: EventExpense[];
  currentDrafts: DraftExpense[];
}): Promise<void> {
  const { deletes, creates, updates } = diffExpenses(args.initialItems, args.currentDrafts);

  await Promise.all([
    ...deletes.map(id => deleteEventExpense(id)),
    ...updates.map(u => updateEventExpense(u.id, u.patch)),
    ...creates.map(c =>
      createEventExpense({
        ...c,
        eventId: args.eventId,
      })
    ),
  ]);
}

export function useEventEditorController(props: {
  mode: EditorMode;
  currentUser: User;
  initialEvent?: SocialEvent;
  onCancel: () => void;
  onSuccess: (event: SocialEvent) => void;
}) {
  const isUpdate = props.mode === 'update';
  const isDraftUpdate = isUpdate && !props.initialEvent?.publishedAt;
  const draftIdRef = React.useRef<string>(globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
  const defaultStartTimeIsoRef = React.useRef<string>(new Date().toISOString());

  const [itineraryItems, setItineraryItems] = React.useState<DraftItineraryItem[]>(() => {
    const existing = props.initialEvent?.itineraryItems ?? [];
    return existing.map(i => ({
      id: i.id,
      title: i.title,
      startTime: i.startTime,
      durationMinutes: i.durationMinutes,
      location: i.location,
      description: i.description,
    }));
  });

  const [expenseItems, setExpenseItems] = React.useState<DraftExpense[]>(() => {
    const existing = props.initialEvent?.expenses ?? [];
    return existing.map((e, idx) => ({
      id: e.id,
      sortOrder: e.sortOrder ?? idx + 1,
      title: e.title,
      appliesTo: e.appliesTo,
      splitType: e.splitType,
      timing: e.timing,
      settledKind: e.settledKind,
      amountCents: e.amountCents,
      currency: e.currency,
      participantIds: e.participantIds,
      itineraryItemId: e.itineraryItemId ?? null,
    }));
  });

  const hasItinerary = itineraryItems.length > 0;

  const defaultValues = React.useMemo<EventEditorValues>(() => {
    const ev = props.initialEvent;
    if (ev) {
      const { date: startDate, time: startTime } = splitLocalDateTime(
        toLocalDateTimeInputValue(ev.startTime)
      );
      const { date: endDate, time: endTime } = splitLocalDateTime(
        toLocalDateTimeInputValue(ev.endTime ?? ev.startTime)
      );
      return {
        title: ev.title,
        headerImageUrl: ev.headerImageUrl ?? '',
        headerImagePositionY: ev.headerImagePositionY ?? 50,
        location: ev.location,
        description: ev.description,
        startDate,
        endDate,
        startTime,
        endTime,
        isAllDay: ev.isAllDay ?? false,
        activityType: ev.activityType,
        isFlexibleStart: ev.isFlexibleStart,
        isFlexibleEnd: ev.isFlexibleEnd,
        itineraryAttendanceEnabled: ev.itineraryAttendanceEnabled ?? false,
        noPhones: ev.noPhones,
        maxSeats: ev.maxSeats && ev.maxSeats > 0 ? ev.maxSeats : '',
        coordinates: ev.coordinates,
        locationData: ev.locationData,
        itineraryTimeDisplay: ev.itineraryTimeDisplay,
        visibilityType: ev.visibilityType ?? EventVisibility.INVITE_ONLY,
        groupIds: ev.groupIds ?? [],
      };
    }

    return {
      title: '',
      headerImageUrl: '',
      headerImagePositionY: 50,
      location: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      isAllDay: false,
      activityType: 'Social',
      isFlexibleStart: false,
      isFlexibleEnd: false,
      itineraryAttendanceEnabled: false,
      noPhones: false,
      maxSeats: '',
      coordinates: undefined,
      locationData: undefined,
      itineraryTimeDisplay: 'START_AND_END',
      visibilityType: EventVisibility.INVITE_ONLY,
      groupIds: [],
    };
  }, [props.initialEvent]);

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = React.useState(false);
  const [groupRoles, setGroupRoles] = React.useState<Map<string, GroupRole>>(new Map());
  const [endDateTouched, setEndDateTouched] = React.useState(() => {
    const ev = props.initialEvent;
    if (!ev?.endTime) return false;
    const { date: startDate } = splitLocalDateTime(toLocalDateTimeInputValue(ev.startTime));
    const { date: endDate } = splitLocalDateTime(toLocalDateTimeInputValue(ev.endTime));
    return !!endDate && endDate !== startDate;
  });
  const groupsEnabled = useFeatureFlag('groups');

  React.useEffect(() => {
    if (!groupsEnabled) {
      setGroups([]);
      setGroupRoles(new Map());
      setGroupsLoading(false);
      return;
    }

    let isMounted = true;
    const loadGroups = async () => {
      setGroupsLoading(true);
      const memberships = await fetchGroupMembershipsForCurrentUser();
      if (!isMounted) return;
      const nextGroups = memberships.map(m => m.group);
      const nextRoles = new Map(memberships.map(m => [m.group.id, m.role] as const));
      setGroups(nextGroups);
      setGroupRoles(nextRoles);
      setGroupsLoading(false);
    };
    loadGroups();
    return () => {
      isMounted = false;
    };
  }, [groupsEnabled]);

  const eligibleGroups = React.useMemo(() => {
    if (!groupsEnabled) return [];
    return groups.filter(group => {
      const role = groupRoles.get(group.id);
      return role === 'ADMIN' || group.allowMembersCreateEvents;
    });
  }, [groupRoles, groups, groupsEnabled]);

  const onSubmit = React.useCallback(
    async ({ value }: { value: EventEditorValues }) => {
      const title = value.title.trim();
      const location = value.location.trim();
      const description = value.description.trim();
      const activityType = String(value.activityType ?? '').trim();

      const errors = validateEventEditor(value, hasItinerary, groupsEnabled);
      if (Object.values(errors).some(Boolean)) throw new Error('Missing required fields');

      const times = computeEventTimes({
        hasItinerary,
        itineraryItems,
        dateTimeDraft: {
          startDate: value.startDate,
          endDate: value.endDate,
          startTime: value.startTime,
          endTime: value.endTime,
          isAllDay: value.isAllDay,
        },
        fallbackStartIso: defaultStartTimeIsoRef.current,
      });
      if (!times) throw new Error('Missing required fields');
      if (!times.endTime) throw new Error('Missing required fields');

      const maxSeats = value.maxSeats === '' ? undefined : Number(value.maxSeats);
      const normalizedMaxSeats = maxSeats && maxSeats > 0 ? maxSeats : undefined;

      if (!isUpdate) {
        const created = await createEvent({
          title,
          headerImageUrl: value.headerImageUrl.trim() || undefined,
          headerImagePositionY: value.headerImagePositionY,
          location,
          description,
          startTime: times.startTime,
          endTime: times.endTime,
          isAllDay: value.isAllDay,
          activityType,
          isFlexibleStart: value.isFlexibleStart,
          isFlexibleEnd: value.isFlexibleEnd,
          itineraryAttendanceEnabled: value.itineraryAttendanceEnabled,
          noPhones: value.noPhones,
          maxSeats: normalizedMaxSeats,
          visibilityType: value.visibilityType,
          allowFriendInvites: false,
          coordinates: value.coordinates,
          locationData: value.locationData,
          itineraryTimeDisplay: value.itineraryTimeDisplay,
          groupIds: value.visibilityType === EventVisibility.GROUPS ? value.groupIds : [],
        });
        if (!created) throw new Error('createEvent returned null');

        await Promise.all([
          hasItinerary
            ? persistItineraryChanges({
                eventId: created.id,
                initialItems: [],
                currentDrafts: itineraryItems,
              })
            : Promise.resolve(),
          expenseItems.length > 0
            ? persistExpenseChanges({
                eventId: created.id,
                initialItems: [],
                currentDrafts: expenseItems,
              })
            : Promise.resolve(),
        ]);

        const refreshed = await fetchEventById(created.id);
        props.onSuccess(refreshed ?? created);
        return;
      }

      if (!props.initialEvent) throw new Error('Missing initialEvent for update mode');

      const updated = await updateEvent(props.initialEvent.id, {
        title,
        publishedAt: isDraftUpdate ? new Date().toISOString() : props.initialEvent.publishedAt,
        headerImageUrl: value.headerImageUrl.trim() || undefined,
        headerImagePositionY: value.headerImagePositionY,
        location,
        description,
        startTime: times.startTime,
        endTime: times.endTime,
        isAllDay: value.isAllDay,
        activityType,
        isFlexibleStart: value.isFlexibleStart,
        isFlexibleEnd: value.isFlexibleEnd,
        itineraryAttendanceEnabled: value.itineraryAttendanceEnabled,
        noPhones: value.noPhones,
        maxSeats: normalizedMaxSeats,
        visibilityType: value.visibilityType,
        allowFriendInvites: false,
        coordinates: value.coordinates,
        locationData: value.locationData,
        itineraryTimeDisplay: value.itineraryTimeDisplay,
        groupIds: value.visibilityType === EventVisibility.GROUPS ? value.groupIds : [],
      });

      if (!updated) throw new Error('updateEvent returned null');

      await Promise.all([
        persistItineraryChanges({
          eventId: props.initialEvent.id,
          initialItems: props.initialEvent.itineraryItems ?? [],
          currentDrafts: itineraryItems,
        }),
        persistExpenseChanges({
          eventId: props.initialEvent.id,
          initialItems: props.initialEvent.expenses ?? [],
          currentDrafts: expenseItems,
        }),
      ]);

      let refreshed = await fetchEventById(props.initialEvent.id);

      const wasAttendanceEnabled = props.initialEvent.itineraryAttendanceEnabled ?? false;
      const isAttendanceEnabled = value.itineraryAttendanceEnabled;
      if (!wasAttendanceEnabled && isAttendanceEnabled && refreshed?.itineraryItems?.length) {
        await ensureItineraryAttendanceForAllAttendees({
          eventId: refreshed.id,
          attendeeIds: refreshed.attendees ?? [],
          itineraryItemIds: refreshed.itineraryItems.map(item => item.id),
        });
        // Re-fetch so UI reflects the backfilled attendance rows.
        refreshed = await fetchEventById(props.initialEvent.id);
      }

      props.onSuccess(refreshed ?? updated);
    },
    [
      expenseItems,
      groupsEnabled,
      hasItinerary,
      isDraftUpdate,
      isUpdate,
      itineraryItems,
      props.initialEvent,
      props.onSuccess,
    ]
  );

  const form = useForm({
    defaultValues,
    onSubmit,
  });

  const values = useStore(form.store, s => s.values);

  const detailErrors = React.useMemo(() => {
    const hasItinerary = itineraryItems.length > 0;
    return validateEventEditor(values, hasItinerary, groupsEnabled);
  }, [groupsEnabled, itineraryItems.length, values]);

  const canSubmit = Object.values(detailErrors).every(v => !v);
  const [showValidation, setShowValidation] = React.useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await form.handleSubmit();
    },
  });

  const editingEventId = isUpdate
    ? (props.initialEvent?.id ?? draftIdRef.current)
    : draftIdRef.current;

  const previewEvent: SocialEvent = React.useMemo(() => {
    const times = computeEventTimes({
      hasItinerary,
      itineraryItems,
      dateTimeDraft: {
        startDate: values.startDate,
        endDate: values.endDate,
        startTime: values.startTime,
        endTime: values.endTime,
        isAllDay: values.isAllDay,
      },
      fallbackStartIso: defaultStartTimeIsoRef.current,
    });

    return {
      id: editingEventId,
      slug: isUpdate ? (props.initialEvent?.slug ?? 'draft') : 'draft',
      hostId: props.currentUser.id,
      publishedAt: props.initialEvent?.publishedAt ?? null,
      title: values.title,
      headerImageUrl: values.headerImageUrl,
      headerImagePositionY: values.headerImagePositionY,
      description: values.description,
      activityType: values.activityType,
      location: values.location,
      coordinates: values.coordinates,
      locationData: values.locationData,
      startTime: times?.startTime ?? defaultStartTimeIsoRef.current,
      endTime: times?.endTime ?? props.initialEvent?.endTime,
      isAllDay: values.isAllDay,
      isFlexibleStart: values.isFlexibleStart,
      isFlexibleEnd: values.isFlexibleEnd,
      visibilityType: values.visibilityType,
      groupIds: values.groupIds,
      allowFriendInvites: false,
      maxSeats:
        values.maxSeats === ''
          ? undefined
          : Number(values.maxSeats) > 0
            ? Number(values.maxSeats)
            : undefined,
      itineraryAttendanceEnabled: values.itineraryAttendanceEnabled,
      attendees: props.initialEvent?.attendees ?? EMPTY_STRING_ARR,
      noPhones: values.noPhones,
      itineraryTimeDisplay: values.itineraryTimeDisplay,
      comments: props.initialEvent?.comments ?? EMPTY_COMMENTS,
      reactions: props.initialEvent?.reactions ?? EMPTY_REACTIONS,
      itineraryItems: mapDraftItineraryItems(itineraryItems, editingEventId),
      expenses: mapDraftExpenses(expenseItems, editingEventId),
    };
  }, [
    editingEventId,
    expenseItems,
    hasItinerary,
    isUpdate,
    itineraryItems,
    props.currentUser.id,
    props.initialEvent?.attendees,
    props.initialEvent?.comments,
    props.initialEvent?.endTime,
    props.initialEvent?.publishedAt,
    props.initialEvent?.reactions,
    props.initialEvent?.slug,
    values.activityType,
    values.coordinates,
    values.endDate,
    values.endTime,
    values.headerImageUrl,
    values.headerImagePositionY,
    values.isAllDay,
    values.locationData,
    values.description,
    values.isFlexibleEnd,
    values.isFlexibleStart,
    values.itineraryAttendanceEnabled,
    values.itineraryTimeDisplay,
    values.visibilityType,
    values.groupIds,
    values.location,
    values.maxSeats,
    values.noPhones,
    values.startDate,
    values.startTime,
    values.title,
  ]);

  const applyPatch = React.useCallback(
    (patch: Partial<SocialEvent>) => {
      if (patch.title !== undefined) form.setFieldValue('title', patch.title);
      if (patch.headerImageUrl !== undefined)
        form.setFieldValue('headerImageUrl', patch.headerImageUrl ?? '');
      if (patch.headerImagePositionY !== undefined)
        form.setFieldValue('headerImagePositionY', patch.headerImagePositionY);
      if (patch.location !== undefined) form.setFieldValue('location', patch.location);
      if (patch.description !== undefined) form.setFieldValue('description', patch.description);
      if (patch.activityType !== undefined) form.setFieldValue('activityType', patch.activityType);
      if (patch.isFlexibleStart !== undefined)
        form.setFieldValue('isFlexibleStart', patch.isFlexibleStart);
      if (patch.isFlexibleEnd !== undefined)
        form.setFieldValue('isFlexibleEnd', patch.isFlexibleEnd);
      if (patch.itineraryAttendanceEnabled !== undefined)
        form.setFieldValue('itineraryAttendanceEnabled', patch.itineraryAttendanceEnabled);
      if (patch.visibilityType !== undefined)
        form.setFieldValue('visibilityType', patch.visibilityType);
      if (patch.groupIds !== undefined) form.setFieldValue('groupIds', patch.groupIds);
      if (patch.noPhones !== undefined) form.setFieldValue('noPhones', patch.noPhones);
      if ('maxSeats' in patch) {
        const n = patch.maxSeats === undefined ? undefined : Number(patch.maxSeats);
        form.setFieldValue('maxSeats', n && n > 0 ? n : '');
      }
      if ('coordinates' in patch) form.setFieldValue('coordinates', patch.coordinates);
      if ('locationData' in patch) form.setFieldValue('locationData', patch.locationData);
      if (patch.startTime !== undefined) {
        const { date, time } = splitLocalDateTime(toLocalDateTimeInputValue(patch.startTime));
        form.setFieldValue('startDate', date);
        form.setFieldValue('startTime', time);
      }
      if (patch.endTime !== undefined) {
        const { date, time } = splitLocalDateTime(toLocalDateTimeInputValue(patch.endTime));
        form.setFieldValue('endDate', date);
        form.setFieldValue('endTime', time);
      }
      if (patch.isAllDay !== undefined) form.setFieldValue('isAllDay', patch.isAllDay);
      if (patch.itineraryTimeDisplay !== undefined)
        form.setFieldValue('itineraryTimeDisplay', patch.itineraryTimeDisplay);
    },
    [form]
  );

  const onChangeStartDate = React.useCallback(
    (value: string) => {
      form.setFieldValue('startDate', value);
      if (!endDateTouched) {
        form.setFieldValue('endDate', value);
      }
    },
    [endDateTouched, form]
  );

  const onChangeEndDate = React.useCallback(
    (value: string) => {
      setEndDateTouched(true);
      form.setFieldValue('endDate', value);
    },
    [form]
  );

  const onChangeStartTime = React.useCallback(
    (value: string) => form.setFieldValue('startTime', value),
    [form]
  );

  const onChangeEndTime = React.useCallback(
    (value: string) => form.setFieldValue('endTime', value),
    [form]
  );

  const onChangeIsAllDay = React.useCallback(
    (value: boolean) => form.setFieldValue('isAllDay', value),
    [form]
  );

  const itineraryEditItems = React.useMemo(() => {
    return mapDraftItineraryItems(itineraryItems, editingEventId);
  }, [editingEventId, itineraryItems]);

  const expenseEditItems = React.useMemo(() => {
    return mapDraftExpenses(expenseItems, editingEventId);
  }, [editingEventId, expenseItems]);

  const onAddItineraryItem = React.useCallback(
    (input: {
      title: string;
      startTime: string;
      durationMinutes: number;
      location?: string;
      description?: string;
    }) => {
      const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
      setItineraryItems(prev => [...prev, { id, ...input }]);
      return id;
    },
    []
  );

  const onUpdateItineraryItem = React.useCallback(
    (
      id: string,
      patch: Partial<{
        title: string;
        startTime: string;
        durationMinutes: number;
        location?: string;
        description?: string;
      }>
    ) => {
      setItineraryItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
    },
    []
  );

  const onDeleteItineraryItem = React.useCallback((id: string) => {
    setItineraryItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const onAddExpense = React.useCallback((input: Omit<DraftExpense, 'id'>) => {
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    setExpenseItems(prev => {
      const maxSortOrder = prev.reduce((max, e) => Math.max(max, e.sortOrder ?? 0), 0);
      const sortOrder = input.sortOrder ?? maxSortOrder + 1;
      return [...prev, { id, ...input, sortOrder }];
    });
    return id;
  }, []);

  const onUpdateExpense = React.useCallback(
    (id: string, patch: Partial<Omit<DraftExpense, 'id'>>) => {
      setExpenseItems(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
    },
    []
  );

  const onDeleteExpense = React.useCallback((id: string) => {
    setExpenseItems(prev => prev.filter(e => e.id !== id));
  }, []);

  const onReorderExpenses = React.useCallback((orderedExpenseIds: string[]) => {
    setExpenseItems(prev => {
      if (!Array.isArray(orderedExpenseIds) || orderedExpenseIds.length === 0) return prev;

      const prevById = new Map(prev.map(e => [e.id, e] as const));
      const orderedSet = new Set(orderedExpenseIds);

      const nextOrdered: DraftExpense[] = [];
      for (const id of orderedExpenseIds) {
        const item = prevById.get(id);
        if (item) nextOrdered.push(item as DraftExpense);
      }

      // Append any expenses not included (e.g. new ones added since the list was built).
      for (const item of prev) {
        if (!orderedSet.has(item.id)) nextOrdered.push(item);
      }

      // Normalize sort order to the new display order.
      return nextOrdered.map((e, idx) => ({ ...e, sortOrder: idx + 1 }));
    });
  }, []);

  const itineraryApi = React.useMemo(() => {
    return {
      items: itineraryEditItems,
      onAdd: onAddItineraryItem,
      onUpdate: onUpdateItineraryItem,
      onDelete: onDeleteItineraryItem,
    };
  }, [itineraryEditItems, onAddItineraryItem, onDeleteItineraryItem, onUpdateItineraryItem]);

  const expenseApi = React.useMemo(() => {
    return {
      items: expenseEditItems,
      onAdd: onAddExpense,
      onUpdate: onUpdateExpense,
      onDelete: onDeleteExpense,
      onReorder: onReorderExpenses,
    };
  }, [expenseEditItems, onAddExpense, onDeleteExpense, onReorderExpenses, onUpdateExpense]);

  const primaryLabel = isDraftUpdate ? 'Publish' : isUpdate ? 'Save changes' : 'Publish invite';

  const onSave = React.useCallback(() => {
    if (!canSubmit) {
      setShowValidation(true);
      return;
    }
    submitMutation.mutate();
  }, [canSubmit, submitMutation]);

  const editModel = React.useMemo(() => {
    return {
      canEdit: canSubmit,
      isSaving: submitMutation.isPending,
      primaryLabel,
      errors: showValidation ? detailErrors : undefined,
      startDate: values.startDate,
      endDate: values.endDate,
      startTime: values.startTime,
      endTime: values.endTime,
      isAllDay: values.isAllDay,
      onChangeStartDate,
      onChangeEndDate,
      onChangeStartTime,
      onChangeEndTime,
      onChangeIsAllDay,
      onChange: applyPatch,
      groups: eligibleGroups,
      groupsEnabled,
      groupsLoading,
      itinerary: itineraryApi,
      expenses: expenseApi,
      onSave,
      onCancel: props.onCancel,
    };
  }, [
    applyPatch,
    canSubmit,
    detailErrors,
    eligibleGroups,
    groupsEnabled,
    expenseApi,
    groupsLoading,
    itineraryApi,
    onChangeEndDate,
    onChangeEndTime,
    onChangeIsAllDay,
    onChangeStartDate,
    onChangeStartTime,
    onSave,
    primaryLabel,
    props.onCancel,
    showValidation,
    submitMutation.isPending,
    values.endDate,
    values.endTime,
    values.isAllDay,
    values.startDate,
    values.startTime,
  ]);

  return { previewEvent, editModel };
}
