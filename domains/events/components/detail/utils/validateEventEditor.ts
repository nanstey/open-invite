import { getEventDateTimeValidationError } from '../../../utils/eventDateTimeDraft';

type EventEditorValuesLike = {
  title: string;
  description: string;
  location: string;
  activityType: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  visibilityType?: string;
  groupIds?: string[];
};

export function validateEventEditor(
  values: EventEditorValuesLike,
  _hasItinerary: boolean
): {
  title?: string;
  activityType?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  groupIds?: string;
} {
  const title = values.title.trim();
  const activityType = String(values.activityType ?? '').trim();
  const dateTimeError = getEventDateTimeValidationError({
    startDate: values.startDate,
    endDate: values.endDate,
    startTime: values.startTime,
    endTime: values.endTime,
    isAllDay: values.isAllDay,
  });

  return {
    title: title ? undefined : 'Title is required',
    activityType: activityType ? undefined : 'Category is required',
    description: undefined,
    startTime: dateTimeError ?? undefined,
    endTime: dateTimeError ?? undefined,
    location: undefined,
    groupIds:
      values.visibilityType === 'GROUPS' && (!values.groupIds || values.groupIds.length === 0)
        ? 'Select at least one group'
        : undefined,
  };
}
