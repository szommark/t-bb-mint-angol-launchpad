// Weighted blueprint + adaptive step helpers for the placement test.

export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type BankSkill = "grammar" | "vocabulary" | "reading";
export type IntakeSkill = "reading" | "writing" | "speaking" | "listening";

export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const LEVEL_INDEX: Record<Level, number> = {
  A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5,
};

export const TOTAL_PLANNED = 20;

// Map an intake-selected skill to the bank skill tags it should draw from.
const INTAKE_TO_BANK: Record<IntakeSkill, BankSkill[]> = {
  reading: ["reading"],
  writing: ["grammar", "vocabulary"],
  speaking: ["vocabulary", "grammar"],
  listening: ["reading", "vocabulary"],
};

export function allowedBankSkills(intakeSkills: IntakeSkill[]): BankSkill[] {
  const set = new Set<BankSkill>();
  for (const s of intakeSkills) for (const b of INTAKE_TO_BANK[s]) set.add(b);
  if (set.size === 0) return ["grammar", "vocabulary", "reading"];
  return Array.from(set);
}

// Weighted level budgets, always summing to TOTAL_PLANNED. Stated level
// always carries the highest concentration.
export function buildBudget(selfLevel: Level): Record<Level, number> {
  const b: Record<Level, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  switch (selfLevel) {
    case "A1":
      b.A1 = 12; b.A2 = 6; b.B1 = 2; break;
    case "A2":
      b.A1 = 4; b.A2 = 8; b.B1 = 6; b.B2 = 2; break;
    case "B1":
      b.A2 = 4; b.B1 = 10; b.B2 = 6; break;
    case "B2":
      b.B1 = 4; b.B2 = 10; b.C1 = 6; break;
    case "C1":
      b.B1 = 4; b.B2 = 6; b.C1 = 10; break;
    case "C2":
      b.B2 = 4; b.C1 = 6; b.C2 = 10; break;
  }
  return b;
}

// Levels reachable given self-assessed level. Beginners capped at +2.
export function reachableLevels(selfLevel: Level): Level[] {
  const idx = LEVEL_INDEX[selfLevel];
  const maxIdx = selfLevel === "A1" || selfLevel === "A2"
    ? Math.min(5, idx + 2)
    : 5;
  return LEVELS.filter((l) => LEVEL_INDEX[l] <= maxIdx);
}

// 2 consecutive correct step up, 2 consecutive wrong step down. Never more
// than one CEFR level per step. Respects reachableLevels for the ceiling.
export function nextAdaptiveLevel(
  current: Level,
  isCorrect: boolean,
  consecCorrect: number,
  consecWrong: number,
  selfLevel: Level,
): { level: Level; consecCorrect: number; consecWrong: number } {
  const cc = isCorrect ? consecCorrect + 1 : 0;
  const cw = isCorrect ? 0 : consecWrong + 1;
  const reach = reachableLevels(selfLevel);
  const maxIdx = LEVEL_INDEX[reach[reach.length - 1]];
  const idx = LEVEL_INDEX[current];
  if (cc >= 2 && idx < maxIdx) {
    return { level: LEVELS[idx + 1], consecCorrect: 0, consecWrong: 0 };
  }
  if (cw >= 2 && idx > 0) {
    return { level: LEVELS[idx - 1], consecCorrect: 0, consecWrong: 0 };
  }
  return { level: current, consecCorrect: cc, consecWrong: cw };
}

// Target wins if budget remains; otherwise nearest level with budget left.
export function chooseSlotLevel(
  target: Level,
  budgets: Record<Level, number>,
): Level | null {
  if ((budgets[target] ?? 0) > 0) return target;
  const idx = LEVEL_INDEX[target];
  for (let d = 1; d < LEVELS.length; d++) {
    for (const step of [-1, 1]) {
      const j = idx + d * step;
      if (j < 0 || j > 5) continue;
      const l = LEVELS[j];
      if ((budgets[l] ?? 0) > 0) return l;
    }
  }
  return null;
}

export function intakeSignature(intake: {
  selfLevel: Level;
  focus?: string | null;
  skills: IntakeSkill[];
}): string {
  const focus = (intake.focus ?? "").trim().toLowerCase();
  const skills = [...intake.skills].sort().join(",");
  return `${intake.selfLevel}|${skills}|${focus}`;
}

export type TestState = {
  v: 2;
  answers: Record<string, number>;
  currentLevel: Level;
  consecCorrect: number;
  consecWrong: number;
  totalPlanned: number;
  budgets: Record<Level, number>;
  intakeSig: string;
  skillRotation: number;
  usedBankIds: string[];
};

export function isTestState(x: unknown): x is TestState {
  return !!x && typeof x === "object" && (x as { v?: number }).v === 2;
}
