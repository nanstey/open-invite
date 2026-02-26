-- Add soft-archive support for feedback_projects.
-- Keep workflow status enum separate from archival state.

ALTER TABLE public.feedback_projects
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_feedback_projects_archived_at
  ON public.feedback_projects(archived_at);

-- Useful for active-board queries by status/order.
CREATE INDEX IF NOT EXISTS idx_feedback_projects_active_status_sort
  ON public.feedback_projects(status, sort_order)
  WHERE archived_at IS NULL;
