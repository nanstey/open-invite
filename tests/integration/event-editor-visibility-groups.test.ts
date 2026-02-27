import { describe, expect, it } from 'vitest'

import { validateEventEditor } from '../../domains/events/components/detail/utils/validateEventEditor'
import { EventVisibility } from '../../domains/events/types'

const baseValues = {
  title: 'Board Game Night',
  description: 'Bring snacks',
  location: 'Downtown',
  activityType: 'Social',
  startDateTimeLocal: '2026-02-28T19:00',
  durationHours: 2,
}

describe('EventEditor integration: group visibility validation', () => {
  it('requires at least one group when visibilityType=GROUPS', () => {
    const errors = validateEventEditor(
      {
        ...baseValues,
        visibilityType: EventVisibility.GROUPS,
        groupIds: [],
      },
      false
    )

    expect(errors.groupIds).toBe('Select at least one group')
  })

  it('passes validation when at least one group is selected', () => {
    const errors = validateEventEditor(
      {
        ...baseValues,
        visibilityType: EventVisibility.GROUPS,
        groupIds: ['group-1'],
      },
      false
    )

    expect(errors.groupIds).toBeUndefined()
  })
})
