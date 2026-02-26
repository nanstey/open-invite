-- Expand/refresh feedback project swim-lane statuses and add soft-archive support.
-- Canonical statuses:
-- backlog, on_deck, research, proposal, in_progress, review, blocked, completed

DO $$
BEGIN
  -- If old value exists, backfill it before type migration.
  IF EXISTS (
    SELECT 1
    FROM public.feedback_projects
    WHERE status::text = 'archived'
  ) THEN
    UPDATE public.feedback_projects
    SET status = 'completed'
    WHERE status::text = 'archived';
  END IF;
END $$;

-- Recreate enum with the new status set.
ALTER TYPE public.feedback_project_status RENAME TO feedback_project_status_old;

CREATE TYPE public.feedback_project_status AS ENUM (
  'backlog',
  'on_deck',
  'research',
  'proposal',
  'in_progress',
  'review',
  'blocked',
  'completed'
);

ALTER TABLE public.feedback_projects
  ALTER COLUMN status
  TYPE public.feedback_project_status
  USING status::text::public.feedback_project_status;

DROP TYPE public.feedback_project_status_old;

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
