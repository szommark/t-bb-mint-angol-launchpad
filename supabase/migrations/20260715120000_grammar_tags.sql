-- Tag grammar_questions by grammar point (tense/aspect, conditionals, etc.)
-- so the adaptive staircase can pick tag-diverse items within a level
-- instead of every candidate seeing the same 10 questions.
ALTER TABLE public.grammar_questions
  ADD COLUMN grammar_tag text CHECK (grammar_tag IN (
    'tense_aspect','conditionals','modals','articles','prepositions',
    'passive_voice','relative_clauses','comparatives','question_formation','reported_speech'
  ));

-- Supports the selector's (level, tag-diverse, least-used-first) query.
CREATE INDEX grammar_questions_level_tag_used_idx ON public.grammar_questions (level, grammar_tag, times_used);
