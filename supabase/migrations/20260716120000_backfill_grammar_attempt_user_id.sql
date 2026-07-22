-- Some grammar_test_attempts rows were inserted before the anonymous
-- session's claimed_by_user_id was set, or via the /submit early-finalize
-- path which didn't stamp user_id at all. Backfill so those attempts show
-- up on the claiming user's dashboard.
UPDATE public.grammar_test_attempts AS gta
SET user_id = s.claimed_by_user_id
FROM public.anonymous_sessions AS s
WHERE gta.anonymous_session_id = s.id
  AND gta.user_id IS NULL
  AND s.claimed_by_user_id IS NOT NULL;
