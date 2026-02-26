-- Expand/refresh feedback project swim-lane statuses.
-- New canonical set:
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
