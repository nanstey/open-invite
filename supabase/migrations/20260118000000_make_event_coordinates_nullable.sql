-- Allow events.coordinates to be NULL so we can hide map previews until a place is selected.
-- Also remove the old default of {"lat":0,"lng":0} which created misleading previews.

BEGIN;

-- Normalize placeholder coordinates to NULL (if any exist).
UPDATE public.events
SET coordinates = NULL
WHERE coordinates = '{"lat": 0, "lng": 0}'::jsonb
   OR coordinates = '{"lat":0,"lng":0}'::jsonb;

-- Drop default and NOT NULL so coordinates can be omitted.
ALTER TABLE public.events
  ALTER COLUMN coordinates DROP DEFAULT,
  ALTER COLUMN coordinates DROP NOT NULL;

COMMIT;


