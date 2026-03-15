import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Tool } from "../../registry";
import {
  tools,
  getToolById,
  getDisplayCategories,
  getToolsByDisplayCategory,
} from "../../registry";
import { useToolStore } from "../../store";
import { APP_VERSION } from "../../version";

const STORAGE_KEY = "instrument:dashboard:activeCategory";
const MAX_RECENT = 5;

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
      className={`group relative flex flex-col p-4 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-panel-dark text-left transition-colors min-w-[180px] ${
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
        <span className="material-symbols-outlined text-[18px]" aria-hidden style={{ fontVariationSettings: isFavourite ? "'FILL' 1" : "'FILL' 0" }}>
          star
        </span>
      </button>
      <div className="size-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-500 dark:text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[24px]" aria-hidden>
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

function ExplorePlaceholderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start justify-center p-4 rounded-lg border border-dashed border-slate-300 dark:border-border-dark bg-slate-50 dark:bg-background-dark/40 text-left hover:border-primary/40 transition-colors cursor-pointer min-w-[180px]"
    >
      <div className="size-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-500 dark:text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[24px]" aria-hidden>
          add
        </span>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Explore Library
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Browse all tools and start a new session.
      </p>
    </button>
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

  const implementedTools = useMemo(
    () => tools.filter((t) => t.implemented),
    []
  );

  const categories = useMemo(() => getDisplayCategories(), []);

  const totalImplemented = implementedTools.length;
  const categoriesWithTools = categories.length;

  const handleSeeAllRecent = () => {
    navigate("/library");
  };

  const handleOpenTool = (tool: Tool) => {
    setActiveTool(tool);
    addToRecent(tool);
    navigate(`/tools/${tool.id}`);
  };

  const handleExploreLibrary = () => {
    navigate("/library");
  };

  const displayedRecent = recentTools.slice(0, MAX_RECENT);
  const showExplorePlaceholder =
    displayedRecent.length > 0 && displayedRecent.length < MAX_RECENT;

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (
      activeCategoryId !== null &&
      !categories.some((c) => c.name === activeCategoryId)
    ) {
      setActiveCategoryId(null);
    }
  }, [activeCategoryId, categories]);

  useEffect(() => {
    if (activeCategoryId === null) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, activeCategoryId);
      } catch {
        /* ignore */
      }
    }
  }, [activeCategoryId]);

  const gridRef = useRef<HTMLDivElement>(null);
  const [itemsPerRow, setItemsPerRow] = useState(5);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      if (w < 600) setItemsPerRow(3);
      else if (w < 900) setItemsPerRow(4);
      else setItemsPerRow(5);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const [pointerLeft, setPointerLeft] = useState(0);

  const updatePointer = useCallback(() => {
    if (!activeCategoryId) return;
    const tile = tileRefs.current[activeCategoryId];
    const panel = panelRef.current;
    if (!tile || !panel) return;
    const tr = tile.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    setPointerLeft(tr.left + tr.width / 2 - pr.left);
  }, [activeCategoryId]);

  useEffect(() => {
    updatePointer();
    window.addEventListener("resize", updatePointer);
    return () => window.removeEventListener("resize", updatePointer);
  }, [updatePointer]);

  useEffect(() => {
    if (!activeCategoryId) return;
    const t = requestAnimationFrame(() => {
      updatePointer();
    });
    return () => cancelAnimationFrame(t);
  }, [activeCategoryId, updatePointer]);

  const activeIndex = activeCategoryId
    ? categories.findIndex((c) => c.name === activeCategoryId)
    : -1;
  const rowIndex = activeIndex >= 0 ? Math.floor(activeIndex / itemsPerRow) : 0;
  const insertIndex = Math.min(
    (rowIndex + 1) * itemsPerRow,
    categories.length
  );

  const gridItems = useMemo(() => {
    const list: Array<{ type: "tile"; category: (typeof categories)[0] } | { type: "panel" }> = [];
    let catIdx = 0;
    const total = categories.length + (activeCategoryId ? 1 : 0);
    for (let pos = 0; pos < total; pos++) {
      if (activeCategoryId && pos === insertIndex) {
        list.push({ type: "panel" });
      } else {
        list.push({ type: "tile", category: categories[catIdx++] });
      }
    }
    return list;
  }, [categories, activeCategoryId, insertIndex]);

  const handleTileClick = useCallback((name: string) => {
    setActiveCategoryId((prev) => (prev === name ? null : name));
  }, []);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Fixed: Dashboard title + Recent */}
      <header className="shrink-0 px-8 pt-6 pb-4 bg-background-light dark:bg-background-dark">
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center shrink-0"
            aria-hidden
          >
            <span className="text-primary text-xs font-bold">⟨/⟩</span>
          </div>
          <span className="text-slate-500 dark:text-slate-400 text-xs font-medium tracking-wider">
            INSTRUMENT
          </span>
        </div>
        <h1 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">
          Dashboard
        </h1>
        {favouriteTools.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[18px] text-amber-400" aria-hidden style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              Favourites
            </h2>
            <div className="flex flex-wrap gap-4">
              {favouriteTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => handleOpenTool(tool)}
                  isFavourite={true}
                  onToggleFavourite={(e) => { e.stopPropagation(); toggleFavourite(tool); }}
                />
              ))}
            </div>
          </section>
        )}
        <section>
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
                  onClick={() => {
                    if (window.confirm("Clear all recent tools?")) clearRecents();
                  }}
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No recent tools yet. Open a tool from the Library.
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {displayedRecent.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => handleOpenTool(tool)}
                  isFavourite={favouriteToolIds.includes(tool.id)}
                  onToggleFavourite={(e) => { e.stopPropagation(); toggleFavourite(tool); }}
                />
              ))}
              {showExplorePlaceholder && (
                <ExplorePlaceholderCard onClick={handleExploreLibrary} />
              )}
            </div>
          )}
        </section>
      </header>

      {/* Scrollable: Category grid accordion */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-8 py-6 pb-6">
          <section>
            <h2 className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-widest flex items-center gap-2 mb-4">
              <span
                className="material-symbols-outlined text-[18px]"
                aria-hidden
              >
                category
              </span>
              Quick Access
            </h2>
            <div
              ref={gridRef}
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
              }}
            >
              {gridItems.map((item) =>
                item.type === "tile" ? (
                  <button
                    key={item.category.name}
                    ref={(el) => {
                      tileRefs.current[item.category.name] = el;
                    }}
                    type="button"
                    onClick={() => handleTileClick(item.category.name)}
                    className={`flex flex-col items-center p-4 w-full border rounded-xl transition-all duration-200 cursor-pointer ${
                      activeCategoryId === item.category.name
                        ? "bg-primary/10 border-primary/40"
                        : "bg-white dark:bg-panel-dark border-slate-200 dark:border-border-dark hover:border-primary/20 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-2xl mb-2 ${
                        activeCategoryId === item.category.name
                          ? "text-primary"
                          : "text-slate-400"
                      }`}
                      style={{ fontSize: 28 }}
                      aria-hidden
                    >
                      {item.category.icon}
                    </span>
                    <span
                      className={`text-xs font-medium uppercase tracking-wider ${
                        activeCategoryId === item.category.name
                          ? "text-primary"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {item.category.name}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                      {item.category.toolCount}{" "}
                      {item.category.toolCount === 1 ? "tool" : "tools"}
                    </span>
                  </button>
                ) : (
                  <div
                    key="panel"
                    ref={panelRef}
                    className="col-span-full relative border border-slate-200 dark:border-border-dark border-t-2 border-t-primary/20 rounded-xl bg-white dark:bg-panel-dark p-4 mt-0 overflow-visible transition-[max-height,opacity] duration-300 ease-out"
                    style={{
                      maxHeight: 600,
                      opacity: 1,
                    }}
                  >
                    <div
                      className="absolute w-0 h-0 pointer-events-none"
                      style={{
                        top: -8,
                        left: pointerLeft,
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "8px solid transparent",
                        borderRight: "8px solid transparent",
                        borderBottom: "8px solid var(--color-border-dark)",
                      }}
                    />
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: activeCategoryId ? "500px" : "0px",
                        opacity: activeCategoryId ? 1 : 0,
                      }}
                    >
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {getToolsByDisplayCategory(
                          activeCategoryId ?? ""
                        ).map((tool) => (
                              <div
                                key={tool.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleOpenTool(tool)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleOpenTool(tool);
                                  }
                                }}
                                className="group relative flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-panel-dark hover:border-primary/30 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left w-full cursor-pointer"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleFavourite(tool); }}
                                  aria-label={favouriteToolIds.includes(tool.id) ? "Remove from favourites" : "Add to favourites"}
                                  className={`absolute top-2 right-2 transition-opacity hover:text-amber-400 dark:hover:text-amber-400 ${favouriteToolIds.includes(tool.id) ? "opacity-100 text-amber-400" : "opacity-20 group-hover:opacity-100 focus-visible:opacity-100 text-slate-400 dark:text-slate-500"}`}
                                >
                                  <span
                                    className="material-symbols-outlined text-[18px]"
                                    aria-hidden
                                    style={{ fontVariationSettings: favouriteToolIds.includes(tool.id) ? "'FILL' 1" : "'FILL' 0" }}
                                  >
                                    star
                                  </span>
                                </button>
                                <span
                                  className="material-symbols-outlined leading-none flex-shrink-0 text-primary/70"
                                  style={{ fontSize: "20px" }}
                                  aria-hidden
                                >
                                  {tool.icon}
                                </span>
                                <div className="min-w-0 flex flex-col gap-0.5">
                                  <span className="text-sm text-slate-900 dark:text-slate-200 font-medium truncate leading-tight">
                                    {tool.name}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate leading-tight">
                                    {tool.description}
                                  </span>
                                </div>
                              </div>
                            ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </div>
      </div>

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
