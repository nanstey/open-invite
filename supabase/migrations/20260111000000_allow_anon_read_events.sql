-- Allow unauthenticated users to read events by id (public event detail page at /e/:eventId).
-- This policy is intentionally scoped to the `anon` role so authenticated visibility rules remain unchanged.

-- Ensure the anon role can select (RLS still applies).
GRANT SELECT ON public.events TO anon;

-- Allow anon to SELECT any event row.
-- Note: "having the link" is effectively "knowing the UUID"; Postgres RLS cannot distinguish intent.
CREATE POLICY "Anon can view all events"
  ON public.events FOR SELECT
  TO anon
  USING (true);


-- --------------------------------------------------------------------------------------
-- Fix infinite recursion in RLS policies involving public.user_groups <-> public.groups.
-- Symptoms: PostgREST returns 500 with SQLSTATE 42P17 ("infinite recursion detected in policy for relation \"user_groups\""),
-- which breaks fetching attendees/comments/reactions (they join user_groups in their RLS checks).
-- --------------------------------------------------------------------------------------

-- Helper: check if a user is a member of a group (bypasses RLS via SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.is_group_member(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_groups ug
    INNER JOIN public.groups g ON g.id = ug.group_id
    WHERE ug.group_id = group_id_param
      AND ug.user_id = user_id_param
      AND g.deleted_at IS NULL
  );
$$;

-- Helper: check if a user is an admin of a group (bypasses RLS via SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.is_group_admin(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_groups ug
    INNER JOIN public.groups g ON g.id = ug.group_id
    WHERE ug.group_id = group_id_param
      AND ug.user_id = user_id_param
      AND ug.role = 'ADMIN'
      AND g.deleted_at IS NULL
  );
$$;

-- Ensure API roles can execute these helpers (Supabase often revokes default PUBLIC privileges).
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID, UUID) TO anon, authenticated;

-- Replace groups policies that referenced user_groups (which triggered recursion).
DROP POLICY IF EXISTS "Users can view accessible groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can update groups" ON public.groups;

CREATE POLICY "Users can view accessible groups"
  ON public.groups FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR public.is_group_member(id, auth.uid())
    )
  );

CREATE POLICY "Admins can update groups"
  ON public.groups FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR public.is_group_admin(id, auth.uid())
    )
  );

-- Replace user_groups policies that referenced user_groups (directly) (which triggered recursion).
DROP POLICY IF EXISTS "Users can view accessible group memberships" ON public.user_groups;
DROP POLICY IF EXISTS "Users can join groups" ON public.user_groups;
DROP POLICY IF EXISTS "Users can manage group memberships" ON public.user_groups;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_groups;

CREATE POLICY "Users can view accessible group memberships"
  ON public.user_groups FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = user_groups.group_id
        AND g.deleted_at IS NULL
        AND (
          g.created_by = auth.uid()
          OR public.is_group_admin(user_groups.group_id, auth.uid())
        )
    )
  );

CREATE POLICY "Users can join groups"
  ON public.user_groups FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = user_groups.group_id
        AND g.deleted_at IS NULL
        AND (
          g.created_by = auth.uid()
          OR g.is_open = true
          OR public.is_group_admin(user_groups.group_id, auth.uid())
        )
    )
  );

CREATE POLICY "Users can manage group memberships"
  ON public.user_groups FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = user_groups.group_id
        AND g.deleted_at IS NULL
        AND (
          g.created_by = auth.uid()
          OR public.is_group_admin(user_groups.group_id, auth.uid())
        )
    )
  );

CREATE POLICY "Admins can update roles"
  ON public.user_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = user_groups.group_id
        AND g.deleted_at IS NULL
        AND (
          g.created_by = auth.uid()
          OR public.is_group_admin(user_groups.group_id, auth.uid())
        )
    )
  );


