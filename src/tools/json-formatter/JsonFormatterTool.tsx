import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useHistoryStore } from "../../store";
import { CodeBlock } from "../../components/ui/CodeBlock";

type JsonFormatMode = "pretty" | "minify" | "compact";
type IndentStyle = "spaces2" | "spaces4" | "tab";

const RUST_COMMAND = "tool_json_format";
const TOOL_ID = "json-formatter";
const DEBOUNCE_MS = 150;
const COPIED_DURATION_MS = 1500;

interface JsonFormatInputPayload {
  value: string;
  mode: JsonFormatMode;
  indent: IndentStyle;
  sortKeys: boolean;
}

interface JsonFormatOutputPayload {
  result: string;
  isValid: boolean;
  lineCount: number;
  charCount: number;
  sizeBytes: number;
  sizeOriginalBytes: number;
  compressionRatio?: number | null;
  error?: string | null;
  errorLine?: number | null;
  errorColumn?: number | null;
}

function JsonFormatterTool() {
  const [inputValue, setInputValue] = useState("");
  const [mode, setMode] = useState<JsonFormatMode>("pretty");
  const [indent, setIndent] = useState<IndentStyle>("spaces2");
  const [sortKeys, setSortKeys] = useState(false);
  const [output, setOutput] = useState<JsonFormatOutputPayload | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      value: string,
      currentMode: JsonFormatMode,
      currentIndent: IndentStyle,
      currentSortKeys: boolean
    ) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: JsonFormatInputPayload = {
          value: trimmed,
          mode: currentMode,
          indent: currentIndent,
          sortKeys: currentSortKeys,
        };
        const result = (await callTool(RUST_COMMAND, payload)) as JsonFormatOutputPayload;
        setOutput(result);
        if (result.isValid) {
          addHistoryEntry(TOOL_ID, {
            input: payload,
            output: result,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : String(e ?? "Format failed");
        setOutput({
          result: "",
          isValid: false,
          lineCount: 0,
          charCount: 0,
          sizeBytes: 0,
          sizeOriginalBytes: trimmed.length,
          error: message,
        });
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = inputValue.trim();
    if (trimmed === "") {
      setOutput(null);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    debounceRef.current = setTimeout(() => {
      runProcess(inputValue, mode, indent, sortKeys);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, mode, indent, sortKeys, runProcess]);

  const handleCopy = useCallback(async () => {
    if (!output?.isValid || !output.result) return;
    try {
      await navigator.clipboard.writeText(output.result);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy"), COPIED_DURATION_MS);
    } catch {
      // ignore
    }
  }, [output]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setOutput(null);
  }, []);

  const isEmpty = inputValue.trim() === "";
  const showValidBadge = !isEmpty && output != null;
  const isValid = output?.isValid === true;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left panel — input */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              INPUT
            </span>
            {!isEmpty && (
              <span className="text-slate-600 text-xs">
                {inputValue.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="JSON input"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste JSON here..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        {/* Right panel — output */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                OUTPUT
              </span>
              {showValidBadge && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    isValid
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {isValid ? "✓ Valid JSON" : "✗ Invalid JSON"}
                </span>
              )}
            </div>
            {isValid && output && (
              <span className="text-slate-600 text-xs">
                {output.lineCount} lines · {output.charCount.toLocaleString()}{" "}
                chars · {output.sizeBytes.toLocaleString()} bytes
                {output.compressionRatio != null &&
                  output.compressionRatio > 0 &&
                  ` · ${output.compressionRatio.toFixed(1)}× smaller`}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 pt-4 pb-4">
            {isEmpty && (
              <p className="text-slate-600 text-sm m-0">
                Formatted JSON will appear here
              </p>
            )}
            {!isEmpty && output && !output.isValid && (
              <div className="text-red-400 text-xs font-mono">
                {output.errorLine != null && output.errorColumn != null && (
                  <span className="text-slate-500">
                    Line {output.errorLine}, Column {output.errorColumn}:{" "}
                  </span>
                )}
                {output.error ?? "Invalid JSON"}
              </div>
            )}
            {isValid && output?.result && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <CodeBlock
                  code={output.result}
                  language="json"
                  maxHeight="100%"
                  showCopyButton
                  className="h-full min-h-0 flex flex-col overflow-hidden"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-0 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Group 1 — Mode */}
        <div className="flex flex-col gap-1" role="group" aria-label="Mode">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Mode
          </span>
          <div className="flex gap-1">
            {(["pretty", "minify", "compact"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${
                  mode === m
                    ? "bg-primary text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-2" />

        {/* Group 2 — Indent (Pretty only) */}
        {mode === "pretty" && (
          <>
            <div className="flex flex-col gap-1" role="group" aria-label="Indent">
              <span className="text-slate-600 text-xs uppercase tracking-wider">
                Indent
              </span>
              <div className="flex gap-1">
                {(
                  [
                    { value: "spaces2" as const, label: "2 spaces" },
                    { value: "spaces4" as const, label: "4 spaces" },
                    { value: "tab" as const, label: "Tab" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIndent(value)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      indent === value
                        ? "bg-primary text-white"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-2" />
          </>
        )}

        {/* Group 3 — Options */}
        <div className="flex flex-col gap-1" role="group" aria-label="Options">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Options
          </span>
          <div className="flex gap-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                aria-label="Sort keys"
                checked={sortKeys}
                onChange={(e) => setSortKeys(e.target.checked)}
                className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">Sort keys</span>
            </label>
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-2" />

        {/* Group 4 — Actions (pushed right) */}
        <div
          className="flex flex-col gap-1 ml-auto"
          role="group"
          aria-label="Actions"
        >
          <div className="flex items-center gap-2">
            {output?.isValid && output.result && (
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {copyLabel}
              </button>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default JsonFormatterTool;
