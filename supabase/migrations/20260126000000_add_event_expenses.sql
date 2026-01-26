-- Add expenses to events
-- - Expenses are owned by the event host (host-only writes)
-- - Reads follow event visibility via public.can_view_event (authenticated only)

BEGIN;

CREATE TABLE IF NOT EXISTS public.event_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  split_type TEXT NOT NULL CHECK (split_type IN ('GROUP', 'PER_PERSON')),
  timing TEXT NOT NULL CHECK (timing IN ('UP_FRONT', 'SETTLED_LATER')),
  settled_kind TEXT CHECK (settled_kind IN ('EXACT', 'ESTIMATE')),
  amount_cents INTEGER CHECK (amount_cents IS NULL OR amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  participant_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT participant_ids_not_empty CHECK (cardinality(participant_ids) > 0),
  -- Business rule: group expenses are always settled later.
  CONSTRAINT event_expenses_group_requires_settled_later CHECK (
    split_type <> 'GROUP' OR timing = 'SETTLED_LATER'
  ),
  CONSTRAINT event_expenses_amounts_valid CHECK (
    (
      timing = 'UP_FRONT'
      AND settled_kind IS NULL
      AND amount_cents IS NOT NULL
    )
    OR
    (
      timing = 'SETTLED_LATER'
      AND settled_kind = 'EXACT'
      AND amount_cents IS NOT NULL
    )
    OR
    (
      timing = 'SETTLED_LATER'
      AND settled_kind = 'ESTIMATE'
      AND amount_cents IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_event_expenses_event_id_created_at
  ON public.event_expenses(event_id, created_at);

-- updated_at trigger (re-use handle_updated_at from initial schema)
DROP TRIGGER IF EXISTS set_updated_at_event_expenses ON public.event_expenses;
CREATE TRIGGER set_updated_at_event_expenses
  BEFORE UPDATE ON public.event_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Ensure authenticated can access table (RLS still applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_expenses TO authenticated;

-- Row Level Security
ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view expenses for visible events" ON public.event_expenses;
CREATE POLICY "Authenticated users can view expenses for visible events"
  ON public.event_expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_expenses.event_id
        AND public.can_view_event(e.id, e.host_id, e.visibility_type, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can create expenses" ON public.event_expenses;
CREATE POLICY "Hosts can create expenses"
  ON public.event_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_expenses.event_id
        AND e.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can update expenses" ON public.event_expenses;
CREATE POLICY "Hosts can update expenses"
  ON public.event_expenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_expenses.event_id
        AND e.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can delete expenses" ON public.event_expenses;
CREATE POLICY "Hosts can delete expenses"
  ON public.event_expenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_expenses.event_id
        AND e.host_id = auth.uid()
    )
  );

COMMIT;


