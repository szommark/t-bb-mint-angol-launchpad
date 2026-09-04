-- Content-review fixes for grammar_questions found by manual audit.
--
-- 1) "The man ___ I was talking to is my uncle." (whom vs who) had two
--    defensible keys: prescriptive "whom" and the now-standard informal
--    "who" as object of a fronted preposition. Reworded so the preposition
--    sits directly before the blank (same pattern already used by the
--    "to whom" item elsewhere in the bank) -- "to who" is ungrammatical,
--    so "whom" becomes the single unambiguous key.
--
-- 2) Four items were tagged under a grammar_tag that didn't match what
--    they actually test, because the tag taxonomy had no bucket for
--    pronoun case or quantifiers -- they'd been dumped into the nearest-
--    sounding tag (prepositions / question_formation / articles). Since
--    grammar_tag drives the adaptive selector's tag-diverse item pick
--    (see 20260715120000_grammar_tags.sql), a wrong tag lets near-
--    duplicate skills through while the selector thinks it's diversifying.

-- Expand the tag taxonomy to cover pronoun case and quantifiers.
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT con.conname INTO c_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'grammar_questions'
    AND con.contype = 'c'
    AND att.attname = 'grammar_tag';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.grammar_questions DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

ALTER TABLE public.grammar_questions
  ADD CONSTRAINT grammar_questions_grammar_tag_check CHECK (grammar_tag IN (
    'tense_aspect','conditionals','modals','articles','prepositions',
    'passive_voice','relative_clauses','comparatives','question_formation',
    'reported_speech','pronouns','quantifiers'
  ));

-- Fix 1: eliminate the who/whom double key.
UPDATE public.grammar_questions
SET
  question_text = 'The man to ___ I was talking is my uncle.',
  explanation = 'After a preposition (''to''), only the formal relative pronoun ''whom'' is grammatical -- ''who'' cannot directly follow a preposition.',
  explanation_hu = 'Elöljárószó (pl. ''to'') után csak a formális ''whom'' vonatkozó névmás grammatikus -- a ''who'' nem állhat közvetlenül elöljárószó után.'
WHERE id = '2057f032-89f8-478e-aaee-f01dc80ae992';

-- Fix 2: retag pronoun-case items (were: prepositions / question_formation).
UPDATE public.grammar_questions
SET grammar_tag = 'pronouns'
WHERE id IN (
  'e369c4d1-7ba0-4411-aa7d-2ef5224df4c7', -- "Listen to ___." (me)
  '84f64cbc-055a-4f8d-9b66-79e1557b4aa1', -- "Are these ___ pens?" (your)
  'ced7edff-f00b-47a2-a0e1-a1ba9b108ee0'  -- "What is ___ name?" (your)
);

-- Fix 2 cont'd: retag the quantifier item (was: articles).
UPDATE public.grammar_questions
SET grammar_tag = 'quantifiers'
WHERE id = 'da150483-8559-4241-aa35-7ce3f9e5af6e'; -- "Is there ___ milk in the fridge?" (any)
