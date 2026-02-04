-- Derive events.start_time/end_time from itinerary items when items exist.
-- If an event has 0 itinerary items, we do not override event times.

BEGIN;

CREATE OR REPLACE FUNCTION public.recompute_event_time_from_itinerary(event_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  min_start TIMESTAMPTZ;
  max_end TIMESTAMPTZ;
BEGIN
  SELECT
    MIN(i.start_time),
    MAX(i.start_time + (i.duration_minutes * INTERVAL '1 minute'))
  INTO min_start, max_end
  FROM public.event_itinerary_items i
  WHERE i.event_id = event_id_param;

  -- No items: do not override existing manual event times.
  IF min_start IS NULL OR max_end IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.events
  SET start_time = min_start,
      end_time = max_end
  WHERE id = event_id_param;
END;
$$;

-- Trigger function to handle insert/update/delete, including event_id changes.
CREATE OR REPLACE FUNCTION public.on_itinerary_items_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.recompute_event_time_from_itinerary(NEW.event_id);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If event_id changed (unlikely), recompute both.
    IF (NEW.event_id IS DISTINCT FROM OLD.event_id) THEN
      PERFORM public.recompute_event_time_from_itinerary(OLD.event_id);
      PERFORM public.recompute_event_time_from_itinerary(NEW.event_id);
    ELSE
      PERFORM public.recompute_event_time_from_itinerary(NEW.event_id);
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_event_time_from_itinerary(OLD.event_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_itinerary_items_changed ON public.event_itinerary_items;
CREATE TRIGGER trg_itinerary_items_changed
  AFTER INSERT OR UPDATE OR DELETE
  ON public.event_itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION public.on_itinerary_items_changed();

COMMIT;





