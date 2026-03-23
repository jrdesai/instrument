import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";

/** Matches Rust EscapeMode (camelCase). */
type EscapeModePayload = "escape" | "unescape";

/** Matches Rust EscapeTarget (camelCase). */
type EscapeTargetPayload =
  | "json"
  | "regex"
  | "html"
  | "sql"
  | "shell"
  | "csv";

/** Matches Rust StringEscaperInput (camelCase). */
interface StringEscaperInputPayload {
  text: string;
  mode: EscapeModePayload;
  target: EscapeTargetPayload;
}

/** Matches Rust StringEscaperOutput (camelCase). */
interface StringEscaperOutputPayload {
  result: string;
  changes: number;
  error?: string | null;
}

const RUST_COMMAND = "string_escaper_process";
const TOOL_ID = "string-escaper";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;
const COPIED_DURATION_MS = 1500;

const TARGETS: { value: EscapeTargetPayload; label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "regex", label: "Regex" },
  { value: "html", label: "HTML" },
  { value: "sql", label: "SQL" },
  { value: "shell", label: "Shell" },
  { value: "csv", label: "CSV" },
];

function StringEscaperTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState<StringEscaperOutputPayload | null>(null);
  const [mode, setMode] = useState<EscapeModePayload>("escape");
  const [target, setTarget] = useState<EscapeTargetPayload>("json");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const [copyLabel, setCopyLabel] = useState("Copy output");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      text: string,
      currentMode: EscapeModePayload,
      currentTarget: EscapeTargetPayload
    ) => {
      if (text === "") {
        setOutput(null);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: StringEscaperInputPayload = {
          text,
          mode: currentMode,
          target: currentTarget,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload,
          { skipHistory: true }
        )) as StringEscaperOutputPayload;
        setOutput(result);
        setError(result.error ?? null);
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
        setError(message);
        setOutput(null);
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(input, mode, target);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, mode, target, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleSwap = useCallback(() => {
    const newInput = output?.result ?? "";
    const newMode: EscapeModePayload = mode === "escape" ? "unescape" : "escape";
    setInput(newInput);
    setDraft(newInput);
    setOutput(null);
    setMode(newMode);
    runProcess(newInput, newMode, target);
  }, [output?.result, mode, target, runProcess, setDraft]);

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput(null);
    setError(null);
  }, [setDraft]);

  const handleCopy = useCallback(async () => {
    const text = output?.result ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy output"), COPIED_DURATION_MS);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy output"), COPIED_DURATION_MS);
    }
  }, [output?.result]);

  const lines = input.split("\n").length;
  const charCount = input.length;
  const changes = output?.changes ?? 0;
  const resultText = output?.result ?? "";
  const showChangesNote =
    !error && input.trim() !== "" && output != null && changes === 0;

  const isDragging = useRef(false);
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftPanelPercent(Math.min(90, Math.max(10, pct)));
    };
    const up = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0">
        {/* Input panel */}
        <div
          className="flex flex-col border-r border-border-light dark:border-border-dark shrink-0"
          style={{ width: `${leftPanelPercent}%` }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>Lines: {lines}</span>
            <span>Chars: {charCount}</span>
          </div>
          <textarea
            aria-label="String escaper input text"
            className="flex-1 w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
            placeholder={
              mode === "escape"
                ? "Enter text to escape…"
                : "Enter escaped string to unescape…"
            }
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              setInput(v);
              setDraft(v);
            }}
            spellCheck={false}
          />
        </div>

        {/* Draggable divider */}
        <button
          type="button"
          aria-label="Resize panels"
          className="w-1 shrink-0 bg-border-light dark:bg-border-dark hover:bg-primary/50 transition-colors cursor-col-resize"
          onMouseDown={handleDividerMouseDown}
        />

        {/* Output panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>Output</span>
            {changes > 0 && (
              <span>
                {changes}{" "}
                {mode === "escape" ? "escapes" : "unescapes"} applied
              </span>
            )}
            {showChangesNote && (
              <span className="text-slate-500">No escaping needed</span>
            )}
            {isLoading && <span className="text-primary">Processing…</span>}
          </div>
          <pre
            aria-live="polite"
            aria-label="String escaper output"
            className={`flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all ${
              error ? "text-red-400" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {error ? error : resultText || (isLoading ? "…" : "")}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Mode */}
        <div className="flex flex-col gap-1" role="group" aria-label="Mode">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Mode
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Escape mode"
              onClick={() => setMode("escape")}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                mode === "escape"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Escape
            </button>
            <button
              type="button"
              aria-label="Unescape mode"
              onClick={() => setMode("unescape")}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                mode === "unescape"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Unescape
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

        {/* Target */}
        <div className="flex flex-col gap-1" role="group" aria-label="Target">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Target
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {TARGETS.map(({ value: t, label }) => (
              <button
                key={t}
                type="button"
                aria-label={`Target: ${label}`}
                onClick={() => setTarget(t)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  target === t
                    ? "bg-primary text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

        {/* Actions */}
        <div
          className="flex flex-col gap-1 ml-auto"
          role="group"
          aria-label="Actions"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Swap input and output"
              onClick={handleSwap}
              className="px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Swap
            </button>
            <button
              type="button"
              aria-label="Clear input and output"
              onClick={handleClear}
              className="px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              aria-label="Copy output to clipboard"
              onClick={handleCopy}
              disabled={!resultText}
              className="px-3 py-1 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copyLabel}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default StringEscaperTool;
