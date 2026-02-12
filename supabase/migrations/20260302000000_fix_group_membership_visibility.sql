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
