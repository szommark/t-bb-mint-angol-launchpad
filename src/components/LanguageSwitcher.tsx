import { Globe, ChevronUp } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { langLabels, type Lang } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[var(--teal-accent)]/50">
            <Globe className="h-4 w-4 text-[var(--teal-accent-strong)]" />
            {langLabels[lang].flag}
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="mb-2 w-40">
          {(Object.keys(langLabels) as Lang[]).map((l) => (
            <DropdownMenuItem key={l} onClick={() => setLang(l)}
              className={`cursor-pointer ${l === lang ? "bg-muted font-semibold" : ""}`}>
              <span className="mr-2 text-xs font-bold text-muted-foreground">{langLabels[l].flag}</span>
              {langLabels[l].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
