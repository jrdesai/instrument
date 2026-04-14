import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CopyButton, PillButton, ToolbarFooter } from "../../components/tool";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { extractErrorMessage } from "../../lib/extractErrorMessage";
import { useHistoryStore } from "../../store";
import type { EscapeMode } from "../../bindings/EscapeMode";
import type { EscapeTarget } from "../../bindings/EscapeTarget";
import type { StringEscaperInput } from "../../bindings/StringEscaperInput";
import type { StringEscaperOutput } from "../../bindings/StringEscaperOutput";

const RUST_COMMAND = "string_escaper_process";
const TOOL_ID = "string-escaper";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const TARGETS: { value: EscapeTarget; label: string }[] = [
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
  const [output, setOutput] = useState<StringEscaperOutput | null>(null);
  const [mode, setMode] = useState<EscapeMode>("escape");
  const [target, setTarget] = useState<EscapeTarget>("json");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      text: string,
      currentMode: EscapeMode,
      currentTarget: EscapeTarget
    ) => {
      if (text === "") {
        setOutput(null);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: StringEscaperInput = {
          text,
          mode: currentMode,
          target: currentTarget,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload,
          { skipHistory: true }
        )) as StringEscaperOutput;
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
        const message = extractErrorMessage(e, "Failed to run tool");
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
    const newMode: EscapeMode = mode === "escape" ? "unescape" : "escape";
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

      <ToolbarFooter
        groups={[
          {
            label: "Mode",
            children: (
              <>
                <PillButton
                  active={mode === "escape"}
                  onClick={() => setMode("escape")}
                  aria-label="Escape mode"
                >
                  Escape
                </PillButton>
                <PillButton
                  active={mode === "unescape"}
                  onClick={() => setMode("unescape")}
                  aria-label="Unescape mode"
                >
                  Unescape
                </PillButton>
              </>
            ),
          },
          {
            label: "Target",
            children: (
              <div className="flex flex-wrap items-center gap-1.5">
                {TARGETS.map(({ value: t, label }) => (
                  <PillButton
                    key={t}
                    active={target === t}
                    onClick={() => setTarget(t)}
                    aria-label={`Target: ${label}`}
                  >
                    {label}
                  </PillButton>
                ))}
              </div>
            ),
          },
          {
            end: true,
            children: (
              <>
                <button
                  type="button"
                  aria-label="Swap input and output"
                  onClick={handleSwap}
                  className="rounded-lg px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Swap
                </button>
                <button
                  type="button"
                  aria-label="Clear input and output"
                  onClick={handleClear}
                  className="rounded-lg px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Clear
                </button>
                <CopyButton
                  value={resultText || undefined}
                  label="Copy"
                  variant="primary"
                  className="py-1"
                  aria-label="Copy output to clipboard"
                />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

export default StringEscaperTool;
