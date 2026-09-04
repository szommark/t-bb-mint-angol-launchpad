-- Extends grammar_questions to track the generative/non-generative axis
-- from the Roadmap coursebook-series analysis, adds the coursebook's own
-- level bands (A2+, B1+, B2+, and renames C1 -> C1-C2 to match), expands
-- the grammar_tag taxonomy for constructions the old 12 tags didn't cover,
-- and adds new questions so each level's generative/non-generative mix
-- moves toward the proportions found in the Roadmap contents analysis.
--
-- Per-level non-generative share cannot be forced to match Roadmap exactly
-- without either deleting live quiz history or adding disproportionate
-- volume at B1/B2/C1-C2 (whose existing content already skews toward
-- advanced exceptions). This migration measurably shifts every level
-- toward its target and gives new levels a real starting ratio; see the
-- chat response for the resulting before/after numbers.

-- ============================================================
-- 1. New columns: track generative vs non-generative per item
-- ============================================================
ALTER TABLE public.grammar_questions
  ADD COLUMN IF NOT EXISTS is_generative boolean NOT NULL DEFAULT true;
ALTER TABLE public.grammar_questions
  ADD COLUMN IF NOT EXISTS generative_category text;
-- generative_category is only meaningful when is_generative = false:
-- subjunctive | defective_paradigm | fixed_idiom | idiosyncratic_complementation
-- | idiosyncratic_collocation | inversion | irregular_morphology | marked_agreement
-- | marked_usage
ALTER TABLE public.grammar_questions
  ADD CONSTRAINT grammar_questions_generative_category_check
  CHECK (
    (is_generative = true AND generative_category IS NULL)
    OR (is_generative = false AND generative_category IN (
      'subjunctive','defective_paradigm','fixed_idiom','idiosyncratic_complementation',
      'idiosyncratic_collocation','inversion','irregular_morphology','marked_agreement',
      'marked_usage'
    ))
  );

-- ============================================================
-- 2. Level taxonomy: adopt the Roadmap series' 8 bands
-- ============================================================
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
    AND att.attname = 'level';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.grammar_questions DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

UPDATE public.grammar_questions SET level = 'C1-C2' WHERE level = 'C1';

ALTER TABLE public.grammar_questions
  ADD CONSTRAINT grammar_questions_level_check
  CHECK (level IN ('A1','A2','A2+','B1','B1+','B2','B2+','C1-C2'));

-- ============================================================
-- 3. Tag taxonomy: add the constructions Roadmap covers that the
--    original 12 tags (built for a generic B1-B2 item bank) didn't.
-- ============================================================
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
    'reported_speech','pronouns','quantifiers',
    'imperatives','fixed_expressions','participle_clauses','cleft_sentences',
    'noun_phrases','verb_patterns'
  ));

-- ============================================================
-- 4. Backfill is_generative for the 37 existing non-generative items
--    (everything else defaults to generative = true).
-- ============================================================
UPDATE public.grammar_questions SET is_generative = false, generative_category = 'irregular_morphology'
WHERE id IN ('92d5bcec-77f0-42ce-84fb-23fc29d65d69');

UPDATE public.grammar_questions SET is_generative = false, generative_category = 'defective_paradigm'
WHERE id IN ('746747c6-5ec9-40ee-9c38-1d1c8c9804d4','6287a310-5043-42e7-8369-d723acf623dc');

UPDATE public.grammar_questions SET is_generative = false, generative_category = 'idiosyncratic_complementation'
WHERE id IN (
  '6d7bdc7e-9bdd-4396-9f74-32bba0a7d337','4908635a-9178-4572-abec-570f71eb58a3',
  'ac9beace-a86e-4ddc-b431-5c73bcc4bafb','d0b7ad77-f984-4a24-912e-d08f3868f3c5'
);

UPDATE public.grammar_questions SET is_generative = false, generative_category = 'subjunctive'
WHERE id IN (
  '5f6ccf69-c8fd-44d8-8e40-79e77f5890c3','22bc0f15-9d81-4dd3-a4e9-bf8bf826b0f3',
  'c329a718-257c-411c-8964-bc5dcfb12ca6','555d8e74-1794-496b-893c-d550872a09aa'
);

