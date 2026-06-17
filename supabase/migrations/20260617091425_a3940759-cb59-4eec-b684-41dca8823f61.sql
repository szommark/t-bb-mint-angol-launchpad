
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS intake jsonb,
  ADD COLUMN IF NOT EXISTS test_questions jsonb,
  ADD COLUMN IF NOT EXISTS test_answers jsonb,
  ADD COLUMN IF NOT EXISTS cefr_level text,
  ADD COLUMN IF NOT EXISTS score_summary text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
