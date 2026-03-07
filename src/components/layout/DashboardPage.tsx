import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Tool, ToolCategory } from "../../registry";
import { tools, getToolById, getToolsByCategory } from "../../registry";
import { useToolStore } from "../../store";
import {
  categoryNameToRegistry,
  categoryIcons,
} from "../../constants/library";

const STORAGE_KEY = "instrument:dashboard:activeCategory";
const MAX_RECENT = 5;

/** Display name for a registry category (for tiles and headings). */
function getCategoryDisplayName(category: ToolCategory): string {
  const entry = Object.entries(categoryNameToRegistry).find(
    ([, reg]) => reg === category
  );
  if (entry) return entry[0];
  const fallback: Record<string, string> = {
    auth: "Auth",
    datetime: "Date & Time",
    numbers: "Numbers",
    data: "Data",
    design: "Design",
  };
  return fallback[category] ?? category;
}

/** Icon name (Material Symbol) for a registry category. */
function getCategoryIcon(category: ToolCategory): string {
  const displayName = getCategoryDisplayName(category);
  return categoryIcons[displayName] ?? tools.find((t) => t.category === category)?.icon ?? "folder";
}

function ToolCard({
  tool,
  onClick,
  disabled,
}: {
  tool: Tool;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group flex flex-col p-4 rounded-lg border border-border-dark bg-panel-dark text-left transition-colors min-w-[180px] ${
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-primary/40 cursor-pointer"
      }`}
    >
      <div className="size-10 rounded bg-slate-800 flex items-center justify-center mb-3 text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[24px]" aria-hidden>
          {tool.icon}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-slate-100 mb-1 line-clamp-1">
        {tool.name}
      </h3>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider mt-1 w-fit">
        {tool.category}
      </span>
    </button>
  );
}

function ExplorePlaceholderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start justify-center p-4 rounded-lg border border-dashed border-border-dark bg-background-dark/40 text-left hover:border-primary/40 transition-colors cursor-pointer min-w-[180px]"
    >
      <div className="size-10 rounded bg-slate-800 flex items-center justify-center mb-3 text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-[24px]" aria-hidden>
          add
        </span>
      </div>
      <h3 className="text-sm font-semibold text-slate-100 mb-1">
        Explore Library
      </h3>
      <p className="text-xs text-slate-500">
        Browse all tools and start a new session.
      </p>
    </button>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const recentToolIds = useToolStore((s) => s.recentToolIds);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const addToRecent = useToolStore((s) => s.addToRecent);

  const recentTools: Tool[] = useMemo(
    () =>
      recentToolIds
        .map((id) => getToolById(id))
        .filter((t): t is Tool => Boolean(t)),
    [recentToolIds]
  );

  const implementedTools = useMemo(
    () => tools.filter((t) => t.implemented),
    []
  );

  const categories = useMemo(() => {
    const seen = new Set<ToolCategory>();
    for (const tool of tools) {
      seen.add(tool.category);
    }
    return Array.from(seen)
      .map((id) => ({
        id,
        name: getCategoryDisplayName(id),
        icon: getCategoryIcon(id),
        toolCount: getToolsByCategory(id).filter((t) => t.implemented).length,
      }))
      .filter((cat) => cat.toolCount > 0);
  }, []);

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
    if (activeCategoryId !== null && !categories.some((c) => c.id === activeCategoryId)) {
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
    ? categories.findIndex((c) => c.id === activeCategoryId)
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

  const handleTileClick = useCallback((id: string) => {
    setActiveCategoryId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background-dark">
      {/* Fixed: Dashboard title + Recent */}
      <header className="shrink-0 px-8 pt-6 pb-4 bg-background-dark">
        <h1 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-6">
          Dashboard
        </h1>
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[18px]"
                aria-hidden
              >
                history
              </span>
              Recent
            </h2>
            <button
              type="button"
              onClick={handleSeeAllRecent}
              className="text-primary text-xs hover:text-primary/80 transition-colors"
            >
              See all →
            </button>
          </div>
          {displayedRecent.length === 0 ? (
            <p className="text-sm text-slate-500">
              No recent tools yet. Open a tool from the Library.
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {displayedRecent.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => handleOpenTool(tool)}
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
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-widest flex items-center gap-2 mb-4">
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
                    key={item.category.id}
                    ref={(el) => {
                      tileRefs.current[item.category.id] = el;
                    }}
                    type="button"
                    onClick={() => handleTileClick(item.category.id)}
                    className={`flex flex-col items-center p-4 w-full border rounded-xl transition-all duration-200 cursor-pointer ${
                      activeCategoryId === item.category.id
                        ? "bg-primary/10 border-primary/40"
                        : "bg-panel-dark border-border-dark hover:border-primary/20 hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-2xl mb-2 ${
                        activeCategoryId === item.category.id
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
                        activeCategoryId === item.category.id
                          ? "text-primary"
                          : "text-slate-500"
                      }`}
                    >
                      {item.category.name}
                    </span>
                    <span className="text-slate-600 text-xs mt-0.5">
                      {item.category.toolCount}{" "}
                      {item.category.toolCount === 1 ? "tool" : "tools"}
                    </span>
                  </button>
                ) : (
                  <div
                    key="panel"
                    ref={panelRef}
                    className="col-span-full relative border border-border-dark border-t-2 border-t-primary/20 rounded-xl bg-panel-dark p-4 mt-0 overflow-visible transition-[max-height,opacity] duration-300 ease-out"
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
                        {activeCategoryId &&
                          getToolsByCategory(activeCategoryId as ToolCategory)
                            .filter((t) => t.implemented)
                            .map((tool) => (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => handleOpenTool(tool)}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border-dark bg-panel-dark hover:border-primary/30 hover:bg-white/5 transition-all text-left w-full cursor-pointer"
                              >
                                <span
                                  className="material-symbols-outlined leading-none flex-shrink-0 text-primary/70"
                                  style={{ fontSize: "20px" }}
                                  aria-hidden
                                >
                                  {tool.icon}
                                </span>
                                <div className="min-w-0 flex flex-col gap-0.5">
                                  <span className="text-sm text-slate-200 font-medium truncate leading-tight">
                                    {tool.name}
                                  </span>
                                  <span className="text-xs text-slate-500 truncate leading-tight">
                                    {tool.description}
                                  </span>
                                </div>
                              </button>
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
      <footer className="shrink-0 px-8 py-3 border-t border-border-dark bg-background-dark">
        <div className="w-full px-4 py-3 rounded-lg border border-border-dark bg-panel-dark flex items-center gap-6 text-xs text-slate-400">
          <span className="font-mono">
            {totalImplemented}{" "}
            {totalImplemented === 1 ? "Tool" : "Tools"} available
          </span>
          <span className="font-mono">
            {categoriesWithTools}{" "}
            {categoriesWithTools === 1 ? "Category" : "Categories"}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
              aria-hidden
            />
            <span className="font-mono text-emerald-500">
              Engine Online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
