BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_schedule_shape_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_schedule_shape_check CHECK (
    start_time IS NOT NULL
    AND (end_time IS NULL OR end_time > start_time)
  );

COMMIT;
