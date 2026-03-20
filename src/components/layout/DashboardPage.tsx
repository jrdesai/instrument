import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Tool } from "../../registry";
import { tools, getToolById } from "../../registry";
import { useToolStore } from "../../store";
import { APP_VERSION } from "../../version";

const MAX_RECENT = 6;
const SUGGESTED_TOOL_IDS = ["json-formatter", "base64", "jwt-decoder"];

function ToolCard({
  tool,
  onClick,
  disabled,
  isFavourite,
  onToggleFavourite,
}: {
  tool: Tool;
  onClick: () => void;
  disabled?: boolean;
  isFavourite: boolean;
  onToggleFavourite: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative flex flex-col p-3 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-panel-dark text-left transition-colors min-w-[180px] ${
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-primary/40 cursor-pointer"
      }`}
    >
      <button
        type="button"
        onClick={onToggleFavourite}
        aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
        className={`absolute top-2 right-2 transition-opacity hover:text-amber-400 dark:hover:text-amber-400 ${isFavourite ? "opacity-100 text-amber-400" : "opacity-20 group-hover:opacity-100 focus-visible:opacity-100 text-slate-400 dark:text-slate-500"}`}
      >
        <span
          className="material-symbols-outlined text-[18px]"
          aria-hidden
          style={{ fontVariationSettings: isFavourite ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      </button>
      <div className="size-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 text-slate-500 dark:text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          {tool.icon}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-1">
        {tool.name}
      </h3>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider mt-1 w-fit">
        {tool.displayCategory}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const recentToolIds = useToolStore((s) => s.recentToolIds);
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const addToRecent = useToolStore((s) => s.addToRecent);
  const toggleFavourite = useToolStore((s) => s.toggleFavourite);
  const clearRecents = useToolStore((s) => s.clearRecents);

  const recentTools: Tool[] = useMemo(
    () =>
      recentToolIds
        .map((id) => getToolById(id))
        .filter((t): t is Tool => Boolean(t)),
    [recentToolIds]
  );

  const favouriteTools: Tool[] = useMemo(
    () =>
      favouriteToolIds
        .map((id) => getToolById(id))
        .filter((t): t is Tool => Boolean(t)),
    [favouriteToolIds]
  );

  const implementedTools = useMemo(() => tools.filter((t) => t.implemented), []);

  const totalImplemented = implementedTools.length;
  const categoriesWithTools = useMemo(
    () => new Set(implementedTools.map((t) => t.displayCategory)).size,
    [implementedTools]
  );

  const handleSeeAllRecent = () => {
    navigate("/library");
  };

  const handleOpenTool = (tool: Tool) => {
    setActiveTool(tool);
    addToRecent(tool);
    navigate(`/tools/${tool.id}`);
  };

  const displayedRecent = recentTools.slice(0, MAX_RECENT);

  function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="shrink-0 px-8 pt-6 pb-4 bg-background-light dark:bg-background-dark">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Dashboard
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
          {getGreeting()} · {totalImplemented} tools · {favouriteTools.length}{" "}
          favourited
        </p>

        {favouriteTools.length > 0 && (
          <section className="mt-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
              <span
                className="material-symbols-outlined text-[14px] text-amber-400"
                aria-hidden
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              Favourites
            </h2>
            <div className="flex flex-wrap gap-2">
              {favouriteTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleOpenTool(tool)}
                  className="group flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 rounded-full border border-slate-200 dark:border-border-dark bg-white dark:bg-panel-dark hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm text-slate-700 dark:text-slate-300"
                >
                  <span
                    className="material-symbols-outlined text-[14px] text-primary/70 shrink-0"
                    aria-hidden
                  >
                    {tool.icon}
                  </span>
                  <span className="text-xs font-medium">{tool.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${tool.name} from favourites`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavourite(tool);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavourite(tool);
                      }
                    }}
                    className="ml-0.5 flex items-center justify-center size-4 rounded-full text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[12px]" aria-hidden>
                      close
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                history
              </span>
              Recent
            </h2>
            <div className="flex items-center gap-3">
              {displayedRecent.length > 0 && (
                <button
                  type="button"
                  onClick={clearRecents}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleSeeAllRecent}
                className="text-primary text-xs hover:text-primary/80 transition-colors"
              >
                See all →
              </button>
            </div>
          </div>
          {displayedRecent.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No recent tools yet.{" "}
                <Link to="/library" className="text-primary hover:underline">
                  Open a tool from the Library.
                </Link>
              </p>
              <div className="flex flex-wrap gap-3">
                {SUGGESTED_TOOL_IDS.map((id) => {
                  const tool = getToolById(id);
                  if (!tool) return null;
                  return (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      onClick={() => handleOpenTool(tool)}
                      isFavourite={favouriteToolIds.includes(tool.id)}
                      onToggleFavourite={(e) => {
                        e.stopPropagation();
                        toggleFavourite(tool);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {displayedRecent.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => handleOpenTool(tool)}
                  isFavourite={favouriteToolIds.includes(tool.id)}
                  onToggleFavourite={(e) => {
                    e.stopPropagation();
                    toggleFavourite(tool);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </header>

      {/* Footer: fixed at bottom */}
      <footer className="shrink-0 px-8 py-3 border-t border-slate-200 dark:border-border-dark bg-background-light dark:bg-background-dark">
        <div className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-panel-dark flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono">
            {totalImplemented}{" "}
            {totalImplemented === 1 ? "Tool" : "Tools"} available
          </span>
          <span className="font-mono">
            {categoriesWithTools}{" "}
            {categoriesWithTools === 1 ? "Category" : "Categories"}
          </span>
          <span className="font-mono ml-auto">v{APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}

