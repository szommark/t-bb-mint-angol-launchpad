// One-off backfill: classifies existing grammar_questions rows that have no
// grammar_tag yet (the original 100-question seed predates the column) into
// one of the fixed grammar-point tags, via a single structured-output call.
// Idempotent — only fetches rows where grammar_tag IS NULL, so it's safe to
// re-run if some rows come back unmatched.
// Run with: bun run scripts/tag-grammar-questions.ts
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing GEMINI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

// Keep in sync with GRAMMAR_TAGS in src/lib/grammar-blueprint.server.ts and
// the CHECK constraint in supabase/migrations/20260715120000_grammar_tags.sql.
const GRAMMAR_TAGS = [
  "tense_aspect",
  "conditionals",
  "modals",
  "articles",
  "prepositions",
  "passive_voice",
  "relative_clauses",
  "comparatives",
  "question_formation",
  "reported_speech",
] as const;

// `id` isn't validated as a strict UUID here on purpose — the model
// occasionally mangles a character when echoing one back, and the
// membership check against `requestedIds` below is what actually gates
// which rows get updated, so a malformed id is simply dropped rather than
// failing the whole batch.
const ClassificationSchema = z.object({
  id: z.string(),
  grammar_tag: z.enum(GRAMMAR_TAGS),
});

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      grammar_tag: { type: Type.STRING, enum: [...GRAMMAR_TAGS] },
    },
    required: ["id", "grammar_tag"],
  },
};

const SYSTEM_INSTRUCTION = `You are an expert English grammar test item classifier.
You will be given a JSON array of CEFR-aligned multiple-choice grammar questions, each with an "id".
For every item, classify which single grammar point it primarily tests, choosing exactly one tag from: ${GRAMMAR_TAGS.join(", ")}.
Return a JSON array with exactly one { "id", "grammar_tag" } object per input item, preserving the same "id" values.
Return ONLY the JSON array, no surrounding prose.`;

async function main() {
  const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabaseAdmin
    .from("grammar_questions")
    .select("id, level, question_text, options, correct_answer")
    .is("grammar_tag", null);
  if (error) {
    console.error("Fetch failed:", error);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log("No untagged questions found. Nothing to do.");
    return;
  }
  console.log(`Classifying ${rows.length} untagged questions...`);

  const google = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });
  const response = await google.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: JSON.stringify(
      rows.map((r) => ({
        id: r.id,
        level: r.level,
        question_text: r.question_text,
        options: r.options,
        correct_answer: r.correct_answer,
      })),
    ),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 16384,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error("Expected a JSON array from Gemini");

  const requestedIds = new Set(rows.map((r) => r.id));
  const tagById = new Map<string, string>();
  for (const item of raw) {
    const result = ClassificationSchema.safeParse(item);
    if (!result.success) {
      console.warn("Skipping malformed classification entry:", item, result.error.issues);
      continue;
    }
    if (!requestedIds.has(result.data.id)) {
      console.warn(`Ignoring unrecognized id in response: ${result.data.id}`);
      continue;
    }
    tagById.set(result.data.id, result.data.grammar_tag);
  }
  const missing = rows.filter((r) => !tagById.has(r.id));
  if (missing.length > 0) {
    console.warn(
      `${missing.length} question(s) didn't come back tagged; re-run this script to retry them.`,
    );
  }

  let updated = 0;
  for (const [id, grammar_tag] of tagById) {
    const { error: updErr } = await supabaseAdmin
      .from("grammar_questions")
      .update({ grammar_tag })
      .eq("id", id);
    if (updErr) {
      console.error(`Update failed for ${id}:`, updErr);
      continue;
    }
    updated += 1;
  }
  console.log(`Tagged ${updated}/${rows.length} questions.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
