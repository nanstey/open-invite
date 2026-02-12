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
