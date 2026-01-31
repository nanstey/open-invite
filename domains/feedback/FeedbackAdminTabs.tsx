import React from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardList, FolderKanban } from 'lucide-react'
import { FeedbackAdminPage } from './components/FeedbackAdminPage'
import { ProjectsKanbanBoard } from './components/ProjectsKanbanBoard'

type TabId = 'feedback' | 'projects'

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
  href: string
}

const TABS: Tab[] = [
  { id: 'feedback', label: 'Feedback', icon: ClipboardList, href: '/admin/feedback' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, href: '/admin/projects' },
]

interface FeedbackAdminTabsProps {
  initialTab?: TabId
  initialProjectId?: string
  initialFeedbackId?: string
}

export function FeedbackAdminTabs({ initialTab = 'feedback', initialProjectId, initialFeedbackId }: FeedbackAdminTabsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/50">
        <div className="flex gap-1 px-4 pt-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = initialTab === tab.id
            return (
              <Link
                key={tab.id}
                to={tab.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-bold text-sm transition-colors ${
                  isActive
                    ? 'bg-background text-white border-t border-l border-r border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {initialTab === 'feedback' && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <FeedbackAdminPage initialFeedbackId={initialFeedbackId} />
          </div>
        )}
        {initialTab === 'projects' && (
          <div className="h-full">
            <ProjectsKanbanBoard initialProjectId={initialProjectId} />
          </div>
        )}
      </div>
    </div>
  )
}

