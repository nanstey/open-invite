-- Harden the notification system (core).
--
-- Problem this addresses:
--   1. Notifications were never generated server-side (no triggers; the client
--      createNotification path had no production callers).
--   2. The insert policy was `WITH CHECK (true)`, letting any authenticated client
--      insert a notification for ANY user_id with a spoofed actor_id.
--
-- This migration:
--   * adds a dedup_key so the same logical event cannot notify twice,
--   * introduces a private `internal` schema holding a SECURITY DEFINER helper that
--     is the ONLY sanctioned way to create notifications,
--   * removes the permissive insert policy so clients can no longer insert directly,
--   * exposes a single thin, admin-authorized RPC for SYSTEM broadcasts.
--
-- See docs/projects/OI-PRD-20260717-harden-notifications.md.

-- --------------------------------------------------------------------------
-- Dedup key
-- --------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedup_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedup
  ON public.notifications (dedup_key)
  WHERE dedup_key IS NOT NULL;

-- --------------------------------------------------------------------------
-- Private schema for the trusted creation path.
-- `internal` is intentionally NOT added to the PostgREST exposed schemas
-- (supabase/config.toml [api].schemas), so nothing in it is reachable as an RPC.
-- --------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS internal;

-- Shared helper: the single trusted way to create a notification.
-- search_path is pinned to '' to prevent function/table hijacking; every object
-- reference below is therefore fully schema-qualified.
CREATE OR REPLACE FUNCTION internal.create_notification(
  p_user_id          UUID,
  p_type             public.notification_type,
  p_title            TEXT,
  p_message          TEXT,
  p_related_event_id UUID,
  p_actor_id         UUID,
  p_dedup_key        TEXT
) RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  -- Never notify a user about their own action.
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications
    (user_id, type, title, message, related_event_id, actor_id, dedup_key)
  VALUES
    (p_user_id, p_type, p_title, p_message, p_related_event_id, p_actor_id, p_dedup_key)
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;
END;
$$;

-- Belt and suspenders: even inside a private schema, strip the default PUBLIC grant
-- so the helper can never be called by application roles. Only triggers (owner) and
-- authorized wrapper RPCs (below) invoke it.
REVOKE ALL ON FUNCTION internal.create_notification(
  UUID, public.notification_type, TEXT, TEXT, UUID, UUID, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION internal.create_notification(
  UUID, public.notification_type, TEXT, TEXT, UUID, UUID, TEXT
) FROM anon, authenticated;

-- --------------------------------------------------------------------------
-- Lock down direct client inserts.
-- With the permissive policy gone and no replacement INSERT policy for the
-- authenticated/anon roles, RLS denies all direct client inserts. Notifications
-- are created only by SECURITY DEFINER triggers/RPCs (which run as owner and bypass
-- RLS) or by the service role.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- --------------------------------------------------------------------------
-- Authorized SYSTEM broadcast RPC.
-- Lives in `public` because it must be callable, but it authorizes the caller
-- (admin only) before delegating to the unchecked helper. Non-admin callers get a
-- hard error, so this cannot be used to forge notifications.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_system_notification(
  p_user_id UUID,
  p_title   TEXT,
  p_message TEXT,
  p_related_event_id UUID DEFAULT NULL,
  p_dedup_key TEXT DEFAULT NULL
) RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins may create system notifications';
  END IF;

  PERFORM internal.create_notification(
    p_user_id, 'SYSTEM'::public.notification_type, p_title, p_message,
    p_related_event_id, NULL, p_dedup_key
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_system_notification(UUID, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_system_notification(UUID, TEXT, TEXT, UUID, TEXT) TO authenticated;
