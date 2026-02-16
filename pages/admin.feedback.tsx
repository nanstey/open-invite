import { createFileRoute } from '@tanstack/react-router'
import { FeedbackAdminTabs } from '../domains/feedback/FeedbackAdminTabs'

export const Route = createFileRoute('/admin/feedback')({
  component: AdminFeedbackPage,
  validateSearch: (search: Record<string, unknown>) => ({
    feedbackId: typeof search.feedbackId === 'string' ? search.feedbackId : undefined,
  }),
})

function AdminFeedbackPage() {
  const { feedbackId } = Route.useSearch()

  return (
    <div className="flex-1 overflow-hidden">
      <FeedbackAdminTabs initialTab="feedback" initialFeedbackId={feedbackId} />
    </div>
  )
}