UPDATE public.grammar_questions SET is_generative = false, generative_category = 'fixed_idiom'
WHERE id IN (
  '7f931d9a-c93e-4ade-9bd7-8335ba460422','59238fa1-fe7f-4736-872a-bf9a27707003',
  '89555ef8-6b01-4bbb-8a03-7e6825eca120','2501b2a0-29b1-49fe-9a57-9f71d056df7f',
  '725ca2c1-f777-460f-a489-cbacb982d84f','9ef965d2-feb0-463f-aa7c-b3571c82af44',
  '4bd17612-d39e-4f7f-82dc-ad31f7cae9b3','b94cfd65-3eab-4e55-8d8f-80d3f5fbfb24',
  'd5e6dac9-ed06-4808-8732-c8e36e96a6d0','6d6adb6b-a319-4090-9af8-c7b0cf0c5043'
);

UPDATE public.grammar_questions SET is_generative = false, generative_category = 'idiosyncratic_collocation'
WHERE id IN ('8ecccb7f-eead-4e9a-92b4-dd162e928501');

UPDATE public.grammar_questions SET is_generative = false, generative_category = 'marked_agreement'
WHERE id IN ('fc215de5-29d4-414b-a21d-df21aaa933ad');

UPDATE public.grammar_questions SET is_generative = false, generative_category = 'inversion'
WHERE id IN (
  '3d67af95-852f-438b-8cc0-b8bc633b36ff','98316617-c46a-4b6c-810c-e9339593de5b',
  'bfdd026f-fda1-40f7-bb7e-5b1ed8f02816','a954ee1c-bff0-404e-a747-84a1fe19f298',
  '556021a4-8331-4ea6-b246-f00c9708bff5','21324345-edbf-4b6a-95a4-f625e7829289',
  '67c642d0-dda5-4fd3-a47c-8add8062ddea','755837d7-bcc1-4147-b0cc-2ea6afd60803',
  '26bc370e-b7c6-40b7-872f-bddefd5ae8c8','761c79f8-e624-49f2-93be-857b4e6faf8c',
  'ed5a4867-07ef-454f-bad0-ed37f9c23c4a','496a1959-b804-4c2e-a0e5-8c41a90d96ae',
  'f95bf0db-a653-4465-b508-b28ebc026139'
);

-- ============================================================
-- 5. New questions: populate A2+, B1+, B2+ (previously empty) and
--    dilute A1/A2/B1/B2/C1-C2 toward their Roadmap ratios.
-- ============================================================

