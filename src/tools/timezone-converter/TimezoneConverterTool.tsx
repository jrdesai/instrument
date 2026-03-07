import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useHistoryStore } from "../../store";
import {
  formatTimezoneLabel,
  getTimezoneList,
} from "./timezoneLists";

/** Matches Rust TimezoneInput (camelCase). */
interface TimezoneInputPayload {
  datetime: string;
  fromTz: string;
  toTz: string;
}

/** Matches Rust TimezoneOutput (camelCase). */
interface TimezoneOutputPayload {
  result: string;
  resultIso: string;
  fromOffset: string;
  toOffset: string;
  fromAbbr: string;
  toAbbr: string;
  fromDst: boolean;
  toDst: boolean;
  difference: string;
  error?: string | null;
}

const RUST_COMMAND = "timezone_process";
const TOOL_ID = "timezone-converter";
const DEBOUNCE_MS = 150;
const COPIED_DURATION_MS = 1500;

const OUTPUT_CARDS: {
  id: keyof Omit<TimezoneOutputPayload, "error">;
  label: string;
}[] = [
  { id: "result", label: "Result datetime" },
  { id: "resultIso", label: "ISO 8601" },
  { id: "fromOffset", label: "From offset" },
  { id: "toOffset", label: "To offset" },
  { id: "fromAbbr", label: "From abbreviation" },
  { id: "toAbbr", label: "To abbreviation" },
  { id: "fromDst", label: "DST (from)" },
  { id: "toDst", label: "DST (to)" },
  { id: "difference", label: "Difference" },
];

