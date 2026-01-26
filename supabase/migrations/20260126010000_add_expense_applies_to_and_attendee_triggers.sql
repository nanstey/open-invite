-- Add applies_to presets for expenses and keep participant_ids in sync with event attendance.
-- Rules:
-- - applies_to controls how participant_ids is derived:
--   - EVERYONE: host + attendees
--   - HOST_ONLY: host only
--   - GUESTS_ONLY: attendees excluding host (can be empty)
--   - CUSTOM: explicit participant_ids (no auto-rewrites), but leavers are removed
-- - When a user leaves an event, they are removed from ALL expense participant_ids.

BEGIN;

-- 1) Add applies_to column + allow empty participant_ids arrays.
ALTER TABLE public.event_expenses
  ADD COLUMN IF NOT EXISTS applies_to TEXT NOT NULL DEFAULT 'EVERYONE'
  CHECK (applies_to IN ('EVERYONE', 'HOST_ONLY', 'GUESTS_ONLY', 'CUSTOM'));

-- Existing expenses predate applies_to; preserve their current participant lists.
UPDATE public.event_expenses
SET applies_to = 'CUSTOM'
WHERE applies_to = 'EVERYONE';

ALTER TABLE public.event_expenses
  DROP CONSTRAINT IF EXISTS participant_ids_not_empty;

-- 2) Helper: compute participants for an event + preset.
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

-- 3) Keep participant_ids derived for non-custom expenses on insert/update.
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

-- 4) When attendance changes, sync non-custom expenses + remove leavers from all expenses.
CREATE OR REPLACE FUNCTION public.sync_event_expense_participants_on_attendance_change()
RETURNS TRIGGER AS $$
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

  -- Recompute preset expenses after any attendance change.
  UPDATE public.event_expenses ee
  SET participant_ids = COALESCE(public.compute_expense_participants(ee.event_id, ee.applies_to), ee.participant_ids)
  WHERE ee.event_id = event_id_val
    AND ee.applies_to <> 'CUSTOM';

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_attendees_sync_expenses_ins ON public.event_attendees;
CREATE TRIGGER trg_event_attendees_sync_expenses_ins
  AFTER INSERT
  ON public.event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_expense_participants_on_attendance_change();

DROP TRIGGER IF EXISTS trg_event_attendees_sync_expenses_del ON public.event_attendees;
CREATE TRIGGER trg_event_attendees_sync_expenses_del
  AFTER DELETE
  ON public.event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_expense_participants_on_attendance_change();

COMMIT;


