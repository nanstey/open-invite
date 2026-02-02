import React from 'react'

import { TabGroup } from '../../../lib/ui/components/TabGroup'
import { useHeaderTabs } from '../HeaderTabsContext'

interface MobileTopHeaderProps {
  pageTitle: string
}

export function MobileTopHeader({ pageTitle }: MobileTopHeaderProps) {
  const headerTabs = useHeaderTabs()

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-40 flex items-center justify-between px-4 shadow-lg">
      <h1 className="text-lg font-bold text-white tracking-wide">{pageTitle}</h1>
      <div>
        {headerTabs && (
          <TabGroup
            tabs={headerTabs.tabs}
            activeTab={headerTabs.activeTab}
            onChange={headerTabs.onChange}
            hideLabel
          />
        )}
      </div>
    </div>
  )
}
