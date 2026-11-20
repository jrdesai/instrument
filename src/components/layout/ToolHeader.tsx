import { useNavigate } from "react-router-dom";
import type { Tool } from "../../registry";
import { StorageBadge, NetworkBadge } from "../tool";
import { useToolStore } from "../../store";
import { BookmarkButton } from "../ui/BookmarkButton";
import { LogoMark } from "../LogoMark";

const isMac =
  typeof navigator !== "undefined" && /mac/i.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? "⌘" : "Ctrl+";

export interface ToolHeaderProps {
  tool: Tool;
  /** When rendered inside AppShell's unified 48px top bar, opens the global search modal. */
  onOpenSearch?: () => void;
}

export function ToolHeader({ tool, onOpenSearch }: ToolHeaderProps) {
  const navigate = useNavigate();
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);
  const toggleFavourite = useToolStore((s) => s.toggleFavourite);
  const setPendingRestoreInput = useToolStore((s) => s.setPendingRestoreInput);
  const isFavourite = favouriteToolIds.includes(tool.id);

  const handleLoadSample = () => {
    if (!tool.sampleInput || tool.sensitive) return;
    setPendingRestoreInput(tool.id, tool.sampleInput);
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border-light bg-white px-2 dark:border-border-dark dark:bg-panel-dark sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div className="flex shrink-0 items-center justify-center md:hidden" title="Instrument">
          <LogoMark className="h-7 w-7" />
        </div>
        <div className="hidden size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:flex">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            {tool.icon}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <h1
            className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base"
            title={tool.description}
          >
            {tool.name}
          </h1>
          <StorageBadge tool={tool} />
          <NetworkBadge tool={tool} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {!tool.sensitive && tool.sampleInput && (
          <button
            type="button"
            onClick={handleLoadSample}
            title="Load sample input"
            className="inline-flex items-center gap-1 rounded-md border border-border-light px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border-dark dark:text-slate-300 dark:hover:border-primary/40 dark:hover:text-primary"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden>
              science
            </span>
            <span className="hidden sm:inline">Sample</span>
          </button>
        )}

        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label={`Search tools (${MOD}K)`}
            title={`Search tools (${MOD}K)`}
            className="flex h-7 items-center gap-1.5 rounded-md bg-slate-100 px-2 text-xs text-slate-500 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              search
            </span>
            <kbd className="hidden font-mono text-[11px] sm:inline">{MOD}K</kbd>
          </button>
        )}

        {!tool.sensitive && <BookmarkButton toolId={tool.id} />}

        <button
          type="button"
          onClick={() => toggleFavourite(tool)}
          aria-label={
            isFavourite
              ? `Remove from favourites (${MOD}⇧F)`
              : `Add to favourites (${MOD}⇧F)`
          }
          title={
            isFavourite
              ? `Remove from favourites (${MOD}⇧F)`
              : `Add to favourites (${MOD}⇧F)`
          }
          className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-amber-400"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            aria-hidden
            style={{ fontVariationSettings: isFavourite ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/?category=${encodeURIComponent(tool.displayCategory)}`)}
          className="hidden items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:inline-flex"
          title={`Browse ${tool.displayCategory} tools`}
        >
          {tool.displayCategory}
        </button>
      </div>
    </header>
  );
}

