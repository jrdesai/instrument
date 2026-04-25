import { useNavigate } from "react-router-dom";
import type { Tool } from "../../registry";
import { StorageBadge } from "../tool";
import { useToolStore } from "../../store";
import { BookmarkButton } from "../ui/BookmarkButton";

const isMac =
  typeof navigator !== "undefined" && /mac/i.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? "⌘" : "Ctrl+";

export function ToolHeader({ tool }: { tool: Tool }) {
  const navigate = useNavigate();
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);
  const toggleFavourite = useToolStore((s) => s.toggleFavourite);
  const isFavourite = favouriteToolIds.includes(tool.id);

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-border-light dark:border-border-dark bg-white dark:bg-panel-dark">
      <div className="flex items-center gap-4 min-w-0">
        <div className="size-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <span className="material-symbols-outlined text-[24px]" aria-hidden>
            {tool.icon}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-medium text-slate-900 dark:text-slate-100">
              {tool.name}
            </h1>
            <StorageBadge tool={tool} />
          </div>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {tool.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
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
          className="text-slate-400 hover:text-amber-400 dark:text-slate-500 dark:hover:text-amber-400 transition-colors"
        >
          <span
            className="material-symbols-outlined text-[22px]"
            aria-hidden
            style={{ fontVariationSettings: isFavourite ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/", { state: { openCategory: tool.displayCategory } })}
          className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-primary/20"
          title={`Browse ${tool.displayCategory} tools`}
        >
          {tool.displayCategory}
        </button>
      </div>
    </header>
  );
}

