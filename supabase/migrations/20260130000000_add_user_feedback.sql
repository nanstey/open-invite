-- Add is_admin column to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create feedback type enum
CREATE TYPE feedback_type AS ENUM ('bug', 'feature', 'ux', 'other');

-- Create feedback importance enum
CREATE TYPE feedback_importance AS ENUM ('low', 'medium', 'high', 'critical');

-- Create feedback status enum
CREATE TYPE feedback_status AS ENUM ('new', 'reviewed', 'planned', 'done', 'declined');

-- Create user_feedback table
CREATE TABLE public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type feedback_type NOT NULL,
  importance feedback_importance NOT NULL,
  description TEXT NOT NULL,
  status feedback_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX idx_user_feedback_created_at ON public.user_feedback(created_at);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at_user_feedback
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- RLS Policies for user_feedback

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.user_feedback FOR SELECT
  USING (public.is_current_user_admin());

-- Admins can update feedback status
CREATE POLICY "Admins can update feedback"
  ON public.user_feedback FOR UPDATE
  USING (public.is_current_user_admin());

