-- When a user opens a public event link (/e/:slug) and then signs in,
-- they are redirected to the authenticated route (/events/:slug).
--
-- We want:
-- - Public (/e/:slug) to keep working for anonymous users
-- - Authenticated users to be able to view an event if they have the link
-- - Viewing an event while authenticated to make it show up in "Pending"/"Going" (feed)
--
-- Implementation:
-- - Keep the anon-only public-read policy on `events` (as before)
-- - Add a table `event_link_views` that records which authenticated users have viewed an event
-- - Add SECURITY DEFINER RPC helpers to mark an event as viewed (by id or by slug)
-- - Extend `can_view_event(...)` so a recorded viewer can read the event and its related tables

-- Ensure authenticated can select from events (RLS still applies).
GRANT SELECT ON public.events TO authenticated;

-- --------------------------------------------------------------------------------------
-- Link-view tracking
-- --------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_link_views (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_link_views_event_id ON public.event_link_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_link_views_user_id ON public.event_link_views(user_id);

ALTER TABLE public.event_link_views ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_link_views TO authenticated;

DROP POLICY IF EXISTS "Users can view their own event link views" ON public.event_link_views;
CREATE POLICY "Users can view their own event link views"
  ON public.event_link_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can record their own event link views" ON public.event_link_views;
CREATE POLICY "Users can record their own event link views"
  ON public.event_link_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SECURITY DEFINER: record that the current user has viewed an event (by id)
CREATE OR REPLACE FUNCTION public.mark_event_viewed(event_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.event_link_views(event_id, user_id, viewed_at)
  VALUES (event_id_param, uid, NOW())
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET viewed_at = EXCLUDED.viewed_at;

  RETURN true;
END;
$$;

-- SECURITY DEFINER: resolve slug -> id and record that the current user has viewed the event
CREATE OR REPLACE FUNCTION public.mark_event_viewed_by_slug(slug_param TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_id UUID;
BEGIN
  SELECT e.id INTO resolved_id
  FROM public.events e
  WHERE e.slug = slug_param
  LIMIT 1;

  IF resolved_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM public.mark_event_viewed(resolved_id);
  RETURN resolved_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_event_viewed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_event_viewed_by_slug(TEXT) TO authenticated;

-- --------------------------------------------------------------------------------------
-- Fix access regression: keep public read for anon only (do NOT grant "view all" to authenticated)
-- --------------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anon and authenticated can view all events" ON public.events;
DROP POLICY IF EXISTS "Anon can view all events" ON public.events;

CREATE POLICY "Anon can view all events"
  ON public.events FOR SELECT
  TO anon
  USING (true);

-- --------------------------------------------------------------------------------------
-- Extend can_view_event(...) to include link viewers
-- --------------------------------------------------------------------------------------

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
  -- Host can always view
  IF event_host_id_param = user_id_param THEN
    RETURN true;
  END IF;

  -- "Viewed via link" counts as invited/allowed
  IF EXISTS (
    SELECT 1
    FROM public.event_link_views elv
    WHERE elv.event_id = event_id_param
      AND elv.user_id = user_id_param
  ) THEN
    RETURN true;
  END IF;
  
  -- Check visibility based on type
  IF event_visibility_param = 'ALL_FRIENDS' THEN
    -- Check if users are friends
    RETURN EXISTS (
      SELECT 1 FROM public.user_friends
      WHERE (user_id = user_id_param AND friend_id = event_host_id_param)
         OR (user_id = event_host_id_param AND friend_id = user_id_param)
    );
  ELSIF event_visibility_param = 'GROUPS' THEN
    -- For GROUPS visibility, check if user is in any group for this event
    RETURN EXISTS (
      SELECT 1 FROM public.event_groups eg
      INNER JOIN public.user_groups ug ON ug.group_id = eg.group_id
      INNER JOIN public.groups g ON g.id = eg.group_id
      WHERE eg.event_id = event_id_param
        AND ug.user_id = user_id_param
        AND g.deleted_at IS NULL
    );
  ELSIF event_visibility_param = 'INVITE_ONLY' THEN
    -- Check if user is invited
    RETURN EXISTS (
      SELECT 1 FROM public.event_invites
      WHERE event_id = event_id_param AND user_id = user_id_param
    );
  END IF;
  
  RETURN false;
END;
$$;

-- --------------------------------------------------------------------------------------
-- Make related data follow the same access rules (so "Pending" cards hydrate correctly)
-- --------------------------------------------------------------------------------------

-- event_attendees
DROP POLICY IF EXISTS "Users can view attendees of visible events" ON public.event_attendees;
CREATE POLICY "Users can view attendees of visible events"
  ON public.event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_attendees.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can join events" ON public.event_attendees;
CREATE POLICY "Users can join events"
  ON public.event_attendees FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_attendees.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );

-- comments
DROP POLICY IF EXISTS "Users can view comments on visible events" ON public.comments;
CREATE POLICY "Users can view comments on visible events"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = comments.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = comments.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );

-- reactions
DROP POLICY IF EXISTS "Users can view reactions on visible events" ON public.reactions;
CREATE POLICY "Users can view reactions on visible events"
  ON public.reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = reactions.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create reactions" ON public.reactions;
CREATE POLICY "Users can create reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = reactions.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );


