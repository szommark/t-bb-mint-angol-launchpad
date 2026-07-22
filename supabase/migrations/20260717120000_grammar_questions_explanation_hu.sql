-- Hungarian translation of grammar_questions.explanation, shown to students
-- in their own language when reviewing mistakes on the Grammar Test.
ALTER TABLE public.grammar_questions
  ADD COLUMN IF NOT EXISTS explanation_hu text;
