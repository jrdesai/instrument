import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isWeb } from "../../bridge";
import { categorySubtitles } from "../../constants/library";
import type { Role, Tool } from "../../registry";
import {
  getDisplayCategories,
  getToolById,
  getToolsByDisplayCategory,
  tools,
} from "../../registry";
import { usePreferenceStore, useToolStore } from "../../store";

const MAX_RECENT = 8;

/** Soft tints for category overview cards only (not tool grid). */
const CATEGORY_ACCENT: Record<string, { bg: string; text: string }> = {
  Encoding: { bg: "bg-sky-100 dark:bg-sky-900/20", text: "text-sky-600 dark:text-sky-400" },
  Security: { bg: "bg-red-100 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400" },
  Auth: { bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400" },
  "JSON Tools": {
    bg: "bg-yellow-100 dark:bg-yellow-900/20",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  Code: { bg: "bg-violet-100 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400" },
  Formatting: {
    bg: "bg-indigo-100 dark:bg-indigo-900/20",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  "Date & Time": {
    bg: "bg-teal-100 dark:bg-teal-900/20",
    text: "text-teal-600 dark:text-teal-400",
  },
  Numbers: {
    bg: "bg-emerald-100 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  Network: { bg: "bg-cyan-100 dark:bg-cyan-900/20", text: "text-cyan-600 dark:text-cyan-400" },
  Data: { bg: "bg-lime-100 dark:bg-lime-900/20", text: "text-lime-600 dark:text-lime-400" },
  Media: { bg: "bg-pink-100 dark:bg-pink-900/20", text: "text-pink-600 dark:text-pink-400" },
  Design: {
    bg: "bg-fuchsia-100 dark:bg-fuchsia-900/20",
    text: "text-fuchsia-600 dark:text-fuchsia-400",
  },
};
const DEFAULT_CATEGORY_ACCENT = {
  bg: "bg-slate-100 dark:bg-slate-800",
  text: "text-slate-500 dark:text-slate-400",
};

type HomeView =
  | { type: "categories" }
  | { type: "category"; name: string }
  | { type: "all" };

const ROLES = ["All", "Frontend", "Backend", "DevOps", "Security", "Data", "General"] as const;
type RoleFilter = (typeof ROLES)[number];

function WelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 px-6 py-6 dark:border-primary/15 dark:bg-primary/10">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss welcome card"
        className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          close
        </span>
      </button>

      <div className="mb-4 text-center">
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Welcome to Instrument
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          A privacy-first developer toolkit. Tools run locally on your device —
          and the few that use the network are clearly marked.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {[
          { icon: "lock", label: "Privacy-first" },
          { icon: "offline_bolt", label: "Works offline" },
          { icon: "devices", label: "Web + Desktop" },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
          >
            <span
              className="material-symbols-outlined text-[14px] text-primary"
              aria-hidden
            >
              {icon}
            </span>
            {label}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {isWeb && (
          <a
            href="https://github.com/jrdesai/instrument/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:ring-slate-600"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              download
            </span>
            Download Desktop App
          </a>
        )}
        <a
          href="https://github.com/jrdesai/instrument"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:ring-slate-600"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            open_in_new
          </span>
          View on GitHub
        </a>
      </div>
    </div>
  );
}

function ToolGridCard({
  tool,
  isFavourite,
  onClick,
  onToggleFavourite,
  desktopOnly = false,
}: {
  tool: Tool;
  isFavourite: boolean;
  onClick: () => void;
  onToggleFavourite: (e: React.MouseEvent) => void;
  desktopOnly?: boolean;
}) {
  return (
    <div
      title={desktopOnly ? "Available in the Instrument desktop app" : undefined}
      className={`group relative flex flex-col gap-2 rounded-xl border border-border-light bg-white p-4 transition-colors dark:border-border-dark dark:bg-panel-dark ${
        desktopOnly ? "opacity-60" : "hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={tool.name}
        className={`absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          desktopOnly ? "pointer-events-none cursor-not-allowed" : ""
        }`}
      />

      <div className="flex items-start justify-between">
        <div
          className={`flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 ${
            desktopOnly ? "" : "transition-colors group-hover:bg-primary/10 group-hover:text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            {tool.icon}
          </span>
        </div>
        {desktopOnly ? (
          <span className="relative z-10 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Desktop only
          </span>
        ) : (
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
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {tool.name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
          {tool.description}
        </p>
      </div>

      {(tool.cliCommand || (!isWeb && tool.trayPopover)) && (
        <div className="relative z-10 flex justify-end gap-2">
          {tool.cliCommand && (
            <span
              title={`Available in CLI — instrument ${tool.cliCommand}`}
              className="flex items-center text-slate-300 dark:text-slate-600"
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden>
                terminal
              </span>
            </span>
          )}
          {!isWeb && tool.trayPopover && (
            <span
              title="Available in tray popover"
              className="flex items-center text-slate-300 dark:text-slate-600"
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden>
                picture_in_picture
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const location = useLocation();
  const [view, setView] = useState<HomeView>({ type: "categories" });
  const [activeRole, setActiveRole] = useState<RoleFilter>("All");
  const welcomeDismissed = usePreferenceStore((s) => s.welcomeDismissed);
  const setWelcomeDismissed = usePreferenceStore((s) => s.setWelcomeDismissed);

  // Open a specific category if navigated here from a tool's category badge
  useEffect(() => {
    const incoming = (location.state as { openCategory?: string } | null)
      ?.openCategory;
    if (incoming) {
      setView({ type: "category", name: incoming });
      // Clear the state so back-navigation doesn't re-trigger
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const platformTools = useMemo(
    () => tools.filter((t) => !isWeb || t.platforms.includes("web")),
    []
  );
  const implementedTools = useMemo(
    () => platformTools.filter((t) => t.implemented),
    [platformTools]
  );
  const displayCategories = useMemo(() => getDisplayCategories(), []);
  const totalImplemented = implementedTools.length;
  const allRoleTools = useMemo(
    () => tools.filter((t) => t.implemented),
    []
  );

  const filteredTools = useMemo(() => {
    if (view.type !== "category") return [];
    return getToolsByDisplayCategory(view.name);
  }, [view]);

  const navigate = useNavigate();
  const recentToolIds = useToolStore((s) => s.recentToolIds);
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const addToRecent = useToolStore((s) => s.addToRecent);
  const toggleFavourite = useToolStore((s) => s.toggleFavourite);

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

  const handleOpenTool = (tool: Tool) => {
    setActiveTool(tool);
    addToRecent(tool);
    navigate(`/tools/${tool.id}`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <header className="shrink-0 border-b border-border-light bg-slate-50 px-6 pb-4 pt-6 dark:border-border-dark dark:bg-background-dark">
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Privacy-first developer toolkit · {totalImplemented} tools, all running locally
        </p>

        {!welcomeDismissed && (
          <div className="mb-4">
            <WelcomeCard onDismiss={() => setWelcomeDismissed(true)} />
          </div>
        )}

        {(favouriteTools.length > 0 || displayedRecent.length > 0) && (
          <section className="mb-3" aria-label="Quick access">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {favouriteTools.map((tool) => (
                <div key={tool.id} className="group/fav relative shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenTool(tool)}
                    aria-label={tool.name}
                    className="flex size-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-100 text-amber-600 transition-colors hover:border-amber-400 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden>
                      {tool.icon}
                    </span>
                  </button>
                  <span className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-100 opacity-0 transition-opacity group-hover/fav:opacity-100 dark:bg-slate-700">
                    {tool.name}
                  </span>
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

              {favouriteTools.length > 0 && displayedRecent.length > 0 && (
                <div
                  className="mx-1 h-6 w-px shrink-0 bg-border-light dark:bg-border-dark"
                  aria-hidden
                />
              )}

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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view.type === "categories" && (
          <div className="px-6 py-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Browse by category
              </span>
              <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRole(role)}
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      activeRole === role
                        ? "bg-primary/10 text-primary"
                        : "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
              {displayCategories.map((cat) => {
                const catTools = getToolsByDisplayCategory(cat.name)
                  .filter((t) => !isWeb || t.platforms.includes("web"))
                  .filter(
                    (t) =>
                      activeRole === "All" ||
                      t.roles.includes(activeRole.toLowerCase() as Role)
                  );

                if (catTools.length === 0) return null;

                const subtitle = categorySubtitles[cat.name] ?? "";
                const accent = CATEGORY_ACCENT[cat.name] ?? DEFAULT_CATEGORY_ACCENT;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setView({ type: "category", name: cat.name })}
                    className="group flex flex-col items-start gap-2 rounded-xl border border-border-light bg-white p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-border-dark dark:bg-panel-dark"
                  >
                    <div
                      className={`flex size-12 items-center justify-center rounded-lg transition-colors group-hover:bg-primary/10 group-hover:text-primary ${accent.bg} ${accent.text}`}
                    >
                      <span
                        className="material-symbols-outlined text-[22px]"
                        aria-hidden
                      >
                        {cat.icon}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {cat.name}
                        </p>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {catTools.length}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                        {subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {displayCategories.every((cat) => {
              const catTools = getToolsByDisplayCategory(cat.name)
                .filter((t) => !isWeb || t.platforms.includes("web"))
                .filter(
                  (t) =>
                    activeRole === "All" ||
                    t.roles.includes(activeRole.toLowerCase() as Role)
                );
              return catTools.length === 0;
            }) && (
              <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                {activeRole === "All"
                  ? "No tools available on this platform."
                  : `No categories for the ${activeRole} role.`}
              </p>
            )}

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setView({ type: "all" })}
                className="flex items-center gap-1.5 rounded-lg border border-border-light px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-primary/40 hover:text-primary dark:border-border-dark dark:text-slate-400 dark:hover:border-primary/40 dark:hover:text-primary"
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
                    desktopOnly={isWeb && !tool.platforms.includes("web")}
                    onClick={
                      isWeb && !tool.platforms.includes("web")
                        ? () => {}
                        : () => handleOpenTool(tool)
                    }
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
                  {allRoleTools.length} {allRoleTools.length === 1 ? "tool" : "tools"}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {allRoleTools.map((tool) => (
                  <ToolGridCard
                    key={tool.id}
                    tool={tool}
                    isFavourite={favouriteToolIds.includes(tool.id)}
                    desktopOnly={isWeb && !tool.platforms.includes("web")}
                    onClick={
                      isWeb && !tool.platforms.includes("web")
                        ? () => {}
                        : () => handleOpenTool(tool)
                    }
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

    </div>
  );
}
