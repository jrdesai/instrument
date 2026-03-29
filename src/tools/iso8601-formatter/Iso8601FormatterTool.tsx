import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { FormatHint } from "../../components/ui/FormatHint";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { Iso8601Input } from "../../bindings/Iso8601Input";
import type { Iso8601Output } from "../../bindings/Iso8601Output";

const RUST_COMMAND = "iso8601_process";
const TOOL_ID = "iso8601-formatter";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;
const COPIED_DURATION_MS = 1500;

const COMPONENT_FIELDS: {
  id: keyof Iso8601Output;
  label: string;
  isDuration?: boolean;
}[] = [
  { id: "date", label: "Date" },
  { id: "time", label: "Time" },
  { id: "offset", label: "Offset" },
  { id: "utcEquivalent", label: "UTC equivalent" },
  { id: "weekNumber", label: "Week number" },
  { id: "dayOfYear", label: "Day of year" },
  { id: "quarter", label: "Quarter" },
  { id: "dayOfWeek", label: "Day of week" },
  { id: "durationYears", label: "Duration (years)", isDuration: true },
  { id: "durationMonths", label: "Duration (months)", isDuration: true },
  { id: "durationDays", label: "Duration (days)", isDuration: true },
  { id: "durationHours", label: "Duration (hours)", isDuration: true },
  { id: "durationMinutes", label: "Duration (minutes)", isDuration: true },
  { id: "durationSeconds", label: "Duration (seconds)", isDuration: true },
];

const CONVERSION_FIELDS: {
  id: keyof Iso8601Output;
  label: string;
}[] = [
  { id: "asDateOnly", label: "Date only" },
  { id: "asWeekDate", label: "Week date" },
  { id: "asOrdinal", label: "Ordinal" },
  { id: "asUtc", label: "UTC" },
  { id: "asLocalOffset", label: "With offset" },
];

const QUICK_REF_EXAMPLES: { label: string; value: string }[] = [
  { label: "Date:", value: "2024-03-04" },
  { label: "DateTime UTC:", value: "2024-03-04T12:00:00Z" },
  { label: "DateTime offset:", value: "2024-03-04T12:00:00+05:30" },
  { label: "Week date:", value: "2024-W10-1" },
  { label: "Ordinal date:", value: "2024-064" },
  { label: "Duration:", value: "P1Y2M3DT4H5M6S" },
];

