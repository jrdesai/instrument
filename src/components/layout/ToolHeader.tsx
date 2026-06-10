import { useNavigate } from "react-router-dom";
import type { Tool } from "../../registry";
import { StorageBadge, NetworkBadge } from "../tool";
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
    <header className="flex items-center justify-between border-b border-border-light bg-white px-6 py-2 dark:border-border-dark dark:bg-panel-dark">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-8 items-center justify-center rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            {tool.icon}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1
              className="truncate text-lg font-medium text-slate-900 dark:text-slate-100"
              title={tool.description}
            >
              {tool.name}
            </h1>
            <StorageBadge tool={tool} />
            <NetworkBadge tool={tool} />
          </div>
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

