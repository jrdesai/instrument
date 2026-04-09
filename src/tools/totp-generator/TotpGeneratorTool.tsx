import React, { useEffect, useState } from "react";
import { callTool } from "../../bridge";
import { CopyButton } from "../../components/tool";
import { usePopoverBootstrapStore } from "../../store";
import type { TotpAlgorithm } from "../../bindings/TotpAlgorithm";
import type { TotpInput } from "../../bindings/TotpInput";
import type { TotpOutput } from "../../bindings/TotpOutput";

const TOOL_ID = "totp-generator";
const RUST_COMMAND = "tool_totp_generate";

/** Split code into two equal groups: "994941" → "994   941" */
function formatCode(code: string): string {
  if (!code) return "";
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)}   ${code.slice(mid)}`;
}

/** Pill button used for algorithm / digits / period selectors */
function OptionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-primary/10 text-primary border-primary/30"
          : "text-slate-500 dark:text-slate-400 border-border-light dark:border-border-dark hover:bg-slate-100 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

export default function TotpGeneratorTool() {
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [algorithm, setAlgorithm] = useState<TotpAlgorithm>("sha1");
  const [digits, setDigits] = useState<6 | 8>(6);
  const [period, setPeriod] = useState<30 | 60>(30);
  const [timestamp, setTimestamp] = useState(() => Math.floor(Date.now() / 1000));
  const [output, setOutput] = useState<TotpOutput | null>(null);

  // Consume tray clipboard seed on mount (same pattern as JWT)
  useEffect(() => {
    const pending = usePopoverBootstrapStore.getState().consumePending(TOOL_ID);
    if (pending) setSecret(pending);
  }, []);

  // Tick every second to refresh the code
  useEffect(() => {
    const id = window.setInterval(() => {
      setTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Re-generate whenever inputs or timestamp change
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload: TotpInput = { secret, algorithm, digits, period, timestamp };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as TotpOutput;
        if (!cancelled) setOutput(result);
      } catch {
        if (!cancelled)
          setOutput({ code: "", nextCode: "", validFor: 0, progress: 0, error: "Failed to generate TOTP" });
      }
    })();
    return () => { cancelled = true; };
  }, [secret, algorithm, digits, period, timestamp]);

  const err = output?.error ?? null;
  const validFor = output?.validFor ?? period;
  const progress = output?.progress ?? 1;
  const code = output?.code ?? "";
  const nextCode = output?.nextCode ?? "";
  const hasCode = code.length > 0 && err == null;

  const codeColor =
    !hasCode
      ? "text-slate-300 dark:text-slate-600"
      : validFor <= 3
        ? "text-red-500"
        : validFor <= 7
          ? "text-amber-500"
          : "text-slate-900 dark:text-slate-100";

  const barColor =
    validFor <= 3 ? "bg-red-500" : validFor <= 7 ? "bg-amber-500" : "bg-primary";

  const placeholder = digits === 6 ? "———   ———" : "————   ————";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">

      {/* Secret input */}
      <div className="shrink-0 px-4 pt-3 pb-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
          Secret
        </div>
        <div className="relative">
          <input
            type={showSecret ? "text" : "password"}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="JBSWY3DPEHPK3PXP"
            spellCheck={false}
            autoComplete="off"
            className="w-full font-mono text-xs px-3 py-2 pr-20 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setShowSecret((s) => !s)}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1"
          >
            {showSecret ? "Hide" : "Show"}
          </button>
          {secret !== "" && (
            <button
              type="button"
              onClick={() => setSecret("")}
              aria-label="Clear secret"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>
        {err != null && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{err}</p>
        )}
      </div>

      {/* Code display — fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 py-8 gap-4">

        {/* OTP code */}
        <div className={`font-mono tracking-[0.25em] text-[3.25rem] leading-none select-all transition-colors ${codeColor}`}>
          {hasCode ? formatCode(code) : placeholder}
        </div>

        {/* Countdown bar */}
        <div className="w-full max-w-sm space-y-1">
          <div className="h-1 w-full rounded-full bg-border-light dark:bg-border-dark overflow-hidden">
            <div
              className={`h-full rounded-full transition-none ${barColor}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-end">
            <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
              {hasCode ? `${validFor}s` : ""}
            </span>
          </div>
        </div>

        {/* Next code */}
        {hasCode && nextCode && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono tracking-widest">
            Next: {formatCode(nextCode)}
          </p>
        )}
      </div>

      {/* Footer — actions + options */}
      <footer className="shrink-0 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 text-xs text-slate-500 dark:text-slate-400">

          {/* Algorithm */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider">Algorithm</span>
            <div className="flex gap-1">
              {(["sha1", "sha256", "sha512"] as const).map((id) => (
                <OptionPill key={id} active={algorithm === id} onClick={() => setAlgorithm(id)}>
                  {id === "sha1" ? "SHA-1" : id === "sha256" ? "SHA-256" : "SHA-512"}
                </OptionPill>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-border-light dark:bg-border-dark self-center" />

          {/* Digits */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider">Digits</span>
            <div className="flex gap-1">
              {([6, 8] as const).map((d) => (
                <OptionPill key={d} active={digits === d} onClick={() => setDigits(d)}>
                  {d}
                </OptionPill>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-border-light dark:bg-border-dark self-center" />

          {/* Period */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider">Period</span>
            <div className="flex gap-1">
              {([30, 60] as const).map((p) => (
                <OptionPill key={p} active={period === p} onClick={() => setPeriod(p)}>
                  {p}s
                </OptionPill>
              ))}
            </div>
          </div>

          {/* Copy — pushed to right */}
          <div className="ml-auto shrink-0 flex items-center self-center">
            <CopyButton
              value={hasCode ? code : undefined}
              label="Copy"
              variant="primary"
              className="py-1.5 text-[11px] font-semibold uppercase tracking-wider"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