function Iso8601FormatterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [value, setValue] = useState("");
  useRestoreStringDraft(TOOL_ID, setValue);
  const [output, setOutput] = useState<Iso8601Output | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy All");
  const [quickRefOpen, setQuickRefOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (currentValue: string) => {
      setIsLoading(true);
      try {
        const payload: Iso8601Input = { value: currentValue };
        const result = (await callTool(
          RUST_COMMAND,
          payload,
          { skipHistory: true }
        )) as Iso8601Output;
        setOutput(result);
        if (result.isValid && !result.error) {
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
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : e && typeof e === "object" && "message" in e
                ? String((e as { message: unknown }).message)
                : e != null
                  ? String(e)
                  : "Failed to run tool";
        setOutput({
          isValid: false,
          inputType: "Invalid",
          date: null,
          time: null,
          offset: null,
          utcEquivalent: null,
          weekNumber: null,
          dayOfYear: null,
          quarter: null,
          dayOfWeek: null,
          asDateOnly: null,
          asWeekDate: null,
          asOrdinal: null,
          asUtc: null,
          asLocalOffset: null,
          durationYears: null,
          durationMonths: null,
          durationDays: null,
          durationHours: null,
          durationMinutes: null,
          durationSeconds: null,
          error: message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(value);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleClear = useCallback(() => {
    setValue("");
    setDraft("");
    setOutput(null);
  }, [setDraft]);

  const handleCopyValue = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (!output || !output.isValid || output.error) return;
    const lines: string[] = [];
    for (const { id, label } of COMPONENT_FIELDS) {
      const v = output[id];
      if (v != null && v !== "") {
        lines.push(`${label}: ${v}`);
      }
    }
    for (const { id, label } of CONVERSION_FIELDS) {
      const v = output[id];
      if (v != null && v !== "") {
        lines.push(`${label}: ${v}`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyAllLabel("Copied");
      setTimeout(() => setCopyAllLabel("Copy All"), COPIED_DURATION_MS);
    } catch {
      setCopyAllLabel("Copy failed");
      setTimeout(() => setCopyAllLabel("Copy All"), COPIED_DURATION_MS);
    }
  }, [output]);

  const fillExample = useCallback(
    (exampleValue: string) => {
      setValue(exampleValue);
      setDraft(exampleValue);
    },
    [setDraft]
  );

  const isEmpty = value.trim() === "";
  const isValid = output?.isValid ?? false;
  const hasError = Boolean(output?.error);
  const inputType = output?.inputType ?? "";
  const isDuration = inputType === "Duration";
  const showComponents = isValid && output;
  const showConversions = isValid && output && !isDuration;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Input */}
      <div className="flex flex-col px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center gap-1 flex-1 min-w-[200px]">
            <input
              type="text"
              aria-label="ISO 8601 input"
              className="flex-1 min-w-0 px-3 py-2 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg"
              placeholder="Enter ISO 8601 string (e.g. 2024-03-04T12:00:00Z)"
              value={value}
              onChange={(e) => {
                const v = e.target.value;
                setValue(v);
                setDraft(v);
              }}
            />
            <FormatHint
              formats={[
                { label: "Date only", example: "2024-03-04" },
                { label: "DateTime UTC", example: "2024-03-04T12:00:00Z" },
                { label: "DateTime offset", example: "2024-03-04T12:00:00+05:30" },
                { label: "Week date", example: "2024-W10-1" },
                { label: "Ordinal date", example: "2024-064" },
                { label: "Duration", example: "P1Y2M3DT4H5M6S" },
              ]}
              onSelect={(example) => {
                setValue(example);
                setDraft(example);
                runProcess(example);
              }}
            />
          </div>
          {!isEmpty && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                isValid
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {isValid ? "✓ Valid" : "✗ Invalid"}
            </span>
          )}
          {isValid && inputType && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
              {inputType}
            </span>
          )}
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {hasError && (
          <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap mb-4">
            {output?.error}
          </div>
        )}

        {showComponents && (
          <section className="mb-6">
            <h2 className="text-slate-500 text-xs uppercase tracking-wider mb-3">
              Components
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {COMPONENT_FIELDS.map(({ id, label, isDuration: dur }) => {
                if (dur && !isDuration) return null;
                if (!dur && isDuration) return null;
                const raw = output[id];
                const valueStr =
                  typeof raw === "number" || typeof raw === "bigint"
                    ? String(raw)
                    : String(raw ?? "");
                const display = valueStr || "—";
                if (isDuration && raw == null) return null;
                return (
                  <div
                    key={id}
                    className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-xs uppercase tracking-wider">
                        {label}
                      </span>
                      {display !== "—" && (
                        <button
                          type="button"
                          onClick={() => handleCopyValue(display)}
                          className="px-2 py-0.5 text-[10px] font-medium bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:border-primary/60 transition-colors"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                    <pre className="font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
                      {display}
                    </pre>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {showConversions && (
          <section className="mb-6">
            <h2 className="text-slate-500 text-xs uppercase tracking-wider mb-3">
              Conversions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {CONVERSION_FIELDS.map(({ id, label }) => {
                const raw = output[id];
                const valueStr = String(raw ?? "");
                const display = valueStr || "N/A";
                const grayed = display === "N/A";
                return (
                  <div
                    key={id}
                    className={`flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3 hover:border-primary/40 transition-colors ${
                      grayed ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        {label}
                      </span>
                      {!grayed && (
                        <button
                          type="button"
                          onClick={() => handleCopyValue(valueStr)}
                          className="px-2 py-0.5 text-[10px] font-medium bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:border-primary/60 transition-colors"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                    <pre className="font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
                      {display}
                    </pre>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick reference */}
        <section className="border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setQuickRefOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <span className="text-xs font-semibold uppercase tracking-wider">
              ISO 8601 Quick Reference
            </span>
            <span className="material-symbols-outlined text-[18px]">
              {quickRefOpen ? "expand_less" : "expand_more"}
            </span>
          </button>
          {quickRefOpen && (
            <div className="px-4 pb-4 pt-0 border-t border-border-light dark:border-border-dark">
              <div className="flex flex-col gap-2 text-xs font-mono text-slate-500">
                {QUICK_REF_EXAMPLES.map(({ label, value: ex }) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => fillExample(ex)}
                    className="flex flex-wrap items-baseline gap-2 text-left hover:text-primary transition-colors"
                  >
                    <span className="shrink-0">{label}</span>
                    <span className="text-slate-400 break-all">{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <button
          type="button"
          onClick={handleCopyAll}
          disabled={!output?.isValid || !!output?.error}
          className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {copyAllLabel}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
        >
          Clear
        </button>
        {isLoading && (
          <span className="ml-auto text-xs text-primary">Processing…</span>
        )}
      </footer>
    </div>
  );
}

export default Iso8601FormatterTool;
