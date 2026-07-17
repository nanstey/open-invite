-- Event reminder notifications.
--
-- A set-based scanner that enqueues one REMINDER notification per attendee for events
-- starting within the given lead window. Idempotent via dedup_key
-- ('reminder:<event>:<user>'), so re-running (or overlapping schedules) never
-- duplicates a reminder. Actor is NULL (system-originated), so self-suppression does
-- not apply — hosts who are attendees still get reminded.
--
-- See docs/projects/OI-PRD-20260717-harden-notifications.md (§6.2, FR-2 REMINDER).

CREATE OR REPLACE FUNCTION internal.enqueue_event_reminders(
  p_lead INTERVAL DEFAULT INTERVAL '24 hours'
) RETURNS INTEGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_inserted INTEGER;
BEGIN
  INSERT INTO public.notifications
    (user_id, type, title, message, related_event_id, actor_id, dedup_key)
  SELECT
    ea.user_id,
    'REMINDER'::public.notification_type,
    'Event reminder',
    'Starting soon: ' || COALESCE(e.title, 'your event'),
    e.id,
    NULL,
    'reminder:' || e.id || ':' || ea.user_id
  FROM public.events e
  JOIN public.event_attendees ea ON ea.event_id = e.id
  WHERE e.published_at IS NOT NULL
    AND e.start_time >= now()
    AND e.start_time <= now() + p_lead
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- Not exposed as an RPC (private schema) and no application-role grant.
REVOKE ALL ON FUNCTION internal.enqueue_event_reminders(INTERVAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION internal.enqueue_event_reminders(INTERVAL) FROM anon, authenticated;

-- --------------------------------------------------------------------------
-- Schedule the scanner every 15 minutes if pg_cron is available. Local/dev stacks
-- typically don't have pg_cron enabled; in that case the function still exists and
-- can be driven externally (e.g. a scheduled GitHub Action, as the repo already does
-- for supabase-keepalive), and this block is a safe no-op.
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'event-reminders-15m',
      '*/15 * * * *',
      $cron$ SELECT internal.enqueue_event_reminders(INTERVAL '24 hours'); $cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron not installed; call internal.enqueue_event_reminders() from an external scheduler.';
  END IF;
END;
$$;
