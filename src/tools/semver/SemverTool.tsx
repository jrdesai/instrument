import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader, ToolbarFooter } from "../../components/tool";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { SemverCompareResult } from "../../bindings/SemverCompareResult";
import type { SemverInput } from "../../bindings/SemverInput";
import type { SemverOutput } from "../../bindings/SemverOutput";

const TOOL_ID = "semver";
const RUST_COMMAND = "semver_process";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

type DraftShape = { version: string; compareWith: string; range: string };

function compareLabel(r: SemverCompareResult): string {
  switch (r) {
    case "lessThan":
      return "Older (first < second)";
    case "equal":
      return "Equal";
    case "greaterThan":
      return "Newer (first > second)";
    default:
      return String(r);
  }
}

function SemverTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [version, setVersion] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [range, setRange] = useState("");
  const [output, setOutput] = useState<SemverOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  useRestoreDraft(TOOL_ID, (raw) => {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const d = raw as Partial<DraftShape>;
      if (typeof d.version === "string") setVersion(d.version);
      if (typeof d.compareWith === "string") setCompareWith(d.compareWith);
      if (typeof d.range === "string") setRange(d.range);
    }
  });

  const persistDraft = useCallback(() => {
    setDraft({
      version,
      compareWith,
      range,
    } satisfies DraftShape);
  }, [setDraft, version, compareWith, range]);

  const run = useCallback(
    async (v: string, c: string, r: string) => {
      if (!v.trim()) {
        setOutput(null);
        return;
      }
      const payload: SemverInput = {
        version: v.trim(),
        compareWith: c.trim() ? c.trim() : null,
        range: r.trim() ? r.trim() : null,
      };
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as SemverOutput;
      setOutput(result);
      if (!result.error) {
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        historyDebounceRef.current = setTimeout(() => {
          addHistoryEntry(TOOL_ID, {
            input: payload,
            output: result,
            timestamp: Date.now(),
          });
          historyDebounceRef.current = null;
        }, HISTORY_DEBOUNCE_MS);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void run(version, compareWith, range);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [version, compareWith, range, run]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const hasOk = output && !output.error;

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-100 dark:bg-background-dark">
      <PanelHeader label="Semver" meta="Parse, compare, ranges, bumps" />

      <div className="grid shrink-0 gap-3 border-b border-border-light p-4 dark:border-border-dark sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Version
          </label>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g. 1.2.3 or v1.2.3-beta.1"
            className="w-full rounded-lg border border-border-light bg-panel-light px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-panel-dark"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Compare with (optional)
          </label>
          <input
            value={compareWith}
            onChange={(e) => setCompareWith(e.target.value)}
            placeholder="e.g. 1.10.0"
            className="w-full rounded-lg border border-border-light bg-panel-light px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-panel-dark"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Range (optional)
          </label>
          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="e.g. ^1.0.0 or >=1.2.3, <2.0.0"
            className="w-full rounded-lg border border-border-light bg-panel-light px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-panel-dark"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        {!version.trim() && (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Enter a version to parse. Optional fields add comparison and requirement checks.
          </div>
        )}
        {output?.error && <div className="p-6 text-sm text-red-400">{output.error}</div>}
        {hasOk && output && (
          <div className="border-t border-border-light px-4 py-4 dark:border-border-dark">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "Canonical", value: output.canonical },
                { label: "Major", value: output.major != null ? String(output.major) : "" },
                { label: "Minor", value: output.minor != null ? String(output.minor) : "" },
                { label: "Patch", value: output.patch != null ? String(output.patch) : "" },
                { label: "Prerelease", value: output.prerelease },
                { label: "Build", value: output.buildMetadata },
                { label: "Next major", value: output.bumpedMajor ?? "" },
                { label: "Next minor", value: output.bumpedMinor ?? "" },
                { label: "Next patch", value: output.bumpedPatch ?? "" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="relative rounded-lg border border-border-light bg-panel-light p-2 text-xs dark:border-border-dark dark:bg-panel-dark"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                    <CopyButton
                      value={value || undefined}
                      variant="icon"
                      aria-label={`Copy ${label.toLowerCase()}`}
                    />
                  </div>
                  <div className="mt-0.5 break-all font-mono text-sm leading-snug text-slate-200">
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>

            {(output.compareResult != null || output.compareError) && (
              <div className="mt-4 border-t border-border-light pt-4 dark:border-border-dark">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Comparison
                </p>
                {output.compareError && (
                  <p className="text-xs text-amber-400">{output.compareError}</p>
                )}
                {output.compareResult != null && (
                  <p className="text-xs text-slate-300">{compareLabel(output.compareResult)}</p>
                )}
              </div>
            )}

            {(output.rangeSatisfied != null || output.rangeError) && (
              <div className="mt-4 border-t border-border-light pt-4 dark:border-border-dark">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Range
                </p>
                {output.rangeError && <p className="text-xs text-amber-400">{output.rangeError}</p>}
                {output.rangeSatisfied != null && (
                  <p className={`text-xs ${output.rangeSatisfied ? "text-emerald-400" : "text-red-400"}`}>
                    {output.rangeSatisfied ? "Satisfies the requirement." : "Does not satisfy the requirement."}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ToolbarFooter
        className="justify-end"
        groups={[
          {
            children: (
              <button
                type="button"
                onClick={() => {
                  setVersion("");
                  setCompareWith("");
                  setRange("");
                  setDraft({ version: "", compareWith: "", range: "" });
                  setOutput(null);
                }}
                className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400"
              >
                Clear
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}

export default SemverTool;
