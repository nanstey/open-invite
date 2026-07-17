-- Server-side notification generation via triggers.
--
-- Each trigger function lives in the private `internal` schema, runs SECURITY DEFINER
-- (so it can insert into notifications despite the locked-down RLS), pins search_path,
-- and delegates to internal.create_notification (which handles self-suppression and
-- dedup). Actors are always derived from the source row — never trusted from a client.
--
-- See docs/projects/OI-PRD-20260717-harden-notifications.md.

-- --------------------------------------------------------------------------
-- INVITE: a row in event_invites means a host/friend invited someone.
-- Recipient = NEW.user_id (invitee); actor = NEW.invited_by.
-- Sourced from event_invites (invite issuance), NOT event_attendees (join/accept),
-- so invitees are notified at send time and ordinary joins aren't mislabeled.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION internal.notify_on_invite()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_title TEXT;
BEGIN
  SELECT title INTO v_title FROM public.events WHERE id = NEW.event_id;

  PERFORM internal.create_notification(
    NEW.user_id,
    'INVITE'::public.notification_type,
    'New invite',
    'You''re invited to ' || COALESCE(v_title, 'an event'),
    NEW.event_id,
    NEW.invited_by,
    'invite:' || NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_invite
  AFTER INSERT ON public.event_invites
  FOR EACH ROW EXECUTE FUNCTION internal.notify_on_invite();

-- --------------------------------------------------------------------------
-- COMMENT: notify the event host when someone comments on their event.
-- Recipient = event host; actor = NEW.user_id (commenter).
-- Self-suppression means a host commenting on their own event is not notified.
-- (Notifying all thread participants is deferred — see PRD open question.)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION internal.notify_on_comment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_host  UUID;
  v_title TEXT;
BEGIN
  SELECT host_id, title INTO v_host, v_title FROM public.events WHERE id = NEW.event_id;
  IF v_host IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM internal.create_notification(
    v_host,
    'COMMENT'::public.notification_type,
    'New comment',
    'New comment on ' || COALESCE(v_title, 'your event') || ': ' || left(NEW.text, 140),
    NEW.event_id,
    NEW.user_id,
    'comment:' || NEW.id || ':' || v_host
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION internal.notify_on_comment();

-- --------------------------------------------------------------------------
-- REACTION: notify the event host when someone reacts to their event.
-- Recipient = event host; actor = NEW.user_id (reactor).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION internal.notify_on_reaction()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_host  UUID;
  v_title TEXT;
BEGIN
  SELECT host_id, title INTO v_host, v_title FROM public.events WHERE id = NEW.event_id;
  IF v_host IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM internal.create_notification(
    v_host,
    'REACTION'::public.notification_type,
    'New reaction',
    NEW.emoji || ' on ' || COALESCE(v_title, 'your event'),
    NEW.event_id,
    NEW.user_id,
    'reaction:' || NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_reaction
  AFTER INSERT ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION internal.notify_on_reaction();
