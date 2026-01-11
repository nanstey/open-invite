-- Add immutable event slugs: {title}-{yyyymmdd}-{uuidSuffix}
-- Slugs are generated on INSERT and are immutable thereafter.

-- 1) Column (nullable first for backfill)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2) Slug generator
-- Note: We intentionally keep this ASCII-only (a-z0-9-). Non-matching chars become '-' and are collapsed.
CREATE OR REPLACE FUNCTION public.generate_event_slug(title_text TEXT, start_time_ts TIMESTAMPTZ, id_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw_title TEXT;
  title_part TEXT;
  date_part TEXT;
  suffix_part TEXT;
BEGIN
  raw_title := COALESCE(title_text, '');

  -- lower, replace non [a-z0-9] with '-', collapse repeats, trim '-'
  title_part := lower(raw_title);
  title_part := regexp_replace(title_part, '[^a-z0-9]+', '-', 'g');
  title_part := regexp_replace(title_part, '^-+|-+$', '', 'g');

  IF title_part IS NULL OR length(title_part) = 0 THEN
    title_part := 'event';
  END IF;

  -- keep URLs reasonable
  title_part := left(title_part, 60);
  title_part := regexp_replace(title_part, '^-+|-+$', '', 'g');

  date_part := to_char(start_time_ts AT TIME ZONE 'UTC', 'YYYYMMDD');

  -- 12 hex chars ~= 48 bits (very low collision risk) while staying short
  suffix_part := right(replace(id_uuid::text, '-', ''), 12);

  RETURN title_part || '-' || date_part || '-' || suffix_part;
END;
$$;

-- 3) Set slug on INSERT (canonicalize/override any provided slug)
CREATE OR REPLACE FUNCTION public.events_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.slug := public.generate_event_slug(NEW.title, NEW.start_time, NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_events_slug ON public.events;
CREATE TRIGGER set_events_slug
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.events_set_slug();

-- 4) Prevent updates to slug (immutability)
CREATE OR REPLACE FUNCTION public.events_prevent_slug_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'events.slug is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_events_slug_update ON public.events;
CREATE TRIGGER prevent_events_slug_update
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.events_prevent_slug_update();

-- 5) Backfill existing rows
UPDATE public.events
SET slug = public.generate_event_slug(title, start_time, id)
WHERE slug IS NULL OR slug = '';

-- 6) Enforce constraints after backfill
ALTER TABLE public.events
ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique ON public.events (slug);


