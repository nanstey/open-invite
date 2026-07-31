-- Notification producer for the generic email delivery core.
--
-- Notifications are the FIRST producer wired to the delivery core. Rather than a
-- notification-specific outbox, an AFTER INSERT trigger on public.notifications
-- enqueues through the generic seam internal.enqueue_email(...). Because every
-- server-side notification (the internal.notify_on_* triggers, the reminder
-- scanner, and the admin SYSTEM RPC) lands a row in public.notifications, this one
-- trigger covers them all uniformly. A future marketing/account producer calls the
-- same seam from its own path — no change to the core or to this trigger.
--
-- Trust: notification creation is already server-side and clients cannot insert
-- directly (20260717000000_harden_notifications_core.sql), so every row that fires
-- this trigger is trustworthy (PRD FR-0). This trigger only enqueues; it never sends.
-- Sending is gated by the emailDelivery / emailNotifications feature flags, checked
-- by the worker.
--
-- See docs/projects/OI-PRD-20260717-email-delivery.md (§6.3, §6.7, FR-N1..N3).

CREATE OR REPLACE FUNCTION internal.enqueue_notification_email()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_topic         TEXT;
  v_template      TEXT;
BEGIN
  -- REACTION is digest-only (low urgency, high frequency) — not enqueued as an
  -- immediate email here; a digest job batches it. Everything else is immediate.
  IF NEW.type NOT IN ('INVITE', 'COMMENT', 'REMINDER', 'SYSTEM') THEN
    RETURN NEW;
  END IF;

  v_topic    := 'notif.' || lower(NEW.type::text);
  v_template := lower(NEW.type::text) || '_v1';

  PERFORM internal.enqueue_email(
    p_producer        => 'notifications',
    p_message_class   => 'transactional'::public.email_message_class,
    p_topic           => v_topic,
    p_template        => v_template,
    p_payload         => jsonb_build_object(
                           'title', NEW.title,
                           'message', NEW.message,
                           'related_event_id', NEW.related_event_id,
                           'actor_id', NEW.actor_id
                         ),
    p_idempotency_key => 'notif:' || NEW.id,
    p_user_id         => NEW.user_id
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION internal.enqueue_notification_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION internal.enqueue_notification_email() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_enqueue_notification_email ON public.notifications;
CREATE TRIGGER trg_enqueue_notification_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION internal.enqueue_notification_email();

-- --------------------------------------------------------------------------
-- Feature flags: a core flag arms the worker, a per-producer flag gates the
-- notification producer's real sends. Both default off so the system can be
-- dark-launched (enqueue + render, no send).
-- --------------------------------------------------------------------------
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('emailDelivery',      false, 'Arms the email delivery worker (core switch). Off = enqueue/dark-launch only.'),
  ('emailNotifications', false, 'Sends notification emails via the delivery core. Requires emailDelivery.')
ON CONFLICT (key) DO NOTHING;
