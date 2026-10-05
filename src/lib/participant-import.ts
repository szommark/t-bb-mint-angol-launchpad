import { z } from "zod";

// Parses the official "Résztvevő adatai" .xlsx template. Only columns A–I are
// imported; the remaining columns (fees, DHK credit, completion) are ignored.

export const EDUCATION_LEVELS = [
  "Végzettség nélkül",
  "Általános iskolai végzettség",
  "Középfokú végzettség és gimnáziumi érettségi (gimnázium)",
  "Középfokú végzettség és középfokú szakképesítés (szakgimnázium, szakképző iskola, szakiskola)",
  "Középfokú végzettség és középfokú szakképzettség (technikum)",
  "Felsőfokú végzettségi szint és felsőfokú szakképzettség (felsőoktatási intézmény)",
  "Felsőoktatási szakképzés (felsőoktatási intézmény)",
] as const;

export const ParticipantRecordSchema = z.object({
  highestEducation: z.enum(EDUCATION_LEVELS),
  currentName: z.string().trim().min(1).max(200),
  birthName: z.string().trim().min(1).max(200),
  motherName: z.string().trim().min(1).max(200),
  birthCountry: z.string().trim().min(1).max(100).nullable(),
  birthPlace: z.string().trim().min(1).max(200),
  birthDate: z.string().date(),
  email: z.string().trim().toLowerCase().email().max(320),
  nonHuCitizenWithoutHuAddress: z.boolean(),
});

export type ParticipantRecord = z.infer<typeof ParticipantRecordSchema>;

export type ParsedParticipantRow = { row: number; record: ParticipantRecord };
export type ParticipantRowError = { row: number; message: string };

// Header text of columns A–I, used to recognise the template.
const HEADERS = [
  "Legmagasabb iskolai végzettsége",
  "Viselt neve",
  "Születési neve",
  "Anyja neve",
  "Születési ország",
  "Születési helye",
  "Születési ideje",
  "E-mail címe",
  "Magyarországi lakcímmel nem rendelkező nem magyar állampolgár",
];

const COLUMN_LABELS = [
  "Highest education (A)",
  "Current name (B)",
  "Birth name (C)",
  "Mother's name (D)",
  "Birth country (E)",
  "Birth place (F)",
  "Birth date (G)",
  "Email (H)",
  "Non-Hungarian citizen without Hungarian address (I)",
];

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  // \s also covers the non-breaking spaces found in the template's lists.
  return String(value).replace(/\s+/g, " ").trim();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isValidDate(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Accepts real Excel date cells as well as the text forms Hungarian users
// type: "1998.02.25", "1998. 02. 25.", "1998-02-25".
function parseBirthDate(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  const match = normalize(value).match(/^(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\.?$/);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return isValidDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null;
}

function parseYesNo(value: unknown): boolean | null {
  const text = normalize(value).toLowerCase();
  if (text === "" || text === "nem") return false;
  if (text === "igen") return true;
  return null;
}

function matchEducation(value: unknown): (typeof EDUCATION_LEVELS)[number] | null {
  const text = normalize(value).toLowerCase();
  return EDUCATION_LEVELS.find((level) => level.toLowerCase() === text) ?? null;
}

export function parseParticipantSheet(rows: unknown[][]): {
  records: ParsedParticipantRow[];
  errors: ParticipantRowError[];
} {
  const headerIndex = rows.findIndex((cells) =>
    HEADERS.every((header, i) => normalize(cells[i]).toLowerCase() === header.toLowerCase()),
  );
  if (headerIndex === -1) {
    return {
      records: [],
      errors: [
        {
          row: 0,
          message:
            "The file doesn't match the participant template (header row with columns A–I not found).",
        },
      ],
    };
  }

  const records: ParsedParticipantRow[] = [];
  const errors: ParticipantRowError[] = [];
  const seenEmails = new Map<string, number>();

  rows.slice(headerIndex + 1).forEach((cells, offset) => {
    const row = headerIndex + offset + 2; // 1-based Excel row number
    const values = Array.from({ length: HEADERS.length }, (_, i) => cells[i]);
    if (values.every((v) => normalize(v) === "")) return;

    const rowErrors: string[] = [];
    const required = (i: number) => {
      const text = normalize(values[i]);
      if (!text) rowErrors.push(`${COLUMN_LABELS[i]} is required.`);
      return text;
    };

    const educationText = required(0);
    const highestEducation = matchEducation(values[0]);
    if (educationText && !highestEducation) {
      rowErrors.push(`${COLUMN_LABELS[0]} must be one of the template's predefined values.`);
    }

    const birthDateText = required(6);
    const birthDate = parseBirthDate(values[6]);
    if (birthDateText && !birthDate) {
      rowErrors.push(
        `${COLUMN_LABELS[6]} "${birthDateText}" is not a valid date (expected YYYY.MM.DD).`,
      );
    }

    const emailText = required(7);
    if (emailText && !z.string().email().safeParse(emailText).success) {
      rowErrors.push(`${COLUMN_LABELS[7]} "${emailText}" is not a valid email address.`);
    }

    const nonHu = parseYesNo(values[8]);
    if (nonHu === null) rowErrors.push(`${COLUMN_LABELS[8]} must be "Igen" or "Nem".`);

    const candidate = {
      highestEducation,
      currentName: required(1),
      birthName: required(2),
      motherName: required(3),
      birthCountry: normalize(values[4]) || null,
      birthPlace: required(5),
      birthDate,
      email: emailText,
      nonHuCitizenWithoutHuAddress: nonHu,
    };

    if (rowErrors.length > 0) {
      errors.push({ row, message: rowErrors.join(" ") });
      return;
    }

    const parsed = ParticipantRecordSchema.safeParse(candidate);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => {
        const field = issue.path[0] === "email" ? "Email (H)" : String(issue.path[0]);
        return `${field}: ${issue.message}`;
      });
      errors.push({ row, message: issues.join(" ") });
      return;
    }

    const firstRow = seenEmails.get(parsed.data.email);
    if (firstRow !== undefined) {
      errors.push({
        row,
        message: `Email ${parsed.data.email} is already used in row ${firstRow}.`,
      });
      return;
    }
    seenEmails.set(parsed.data.email, row);
    records.push({ row, record: parsed.data });
  });

  return { records, errors };
}
