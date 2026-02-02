-- Friend requests table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id),
  CHECK (requester_id != recipient_id),
  CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED'))
);

CREATE INDEX idx_friend_requests_requester_id ON public.friend_requests(requester_id);
CREATE INDEX idx_friend_requests_recipient_id ON public.friend_requests(recipient_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friend requests"
  ON public.friend_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their friend requests"
  ON public.friend_requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can delete their friend requests"
  ON public.friend_requests FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Create a SECURITY DEFINER function to accept friend requests
-- This allows creating bidirectional friendships while bypassing RLS
-- but only when there is a valid pending friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id UUID;
  v_recipient_id UUID;
  v_status TEXT;
BEGIN
  -- Get the friend request details
  SELECT requester_id, recipient_id, status
  INTO v_requester_id, v_recipient_id, v_status
  FROM public.friend_requests
  WHERE id = request_id;

  -- Validate the request exists
  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;

  -- Validate the current user is the recipient
  IF v_recipient_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the recipient can accept this friend request';
  END IF;

  -- Validate the request is still pending
  IF v_status != 'PENDING' THEN
    RAISE EXCEPTION 'Friend request is no longer pending';
  END IF;

  -- Insert bidirectional friendships
  INSERT INTO public.user_friends (user_id, friend_id)
  VALUES 
    (v_recipient_id, v_requester_id),
    (v_requester_id, v_recipient_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  -- Update the request status
  UPDATE public.friend_requests
  SET status = 'ACCEPTED', updated_at = NOW()
  WHERE id = request_id;

  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;

