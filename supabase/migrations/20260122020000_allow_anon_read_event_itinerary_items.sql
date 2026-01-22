-- Allow unauthenticated users to read itinerary items on the public event page.
-- This mirrors the existing "Anon can view all events" policy on public.events.

BEGIN;

-- Ensure the anon/authenticated roles can select (RLS still applies).
GRANT SELECT ON public.event_itinerary_items TO anon;
GRANT SELECT ON public.event_itinerary_items TO authenticated;

DROP POLICY IF EXISTS "Anon can view itinerary items" ON public.event_itinerary_items;
CREATE POLICY "Anon can view itinerary items"
  ON public.event_itinerary_items
  FOR SELECT
  TO anon
  USING (true);

COMMIT;


