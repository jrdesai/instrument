import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getToolById } from "../../registry";
import { LogoMark } from "../LogoMark";
import { OnboardingModal } from "../onboarding/OnboardingModal";
import { PwaInstallBanner } from "../ui/PwaInstallBanner";
import { SearchModal } from "../ui/SearchModal";

const SIDEBAR_WIDTH = 48;

/** Returns the platform modifier key symbol for display purposes. */
const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? "⌘" : "Ctrl+";

const navItems: { to: string; icon: string; label: string; shortcut: string }[] =
  [
    { to: "/", icon: "home", label: "Home", shortcut: `${MOD}1` },
    { to: "/history", icon: "history", label: "History", shortcut: `${MOD}2` },
    { to: "/settings", icon: "settings", label: "Settings", shortcut: `${MOD}3` },
  ];

export function AppShell() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toolIdMatch = location.pathname.match(/^\/tools\/(.+)$/);
  const activeTool = toolIdMatch ? getToolById(toolIdMatch[1]) : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (mod && e.key === "1") {
        e.preventDefault();
        navigate("/");
      }
      if (mod && e.key === "2") {
        e.preventDefault();
        navigate("/history");
      }
      if (mod && e.key === "3") {
        e.preventDefault();
        navigate("/settings");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-screen w-full min-w-0 flex-col overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display md:flex-row">
      <aside
        className="hidden shrink-0 flex-col items-center border-r border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark z-20 md:flex"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="Main navigation"
      >
        <div
          className="h-12 flex w-full shrink-0 items-center justify-center border-b border-border-light dark:border-border-dark"
          title="Instrument"
        >
          <LogoMark />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1 py-4">
          {navItems.map(({ to, icon, label, shortcut }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex size-10 items-center justify-center rounded-lg transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`
              }
              aria-label={`${label} (${shortcut})`}
              title={`${label} (${shortcut})`}
            >
              <span className="material-symbols-outlined text-[24px]" aria-hidden>
                {icon}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-light bg-background-light px-2 dark:border-border-dark dark:bg-background-dark sm:gap-3 sm:px-4">
          <div className="flex shrink-0 items-center justify-center md:hidden" title="Instrument">
            <LogoMark className="h-8 w-8" />
          </div>
          <div className="hidden min-w-0 items-center gap-1.5 md:flex">
            <span className="select-none text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-300">
              Instrument
            </span>
            {activeTool && (
              <>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {activeTool.name}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-slate-100 px-2 text-left text-sm text-slate-400 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700 sm:px-3"
            aria-label={`Search tools (${MOD}K)`}
          >
            <span className="material-symbols-outlined shrink-0 text-[18px]" aria-hidden>
              search
            </span>
            <span className="min-w-0 flex-1 truncate">Search tools...</span>
            <kbd className="hidden items-center gap-0.5 font-mono text-xs text-slate-400 dark:text-slate-500 sm:inline-flex">
              <span>{MOD}</span>
              <span>K</span>
            </kbd>
          </button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden">
          <PwaInstallBanner />
          <Outlet />
        </main>
      </div>

      <nav
        className="bottom-nav flex h-14 shrink-0 items-stretch justify-around border-t border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark md:hidden"
        aria-label="Main navigation"
      >
        {navItems.map(({ to, icon, label, shortcut }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-center text-[10px] font-medium leading-tight transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800/80"
              }`
            }
            aria-label={`${label} (${shortcut})`}
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden>
              {icon}
            </span>
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <OnboardingModal />
    </div>
  );
}
