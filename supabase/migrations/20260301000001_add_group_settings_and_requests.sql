ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS allow_members_create_events BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_members_add_members BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_members_require_admin_approval BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.group_member_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, requester_id)
);

CREATE INDEX IF NOT EXISTS idx_group_member_requests_group_id ON public.group_member_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_member_requests_requester_id ON public.group_member_requests(requester_id);

ALTER TABLE public.group_member_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage group member requests"
  ON public.group_member_requests
  FOR ALL
  USING (public.is_group_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "Users can request to join groups"
  ON public.group_member_requests
  FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can view their own group member requests"
  ON public.group_member_requests
  FOR SELECT
  USING (requester_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- Allow all group members (not only admins/creators) to view memberships
-- for groups they belong to. This keeps deleted groups excluded.

DROP POLICY IF EXISTS "Users can view accessible group memberships" ON public.user_groups;

CREATE POLICY "Users can view accessible group memberships"
  ON public.user_groups FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = user_groups.group_id
        AND g.deleted_at IS NULL
        AND g.created_by = auth.uid()
    )
  );

-- Allow soft-deleting groups via UPDATE ... SET deleted_at = now().

DROP POLICY IF EXISTS "Admins can update groups" ON public.groups;

CREATE POLICY "Admins can update groups"
  ON public.groups FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR public.is_group_admin(id, auth.uid())
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_group_admin(id, auth.uid())
    OR deleted_at IS NOT NULL
  );

-- Security-definer helper to soft-delete a group without relying on row UPDATE
-- policy evaluation against the post-update row.
CREATE OR REPLACE FUNCTION public.soft_delete_group(group_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.groups g
  SET deleted_at = NOW()
  WHERE g.id = group_id_param
    AND g.deleted_at IS NULL
    AND (
      g.created_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_groups ug
        WHERE ug.group_id = g.id
          AND ug.user_id = auth.uid()
          AND ug.role = 'ADMIN'
      )
    );

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_group(UUID) TO authenticated;
