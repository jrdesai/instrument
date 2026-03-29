import { useCallback, useEffect, useState } from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import type { ChmodInput } from "../../bindings/ChmodInput";
import type { ChmodOutput } from "../../bindings/ChmodOutput";

const TOOL_ID = "chmod-calculator";
const RUST_COMMAND = "chmod_process";

const PRESETS = [
  { label: "755", desc: "Executable (scripts, dirs)" },
  { label: "644", desc: "File (owner write, all read)" },
  { label: "600", desc: "Private (SSH keys)" },
  { label: "777", desc: "World-writable" },
  { label: "400", desc: "Read-only (certs)" },
  { label: "1755", desc: "Sticky + executable" },
];

export default function ChmodCalculatorTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<ChmodOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");

  const { setDraft } = useDraftInput(TOOL_ID);
  useRestoreStringDraft(TOOL_ID, setInput);

  const run = useCallback(async (value: string) => {
    if (!value.trim()) {
      setOutput(null);
      return;
    }
    setIsLoading(true);
    try {
      const result = (await callTool(
        RUST_COMMAND,
        { value } as ChmodInput,
        { skipHistory: true }
      )) as ChmodOutput;
      setOutput(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void run(input);
    }, 150);
    return () => window.clearTimeout(t);
  }, [input, run]);

  const handleChange = (v: string) => {
    setInput(v);
    setDraft(v);
  };

  const handlePreset = (label: string) => {
    handleChange(label);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied!");
      window.setTimeout(() => setCopyLabel("Copy"), 1500);
    } catch {
      /* ignore */
    }
  };

  const hasResult = output && !output.error;

  return (
    <div className="flex flex-col h-full w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto px-6 py-6 space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Permission
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="755, rwxr-xr-x, or 0644…"
            className="w-full px-4 py-3 bg-white dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            spellCheck={false}
            autoComplete="off"
            aria-busy={isLoading}
          />
          {isLoading && input.trim() && (
            <p className="text-xs text-slate-500 mt-1">Updating…</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p.label)}
                title={p.desc}
                className="px-2.5 py-1 text-xs font-mono rounded-lg border border-border-light dark:border-border-dark text-slate-600 dark:text-slate-400 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {output?.error && (
          <p className="text-sm text-red-500 dark:text-red-400">{output.error}</p>
        )}

        {hasResult && output && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Octal", value: output.octal },
                { label: "Symbolic", value: output.symbolic },
                { label: "Decimal", value: String(output.decimal) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center p-4 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-panel-dark gap-1"
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    {label}
                  </span>
                  <span className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100 break-all text-center">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-panel-dark">
              <code className="flex-1 font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
                {output.chmodCommand}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(output.chmodCommand)}
                className="shrink-0 text-xs text-slate-500 hover:text-primary transition-colors"
              >
                {copyLabel}
              </button>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Breakdown
              </h2>
              <div className="space-y-2">
                {[
                  { cls: output.owner,  who: "Owner",  icon: "person", special: output.setuid ? "setuid" : undefined },
                  { cls: output.group,  who: "Group",  icon: "group",  special: output.setgid ? "setgid" : undefined },
                  { cls: output.others, who: "Others", icon: "public", special: output.sticky ? "sticky" : undefined },
                ].map(({ cls, who, icon, special }) => (
                  <div
                    key={who}
                    className="flex flex-wrap items-center gap-3 sm:gap-4 px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-panel-dark"
                  >
                    <span
                      className="material-symbols-outlined text-[18px] text-slate-400 shrink-0"
                      aria-hidden
                    >
                      {icon}
                    </span>
                    <span className="text-sm font-medium w-14 shrink-0 text-slate-600 dark:text-slate-400">
                      {who}
                    </span>
                    <div className="flex gap-2">
                      {[
                        { label: "r", active: cls.read, title: "Read" },
                        { label: "w", active: cls.write, title: "Write" },
                        { label: "x", active: cls.execute, title: "Execute" },
                      ].map(({ label, active, title }) => (
                        <span
                          key={label}
                          title={title}
                          className={`w-7 h-7 flex items-center justify-center rounded font-mono text-sm font-semibold ${
                            active
                              ? "bg-primary/10 text-primary"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                          }`}
                        >
                          {active ? label : "-"}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500 sm:ml-auto w-full sm:w-auto">
                      {cls.label.split(": ")[1] ?? "No permissions"}
                      {special && (
                        <span className="ml-1.5 text-amber-500 dark:text-amber-400">
                          + {special}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(output.setuid || output.setgid || output.sticky) && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Special Bits
                </h2>
                <div className="flex flex-wrap gap-3">
                  {output.setuid && (
                    <div className="px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
                      <span className="font-semibold">setuid</span> — runs as file owner
                    </div>
                  )}
                  {output.setgid && (
                    <div className="px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
                      <span className="font-semibold">setgid</span> — runs as file group
                    </div>
                  )}
                  {output.sticky && (
                    <div className="px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs">
                      <span className="font-semibold">sticky</span> — only owner can delete
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
