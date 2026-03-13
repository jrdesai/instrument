import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { FormatHint } from "../../components/ui/FormatHint";
import { useHistoryStore } from "../../store";

/** Matches Rust TimestampInput (camelCase). */
interface TimestampInputPayload {
  value: string;
  mode: "toHuman" | "toUnix" | "now";
  unit: "seconds" | "milliseconds";
}

/** Matches Rust TimestampOutput (camelCase). */
interface TimestampOutputPayload {
  unixSeconds: number;
  unixMilliseconds: number;
  iso8601: string;
  rfc2822: string;
  utcHuman: string;
  dateOnly: string;
  timeOnly: string;
  dayOfWeek: string;
  relative: string;
  isFuture: boolean;
  error?: string | null;
}

const RUST_COMMAND = "timestamp_process";
const TOOL_ID = "timestamp-converter";
const DEBOUNCE_MS = 150;
const COPIED_DURATION_MS = 1500;
const NOW_TICK_MS = 1000;

const OUTPUT_FIELDS: {
  id: keyof Omit<
    TimestampOutputPayload,
    "error"
  >;
  label: string;
}[] = [
  { id: "unixSeconds", label: "Unix (seconds)" },
  { id: "unixMilliseconds", label: "Unix (milliseconds)" },
  { id: "iso8601", label: "ISO 8601" },
  { id: "rfc2822", label: "RFC 2822" },
  { id: "utcHuman", label: "UTC Human" },
  { id: "dateOnly", label: "Date only" },
  { id: "timeOnly", label: "Time only" },
  { id: "dayOfWeek", label: "Day of week" },
  { id: "relative", label: "Relative" },
];

type TimestampMode = "toHuman" | "toUnix" | "now";
type TimestampUnit = "seconds" | "milliseconds";

