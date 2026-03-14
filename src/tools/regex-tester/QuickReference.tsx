import { useState } from "react";
import { REFERENCE_SECTIONS } from "./RegexTesterTool";

type QuickReferenceProps = {
  onInsert: (token: string) => void;
};

export function QuickReference({ onInsert }: QuickReferenceProps) {
  const [filter, setFilter] = useState("");
  const [activeSection, setActiveSection] = useState("characters");

  const filtered = filter.trim().toLowerCase();

  const visibleSections = REFERENCE_SECTIONS.map((section) => ({
    ...section,
    tokens: filtered
      ? section.tokens.filter(
          (t) =>
            t.token.toLowerCase().includes(filtered) ||
            t.description.toLowerCase().includes(filtered)
        )
      : section.tokens,
  })).filter((s) => s.tokens.length > 0);

  const activeTokens =
    visibleSections.find((s) => s.id === activeSection)?.tokens ??
    visibleSections[0]?.tokens ??
    [];

  const flatFiltered = filtered.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <input
        type="text"
        className="w-full px-3 py-1.5 rounded-md bg-panel-light dark:bg-panel-dark text-slate-800 dark:text-slate-200 text-xs border border-border-light dark:border-border-dark focus:outline-none focus:border-primary font-mono placeholder:text-slate-500"
        placeholder="Filter tokens…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        autoFocus
      />

      <div className="flex flex-1 min-h-0 border border-border-light dark:border-border-dark rounded-md overflow-hidden">
        {!flatFiltered && (
          <div className="w-36 shrink-0 border-r border-border-light dark:border-border-dark overflow-y-auto bg-panel-light/50 dark:bg-panel-dark/50">
            {REFERENCE_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 text-[11px] transition-colors border-l-2 ${
                  activeSection === section.id
                    ? "border-primary text-slate-800 dark:text-slate-200 bg-primary/10"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {(flatFiltered
            ? visibleSections.flatMap((s) => s.tokens)
            : activeTokens
          ).map((t) => (
            <button
              key={t.token}
              type="button"
              onClick={() => onInsert(t.token)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group border-b border-border-light/50 dark:border-border-dark/50 last:border-0"
            >
              <span className="font-mono text-primary text-[11px] min-w-[80px] shrink-0 truncate">
                {t.token}
              </span>
              <span className="text-slate-500 text-[11px] flex-1 truncate group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                {t.description}
              </span>
              <span className="text-slate-700 text-[10px] shrink-0 group-hover:text-primary transition-colors">
                ↵
              </span>
            </button>
          ))}

          {flatFiltered && visibleSections.length === 0 && (
            <div className="flex items-center justify-center h-full text-slate-600 text-xs py-8">
              No tokens match "{filter}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
