import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isWeb } from "../../bridge";
import { categorySubtitles } from "../../constants/library";
import type { Role, Tool } from "../../registry";
import {
  getDisplayCategories,
  getToolById,
  getToolsByDisplayCategory,
  tools,
} from "../../registry";
import { useToolStore } from "../../store";
import { APP_VERSION } from "../../version";

const MAX_RECENT = 8;

const ROLES = ["All", "Frontend", "Backend", "DevOps", "Security", "Data"] as const;
type RoleFilter = (typeof ROLES)[number];

type HomeView =
  | { type: "categories" }
  | { type: "category"; name: string }
  | { type: "all" };

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function ToolGridCard({
  tool,
  isFavourite,
  onClick,
  onToggleFavourite,
}: {
  tool: Tool;
  isFavourite: boolean;
  onClick: () => void;
  onToggleFavourite: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-border-light bg-white p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-border-dark dark:bg-panel-dark">
      <button
        type="button"
        onClick={onClick}
        aria-label={tool.name}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />

      <div className="flex items-start justify-between">
        <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:bg-slate-800 dark:text-slate-400">
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            {tool.icon}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleFavourite}
          aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
          className={`relative z-10 shrink-0 transition-all hover:text-amber-400 ${
            isFavourite
              ? "opacity-100 text-amber-400"
              : "opacity-0 text-slate-400 group-hover:opacity-60 dark:text-slate-500"
          }`}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            aria-hidden
            style={{ fontVariationSettings: isFavourite ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {tool.name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
          {tool.description}
        </p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [view, setView] = useState<HomeView>({ type: "categories" });
  const [activeRole, setActiveRole] = useState<RoleFilter>("All");

  const platformTools = useMemo(
    () => tools.filter((t) => !isWeb || t.platforms.includes("web")),
    []
  );
  const implementedTools = useMemo(
    () =>
      platformTools
        .filter((t) => t.implemented)
        .filter(
          (t) =>
            activeRole === "All" ||
            t.roles.includes(activeRole.toLowerCase() as Role)
        ),
    [platformTools, activeRole]
  );
  const displayCategories = useMemo(() => getDisplayCategories(), []);
  const totalImplemented = implementedTools.length;
  const categoriesWithTools = displayCategories.length;

  const filteredTools = useMemo(() => {
    if (view.type !== "category") return [];
    return getToolsByDisplayCategory(view.name)
      .filter((t) => !isWeb || t.platforms.includes("web"))
      .filter(
        (t) =>
          activeRole === "All" ||
          t.roles.includes(activeRole.toLowerCase() as Role)
      );
  }, [view, activeRole]);

  const navigate = useNavigate();
  const recentToolIds = useToolStore((s) => s.recentToolIds);
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const addToRecent = useToolStore((s) => s.addToRecent);
  const toggleFavourite = useToolStore((s) => s.toggleFavourite);
  const clearRecents = useToolStore((s) => s.clearRecents);

  const recentTools = useMemo(
    () =>
      recentToolIds
        .map((id) => getToolById(id))
        .filter((t): t is Tool => Boolean(t))
        .filter((t) => !isWeb || t.platforms.includes("web")),
    [recentToolIds]
  );

  const favouriteTools = useMemo(
    () =>
      favouriteToolIds
        .map((id) => getToolById(id))
        .filter((t): t is Tool => Boolean(t))
        .filter((t) => !isWeb || t.platforms.includes("web")),
    [favouriteToolIds]
  );

  const displayedRecent = recentTools.slice(0, MAX_RECENT);

  const handleRoleChange = (role: RoleFilter) => {
    setActiveRole(role);
    // Drill-down may show zero tools for the new role — always reset to categories.
    // "All tools" view can refilter in place, so leave it alone.
    if (view.type === "category") setView({ type: "categories" });
  };

  const handleOpenTool = (tool: Tool) => {
    setActiveTool(tool);
    addToRecent(tool);
    navigate(`/tools/${tool.id}`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <header className="shrink-0 border-b border-border-light px-6 pb-4 pt-6 dark:border-border-dark">
        {/* Centered greeting + tagline */}
        <div className="mb-4 text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {getGreeting()}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Privacy-first developer toolkit · {totalImplemented} tools, all running locally
          </p>
        </div>

        {/* Favourites — amber icon dock */}
        {favouriteTools.length > 0 && (
          <section className="mb-3" aria-label="Favourites">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Favourites
            </p>
            <div className="flex flex-wrap gap-2">
              {favouriteTools.map((tool) => (
                <div key={tool.id} className="group/fav relative shrink-0">
                  {/* Icon button */}
                  <button
                    type="button"
                    onClick={() => handleOpenTool(tool)}
                    aria-label={tool.name}
                    className="flex size-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-500 transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden>
                      {tool.icon}
                    </span>
                  </button>
                  {/* Tooltip — below the icon, left-aligned to avoid edge clipping */}
                  <span className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-100 opacity-0 transition-opacity group-hover/fav:opacity-100 dark:bg-slate-700">
                    {tool.name}
                  </span>
                  {/* Remove button — only on hover */}
                  <button
                    type="button"
                    onClick={() => toggleFavourite(tool)}
                    aria-label={`Remove ${tool.name} from favourites`}
                    className="absolute -right-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-slate-500 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover/fav:opacity-100 dark:bg-slate-600 dark:hover:bg-red-500"
                  >
                    <span className="material-symbols-outlined text-[10px]" aria-hidden>
                      close
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recents */}
        {displayedRecent.length > 0 && (
          <section aria-label="Recent tools">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recent
              </p>
              <button
                type="button"
                onClick={clearRecents}
                className="text-[10px] text-slate-400 transition-colors hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {displayedRecent.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleOpenTool(tool)}
                  className="flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border-light bg-white px-2.5 text-xs text-slate-600 transition-colors hover:border-primary/40 hover:text-primary dark:border-border-dark dark:bg-panel-dark dark:text-slate-400"
                >
                  <span className="material-symbols-outlined text-[12px]" aria-hidden>
                    {tool.icon}
                  </span>
                  {tool.name}
                </button>
              ))}
            </div>
          </section>
        )}
      </header>

      {/* Role filter pills — persistent across all views */}
      <div className="shrink-0 border-b border-border-light px-6 py-2.5 dark:border-border-dark">
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleRoleChange(role)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeRole === role
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view.type === "categories" && (
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {displayCategories.map((cat) => {
                const catTools = getToolsByDisplayCategory(cat.name)
                  .filter((t) => !isWeb || t.platforms.includes("web"))
                  .filter(
                    (t) =>
                      activeRole === "All" ||
                      t.roles.includes(activeRole.toLowerCase() as Role)
                  );

                if (catTools.length === 0) return null;

                const preview = catTools.slice(0, 3).map((t) => t.name);
                const subtitle = categorySubtitles[cat.name] ?? "";
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setView({ type: "category", name: cat.name })}
                    className="group flex flex-col items-start gap-2 rounded-xl border border-border-light bg-white p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-border-dark dark:bg-panel-dark"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:bg-slate-800 dark:text-slate-400">
                        <span
                          className="material-symbols-outlined text-[18px]"
                          aria-hidden
                        >
                          {cat.icon}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                        {catTools.length}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {cat.name}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                        {subtitle}
                      </p>
                    </div>
                    {preview.length > 0 && (
                      <div className="mt-auto flex flex-wrap gap-1 pt-1">
                        {preview.map((name) => (
                          <span
                            key={name}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          >
                            {name}
                          </span>
                        ))}
                        {catTools.length > 3 && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            +{catTools.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {displayCategories.every((cat) => {
              const catTools = getToolsByDisplayCategory(cat.name)
                .filter((t) => !isWeb || t.platforms.includes("web"))
                .filter((t) =>
                  activeRole === "All" ||
                  t.roles.includes(activeRole.toLowerCase() as Role)
                );
              return catTools.length === 0;
            }) && (
              <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                No tools found for the {activeRole} role.
              </p>
            )}

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setView({ type: "all" })}
                className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-primary dark:text-slate-400"
              >
                <span
                  className="material-symbols-outlined text-[14px]"
                  aria-hidden
                >
                  grid_view
                </span>
                View all {totalImplemented} tools
              </button>
            </div>
          </div>
        )}

        {view.type === "category" && (
          <div className="flex min-h-0 flex-col">
            <div className="shrink-0 border-b border-border-light px-6 py-3 dark:border-border-dark">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setView({ type: "categories" })}
                  className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-primary dark:text-slate-400"
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    aria-hidden
                  >
                    arrow_back
                  </span>
                  Categories
                </button>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {view.name}
                </span>
                <span className="ml-auto font-mono text-xs text-slate-400 dark:text-slate-500">
                  {filteredTools.length} {filteredTools.length === 1 ? "tool" : "tools"}
                  {activeRole !== "All" && (
                    <span className="ml-1.5 text-primary">· {activeRole}</span>
                  )}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTools.map((tool) => (
                  <ToolGridCard
                    key={tool.id}
                    tool={tool}
                    isFavourite={favouriteToolIds.includes(tool.id)}
                    onClick={() => handleOpenTool(tool)}
                    onToggleFavourite={(e) => {
                      e.stopPropagation();
                      toggleFavourite(tool);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {view.type === "all" && (
          <div className="flex min-h-0 flex-col">
            <div className="shrink-0 border-b border-border-light px-6 py-3 dark:border-border-dark">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setView({ type: "categories" })}
                  className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-primary dark:text-slate-400"
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    aria-hidden
                  >
                    arrow_back
                  </span>
                  Categories
                </button>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  All tools
                </span>
                <span className="ml-auto font-mono text-xs text-slate-400 dark:text-slate-500">
                  {totalImplemented} {totalImplemented === 1 ? "tool" : "tools"}
                  {activeRole !== "All" && (
                    <span className="ml-1.5 text-primary">· {activeRole}</span>
                  )}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {implementedTools.map((tool) => (
                  <ToolGridCard
                    key={tool.id}
                    tool={tool}
                    isFavourite={favouriteToolIds.includes(tool.id)}
                    onClick={() => handleOpenTool(tool)}
                    onToggleFavourite={(e) => {
                      e.stopPropagation();
                      toggleFavourite(tool);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-border-light px-6 py-3 dark:border-border-dark">
        <div className="flex items-center gap-4 font-mono text-xs text-slate-500 dark:text-slate-400">
          <span>
            {totalImplemented} {totalImplemented === 1 ? "Tool" : "Tools"}
          </span>
          <span>
            {categoriesWithTools}{" "}
            {categoriesWithTools === 1 ? "Category" : "Categories"}
          </span>
          <span className="ml-auto">v{APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}
