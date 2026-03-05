import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Tool, ToolCategory } from "../../registry";
import { tools, getToolById } from "../../registry";
import { useToolStore } from "../../store";
import { categoryNameToRegistry } from "../../constants/library";

const MAX_RECENT = 5;

function ToolCard({
  tool,
  onClick,
}: {
  tool: Tool;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col p-4 rounded-lg border border-border-dark bg-panel-dark text-left hover:border-primary/40 transition-colors cursor-pointer min-w-[180px]"
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

  const toolsByCategory = useMemo(() => {
    const map = new Map<ToolCategory, Tool[]>();
    for (const tool of implementedTools) {
      const list = map.get(tool.category) ?? [];
      if (list.length < 4) {
        list.push(tool);
      }
      map.set(tool.category, list);
    }
    return Array.from(map.entries());
  }, [implementedTools]);

  const totalImplemented = implementedTools.length;
  const categoriesWithTools = toolsByCategory.length;

  const handleSeeAllRecent = () => {
    navigate("/library");
  };

  const handleSeeAllCategory = (category: ToolCategory) => {
    const entry = Object.entries(categoryNameToRegistry).find(
      ([, registry]) => registry === category
    );
    if (entry) {
      navigate("/library", { state: { category: entry[0] } });
    } else {
      navigate("/library");
    }
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

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background-dark">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
        <header className="mb-6">
          <h1 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Dashboard
          </h1>
        </header>

        <div className="space-y-10">
          {/* Section 1: Recent tools */}
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

          {/* Section 2: Quick access by category */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[18px]"
                  aria-hidden
                >
                  category
                </span>
                Encoding
              </h2>
            </div>
            <div className="space-y-4">
              {toolsByCategory.map(([category, categoryTools]) => {
                const displayName =
                  Object.entries(categoryNameToRegistry).find(
                    ([, registry]) => registry === category
                  )?.[0] ?? category;
                return (
                  <div
                    key={category}
                    className="flex items-start gap-4"
                  >
                    <div className="w-32 flex-shrink-0 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {displayName}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSeeAllCategory(category)}
                        className="text-primary text-xs hover:text-primary/80 transition-colors"
                      >
                        See all →
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {categoryTools.map((tool) => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          onClick={() => handleOpenTool(tool)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 3: Stats bar */}
          <section>
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
          </section>
        </div>
      </div>
    </div>
  );
}

