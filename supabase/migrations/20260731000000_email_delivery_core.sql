-- Generic email delivery core.
--
-- A producer-agnostic outbox + worker substrate. Any producer (the notification
-- producer added in the next migration, and marketing/account producers later)
-- enqueues through the single seam internal.enqueue_email(...); the delivery core
-- below knows nothing about notifications.
--
-- Design notes:
--   * message_class (transactional | marketing | account) carries compliance
--     behavior, so adding marketing later is configuration, not a schema change.
--   * Topics are DATA (email_topics), so a new kind of email is an INSERT, not an
--     ALTER TABLE, and preferences (email_subscriptions) are sparse/default-driven.
--   * Recipients are flexible: an outbox row targets a user_id, an explicit
--     recipient_email, or both — so we can email people who aren't users yet.
--   * Suppression is scoped (all | marketing) so a marketing unsubscribe never
--     blocks a transactional invite.
--   * The claim/finalize/webhook helpers live in `public` but are granted to the
--     service_role only (the worker), never to anon/authenticated. Everything the
--     worker needs is resolved server-side; the policy decision itself is computed
--     in the worker (see supabase/functions/email-worker/policy.ts).
--
-- See docs/projects/OI-PRD-20260717-email-delivery.md.

-- --------------------------------------------------------------------------
-- Classification types
-- --------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.email_message_class AS ENUM ('transactional', 'marketing', 'account');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_status AS ENUM ('pending', 'sending', 'sent', 'failed', 'dead', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_suppression_scope AS ENUM ('all', 'marketing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------------------
-- Topic registry. Topics are data so a new email kind is an INSERT, not a
-- migration. default_subscribed encodes opt-out (transactional) vs opt-in
-- (marketing). digestible flags topics a digest job may batch.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_topics (
  topic              TEXT PRIMARY KEY,
  message_class      public.email_message_class NOT NULL,
  description        TEXT,
  default_subscribed BOOLEAN NOT NULL,
  digestible         BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- Sparse per-user, per-topic preference. A missing row means "use the topic
-- default", so we never have to backfill a row per (user, topic).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_subscriptions (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic       TEXT NOT NULL REFERENCES public.email_topics(topic) ON DELETE CASCADE,
  subscribed  BOOLEAN NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, topic)
);

-- --------------------------------------------------------------------------
-- The outbox. Self-describing (producer / channel / message_class / topic) so
-- metrics can be sliced per producer without joining anything.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer            TEXT NOT NULL,
  channel             TEXT NOT NULL DEFAULT 'email',
  message_class       public.email_message_class NOT NULL,
  topic               TEXT NOT NULL REFERENCES public.email_topics(topic),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email     TEXT,
  idempotency_key     TEXT NOT NULL UNIQUE,
  template            TEXT NOT NULL,
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              public.email_status NOT NULL DEFAULT 'pending',
  attempts            INT NOT NULL DEFAULT 0,
  next_attempt_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at          TIMESTAMPTZ,
  lock_until          TIMESTAMPTZ,
  last_error          TEXT,
  provider_message_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_outbox_recipient_present CHECK (user_id IS NOT NULL OR recipient_email IS NOT NULL)
);

-- Claim index covers both fresh pending rows and stale (lease-expired) sending rows.
CREATE INDEX IF NOT EXISTS idx_email_outbox_claim
  ON public.email_outbox (status, next_attempt_at, lock_until);
-- Slice index for per-producer / per-class / per-topic metrics.
CREATE INDEX IF NOT EXISTS idx_email_outbox_slice
  ON public.email_outbox (producer, message_class, topic);

CREATE TABLE IF NOT EXISTS public.email_delivery_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id         UUID REFERENCES public.email_outbox(id) ON DELETE CASCADE,
  event             TEXT NOT NULL,
  provider_payload  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_outbox
  ON public.email_delivery_log (outbox_id);

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email       TEXT NOT NULL,
  scope       public.email_suppression_scope NOT NULL DEFAULT 'all',
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (email, scope)
);

