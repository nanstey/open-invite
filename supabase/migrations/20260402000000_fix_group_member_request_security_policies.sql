DROP POLICY IF EXISTS "Users can request to join groups" ON public.group_member_requests;

CREATE POLICY "Users can request to join groups"
  ON public.group_member_requests
  FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_member_requests.group_id
        AND g.deleted_at IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.approve_group_member_request(request_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_requester_id UUID;
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT group_id, requester_id, status
  INTO v_group_id, v_requester_id, v_status
  FROM public.group_member_requests
  WHERE id = request_id_param
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Group member request not found';
  END IF;

  IF NOT public.is_group_admin(v_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only group admins can approve requests';
  END IF;

  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'Group member request is no longer pending';
  END IF;

  INSERT INTO public.user_groups (user_id, group_id, role)
  VALUES (v_requester_id, v_group_id, 'MEMBER')
  ON CONFLICT (user_id, group_id) DO NOTHING;

  UPDATE public.group_member_requests
  SET status = 'APPROVED', updated_at = NOW()
  WHERE id = request_id_param;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_group_member_request(UUID) TO authenticated;
