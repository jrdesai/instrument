import { NavLink, Outlet } from "react-router-dom";

const SIDEBAR_WIDTH = 48;

const navItems: { to: string; icon: string; label: string }[] = [
  { to: "/", icon: "home", label: "Dashboard" },
  { to: "/library", icon: "grid_view", label: "Library" },
  { to: "/chains", icon: "device_hub", label: "Chains" },
  { to: "/history", icon: "history", label: "History" },
  { to: "/settings", icon: "settings", label: "Settings" },
];

export function AppShell() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <aside
        className="flex flex-col items-center border-r border-slate-200 dark:border-border-dark bg-background-light dark:bg-background-dark shrink-0 z-20"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="Main navigation"
      >
        {/* Logo mark + tooltip (icon-only sidebar) */}
        <div
          className="py-3 flex items-center justify-center border-b border-slate-200 dark:border-border-dark w-full"
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
        <Outlet />
      </main>
    </div>
  );
}
