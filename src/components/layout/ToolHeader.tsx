import type { Tool } from "../../registry";

export function ToolHeader({ tool }: { tool: Tool }) {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-border-dark bg-background-dark">
      <div className="flex items-center gap-4 min-w-0">
        <div className="size-10 rounded bg-slate-800 flex items-center justify-center text-slate-400">
          <span className="material-symbols-outlined text-[24px]" aria-hidden>
            {tool.icon}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-medium text-slate-100 truncate">
            {tool.name}
          </h1>
          <p className="text-sm text-slate-500 truncate">
            {tool.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          {tool.category}
        </span>
        {tool.roles.map((role) => (
          <span
            key={role}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-panel-dark border border-border-dark text-xs text-slate-400"
          >
            {role}
          </span>
        ))}
      </div>
    </header>
  );
}