function TimezoneSelect({
  id,
  label,
  value,
  onChange,
  timezoneList,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (tz: string) => void;
  timezoneList: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return timezoneList;
    const q = search.trim().toLowerCase();
    return timezoneList.filter((tz) => tz.toLowerCase().includes(q));
  }, [timezoneList, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = value || "Select timezone...";
  const showSearch = open;

  return (
    <div ref={containerRef} className="flex flex-col flex-1 min-w-0">
      <span className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">
        {label}
      </span>
      <div className="relative">
        <input
          type="text"
          id={id}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="listbox"
          role="combobox"
          autoComplete="off"
          value={open ? search : displayValue}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setSearch("");
            }
          }}
          className="w-full px-3 py-2 bg-background-dark text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-dark rounded-lg"
        />
        {showSearch && (
          <ul
            role="listbox"
            className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto custom-scrollbar py-1 bg-panel-dark border border-border-dark rounded-lg shadow-lg"
          >
            {filtered.slice(0, 100).map((tz) => (
              <li
                key={tz}
                role="option"
                aria-selected={value === tz}
                onClick={() => {
                  onChange(tz);
                  setOpen(false);
                  setSearch("");
                }}
                className={`px-3 py-2 text-sm font-mono cursor-pointer transition-colors ${
                  value === tz
                    ? "bg-primary/20 text-primary"
                    : "text-slate-200 hover:bg-slate-700"
                }`}
              >
                {formatTimezoneLabel(tz)}
              </li>
            ))}
            {filtered.length > 100 && (
              <li className="px-3 py-2 text-xs text-slate-500">
                Type to narrow ({filtered.length} total)
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function TimezoneConverterTool() {
  const [datetime, setDatetime] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  });
  const [fromTz, setFromTz] = useState("UTC");
  const [toTz, setToTz] = useState("America/New_York");
  const [output, setOutput] = useState<TimezoneOutputPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy All");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const timezoneList = useMemo(() => getTimezoneList(), []);

  const runProcess = useCallback(
    async (
      currentDatetime: string,
      currentFromTz: string,
      currentToTz: string
    ) => {
      setIsLoading(true);
      try {
        const payload: TimezoneInputPayload = {
          datetime: currentDatetime,
          fromTz: currentFromTz,
          toTz: currentToTz,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as TimezoneOutputPayload;
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
          result: "",
          resultIso: "",
          fromOffset: "",
          toOffset: "",
          fromAbbr: "",
          toAbbr: "",
          fromDst: false,
          toDst: false,
          difference: "",
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
      runProcess(datetime, fromTz, toTz);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [datetime, fromTz, toTz, runProcess]);

  const handleSwap = useCallback(() => {
    setFromTz(toTz);
    setToTz(fromTz);
    runProcess(datetime, toTz, fromTz);
  }, [datetime, fromTz, toTz, runProcess]);

  const handleClear = useCallback(() => {
    setDatetime("");
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
    const lines = OUTPUT_CARDS.map(({ id, label }) => {
      const val = output[id];
      const str =
        typeof val === "boolean" ? (val ? "Active" : "Inactive") : String(val ?? "");
      return `${label}: ${str}`;
    });
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
    const d = new Date();
    setDatetime(d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ""));
  }, []);

  const hasError = Boolean(output?.error);
  const displayOutput = hasError ? null : output;

  return (
    <div className="flex flex-col h-full bg-background-dark text-slate-100 font-display">
      {/* Top: datetime input */}
      <div className="flex flex-col px-4 py-3 border-b border-border-dark bg-panel-dark">
        <span className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">
          Date/time
        </span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label="Date/time to convert"
            className="flex-1 px-3 py-2 bg-background-dark text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-dark rounded-lg"
            placeholder="Enter date/time (e.g. 2024-03-04 12:00:00)"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
          <button
            type="button"
            aria-label="Use current date and time"
            onClick={fillNow}
            className="px-3 py-2 text-sm font-medium bg-background-dark text-slate-400 border border-border-dark rounded-lg hover:text-primary hover:border-primary/60 transition-colors shrink-0"
          >
            Use now
          </button>
        </div>
      </div>

      {/* Middle: timezone selectors + swap */}
      <div className="flex items-end gap-2 px-4 py-3 border-b border-border-dark bg-panel-dark">
        <TimezoneSelect
          id="from-tz"
          label="From timezone"
          value={fromTz}
          onChange={setFromTz}
          timezoneList={timezoneList}
        />
        <button
          type="button"
          aria-label="Swap from and to timezone"
          onClick={handleSwap}
          className="shrink-0 p-2 text-slate-400 hover:text-primary hover:bg-slate-700 rounded-lg transition-colors mb-0.5"
          title="Swap"
        >
          <span className="font-mono text-lg" aria-hidden>
            ⇄
          </span>
        </button>
        <TimezoneSelect
          id="to-tz"
          label="To timezone"
          value={toTz}
          onChange={setToTz}
          timezoneList={timezoneList}
        />
      </div>

      {/* Bottom: output cards (2 columns) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {hasError ? (
          <div className="text-red-400 text-sm font-mono whitespace-pre-wrap">
            {output?.error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OUTPUT_CARDS.map(({ id, label }) => {
              const raw = displayOutput?.[id];
              const isDst = id === "fromDst" || id === "toDst";
              const copyVal =
                typeof raw === "boolean" ? (raw ? "Active" : "Inactive") : String(raw ?? "");

              return (
                <div
                  key={id}
                  className="flex flex-col border border-border-dark bg-panel-dark rounded-lg p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-xs uppercase tracking-wider">
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyValue(copyVal)}
                      disabled={!copyVal || copyVal === "—"}
                      className="px-2 py-0.5 text-[10px] font-medium bg-background-dark text-slate-300 border border-border-dark rounded-lg hover:text-primary hover:border-primary/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  {isDst && typeof raw === "boolean" ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        raw
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {raw ? "Active" : "Inactive"}
                    </span>
                  ) : (
                    <pre className="font-mono text-sm text-slate-200 whitespace-pre-wrap break-all">
                      {typeof raw === "boolean" ? (raw ? "Active" : "Inactive") : String(raw ?? "") || "—"}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-dark bg-panel-dark shrink-0">
        <button
          type="button"
          onClick={handleCopyAll}
          disabled={!displayOutput}
          className="px-3 py-2 text-xs font-medium bg-panel-dark text-slate-300 border border-border-dark rounded-lg hover:text-primary hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {copyAllLabel}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm bg-panel-dark text-slate-400 border border-border-dark rounded-lg hover:text-slate-200 hover:border-slate-500 transition-colors"
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

export default TimezoneConverterTool;