function TimestampConverterTool() {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<TimestampMode>("toHuman");
  const [unit, setUnit] = useState<TimestampUnit>("seconds");
  const [output, setOutput] = useState<TimestampOutputPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy All");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nowTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      currentValue: string,
      currentMode: TimestampMode,
      currentUnit: TimestampUnit
    ) => {
      setIsLoading(true);
      try {
        const payload: TimestampInputPayload = {
          value: currentMode === "now" ? "" : currentValue,
          mode: currentMode,
          unit: currentUnit,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as TimestampOutputPayload;
        setOutput(result);
        if (!result.error) {
          addHistoryEntry(TOOL_ID, {
            input: payload,
            output: result,
            timestamp: Date.now(),
          });
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
          unixSeconds: 0,
          unixMilliseconds: 0,
          iso8601: "",
          rfc2822: "",
          utcHuman: "",
          dateOnly: "",
          timeOnly: "",
          dayOfWeek: "",
          relative: "",
          isFuture: false,
          error: message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (mode === "now") {
      runProcess("", "now", unit);
      nowTickRef.current = setInterval(() => {
        runProcess("", "now", unit);
      }, NOW_TICK_MS);
      return () => {
        if (nowTickRef.current) {
          clearInterval(nowTickRef.current);
          nowTickRef.current = null;
        }
      };
    }
    if (nowTickRef.current) {
      clearInterval(nowTickRef.current);
      nowTickRef.current = null;
    }
    // Don't run when input is empty (toHuman/toUnix) — avoid "Empty timestamp" on load or after clear
    const trimmed = value.trim();
    if (trimmed === "") {
      setOutput(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(value, mode, unit);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, mode, unit, runProcess]);

  const handleClear = useCallback(() => {
    setValue("");
    setOutput(null);
  }, []);

  const handleCopyValue = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (!output || output.error) return;
    const lines = OUTPUT_FIELDS.map(({ id, label }) => {
      const val = output[id];
      const str = typeof val === "boolean" ? (val ? "Future" : "Past") : String(val ?? "");
      return `${label}: ${str}`;
    });
    lines.push(`Is future: ${output.isFuture ? "Future" : "Past"}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyAllLabel("Copied");
      setTimeout(() => setCopyAllLabel("Copy All"), COPIED_DURATION_MS);
    } catch {
      setCopyAllLabel("Copy failed");
      setTimeout(() => setCopyAllLabel("Copy All"), COPIED_DURATION_MS);
    }
  }, [output]);

  const fillNow = useCallback(() => {
    if (mode === "toHuman") {
      setValue(String(Math.floor(Date.now() / 1000)));
    } else if (mode === "toUnix") {
      const d = new Date();
      setValue(d.toISOString().replace(/\.\d{3}Z$/, "Z"));
    }
  }, [mode]);

  const placeholders: Record<TimestampMode, string> = {
    toHuman: "Enter Unix timestamp (e.g. 1709558400)",
    toUnix: "Enter date (e.g. 2024-03-04 12:00:00)",
    now: "",
  };

  const hasError = Boolean(output?.error);
  const displayOutput = hasError ? null : output;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Input */}
      <div className="flex flex-col px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-slate-500 text-xs uppercase tracking-wider mr-1">
            Mode
          </span>
          {(["toHuman", "toUnix", "now"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-label={m === "now" ? "Now" : m === "toHuman" ? "To Human" : "To Unix"}
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                mode === m
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {m === "now" ? "Now" : m === "toHuman" ? "To Human" : "To Unix"}
            </button>
          ))}
        </div>

        {mode === "now" ? (
          <p className="text-slate-500 text-sm">Using current time</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px] flex items-center gap-2">
              <div className="relative flex items-center gap-1 flex-1">
                <input
                  type="text"
                  aria-label="Timestamp or date input"
                  className="flex-1 w-full min-w-0 px-3 py-2 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg"
                  placeholder={placeholders[mode]}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <FormatHint
                  formats={[
                    { label: "Unix seconds", example: "1709558400" },
                    { label: "Unix milliseconds", example: "1709558400000" },
                    { label: "ISO 8601 UTC", example: "2024-03-04T12:00:00Z" },
                    { label: "ISO 8601 offset", example: "2024-03-04T12:00:00+05:30" },
                    { label: "Space separated", example: "2024-03-04 12:00:00" },
                    { label: "Date only", example: "2024-03-04" },
                    { label: "Month name", example: "March 4 2024" },
                    { label: "RFC 2822", example: "Mon, 04 Mar 2024 12:00:00 +0000" },
                  ]}
                  onSelect={(example) => {
                    setValue(example);
                    runProcess(example, mode, unit);
                  }}
                />
              </div>
              <button
                type="button"
                aria-label="Fill with current time"
                onClick={fillNow}
                className="px-2 py-1 text-xs font-medium bg-background-light dark:bg-background-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:border-primary/60 transition-colors"
              >
                Now
              </button>
            </div>
            {mode === "toHuman" && (
              <div className="flex items-center gap-1">
                {(["seconds", "milliseconds"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-label={u === "seconds" ? "Seconds" : "Milliseconds"}
                    onClick={() => setUnit(u)}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      unit === u
                        ? "bg-primary text-white"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {u === "seconds" ? "Seconds" : "Milliseconds"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output cards */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {hasError ? (
          <div className="text-red-400 text-sm font-mono whitespace-pre-wrap">
            {output?.error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {OUTPUT_FIELDS.map(({ id, label }) => {
              const raw = displayOutput?.[id];
              const valueStr =
                typeof raw === "boolean" ? (raw ? "Future" : "Past") : String(raw ?? "");
              const display = valueStr || "—";
              return (
                <div
                  key={id}
                  className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyValue(valueStr)}
                      disabled={!valueStr || valueStr === "—"}
                      className="px-2 py-0.5 text-[10px] font-medium bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:border-primary/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
                    {display}
                  </pre>
                </div>
              );
            })}
            {/* Is future badge card */}
            <div className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  Is future
                </span>
              </div>
              <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                {displayOutput ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      displayOutput.isFuture
                        ? "bg-primary/20 text-primary"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {displayOutput.isFuture ? "Future" : "Past"}
                  </span>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <button
          type="button"
          onClick={handleCopyAll}
          disabled={!displayOutput}
          className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {copyAllLabel}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
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

export default TimestampConverterTool;
