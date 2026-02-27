import { ArrowLeft, Settings, Users } from 'lucide-react'
import type * as React from 'react'

import type { Group } from '../../../lib/types'
import { TabGroup, type TabOption } from '../../../lib/ui/components/TabGroup'

type GroupDetailPaneProps = {
  selectedGroup: Group | null
  activeTab: string
  onTabChange: (tab: string) => void
  onBack: () => void
  children: React.ReactNode
}

const groupTabs: TabOption[] = [
  { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
]

export function GroupDetailPane({
  selectedGroup,
  activeTab,
  onTabChange,
  onBack,
  children,
}: GroupDetailPaneProps) {
  if (!selectedGroup) {
    return (
      <div className="hidden lg:flex items-center justify-center bg-surface border border-slate-700 rounded-2xl h-full text-slate-400">
        Select a group to see details.
      </div>
    )
  }

  return (
    <section className="min-h-[380px]">
      <div className="bg-surface border border-slate-700 rounded-2xl p-4 md:p-5 space-y-4 h-full">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden p-2 rounded-full border border-slate-700 text-slate-300"
            aria-label="Back to groups"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">{selectedGroup.name}</h2>
          </div>
        </div>

        <TabGroup tabs={groupTabs} activeTab={activeTab} onChange={onTabChange} />

        {children}
      </div>
    </section>
  )
}
