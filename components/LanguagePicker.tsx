import { LOCALES, type Locale } from "@/lib/i18n/locales";

// One small button per language, each in its own script so people can find
// theirs without reading the current one.
export function LanguagePicker({ current, label }: { current: Locale; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1.5 text-sm">
      <span aria-hidden>🌐</span>
      {(Object.keys(LOCALES) as Locale[]).map((l) => (
        <a
          key={l}
          href={`/lang?to=${l}`}
          lang={l}
          aria-current={l === current ? "true" : undefined}
          className="rounded-full border-2 px-2.5 py-0.5"
          style={{
            borderColor: l === current ? "var(--line)" : "var(--soft-line)",
            background: l === current ? "var(--bow)" : "transparent",
            color: l === current ? "var(--charcoal)" : "var(--ink)",
            fontWeight: l === current ? 600 : 400,
          }}
        >
          {LOCALES[l].name}
        </a>
      ))}
    </nav>
  );
}
