BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS itinerary_attendance_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.events.itinerary_attendance_enabled IS
  'When true, attendees select itinerary items on join and expenses can scope to those selections.';

ALTER TABLE public.event_expenses
  ADD COLUMN IF NOT EXISTS itinerary_item_id UUID REFERENCES public.event_itinerary_items(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.event_expenses.itinerary_item_id IS
  'Optional itinerary item this expense is scoped to; null means event-wide.';

CREATE INDEX IF NOT EXISTS idx_event_expenses_event_id_itinerary_item_id
  ON public.event_expenses(event_id, itinerary_item_id);

CREATE TABLE IF NOT EXISTS public.event_itinerary_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  itinerary_item_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_itinerary_attendance_event_id
  ON public.event_itinerary_attendance(event_id);

CREATE INDEX IF NOT EXISTS idx_event_itinerary_attendance_user_id
  ON public.event_itinerary_attendance(user_id);

DROP TRIGGER IF EXISTS set_updated_at_event_itinerary_attendance ON public.event_itinerary_attendance;
CREATE TRIGGER set_updated_at_event_itinerary_attendance
  BEFORE UPDATE ON public.event_itinerary_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.event_itinerary_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view itinerary attendance for visible events" ON public.event_itinerary_attendance;
CREATE POLICY "Users can view itinerary attendance for visible events"
  ON public.event_itinerary_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_itinerary_attendance.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Attendees can set their itinerary attendance" ON public.event_itinerary_attendance;
CREATE POLICY "Attendees can set their itinerary attendance"
  ON public.event_itinerary_attendance
  FOR INSERT
  WITH CHECK (
    (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1
        FROM public.event_attendees ea
        WHERE ea.event_id = event_itinerary_attendance.event_id
          AND ea.user_id = auth.uid()
      )
    )
    OR
    (
      EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = event_itinerary_attendance.event_id
          AND e.host_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1
        FROM public.event_attendees ea
        WHERE ea.event_id = event_itinerary_attendance.event_id
          AND ea.user_id = event_itinerary_attendance.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Attendees can update their itinerary attendance" ON public.event_itinerary_attendance;
CREATE POLICY "Attendees can update their itinerary attendance"
  ON public.event_itinerary_attendance
  FOR UPDATE
  USING (
    (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1
        FROM public.event_attendees ea
        WHERE ea.event_id = event_itinerary_attendance.event_id
          AND ea.user_id = auth.uid()
      )
    )
    OR
    (
      EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = event_itinerary_attendance.event_id
          AND e.host_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1
        FROM public.event_attendees ea
        WHERE ea.event_id = event_itinerary_attendance.event_id
          AND ea.user_id = event_itinerary_attendance.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Attendees can delete their itinerary attendance" ON public.event_itinerary_attendance;
CREATE POLICY "Attendees can delete their itinerary attendance"
  ON public.event_itinerary_attendance
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_itinerary_attendance TO authenticated;

COMMIT;
