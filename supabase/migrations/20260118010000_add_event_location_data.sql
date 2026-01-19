-- Store structured location components from the autocomplete provider (Photon / OSM).
-- This makes read-mode rendering deterministic (place name, address line, locality line, etc).

BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_data JSONB;

COMMIT;


