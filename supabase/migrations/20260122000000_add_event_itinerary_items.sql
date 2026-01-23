-- Add itinerary items to events
-- - Items are owned by the event host (host-only writes)
-- - Reads follow event visibility via public.can_view_event

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_itinerary_items_event_id_start_time
  ON public.event_itinerary_items(event_id, start_time);

-- updated_at trigger (re-use handle_updated_at from initial schema)
DROP TRIGGER IF EXISTS set_updated_at_event_itinerary_items ON public.event_itinerary_items;
CREATE TRIGGER set_updated_at_event_itinerary_items
  BEFORE UPDATE ON public.event_itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security
ALTER TABLE public.event_itinerary_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view itinerary items for visible events" ON public.event_itinerary_items;
CREATE POLICY "Users can view itinerary items for visible events"
  ON public.event_itinerary_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_itinerary_items.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can create itinerary items" ON public.event_itinerary_items;
CREATE POLICY "Hosts can create itinerary items"
  ON public.event_itinerary_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_itinerary_items.event_id
        AND e.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can update itinerary items" ON public.event_itinerary_items;
CREATE POLICY "Hosts can update itinerary items"
  ON public.event_itinerary_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_itinerary_items.event_id
        AND e.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can delete itinerary items" ON public.event_itinerary_items;
CREATE POLICY "Hosts can delete itinerary items"
  ON public.event_itinerary_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_itinerary_items.event_id
        AND e.host_id = auth.uid()
    )
  );

COMMIT;



