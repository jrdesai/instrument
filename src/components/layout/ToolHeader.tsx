import type { Tool } from "../../registry";
import { useToolStore } from "../../store";

export function ToolHeader({ tool }: { tool: Tool }) {
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
          <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100 truncate">
            {tool.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {tool.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          type="button"
          onClick={() => toggleFavourite(tool)}
          aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
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
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          {tool.displayCategory}
        </span>
        {tool.roles.map((role) => (
          <span
            key={role}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-panel-dark border border-border-light dark:border-border-dark text-xs text-slate-600 dark:text-slate-400"
          >
            {role}
          </span>
        ))}
      </div>
    </header>
  );
}

