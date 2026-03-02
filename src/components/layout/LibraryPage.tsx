import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  sidebarMapping,
  gridRoleMapping,
  categorySubtitles,
  categoryIcons,
  categoryNameToRegistry,
} from "../../constants/library";
import { tools, getToolsByRole } from "../../registry";
import type { Role, Tool } from "../../registry";
import { useToolStore } from "../../store";

const ROLES = ["All", "Frontend", "Backend", "DevOps", "Security", "Data"] as const;
const VERSION = "v1.0.0";

function StatusBar({ toolCount }: { toolCount: number }) {
  return (
    <footer className="h-8 flex items-center px-6 border-t border-border-dark bg-background-dark text-[10px] text-slate-500 gap-6 shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
        <span className="font-mono text-emerald-500">Engine Online</span>
      </div>
      <span className="font-mono">{toolCount} {toolCount === 1 ? "Tool" : "Tools"}</span>
      <span className="font-mono ml-auto">{VERSION}</span>
    </footer>
  );
}

export function LibraryPage() {
  const navigate = useNavigate();
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const [currentRole, setCurrentRole] = useState<(typeof ROLES)[number]>("All");
  const [currentCategory, setCurrentCategory] = useState<string>("Encoding");

  const filteredCategories = useMemo(
    () => sidebarMapping[currentRole] ?? [],
    [currentRole]
  );

  const filteredTools = useMemo(() => {
    const roleFiltered =
      gridRoleMapping[currentRole] === "all"
        ? tools
        : getToolsByRole(currentRole.toLowerCase() as Role);
    const registryCategory = categoryNameToRegistry[currentCategory];
    if (!registryCategory) return roleFiltered.filter(() => false);
    return roleFiltered.filter((t) => t.category === registryCategory);
  }, [currentRole, currentCategory]);

  const handleRoleClick = (role: (typeof ROLES)[number]) => {
    setCurrentRole(role);
    const cats = sidebarMapping[role];
    if (cats?.length) setCurrentCategory(cats[0]);
  };

  const handleToolClick = (tool: Tool) => {
    if (!tool.implemented) return;
    setActiveTool(tool);
    navigate(`/tools/${tool.id}`);
  };

  const implementedCount = useMemo(
    () => tools.filter((t) => t.implemented).length,
    [tools]
  );
  const implementedInFiltered = useMemo(
    () => filteredTools.filter((t) => t.implemented).length,
    [filteredTools]
  );

  const subtitle = categorySubtitles[currentCategory] ?? "";

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Category sidebar */}
      <aside className="w-[260px] flex flex-col border-r border-border-dark bg-background-dark shrink-0">
        <div className="p-6 border-b border-border-dark">
          <h1 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Library
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {implementedCount} {implementedCount === 1 ? "Tool" : "Tools"} available
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <div className="px-3 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleClick(role)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full cursor-pointer transition-colors ${
                    currentRole === role
                      ? "bg-primary text-white"
                      : "bg-panel-dark text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            <div className="mt-4 h-px bg-border-dark" />
          </div>
          {filteredCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCurrentCategory(cat)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-left ${
                currentCategory === cat
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                {categoryIcons[cat] ?? "folder"}
              </span>
              <span className="text-sm">{cat}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main grid + status */}
      <div className="flex-1 flex flex-col min-w-0 bg-background-dark overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-100">
              {currentCategory} Tools
            </h2>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolClick(tool)}
                className={`group relative flex flex-col p-4 rounded-lg border border-border-dark bg-panel-dark text-left transition-all ${
                  tool.implemented
                    ? "hover:border-primary/40 hover:bg-panel-dark cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                {!tool.implemented && (
                  <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Coming soon
                  </span>
                )}
                <div className="size-10 rounded bg-slate-800 flex items-center justify-center mb-4 text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[24px]" aria-hidden>
                    {tool.icon}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">
                  {tool.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                  {tool.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="uppercase tracking-wider font-semibold text-slate-400">
                    {tool.category}
                  </span>
                  {tool.roles.map((r) => (
                    <span
                      key={r}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                    >
                      {r}
                    </span>
                  ))}
                  {tool.implemented && (
                    <span className="material-symbols-outlined text-[14px] text-slate-500 ml-auto">
                      arrow_forward
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        <StatusBar toolCount={implementedInFiltered} />
      </div>
    </div>
  );
}
