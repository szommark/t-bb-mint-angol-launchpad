// Only "Grammar" is selectable for now. The rest of the previous preset
// list is parked here so it's easy to bring back once those focus areas
// are ready; FOCUS_COMING_SOON is rendered as a disabled placeholder item.
export const FOCUS_OPTIONS = ["Grammar"] as const;

export const FOCUS_COMING_SOON = "More focus areas (coming soon)";

export const FOCUS_OTHER = "Other (specify)";

export function isPresetFocus(value: string | null | undefined): boolean {
  if (!value) return false;
  return (FOCUS_OPTIONS as readonly string[]).includes(value);
}

export type IntakeSkill = "reading" | "writing" | "speaking" | "listening";
export type IntakeLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const ALL_SKILLS: IntakeSkill[] = ["reading", "writing", "speaking", "listening"];

// Which skills a given focus area practices. There is no separate skill
// picker anymore — the chosen focus area decides what gets practiced.
// Unrecognized/custom focus text falls back to practicing all four skills.
const FOCUS_SKILLS: Record<string, IntakeSkill[]> = {
  "Business English": ["reading", "writing", "speaking"],
  "English for AI & Prompting": ["reading", "writing"],
  "English for Job Interviews & CVs": ["writing", "speaking"],
  "Conversational / Everyday English": ["speaking", "listening"],
  "English for Presentations & Public Speaking": ["speaking", "listening"],
  "English for Social Media & Content Creation": ["writing", "reading"],
  "Travel English": ["speaking", "listening"],
  "Academic English / IELTS Preparation": ALL_SKILLS,
  "Nyelvvizsga gyakorlás (B1)": ALL_SKILLS,
  "Nyelvvizsga gyakorlás (B2)": ALL_SKILLS,
  "Nyelvvizsga gyakorlás (C1)": ALL_SKILLS,
};

export function skillsForFocus(focus: string | null | undefined): IntakeSkill[] {
  if (!focus) return ALL_SKILLS;
  return FOCUS_SKILLS[focus] ?? ALL_SKILLS;
}

// Exam-prep focus areas target one specific CEFR level, so picking one
// locks the self-assessed level to match instead of asking separately.
const FOCUS_LEVEL: Record<string, IntakeLevel> = {
  "Nyelvvizsga gyakorlás (B1)": "B1",
  "Nyelvvizsga gyakorlás (B2)": "B2",
  "Nyelvvizsga gyakorlás (C1)": "C1",
};

export function levelForFocus(focus: string | null | undefined): IntakeLevel | null {
  if (!focus) return null;
  return FOCUS_LEVEL[focus] ?? null;
}
