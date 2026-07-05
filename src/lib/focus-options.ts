export const FOCUS_OPTIONS = [
  "Business English",
  "English for AI & Prompting",
  "English for Job Interviews & CVs",
  "Conversational / Everyday English",
  "English for Presentations & Public Speaking",
  "English for Social Media & Content Creation",
  "Travel English",
  "Academic English / IELTS Preparation",
] as const;

export const FOCUS_OTHER = "Other (specify)";

export function isPresetFocus(value: string | null | undefined): boolean {
  if (!value) return false;
  return (FOCUS_OPTIONS as readonly string[]).includes(value);
}