-- --------------------------------------------------------------------------
-- updated_at bookkeeping (reuse the existing shared trigger fn).
-- --------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_email_subscriptions ON public.email_subscriptions;
CREATE TRIGGER set_updated_at_email_subscriptions
  BEFORE UPDATE ON public.email_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_email_outbox ON public.email_outbox;
CREATE TRIGGER set_updated_at_email_outbox
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------------
-- The single enqueue seam. Every producer inserts through this; nothing else
-- writes email_outbox. SECURITY DEFINER so it runs as owner (bypassing RLS),
-- search_path pinned to '' so every reference is schema-qualified. Returns the
-- new row id, or NULL when the idempotency key already existed (deduped).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION internal.enqueue_email(
  p_producer        TEXT,
  p_message_class   public.email_message_class,
  p_topic           TEXT,
  p_template        TEXT,
  p_payload         JSONB,
  p_idempotency_key TEXT,
  p_user_id         UUID DEFAULT NULL,
  p_recipient_email TEXT DEFAULT NULL
) RETURNS UUID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_user_id IS NULL AND p_recipient_email IS NULL THEN
    RAISE EXCEPTION 'enqueue_email requires a user_id or a recipient_email';
  END IF;

  INSERT INTO public.email_outbox
    (producer, message_class, topic, template, payload, idempotency_key, user_id, recipient_email)
  VALUES
    (p_producer, p_message_class, p_topic, p_template,
     COALESCE(p_payload, '{}'::jsonb), p_idempotency_key, p_user_id, p_recipient_email)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- The seam is for trusted server-side producers (triggers/definer functions)
-- only — never application roles.
REVOKE ALL ON FUNCTION internal.enqueue_email(
  TEXT, public.email_message_class, TEXT, TEXT, JSONB, TEXT, UUID, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION internal.enqueue_email(
  TEXT, public.email_message_class, TEXT, TEXT, JSONB, TEXT, UUID, TEXT
) FROM anon, authenticated;

-- --------------------------------------------------------------------------
-- Worker RPC: claim a batch, resolving everything the worker needs to decide
-- delivery (recipient address, effective subscription, suppression scopes) so
-- the worker makes one call per batch. The delivery decision itself is computed
-- in the worker (policy.ts) from these fields.
--
-- A row is claimable when it is fresh (pending & due) or stale (sending but the
-- lease expired — its worker died mid-flight). Claiming stamps a lease and bumps
-- attempts so a chronically-crashing row still dead-letters instead of looping.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_email_batch(
  p_limit INT DEFAULT 20,
  p_lease INTERVAL DEFAULT INTERVAL '5 minutes'
) RETURNS TABLE (
  id                     UUID,
  producer               TEXT,
  message_class          public.email_message_class,
  topic                  TEXT,
  template               TEXT,
  payload                JSONB,
  attempts               INT,
  user_id                UUID,
  recipient_email        TEXT,
  resolved_email         TEXT,
  subscribed             BOOLEAN,
  topic_default_subscribed BOOLEAN,
  suppressed_all         BOOLEAN,
  suppressed_marketing   BOOLEAN
)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT o.id
    FROM public.email_outbox o
    WHERE (o.status = 'pending' AND o.next_attempt_at <= now())
       OR (o.status = 'sending' AND o.lock_until IS NOT NULL AND o.lock_until < now())
    ORDER BY o.next_attempt_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ),
  claimed AS (
    UPDATE public.email_outbox o
      SET status     = 'sending',
          claimed_at = now(),
          lock_until = now() + p_lease,
          attempts   = o.attempts + 1
    FROM claimable c
    WHERE o.id = c.id
    RETURNING o.*
  )
  SELECT
    cl.id,
    cl.producer,
    cl.message_class,
    cl.topic,
    cl.template,
    cl.payload,
    cl.attempts,
    cl.user_id,
    cl.recipient_email,
    COALESCE(cl.recipient_email, u.email)              AS resolved_email,
    sub.subscribed,
    t.default_subscribed,
    EXISTS (
      SELECT 1 FROM public.email_suppressions s
      WHERE s.email = COALESCE(cl.recipient_email, u.email) AND s.scope = 'all'
    )                                                  AS suppressed_all,
    EXISTS (
      SELECT 1 FROM public.email_suppressions s
      WHERE s.email = COALESCE(cl.recipient_email, u.email) AND s.scope = 'marketing'
    )                                                  AS suppressed_marketing
  FROM claimed cl
  LEFT JOIN auth.users u ON u.id = cl.user_id
  LEFT JOIN public.email_topics t ON t.topic = cl.topic
  LEFT JOIN public.email_subscriptions sub ON sub.user_id = cl.user_id AND sub.topic = cl.topic;
