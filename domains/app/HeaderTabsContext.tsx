import React from 'react'

import type { TabOption } from '../../lib/ui/components/TabGroup'

interface HeaderTabsState {
  tabs: TabOption[]
  activeTab: string
  onChange: (id: string) => void
}

const HeaderTabsContext = React.createContext<HeaderTabsState | null>(null)
const HeaderTabsSetterContext = React.createContext<React.Dispatch<React.SetStateAction<HeaderTabsState | null>> | null>(null)

export function HeaderTabsProvider({ children }: { children: React.ReactNode }) {
  const [headerTabs, setHeaderTabs] = React.useState<HeaderTabsState | null>(null)

  return (
    <HeaderTabsContext.Provider value={headerTabs}>
      <HeaderTabsSetterContext.Provider value={setHeaderTabs}>
        {children}
      </HeaderTabsSetterContext.Provider>
    </HeaderTabsContext.Provider>
  )
}

export function useHeaderTabs() {
  return React.useContext(HeaderTabsContext)
}

export function useSetHeaderTabs(tabs: TabOption[], activeTab: string, onChange: (id: string) => void) {
  const setHeaderTabs = React.useContext(HeaderTabsSetterContext)

  React.useEffect(() => {
    if (setHeaderTabs) {
      setHeaderTabs({ tabs, activeTab, onChange })
    }
    return () => {
      if (setHeaderTabs) {
        setHeaderTabs(null)
      }
    }
  }, [setHeaderTabs, tabs, activeTab, onChange])
}