-- A1 (+1 generative, +1 non-generative)
INSERT INTO public.grammar_questions (question_text, options, correct_answer, level, explanation, explanation_hu, grammar_tag, is_generative, generative_category) VALUES
('She ___ a doctor.', '["am", "is", "are", "be"]', 'is', 'A1', 'The verb ''to be'' takes ''is'' with the third-person singular subject ''she''.', 'A ''to be'' ige ''is'' alakját használjuk egyes szám harmadik személyű ''she'' alannyal.', 'tense_aspect', true, NULL),
('There are three ___ in the classroom.', '["man", "mans", "men", "mens"]', 'men', 'A1', '''Men'' is the irregular plural of ''man''.', 'A ''men'' a ''man'' szabálytalan többes száma.', 'tense_aspect', false, 'irregular_morphology');

-- A2 (+2 generative)
INSERT INTO public.grammar_questions (question_text, options, correct_answer, level, explanation, explanation_hu, grammar_tag, is_generative, generative_category) VALUES
('This road is ___ than the old one.', '["wide", "wider", "widest", "more wide"]', 'wider', 'A2', 'We add ''-er'' to short adjectives like ''wide'' to compare two things.', 'Rövid melléknevekhez, mint a ''wide'', ''-er''-t adunk két dolog összehasonlításához.', 'comparatives', true, NULL),
('We ___ to the beach every summer.', '["go", "goes", "going", "went"]', 'go', 'A2', '''We'' takes the base form of the verb in the present simple.', 'A ''we'' alannyal az egyszerű jelen időben az ige alapalakját használjuk.', 'tense_aspect', true, NULL);

-- A2+ (new level: 16 generative, 2 non-generative)
INSERT INTO public.grammar_questions (question_text, options, correct_answer, level, explanation, explanation_hu, grammar_tag, is_generative, generative_category) VALUES
('___ does the film start?', '["What time", "What times", "When time", "What''s time"]', 'What time', 'A2+', '''What time'' is the standard wh-phrase for asking about a clock time.', 'A ''What time'' a szokásos kérdő kifejezés pontos időpontra való rákérdezéshez.', 'question_formation', true, NULL),
('He ___ works late on Fridays.', '["usual", "usually", "use to", "used"]', 'usually', 'A2+', 'Adverbs of frequency like ''usually'' describe how often something happens.', 'A gyakoriságot kifejező határozószók, mint az ''usually'', azt fejezik ki, milyen gyakran történik valami.', 'tense_aspect', true, NULL),
('Right now, she ___ dinner.', '["cooks", "is cooking", "cook", "cooked"]', 'is cooking', 'A2+', 'The present continuous describes an action happening at the moment of speaking.', 'A folyamatos jelen idő a beszéd pillanatában zajló cselekvést írja le.', 'tense_aspect', true, NULL),
('They ___ to Rome last spring.', '["travel", "travels", "travelled", "are travelling"]', 'travelled', 'A2+', 'The regular past simple adds ''-ed'' to the base verb.', 'A szabályos egyszerű múlt idő az ige alapalakjához ''-ed'' végződést ad.', 'tense_aspect', true, NULL),
('___ you finish the report yesterday?', '["Do", "Did", "Does", "Were"]', 'Did', 'A2+', '''Did'' is the past simple auxiliary used to form questions.', 'A ''did'' az egyszerű múlt idő segédigéje, amelyet kérdések alkotására használunk.', 'tense_aspect', true, NULL),
('There isn''t ___ sugar left in the jar.', '["many", "much", "a few", "some"]', 'much', 'A2+', '''Much'' is used with uncountable nouns in negative sentences.', 'A ''much'' szót megszámlálhatatlan főnevekkel használjuk tagadó mondatokban.', 'quantifiers', true, NULL),
('This bag is ___ than that one.', '["heavy", "heavier", "heaviest", "more heavy"]', 'heavier', 'A2+', 'We add ''-er'' to short adjectives ending in ''y'' (changing y to i) to form the comparative.', 'Az ''y''-ra végződő rövid melléknevekhez (y-i váltással) ''-er''-t adunk a középfok képzéséhez.', 'comparatives', true, NULL),
('That was the ___ film I''ve ever seen.', '["bad", "worse", "worst", "more bad"]', 'worst', 'A2+', '''Worst'' is the irregular superlative form of ''bad''.', 'A ''worst'' a ''bad'' szabálytalan felsőfokú alakja.', 'comparatives', false, 'irregular_morphology'),
('I''ve ___ been to Japan.', '["ever", "never", "already", "yet"]', 'never', 'A2+', '''Never'' is used in affirmative present perfect sentences to mean ''at no time''.', 'A ''never'' szót állító befejezett jelen idejű mondatokban használjuk ''soha'' jelentéssel.', 'tense_aspect', true, NULL),
('I ___ go to the gym after work tomorrow.', '["am going to", "go", "going to", "went"]', 'am going to', 'A2+', '''Be going to'' expresses a plan or intention for the future.', 'A ''be going to'' szerkezet jövőbeli tervet vagy szándékot fejez ki.', 'tense_aspect', true, NULL),
('___ you help me carry this box?', '["Would", "Do", "Are", "Did"]', 'Would', 'A2+', '''Would you...?'' is a polite way of making a request.', 'A ''Would you...?'' udvarias kéréstétel.', 'modals', true, NULL),
('The dog ___ chase the cat.', '["can''t", "doesn''t can", "not can", "can not to"]', 'can''t', 'A2+', '''Can''t'' is the regular negative form of the modal ''can''.', 'A ''can''t'' a ''can'' modális ige szabályos tagadó alakja.', 'modals', true, NULL),
('That''s the shop ___ sells the best coffee.', '["who", "which", "whose", "whom"]', 'which', 'A2+', '''Which'' refers to things, such as a shop.', 'A ''which'' dolgokra utal, mint például egy bolt.', 'relative_clauses', true, NULL),
('She looks ___ her mother.', '["like", "as", "alike", "same as"]', 'like', 'A2+', '''Look like'' is a fixed expression used to compare appearance and does not follow a general rule.', 'A ''look like'' egy állandósult kifejezés, amelyet a külső hasonlítására használunk, és nem vezethető le egy általános szabályból.', 'fixed_expressions', false, 'idiosyncratic_collocation'),
('___ your homework before dinner.', '["Do", "You do", "Doing", "Did"]', 'Do', 'A2+', 'The imperative uses the base form of the verb with no subject.', 'A felszólító mód az ige alapalakját használja alany nélkül.', 'imperatives', true, NULL),
('You ___ eat so much sugar; it''s bad for you.', '["shouldn''t", "doesn''t have to", "mustn''t to", "not should"]', 'shouldn''t', 'A2+', '''Shouldn''t'' is the regular negative form of ''should'', used for advice.', 'A ''shouldn''t'' a ''should'' szabályos tagadó alakja, tanácsadásra használjuk.', 'modals', true, NULL),
('I''ve lived here ___ 2020.', '["for", "since", "during", "from"]', 'since', 'A2+', '''Since'' is used with a specific point in time.', 'A ''since'' egy konkrét időponttal használatos.', 'prepositions', true, NULL),
('___ you finished your homework yet?', '["Have", "Has", "Did", "Do"]', 'Have', 'A2+', '''Have'' is the present perfect auxiliary for ''you''.', 'A ''have'' a befejezett jelen idő segédigéje ''you'' esetén.', 'tense_aspect', true, NULL);

-- B1 (+6 generative)
INSERT INTO public.grammar_questions (question_text, options, correct_answer, level, explanation, explanation_hu, grammar_tag, is_generative, generative_category) VALUES
('If you heat ice, it ___.', '["melt", "melts", "melting", "will melt"]', 'melts', 'B1', 'The zero conditional uses the present simple in both clauses for general truths.', 'A nulladik feltételes mód mindkét tagmondatban egyszerű jelen időt használ általános igazságokra.', 'conditionals', true, NULL),
('By 2010, the company ___ over a million products.', '["sold", "has sold", "had sold", "sells"]', 'had sold', 'B1', 'The past perfect describes an action completed before a specific past point.', 'A befejezett múlt idő egy adott múltbeli időpont előtt befejeződő cselekvést ír le.', 'tense_aspect', true, NULL),
('The letter ___ by the manager tomorrow.', '["will sign", "will be signed", "is signed", "signs"]', 'will be signed', 'B1', 'The future simple passive is ''will be'' + past participle.', 'Az egyszerű jövő idejű szenvedő szerkezet: ''will be'' + befejezett melléknévi igenév.', 'passive_voice', true, NULL),
('She''s the engineer ___ designed this bridge.', '["who", "whose", "which", "whom"]', 'who', 'B1', '''Who'' is the subject relative pronoun for people.', 'A ''who'' a személyekre vonatkozó alanyeseti vonatkozó névmás.', 'relative_clauses', true, NULL),
('He asked me if I ___ ready to leave.', '["am", "was", "be", "were"]', 'was', 'B1', 'Reported yes/no questions shift present ''am'' back to past ''was''.', 'A függő eldöntendő kérdések a jelen idejű ''am''-ot múlt idejű ''was''-ra viszik vissza.', 'reported_speech', true, NULL),
('___ she speak French?', '["Does", "Is", "Do", "Has"]', 'Does', 'B1', '''Does'' is the do-support auxiliary for third-person singular present simple questions.', 'A ''does'' a harmadik személyű egyes számú egyszerű jelen idejű kérdések segédigéje.', 'question_formation', true, NULL);

-- B1+ (new level: 12 generative, 2 non-generative)
INSERT INTO public.grammar_questions (question_text, options, correct_answer, level, explanation, explanation_hu, grammar_tag, is_generative, generative_category) VALUES
('By next year, she ___ her degree.', '["will finish", "will have finished", "finishes", "finished"]', 'will have finished', 'B1+', 'The future perfect describes an action that will be completed before a future point in time.', 'A befejezett jövő idő egy jövőbeli időpont előtt befejeződő cselekvést ír le.', 'tense_aspect', true, NULL),
('This laptop is ___ more expensive than that one.', '["very", "much", "so", "too"]', 'much', 'B1+', '''Much'' is used to intensify a comparative adjective.', 'A ''much'' szót középfokú melléknevek nyomatékosítására használjuk.', 'comparatives', true, NULL),
('The bridge, ___ was built in 1990, is closed for repairs.', '["that", "which", "who", "whose"]', 'which', 'B1+', '''Which'' introduces a non-defining relative clause about a thing.', 'A ''which'' egy nem-meghatározó vonatkozó mellékmondatot vezet be egy dologról.', 'relative_clauses', true, NULL),
('You ___ show your passport at the border.', '["must", "can", "would", "should to"]', 'must', 'B1+', '''Must'' expresses obligation.', 'A ''must'' kötelezettséget fejez ki.', 'modals', true, NULL),
('Visitors ___ take photos inside the museum.', '["are allowed to", "allow to", "allowed", "are allow"]', 'are allowed to', 'B1+', '''Be allowed to'' expresses permission and conjugates fully regularly in every tense.', 'A ''be allowed to'' engedélyt fejez ki, és minden igeidőben szabályosan ragozódik.', 'modals', true, NULL),
('By the time we arrived, the meeting ___ already started.', '["has", "have", "had", "was"]', 'had', 'B1+', 'The past perfect describes an action completed before another past action.', 'A befejezett múlt idő egy másik múltbeli cselekvés előtt befejeződő cselekvést ír le.', 'tense_aspect', true, NULL),
('She told me she ___ tired that day.', '["is", "was", "be", "been"]', 'was', 'B1+', 'Reported speech shifts present ''is'' back to past ''was''.', 'A függő beszéd a jelen idejű ''is''-t múlt idejű ''was''-ra viszi vissza.', 'reported_speech', true, NULL),
('I had my car ___ last week.', '["repair", "repaired", "repairing", "to repair"]', 'repaired', 'B1+', '''Have something done'' is a productive causative pattern.', 'A ''have something done'' egy produktív műveltető szerkezet.', 'passive_voice', true, NULL),
('He ___ have missed the bus - he''s never late.', '["can''t", "mustn''t", "shouldn''t", "needn''t"]', 'can''t', 'B1+', '''Can''t have'' expresses a strong negative deduction about the past.', 'A ''can''t have'' erős negatív következtetést fejez ki a múltra vonatkozóan.', 'modals', true, NULL),
('You ___ have told me you were coming early!', '["must", "should", "can", "might"]', 'should', 'B1+', '''Should have'' + past participle expresses a past obligation that was not fulfilled.', 'A ''should have'' + befejezett melléknévi igenév egy nem teljesített múltbeli kötelezettséget fejez ki.', 'modals', true, NULL),
('If I had known about the traffic, I ___ left earlier.', '["would", "would have", "will have", "had"]', 'would have', 'B1+', 'The third conditional uses ''would have'' + past participle in the result clause.', 'A harmadik feltételes mód az eredménymondatban ''would have'' + befejezett melléknévi igenevet használ.', 'conditionals', true, NULL),
('You ___ apologise to her - she''s really upset.', '["better", "had better", "should better", "must better"]', 'had better', 'B1+', '''Had better'' is a fixed idiomatic modal phrase used for strong advice; it does not follow the pattern of ordinary modals.', 'A ''had better'' egy állandósult, idiomatikus modális kifejezés erős tanácsadásra; nem követi a hagyományos módbeli segédigék mintáját.', 'fixed_expressions', false, 'fixed_idiom'),
('She admitted ___ the money.', '["take", "to take", "taking", "taken"]', 'taking', 'B1+', '''Admit'' is followed by a gerund, not an infinitive - this has to be learned verb by verb, not from a general rule.', 'Az ''admit'' igét gerund (-ing alak) követi, nem főnévi igenév - ezt igénként külön meg kell tanulni, nem egy általános szabályból vezethető le.', 'verb_patterns', false, 'idiosyncratic_complementation'),
('She bought a ___ table.', '["wooden round", "round wooden", "wood round", "rounded wood"]', 'round wooden', 'B1+', 'Adjective order in English is systematic: shape/size adjectives like ''round'' come before material adjectives like ''wooden''.', 'Az angol melléknévi sorrend szabályos: az alakot/méretet kifejező melléknevek, mint a ''round'', megelőzik az anyagot kifejező mellékneveket, mint a ''wooden''.', 'noun_phrases', true, NULL);

-- B2 (+6 generative)
INSERT INTO public.grammar_questions (question_text, options, correct_answer, level, explanation, explanation_hu, grammar_tag, is_generative, generative_category) VALUES
('The bridge ___ by engineers next month.', '["will inspect", "will be inspected", "is inspecting", "inspects"]', 'will be inspected', 'B2', 'The future simple passive is ''will be'' + past participle.', 'Az egyszerű jövő idejű szenvedő szerkezet: ''will be'' + befejezett melléknévi igenév.', 'passive_voice', true, NULL),
('If she ___ harder, she would pass the exam.', '["study", "studies", "studied", "had studied"]', 'studied', 'B2', 'The second conditional uses the past simple in the ''if'' clause for a hypothetical present.', 'A második feltételes mód az ''if'' tagmondatban egyszerű múlt időt használ egy feltételezett jelenre.', 'conditionals', true, NULL),
('The article, ___ was published last week, caused controversy.', '["that", "which", "who", "whom"]', 'which', 'B2', '''Which'' introduces a non-defining relative clause about a thing.', 'A ''which'' egy nem-meghatározó vonatkozó mellékmondatot vezet be egy dologról.', 'relative_clauses', true, NULL),
('By the end of the course, students ___ over 500 words.', '["learn", "will learn", "will have learned", "learned"]', 'will have learned', 'B2', 'The future perfect describes completion by a future point in time.', 'A befejezett jövő idő egy jövőbeli időpontig történő befejezést fejez ki.', 'tense_aspect', true, NULL),
('The report must ___ finished by Friday.', '["be", "to be", "being", "been"]', 'be', 'B2', '''Must'' + base verb ''be'' + past participle forms the passive with a modal.', 'A ''must'' + ''be'' alapige + befejezett melléknévi igenév alkotja a szenvedő szerkezetet modális igével.', 'passive_voice', true, NULL),
('The committee will announce the results ___ Friday.', '["in", "on", "at", "for"]', 'on', 'B2', '''On'' is used with specific days.', 'A napokkal az ''on'' elöljárószót használjuk.', 'prepositions', true, NULL);

-- B2+ (new level: 9 generative, 3 non-generative)
INSERT INTO public.grammar_questions (question_text, options, correct_answer, level, explanation, explanation_hu, grammar_tag, is_generative, generative_category) VALUES
('It was Sarah ___ organised the whole event.', '["who", "which", "that", "whom"]', 'who', 'B2+', 'Cleft sentences with ''It was X who/that...'' are a productive way to emphasise information about a person.', 'Az ''It was X who/that...'' kiemelő szerkezet produktív módja egy személyre vonatkozó információ hangsúlyozásának.', 'cleft_sentences', true, NULL),
('The ___ she practised, the better she got.', '["more", "most", "much", "many"]', 'more', 'B2+', 'Double comparatives (''the more..., the more...'') form a productive correlative structure.', 'A kettős középfok (''the more..., the more...'') egy produktív korrelatív szerkezet.', 'comparatives', true, NULL),
('___ you like to join us for dinner?', '["Wouldn''t", "Don''t", "Aren''t", "Won''t"]', 'Wouldn''t', 'B2+', 'Negative questions like ''Wouldn''t you...?'' are formed regularly by adding ''n''t'' to the auxiliary.', 'A ''Wouldn''t you...?'' típusú tagadó kérdéseket szabályosan a segédigéhez tett ''n''t'' képezi.', 'question_formation', true, NULL),
('By this time next year, I ___ in Berlin for five years.', '["will live", "will have been living", "live", "lived"]', 'will have been living', 'B2+', 'The future perfect continuous describes an ongoing action up to a point in the future.', 'A befejezett folyamatos jövő idő egy jövőbeli időpontig tartó folyamatos cselekvést ír le.', 'tense_aspect', true, NULL),
('He was last seen ___ towards the station.', '["walk", "to walk", "walking", "walked"]', 'walking', 'B2+', '''Was seen'' + gerund describes an observed action in progress.', 'A ''was seen'' + gerund egy megfigyelt, folyamatban lévő cselekvést ír le.', 'passive_voice', true, NULL),
('He complained ___ the noise from the party next door.', '["about", "for", "on", "at"]', 'about', 'B2+', '''Complain about'' is a fixed verb + preposition combination that has to be learned individually, not derived from a rule.', 'A ''complain about'' egy állandósult ige + elöljárószó kapcsolat, amelyet egyedileg kell megtanulni, nem egy szabályból vezethető le.', 'fixed_expressions', false, 'idiosyncratic_collocation'),
('I can''t believe you did that - you ___ have asked me first!', '["must", "should", "can", "will"]', 'should', 'B2+', '''Should have'' expresses criticism of a past action.', 'A ''should have'' egy múltbeli cselekvés kritikáját fejezi ki.', 'modals', true, NULL),
('___ did she realise how serious the problem was.', '["Only later", "Later only", "Only then she", "Then only"]', 'Only later', 'B2+', 'Restrictive fronted adverbials like ''only later'' trigger subject-auxiliary inversion, a marked deviation from normal word order.', 'A korlátozó jelentésű, mondat elejére került határozók, mint az ''only later'', alany-segédige inverziót váltanak ki, ami eltérés a szokásos szórendtől.', 'fixed_expressions', false, 'inversion'),
('___ finished the report, she sent it to her manager.', '["Having", "She had", "Finished", "Have"]', 'Having', 'B2+', 'A perfect participle clause (''Having'' + past participle) is a productive way to show one action completed before another.', 'A befejezett melléknévi igeneves szerkezet (''Having'' + befejezett melléknévi igenév) produktív módja annak, hogy jelezzük, egy cselekvés egy másik előtt fejeződött be.', 'participle_clauses', true, NULL),
('He ___ always leave his shoes in the middle of the hallway - it drives me crazy.', '["will", "would", "can", "must"]', 'will', 'B2+', '''Will'' used for an annoying habitual behaviour is a marked meaning beyond its normal future use.', 'A bosszantó, szokásszerű viselkedésre használt ''will'' a szokásos jövő idejű jelentésén túli, jelölt jelentés.', 'fixed_expressions', false, 'marked_usage'),
('I wish you ___ interrupting me all the time!', '["stop", "stopped", "would stop", "will stop"]', 'would stop', 'B2+', '''Wish'' + ''would'' is a productive pattern for expressing annoyance about someone else''s ongoing behaviour.', 'A ''wish'' + ''would'' egy produktív szerkezet, amellyel bosszúságot fejezünk ki valaki más folyamatos viselkedésével kapcsolatban.', 'conditionals', true, NULL),
('___ you don''t book early, the tickets will sell out.', '["If", "Unless", "Providing", "As long as"]', 'If', 'B2+', 'The first conditional (''if + present simple, will + base verb'') predicts a likely future result.', 'Az első feltételes mód (''if'' + egyszerű jelen idő, ''will'' + alapige) egy valószínű jövőbeli következményt jósol meg.', 'conditionals', true, NULL);

-- C1-C2 (+6 generative)
INSERT INTO public.grammar_questions (question_text, options, correct_answer, level, explanation, explanation_hu, grammar_tag, is_generative, generative_category) VALUES
('The proposal is believed ___ by the board next week.', '["to approve", "to be approved", "to have approved", "approving"]', 'to be approved', 'C1-C2', 'The passive infinitive after reporting verbs like ''believed'' is a productive formal pattern.', 'A jelentő igék (pl. ''believed'') utáni szenvedő főnévi igenév egy produktív, formális szerkezet.', 'passive_voice', true, NULL),
('The number of applicants ___ increased significantly this year.', '["have", "has", "having", "had"]', 'has', 'C1-C2', '''The number of'' takes a singular verb - a regular subject-verb agreement rule.', 'A ''the number of'' egyes számú igét vonz - ez egy szabályos alany-állítmány egyeztetési szabály.', 'tense_aspect', true, NULL),
('She''s the kind of leader who always ___ time for her team.', '["make", "makes", "making", "made"]', 'makes', 'C1-C2', 'The relative pronoun ''who'' with a habitual meaning takes the regular third-person ''-s'' form.', 'A ''who'' vonatkozó névmás szokásos jelentésben a szabályos egyes szám harmadik személyű ''-s'' alakot vonzza.', 'relative_clauses', true, NULL),
('The findings, ___ were published last month, sparked debate.', '["that", "which", "who", "whom"]', 'which', 'C1-C2', '''Which'' introduces non-defining relative clauses about things.', 'A ''which'' nem-meghatározó vonatkozó mellékmondatot vezet be dolgokról.', 'relative_clauses', true, NULL),
('By the time the results are announced, the committee ___ every application.', '["will review", "will have reviewed", "reviews", "reviewed"]', 'will have reviewed', 'C1-C2', 'The future perfect describes completion before a future point.', 'A befejezett jövő idő egy jövőbeli időpont előtti befejezést fejez ki.', 'tense_aspect', true, NULL),
('The negotiations, ___ lasted three days, ended in an agreement.', '["that", "which", "who", "whom"]', 'which', 'C1-C2', 'A non-defining relative clause uses ''which'' for an event or process.', 'Nem-meghatározó vonatkozó mellékmondat ''which''-csel egy eseményre vagy folyamatra.', 'relative_clauses', true, NULL);