END;
$$;

-- --------------------------------------------------------------------------
-- Worker finalizers.
-- --------------------------------------------------------------------------
-- All three finalizers guard on status = 'sending': only the worker that still
-- legitimately holds the row (it is in 'sending') may write a terminal state. If
-- the lease expired and another worker already reclaimed and finalized the row,
-- this UPDATE matches nothing (IF NOT FOUND / status check) and the late finalizer
-- is a no-op instead of resurrecting a completed row into an endless re-send loop.
CREATE OR REPLACE FUNCTION public.mark_email_sent(
  p_id UUID,
  p_provider_message_id TEXT
) RETURNS VOID
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.email_outbox
    SET status = 'sent', lock_until = NULL, last_error = NULL,
        provider_message_id = p_provider_message_id
    WHERE id = p_id AND status = 'sending';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.email_delivery_log (outbox_id, event, provider_payload)
  VALUES (p_id, 'sent', jsonb_build_object('provider_message_id', p_provider_message_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_email_skipped(
  p_id UUID,
  p_reason TEXT
) RETURNS VOID
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.email_outbox
    SET status = 'skipped', lock_until = NULL, last_error = p_reason
    WHERE id = p_id AND status = 'sending';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.email_delivery_log (outbox_id, event, provider_payload)
  VALUES (p_id, 'skipped', jsonb_build_object('reason', p_reason));
END;
$$;

-- Transient failure: reschedule with backoff, or dead-letter once attempts are
-- exhausted. attempts was already incremented at claim time.
CREATE OR REPLACE FUNCTION public.mark_email_failed(
  p_id UUID,
  p_error TEXT,
  p_backoff_seconds INT,
  p_max_attempts INT DEFAULT 6
) RETURNS VOID
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_attempts INT;
  v_status   public.email_status;
BEGIN
  SELECT attempts, status INTO v_attempts, v_status
  FROM public.email_outbox WHERE id = p_id;

  -- Only the holder of an active claim may fail the row (see note above).
  IF v_status IS DISTINCT FROM 'sending' THEN
    RETURN;
  END IF;

  IF v_attempts >= p_max_attempts THEN
    UPDATE public.email_outbox
      SET status = 'dead', lock_until = NULL, last_error = p_error
      WHERE id = p_id AND status = 'sending';
    INSERT INTO public.email_delivery_log (outbox_id, event, provider_payload)
    VALUES (p_id, 'dead', jsonb_build_object('error', p_error, 'attempts', v_attempts));
  ELSE
    UPDATE public.email_outbox
      SET status = 'pending', lock_until = NULL, last_error = p_error,
          next_attempt_at = now() + make_interval(secs => p_backoff_seconds)
      WHERE id = p_id AND status = 'sending';
    INSERT INTO public.email_delivery_log (outbox_id, event, provider_payload)
    VALUES (p_id, 'failed', jsonb_build_object('error', p_error, 'attempts', v_attempts));
  END IF;
END;
$$;

-- --------------------------------------------------------------------------
-- Provider webhook sink: record a delivery event and, for hard bounce /
-- complaint, add the address to the suppression list with the right scope.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_email_event(
  p_provider_message_id TEXT,
  p_event TEXT,
  p_email TEXT,
  p_payload JSONB DEFAULT NULL
) RETURNS VOID
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_outbox_id UUID;
  v_class     public.email_message_class;
  v_scope     public.email_suppression_scope;
BEGIN
  SELECT id, message_class INTO v_outbox_id, v_class
  FROM public.email_outbox
  WHERE provider_message_id = p_provider_message_id
  LIMIT 1;

  INSERT INTO public.email_delivery_log (outbox_id, event, provider_payload)
  VALUES (v_outbox_id, p_event, p_payload);

  IF p_email IS NOT NULL AND p_event IN ('hard_bounce', 'complaint') THEN
    -- Scope the suppression to the offending mail. A hard bounce means the address
    -- is dead, so suppress everything ('all'). A complaint on a MARKETING message
    -- must only stop marketing — never block the user's transactional invites — so
    -- it suppresses scope 'marketing'; a complaint on transactional/account mail
    -- (or an unknown origin) falls back to 'all'.
    IF p_event = 'complaint' AND v_class = 'marketing' THEN
      v_scope := 'marketing';
    ELSE
      v_scope := 'all';
    END IF;

    INSERT INTO public.email_suppressions (email, scope, reason)
    VALUES (p_email, v_scope, p_event)
    ON CONFLICT (email, scope) DO NOTHING;
  END IF;
END;
$$;

-- The worker/webhook functions are for the service_role (Edge Function) only.
REVOKE ALL ON FUNCTION public.claim_email_batch(INT, INTERVAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_email_batch(INT, INTERVAL) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_batch(INT, INTERVAL) TO service_role;

REVOKE ALL ON FUNCTION public.mark_email_sent(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_email_sent(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_email_sent(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.mark_email_skipped(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_email_skipped(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_email_skipped(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.mark_email_failed(UUID, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_email_failed(UUID, TEXT, INT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_email_failed(UUID, TEXT, INT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.record_email_event(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_email_event(TEXT, TEXT, TEXT, JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_email_event(TEXT, TEXT, TEXT, JSONB) TO service_role;

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------
ALTER TABLE public.email_topics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions  ENABLE ROW LEVEL SECURITY;

-- Topics are public reference data (the Settings UI lists them). Read-only to clients.
GRANT SELECT ON public.email_topics TO anon, authenticated;
DROP POLICY IF EXISTS "Anyone can read email topics" ON public.email_topics;
CREATE POLICY "Anyone can read email topics"
  ON public.email_topics FOR SELECT USING (true);

-- Subscriptions: a user manages only their own rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_subscriptions TO authenticated;
DROP POLICY IF EXISTS "Users read own email subscriptions" ON public.email_subscriptions;
CREATE POLICY "Users read own email subscriptions"
  ON public.email_subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own email subscriptions" ON public.email_subscriptions;
CREATE POLICY "Users insert own email subscriptions"
  ON public.email_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own email subscriptions" ON public.email_subscriptions;
CREATE POLICY "Users update own email subscriptions"
  ON public.email_subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own email subscriptions" ON public.email_subscriptions;
CREATE POLICY "Users delete own email subscriptions"
  ON public.email_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Outbox / delivery log / suppressions: no client access at all. RLS is enabled
-- and no policy grants app roles anything, so authenticated/anon are denied; the
-- worker uses the service_role, which bypasses RLS.

-- --------------------------------------------------------------------------
-- Seed the notification topics (the first producer). Marketing/account topics
-- are intentionally absent — their producers add them later as plain rows, with
-- no change to this core.
-- --------------------------------------------------------------------------
INSERT INTO public.email_topics (topic, message_class, description, default_subscribed, digestible) VALUES
  ('notif.invite',   'transactional', 'You are invited to an event',        true,  false),
  ('notif.comment',  'transactional', 'Someone commented on your event',    true,  true),
  ('notif.reminder', 'transactional', 'An event you are attending is soon', true,  false),
  ('notif.reaction', 'transactional', 'Someone reacted to your event',      false, true),
  ('notif.system',   'transactional', 'Account and system messages',        true,  false)
ON CONFLICT (topic) DO NOTHING;
