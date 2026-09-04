import type { Lang } from "@/lib/i18n";

type LocalizableFields = "title" | "excerpt" | "content";

type WithLocalizedField<F extends LocalizableFields> = {
  [K in F]: string;
} & {
  [K in `${F}_en` | `${F}_de`]?: string | null;
};

export function pickLocalized<F extends LocalizableFields>(post: WithLocalizedField<F>, field: F, lang: Lang): string {
  if (lang === "hu") return post[field];
  const localized = post[`${field}_${lang}` as const];
  return localized || post[field];
}
