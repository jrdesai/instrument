import { useMemo, useState, type MouseEvent } from "react";
import { isDesktop } from "../../bridge";
import { CopyButton } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import {
  CATEGORIES,
  GIT_COMMANDS,
  type Category,
} from "./data";

const TOOL_ID = "git-cheatsheet";

/** Replace `<branch>` and `<remote>` placeholders with user-supplied values. */
function substitute(template: string, branch: string, remote: string): string {
  let result = template;
  if (branch.trim()) result = result.replace(/<branch>/g, branch.trim());
  if (remote.trim()) result = result.replace(/<remote>/g, remote.trim());
  return result;
}

function categoryPillLabel(cat: Category | "All"): string {
  if (cat === "Branching") return "Branch";
  if (cat === "Undoing") return "Undo";
  if (cat === "Stashing") return "Stash";
  return cat;
}

export default function GitCheatsheetTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [branch, setBranch] = useState("");
  useRestoreStringDraft(TOOL_ID, setBranch);
  const [remote, setRemote] = useState("origin");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return GIT_COMMANDS.filter((cmd) => {
      if (activeCategory !== "All" && cmd.category !== activeCategory) return false;
      if (!q) return true;
      return (
        cmd.command.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  const openDocs = (e: MouseEvent<HTMLAnchorElement>) => {
    if (isDesktop) {
      e.preventDefault();
      void import("@tauri-apps/plugin-opener").then(({ openUrl }) =>
        void openUrl("https://git-scm.com/docs")
      );
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border-light bg-amber-50/40 px-4 py-2 text-[11px] text-slate-500 dark:border-border-dark dark:bg-amber-900/10 dark:text-slate-400">
        <span className="material-symbols-outlined text-[13px] text-amber-500">
          info
        </span>
        <span>Always verify commands before running.</span>
        <a
          href="https://git-scm.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-0.5 text-primary underline-offset-2 hover:underline"
          onClick={openDocs}
        >
          git-scm.com ↗
        </a>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-b border-border-light px-4 py-2.5 dark:border-border-dark">
        <label className="flex items-center gap-1.5">
          <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Branch
          </span>
          <input
            type="text"
            value={branch}
            placeholder="<branch>"
            onChange={(e) => {
              const v = e.target.value;
              setBranch(v);
              setDraft(v);
            }}
            className="w-36 rounded border border-border-light bg-transparent px-2 py-1 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-200 dark:placeholder:text-slate-600"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Remote
          </span>
          <input
            type="text"
            value={remote}
            placeholder="origin"
            onChange={(e) => setRemote(e.target.value)}
            className="w-24 rounded border border-border-light bg-transparent px-2 py-1 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-200 dark:placeholder:text-slate-600"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-border-light px-4 py-2 dark:border-border-dark">
        <span className="material-symbols-outlined shrink-0 text-[16px] text-slate-400">
          search
        </span>
        <input
          type="text"
          value={search}
          placeholder="Search commands…"
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-600"
          spellCheck={false}
          autoComplete="off"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border-light px-4 py-2 dark:border-border-dark [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["All", ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border-light bg-transparent text-slate-500 hover:text-primary dark:border-border-dark dark:text-slate-400"
            }`}
          >
            {categoryPillLabel(cat)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        {filtered.length === 0 && (
          <div className="flex h-full min-h-[10rem] items-center justify-center px-4 text-sm text-slate-400">
            No commands match &ldquo;{search}&rdquo;
          </div>
        )}
        {filtered.map((cmd) => {
          const display = substitute(cmd.command, branch, remote);
          return (
            <div
              key={cmd.id}
              className="group flex items-start gap-3 border-b border-border-light px-4 py-3 last:border-0 dark:border-border-dark"
            >
              <div className="mt-0.5 w-4 shrink-0">
                {cmd.dangerous ? (
                  <span
                    className="material-symbols-outlined text-[14px] text-amber-500"
                    title="Destructive — may lose work or rewrite history"
                  >
                    warning
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-all font-mono text-xs text-slate-800 dark:text-slate-200">
                  {display}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {cmd.description}
                </p>
              </div>
              <CopyButton
                value={display}
                variant="icon"
                className="mt-0.5 shrink-0"
                aria-label={`Copy ${cmd.id}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
