-- Add expenses to events (consolidated migration)
-- - Expenses are owned by the event host (host-only writes)
-- - Reads follow event visibility via public.can_view_event (authenticated only)
-- - applies_to controls how participant_ids is derived:
--   - EVERYONE: host + attendees
--   - HOST_ONLY: host only
--   - GUESTS_ONLY: attendees excluding host (can be empty)
--   - CUSTOM: explicit participant_ids (no auto-rewrites), but leavers are removed
-- - When attendance changes (including upsert), sync non-custom expenses.

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  split_type TEXT NOT NULL CHECK (split_type IN ('GROUP', 'PER_PERSON')),
  timing TEXT NOT NULL CHECK (timing IN ('UP_FRONT', 'SETTLED_LATER')),
  settled_kind TEXT CHECK (settled_kind IN ('EXACT', 'ESTIMATE')),
  amount_cents INTEGER CHECK (amount_cents IS NULL OR amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  applies_to TEXT NOT NULL DEFAULT 'EVERYONE'
    CHECK (applies_to IN ('EVERYONE', 'HOST_ONLY', 'GUESTS_ONLY', 'CUSTOM')),
  participant_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Business rule: group expenses are always settled later.
  CONSTRAINT event_expenses_group_requires_settled_later CHECK (
    split_type <> 'GROUP' OR timing = 'SETTLED_LATER'
  ),
  CONSTRAINT event_expenses_amounts_valid CHECK (
    (
      timing = 'UP_FRONT'
      AND settled_kind IS NULL
      AND amount_cents IS NOT NULL
    )
    OR
    (
      timing = 'SETTLED_LATER'
      AND settled_kind = 'EXACT'
      AND amount_cents IS NOT NULL
    )
    OR
    (
      timing = 'SETTLED_LATER'
      AND settled_kind = 'ESTIMATE'
      AND amount_cents IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_event_expenses_event_id_created_at
  ON public.event_expenses(event_id, created_at);

-- updated_at trigger (re-use handle_updated_at from initial schema)
DROP TRIGGER IF EXISTS set_updated_at_event_expenses ON public.event_expenses;
CREATE TRIGGER set_updated_at_event_expenses
  BEFORE UPDATE ON public.event_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Helper: compute participants for an event + preset.
CREATE OR REPLACE FUNCTION public.compute_expense_participants(event_id_param UUID, applies_to_param TEXT)
RETURNS UUID[] AS $$
DECLARE
  host_id UUID;
  attendee_ids UUID[];
  result_ids UUID[];
BEGIN
  SELECT e.host_id INTO host_id
  FROM public.events e
  WHERE e.id = event_id_param;

  SELECT COALESCE(array_agg(ea.user_id ORDER BY ea.joined_at), ARRAY[]::UUID[])
  INTO attendee_ids
  FROM public.event_attendees ea
  WHERE ea.event_id = event_id_param;

  IF applies_to_param = 'HOST_ONLY' THEN
    RETURN ARRAY[host_id];
  ELSIF applies_to_param = 'GUESTS_ONLY' THEN
    SELECT COALESCE(array_agg(x ORDER BY x), ARRAY[]::UUID[])
    INTO result_ids
    FROM (
      SELECT DISTINCT unnest(attendee_ids) AS x
      EXCEPT
      SELECT host_id
    ) t;
    RETURN result_ids;
  ELSIF applies_to_param = 'EVERYONE' THEN
    SELECT COALESCE(array_agg(x ORDER BY x), ARRAY[]::UUID[])
    INTO result_ids
    FROM (SELECT DISTINCT unnest(attendee_ids) AS x) t;
    -- Ensure host is always present even if not in attendees for any reason.
    IF host_id IS NOT NULL AND NOT (host_id = ANY(result_ids)) THEN
      RETURN result_ids || host_id;
    END IF;
    RETURN result_ids;
  END IF;

  -- CUSTOM: caller decides
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Keep participant_ids derived for non-custom expenses on insert/update.
CREATE OR REPLACE FUNCTION public.event_expenses_apply_applies_to()
RETURNS TRIGGER AS $$
DECLARE
  computed UUID[];
BEGIN
  IF NEW.applies_to IS NULL THEN
    NEW.applies_to := 'EVERYONE';
  END IF;

  IF NEW.applies_to <> 'CUSTOM' THEN
    computed := public.compute_expense_participants(NEW.event_id, NEW.applies_to);
    IF computed IS NOT NULL THEN
      NEW.participant_ids := computed;
    END IF;
  END IF;

  -- Always keep NOT NULL shape (empty array allowed).
  IF NEW.participant_ids IS NULL THEN
    NEW.participant_ids := ARRAY[]::UUID[];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_expenses_apply_applies_to ON public.event_expenses;
CREATE TRIGGER trg_event_expenses_apply_applies_to
  BEFORE INSERT OR UPDATE OF applies_to, event_id
  ON public.event_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.event_expenses_apply_applies_to();

-- When attendance changes, sync non-custom expenses + remove leavers from all expenses.
-- SECURITY DEFINER so it can update event_expenses under RLS.
CREATE OR REPLACE FUNCTION public.sync_event_expense_participants_on_attendance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id_val UUID;
BEGIN
  event_id_val := COALESCE(NEW.event_id, OLD.event_id);

  -- Always remove leavers from ALL expenses (including CUSTOM).
  IF TG_OP = 'DELETE' THEN
    UPDATE public.event_expenses
    SET participant_ids = array_remove(participant_ids, OLD.user_id)
    WHERE event_id = event_id_val;
  END IF;

  -- Recompute preset expenses after any attendance change (INSERT/UPDATE/DELETE).
  UPDATE public.event_expenses ee
  SET participant_ids = COALESCE(public.compute_expense_participants(ee.event_id, ee.applies_to), ee.participant_ids)
  WHERE ee.event_id = event_id_val
    AND ee.applies_to <> 'CUSTOM';

  RETURN NULL;
END;
$$;

-- Triggers on attendees to handle insert/update (upsert conflicts) + delete.
DROP TRIGGER IF EXISTS trg_event_attendees_sync_expenses_ins ON public.event_attendees;
DROP TRIGGER IF EXISTS trg_event_attendees_sync_expenses_upd ON public.event_attendees;
CREATE TRIGGER trg_event_attendees_sync_expenses_ins
  AFTER INSERT OR UPDATE
  ON public.event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_expense_participants_on_attendance_change();

DROP TRIGGER IF EXISTS trg_event_attendees_sync_expenses_del ON public.event_attendees;
CREATE TRIGGER trg_event_attendees_sync_expenses_del
  AFTER DELETE
  ON public.event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_expense_participants_on_attendance_change();

-- Ensure authenticated can access table (RLS still applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_expenses TO authenticated;

-- Row Level Security
ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view expenses for visible events" ON public.event_expenses;
CREATE POLICY "Authenticated users can view expenses for visible events"
  ON public.event_expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_expenses.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can create expenses" ON public.event_expenses;
CREATE POLICY "Hosts can create expenses"
  ON public.event_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_expenses.event_id
        AND e.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can update expenses" ON public.event_expenses;
CREATE POLICY "Hosts can update expenses"
  ON public.event_expenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_expenses.event_id
        AND e.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can delete expenses" ON public.event_expenses;
CREATE POLICY "Hosts can delete expenses"
  ON public.event_expenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_expenses.event_id
        AND e.host_id = auth.uid()
    )
  );

COMMIT;


