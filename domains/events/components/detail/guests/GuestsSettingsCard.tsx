import * as React from 'react';
import type { Group } from '../../../../../lib/types';
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../../../../../lib/ui/9ui/combobox';
import { FormSelect } from '../../../../../lib/ui/components/FormControls';
import type { SocialEvent } from '../../../types';
import { EventVisibility } from '../../../types';
import { SectionCard } from '../SectionCard';

type GuestsSettingsCardProps = {
  event: SocialEvent;
  onChangeVisibility?: (next: EventVisibility) => void;
  onChangeGroupIds?: (nextGroupIds: string[]) => void;
  groupOptions?: Group[];
  groupsLoading?: boolean;
  groupError?: string;
  collapsible?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
};

export function GuestsSettingsCard(props: GuestsSettingsCardProps) {
  const {
    event,
    onChangeVisibility,
    onChangeGroupIds,
    groupOptions,
    groupsLoading,
    groupError,
    collapsible,
    expanded,
    onToggleExpanded,
  } = props;
  const [pickerValue, setPickerValue] = React.useState<Group | null>(null);

  const selectedGroupIds = event.groupIds ?? [];
  const selectedGroups = React.useMemo(() => {
    const groupsById = new Map((groupOptions ?? []).map(group => [group.id, group] as const));
    return selectedGroupIds
      .map(groupId => groupsById.get(groupId))
      .filter((group): group is Group => !!group);
  }, [groupOptions, selectedGroupIds]);
  const availableGroups = React.useMemo(
    () => (groupOptions ?? []).filter(group => !selectedGroupIds.includes(group.id)),
    [groupOptions, selectedGroupIds]
  );

  const addGroup = React.useCallback(
    (group: Group | null) => {
      setPickerValue(null);
      if (!group || selectedGroupIds.includes(group.id)) return;
      onChangeGroupIds?.([...selectedGroupIds, group.id]);
    },
    [onChangeGroupIds, selectedGroupIds]
  );

  const removeGroup = React.useCallback(
    (groupId: string) => {
      onChangeGroupIds?.(selectedGroupIds.filter(id => id !== groupId));
    },
    [onChangeGroupIds, selectedGroupIds]
  );

  return (
    <SectionCard
      title="Privacy & Sharing"
      surface="edit"
      contentClassName="space-y-4"
      collapsible={collapsible}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
    >
      <div className="space-y-1">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Visibility</div>
        <FormSelect
          value={event.visibilityType}
          size="lg"
          onChange={e => onChangeVisibility?.(e.target.value as EventVisibility)}
        >
          <option value={EventVisibility.ALL_FRIENDS}>All Friends</option>
          <option value={EventVisibility.GROUPS}>Groups</option>
          <option value={EventVisibility.INVITE_ONLY}>Invite only</option>
        </FormSelect>
      </div>

      {event.visibilityType === EventVisibility.GROUPS ? (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            Group visibility
          </div>
          <Combobox<Group>
            items={availableGroups}
            value={pickerValue}
            onValueChange={addGroup}
            itemToString={group => group?.name ?? ''}
          >
            <ComboboxInput
              disabled={groupsLoading}
              showClear={false}
              placeholder={
                groupsLoading
                  ? 'Loading groups...'
                  : availableGroups.length === 0
                    ? 'All groups selected'
                    : 'Select group'
              }
              startContent={
                selectedGroups.length > 0 ? (
                  <ComboboxChips>
                    {selectedGroups.map(group => (
                      <ComboboxChip key={group.id}>
                        <span>{group.name}</span>
                        <ComboboxChipRemove
                          onClick={event => {
                            event.stopPropagation();
                            removeGroup(group.id);
                          }}
                          aria-label={`Remove ${group.name}`}
                        />
                      </ComboboxChip>
                    ))}
                  </ComboboxChips>
                ) : null
              }
            />
            <ComboboxContent>
              <ComboboxEmpty>
                {groupsLoading ? 'Loading groups...' : 'No groups match your search.'}
              </ComboboxEmpty>
              <ComboboxList<Group>>
                {group => (
                  <ComboboxItem key={group.id} value={group}>
                    {group.name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {groupError ? <div className="text-xs text-red-400">{groupError}</div> : null}
          <div className="text-xs text-slate-500">
            Select one or more groups to control who can view this event.
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
