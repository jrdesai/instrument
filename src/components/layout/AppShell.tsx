import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SearchModal } from "../ui/SearchModal";

const SIDEBAR_WIDTH = 48;

const navItems: { to: string; icon: string; label: string }[] = [
  { to: "/", icon: "home", label: "Dashboard" },
  { to: "/library", icon: "grid_view", label: "Library" },
  { to: "/history", icon: "history", label: "History" },
  { to: "/settings", icon: "settings", label: "Settings" },
];

export function AppShell() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <aside
        className="flex flex-col items-center border-r border-slate-200 dark:border-border-dark bg-background-light dark:bg-background-dark shrink-0 z-20"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="Main navigation"
      >
        {/* Logo mark + tooltip (icon-only sidebar) */}
        <div
          className="h-12 flex items-center justify-center border-b border-slate-200 dark:border-border-dark w-full shrink-0"
          title="Instrument"
        >
          <div
            className="w-8 h-8 rounded-lg bg-primary text-white font-bold text-sm flex items-center justify-center shrink-0"
            aria-hidden
          >
            ⟨/⟩
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1 items-center py-4">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-center size-10 rounded-lg transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`
              }
              aria-label={label}
            >
              <span className="material-symbols-outlined text-[24px]" aria-hidden>
                {icon}
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-200 dark:border-border-dark">
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
            title="Engine online"
            aria-hidden
          />
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Global top bar */}
        <div className="shrink-0 h-12 flex items-center gap-3 px-4 border-b border-slate-200 dark:border-border-dark bg-background-light dark:bg-background-dark">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-tight select-none">
            Instrument
          </span>
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 flex-1 h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm text-left"
            aria-label="Search tools (⌘K)"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden>
              search
            </span>
            <span className="flex-1">Search tools...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-xs text-slate-400 dark:text-slate-500 font-mono">
              <span>⌘</span><span>K</span>
            </kbd>
          </button>
        </div>
        <Outlet />
      </main>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
