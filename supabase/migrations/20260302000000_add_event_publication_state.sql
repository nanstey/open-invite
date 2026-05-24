ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.events
SET published_at = COALESCE(published_at, created_at, NOW())
WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_published_at
  ON public.events(published_at)
  WHERE published_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.can_view_event(
  event_id_param UUID,
  event_host_id_param UUID,
  event_visibility_param event_visibility_type,
  user_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hosts can always see their own drafts and published events.
  IF user_id_param IS NOT NULL AND event_host_id_param = user_id_param THEN
    RETURN TRUE;
  END IF;

  -- Drafts are private to their host.
  IF EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_id_param
      AND e.published_at IS NULL
  ) THEN
    RETURN FALSE;
  END IF;

  -- "Viewed via link" counts as invited/allowed for published events.
  IF EXISTS (
    SELECT 1
    FROM public.event_link_views elv
    WHERE elv.event_id = event_id_param
      AND elv.user_id = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;

  IF event_visibility_param = 'ALL_FRIENDS' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_friends
      WHERE (user_id = user_id_param AND friend_id = event_host_id_param)
         OR (user_id = event_host_id_param AND friend_id = user_id_param)
    );
  END IF;

  IF event_visibility_param = 'GROUPS' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.event_groups eg
      INNER JOIN public.user_groups ug ON eg.group_id = ug.group_id
      INNER JOIN public.groups g ON g.id = eg.group_id
      WHERE eg.event_id = event_id_param
        AND ug.user_id = user_id_param
        AND g.deleted_at IS NULL
    );
  END IF;

  IF event_visibility_param = 'INVITE_ONLY' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.event_invites
      WHERE event_id = event_id_param AND user_id = user_id_param
    );
  END IF;

  RETURN FALSE;
END;
$$;

DROP POLICY IF EXISTS "Anon can view all events" ON public.events;
CREATE POLICY "Anon can view published events"
  ON public.events FOR SELECT
  TO anon
  USING (published_at IS NOT NULL);
