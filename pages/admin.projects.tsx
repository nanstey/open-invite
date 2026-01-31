import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FeedbackAdminTabs } from '../domains/feedback/FeedbackAdminTabs'

export const Route = createFileRoute('/admin/projects')({
  component: AdminProjectsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    projectId: typeof search.projectId === 'string' ? search.projectId : undefined,
  }),
})

function AdminProjectsPage() {
  const { projectId } = Route.useSearch()
  
  return (
    <div className="flex-1 overflow-hidden">
      <FeedbackAdminTabs initialTab="projects" initialProjectId={projectId} />
    </div>
  )
}
