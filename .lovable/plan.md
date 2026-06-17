## Goal

After someone signs up on the landing page, redirect them to `/placement-test/$leadId`. They answer a few intake questions, then take an AI-generated multiple-choice English placement test. At the end, they see their CEFR level, and we save it to their lead record.

## User flow

1. User submits the signup form on `/` → backend creates a lead, returns its ID.
2. App navigates to `/placement-test/{leadId}`.
3. **Intake step** (one screen, multilingual EN/HU/DE): self-assessed level (A1–C2), focus area (prefilled from signup), years of study + last time used English, and which skills they want to improve (reading / writing / speaking / listening, multi-select).
4. **Generating step**: Lovable AI (Gemini 3 Flash) generates ~20 MCQs calibrated to their self-assessed level, focus, and target skills. Questions span grammar, vocabulary, and reading comprehension across A1–C2.
5. **Test step**: one question per screen with progress bar, Previous/Next, and Submit at the end. Answers persist in component state.
6. **Result step**: shows estimated CEFR level (A1–C2), short strengths/weaknesses summary, and a CTA to book the trainer consultation. Saved to the lead row.

## Database changes (one migration)

Extend the existing `leads` table with:

- `intake jsonb` — stored intake answers
- `test_questions jsonb` — the generated question set (so a refresh resumes the same test)
- `test_answers jsonb` — selected answers
- `cefr_level text` — final result (A1…C2)
- `score_summary text` — short AI-written summary
- `completed_at timestamptz`

Add a narrow `TO anon` SELECT/UPDATE policy scoped by `id` so the token-in-URL flow works without auth, plus matching GRANTs. Reads/writes only succeed when the client provides the exact lead UUID (acts as an unguessable token).

## Server endpoints

Two new public server routes under `src/routes/api/public/`:

- `POST /api/public/placement/start` — body `{ leadId, intake }`. Validates with Zod, saves intake, calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with `generateText` + `Output.object` to produce a JSON array of MCQs (id, prompt, options[4], correctIndex, skill, cefrTarget). Stores `test_questions`, returns sanitized questions (no `correctIndex`) to the client.
- `POST /api/public/placement/submit` — body `{ leadId, answers }`. Loads stored `test_questions`, scores answers, derives CEFR level from weighted score across CEFR-tagged questions, asks the AI for a 2-sentence strengths/weaknesses summary, saves `test_answers`, `cefr_level`, `score_summary`, `completed_at`, and triggers a best-effort confirmation email update. Returns the result.

Existing `/api/public/leads` POST stays as-is; the frontend just navigates to the new page on success.

## Frontend changes

- `src/routes/index.tsx`: on successful signup, `navigate({ to: '/placement-test/$leadId', params: { leadId: id } })` instead of showing the inline success message.
- New route `src/routes/placement-test.$leadId.tsx`: single-page wizard with `step` state (`intake` → `loading` → `test` → `result`), reusing the existing translations object and shadcn components (Card, Button, RadioGroup, Progress, Select, Checkbox). Same trilingual switcher as the landing page.
- Light loading/error states. Refresh-safe: on mount, fetch lead row; if `completed_at` is set show result, if `test_questions` exist resume at test step, otherwise start at intake.

## Technical details

- AI call uses the existing `connecting-to-ai-models-tanstack` pattern: provider helper in `src/lib/ai-gateway.server.ts`, model `google/gemini-3-flash-preview`, structured output via `Output.object` with a Zod schema. Schema kept small (≤20 items, short field names) to stay within Gemini's constrained-decoding limits.
- All AI prompts, the answer key, and scoring live server-side; the client never sees `correctIndex`.
- Server routes use `supabaseAdmin` (loaded inside the handler) for writes, after validating that the `leadId` exists and isn't already completed.
- Scoring: each question tagged with a CEFR target; final level = highest CEFR band where the user got ≥70% of that band's questions right (with sensible fallbacks for sparse bands).
- No auth required; the lead UUID in the URL is the access token. Rate-limit-friendly: questions are generated once per lead and cached in the row.
- Login/account creation

## Out of scope

- No timer or anti-cheat measures (this is a placement test, not a certification).
- Email summary to user/admin (you chose "save to lead record" only — easy to add later).