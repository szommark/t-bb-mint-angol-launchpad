// One-shot seed script: asks Gemini for 100 grammar questions (20 each at
// A1/A2/B1/B2/C1) in a single call, then inserts them into grammar_questions.
// Run with: bun run scripts/generate-grammar-questions.ts
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

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
const PER_LEVEL = 20;

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

const QuestionSchema = z.object({
  level: z.enum(LEVELS),
  grammar_tag: z.enum(GRAMMAR_TAGS),
  question_text: z.string().min(1),
  options: z.array(z.string()).length(4),
  correct_answer: z.string().min(1),
  explanation: z.string().min(1),
  explanation_hu: z.string().min(1),
});
const ResponseSchema = z.array(QuestionSchema).length(LEVELS.length * PER_LEVEL);

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      level: { type: Type.STRING, enum: [...LEVELS] },
      grammar_tag: { type: Type.STRING, enum: [...GRAMMAR_TAGS] },
      question_text: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      correct_answer: { type: Type.STRING },
      explanation: { type: Type.STRING },
      explanation_hu: { type: Type.STRING },
    },
    required: [
      "level",
      "grammar_tag",
      "question_text",
      "options",
      "correct_answer",
      "explanation",
      "explanation_hu",
    ],
  },
};

const SYSTEM_INSTRUCTION = `You are an expert English grammar test item writer for CEFR-aligned placement tests.
Produce exactly ${LEVELS.length * PER_LEVEL} multiple-choice grammar questions in a single JSON array: exactly ${PER_LEVEL} questions for EACH of these CEFR levels: ${LEVELS.join(", ")}.
Rules for every item:
- Tests grammar only (verb tense, articles, prepositions, word order, conditionals, modal verbs, comparatives, etc.), not vocabulary or reading comprehension.
- "grammar_tag" must be exactly one of: ${GRAMMAR_TAGS.join(", ")}. Spread the ${PER_LEVEL} questions within each level as evenly as you can across these tags (no more than 3 items per tag per level) so the item bank has real variety within each CEFR level.
- Exactly 4 distinct, plausible options in "options". The 3 wrong options must be realistic interlanguage errors — mistakes a learner one CEFR level below would actually make (wrong verb form, wrong preposition, wrong article, etc.) — never random or absurd words unrelated to the grammar point being tested.
- "correct_answer" must be an exact string match (character-for-character) to one of the 4 "options".
- Difficulty must genuinely match the stated CEFR "level" (A1 = simplest, C1 = most advanced).
- Include a short 1-2 sentence learner-friendly "explanation" (max ~280 chars) of why the correct answer is right.
- Include "explanation_hu": a Hungarian translation of that same explanation (natural, fluent Hungarian for a Hungarian learner of English, not a literal word-for-word translation), since students are native Hungarian speakers.
- No duplicate or near-duplicate questions across the set.
- Return ONLY the JSON array, no surrounding prose.`;

async function main() {
  const google = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

  console.log(
    `Requesting ${LEVELS.length * PER_LEVEL} grammar questions from Gemini in one call...`,
  );
  const response = await google.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate the full set now: ${PER_LEVEL} questions per level for ${LEVELS.join(", ")}.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 32768,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const raw = JSON.parse(text);
  const parsed = ResponseSchema.parse(raw);

  // Sanity-check the counts are actually even across levels, and that
  // correct_answer really matches one of the 4 options for every item.
  const counts: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
  for (const q of parsed) {
    counts[q.level] += 1;
    const match = q.options.some((o) => o.trim() === q.correct_answer.trim());
    if (!match) {
      throw new Error(`correct_answer does not match any option: ${JSON.stringify(q)}`);
    }
  }
  for (const level of LEVELS) {
    if (counts[level] !== PER_LEVEL) {
      throw new Error(`Expected ${PER_LEVEL} questions for ${level}, got ${counts[level]}`);
    }
  }
  console.log("Validation passed:", counts);

  const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = parsed.map((q) => ({
    question_text: q.question_text,
    options: q.options,
    correct_answer: q.correct_answer,
    level: q.level,
    grammar_tag: q.grammar_tag,
    explanation: q.explanation,
    explanation_hu: q.explanation_hu,
  }));

  const { error, count } = await supabaseAdmin
    .from("grammar_questions")
    .insert(rows, { count: "exact" });
  if (error) {
    console.error("Insert failed:", error);
    process.exit(1);
  }
  console.log(`Inserted ${count ?? rows.length} grammar questions.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
