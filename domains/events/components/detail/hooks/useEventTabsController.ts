import * as React from 'react'

import { parseEventTab, type EventTab } from '../route/routing'

export function useEventTabsController(input: {
  activeTabProp?: EventTab
  onTabChange?: (tab: EventTab) => void
  isGuest: boolean
  onRequireAuth?: () => void
}): { activeTab: EventTab; onTabChange: (id: unknown) => void } {
  const { activeTabProp, onTabChange, isGuest, onRequireAuth } = input

  const [uncontrolledActiveTab, setUncontrolledActiveTab] = React.useState<EventTab>('details')
  const requestedTab = activeTabProp ?? uncontrolledActiveTab
  const activeTab: EventTab = isGuest ? 'details' : requestedTab

  const handleTabChange = React.useCallback(
    (id: unknown) => {
      const tabId = parseEventTab(id) ?? 'details'
      if (isGuest && tabId !== 'details') {
        onRequireAuth?.()
        return
      }
      if (tabId === activeTab) return
      if (onTabChange) {
        onTabChange(tabId)
        return
      }
      setUncontrolledActiveTab(tabId)
    },
    [activeTab, isGuest, onRequireAuth, onTabChange],
  )

  return { activeTab, onTabChange: handleTabChange }
}


