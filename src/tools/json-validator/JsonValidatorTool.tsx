import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useHistoryStore } from "../../store";
import { CodeBlock } from "../../components/ui/CodeBlock";

const RUST_COMMAND = "tool_json_validate";
const TOOL_ID = "json-validator";
const DEBOUNCE_MS = 150;

interface JsonValidateInputPayload {
  value: string;
}

interface JsonValidateOutputPayload {
  isValid: boolean;
  error?: string | null;
  errorLine?: number | null;
  errorColumn?: number | null;
  errorContext?: string | null;
  rootType?: string | null;
  depth?: number | null;
  keyCount?: number | null;
  valueCount?: number | null;
  arrayCount?: number | null;
  objectCount?: number | null;
  stringCount?: number | null;
  numberCount?: number | null;
  booleanCount?: number | null;
  nullCount?: number | null;
  maxArrayLength?: number | null;
  hasDuplicateKeys: boolean;
  formatted?: string | null;
}

const COMMON_MISTAKES = [
  "Keys must be quoted: \"key\" not key",
  "No trailing commas after last item",
  "Strings use double quotes not single quotes",
  "No comments allowed in JSON",
  "No undefined or function values",
];

function rootTypeLabel(t: string): string {
  const labels: Record<string, string> = {
    object: "Object",
    array: "Array",
    string: "String",
    number: "Number",
    boolean: "Boolean",
    null: "Null",
  };
  return labels[t] ?? t;
}

function JsonValidatorTool() {
  const [inputValue, setInputValue] = useState("");
  const [output, setOutput] = useState<JsonValidateOutputPayload | null>(null);
  const [showFormattedPreview, setShowFormattedPreview] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") {
      setOutput(null);
      return;
    }
    try {
      const payload: JsonValidateInputPayload = { value: trimmed };
      const result = (await callTool(
        RUST_COMMAND,
        payload
      )) as JsonValidateOutputPayload;
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
        e instanceof Error ? e.message : String(e ?? "Validation failed");
      setOutput({
        isValid: false,
        error: message,
        hasDuplicateKeys: false,
      });
    }
  }, [addHistoryEntry]);

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
      runProcess(inputValue);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, runProcess]);

  const handleCopyInput = useCallback(async () => {
    if (!inputValue) return;
    try {
      await navigator.clipboard.writeText(inputValue);
    } catch {
      // ignore
    }
  }, [inputValue]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setOutput(null);
  }, []);

  const isEmpty = inputValue.trim() === "";
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
            placeholder="Paste JSON to validate..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        {/* Right panel — result */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              RESULT
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4">
            {/* STATE 1 — Empty */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span
                  className="material-symbols-outlined text-6xl text-slate-700 mb-4"
                  aria-hidden
                >
                  check_circle
                </span>
                <p className="text-slate-700 text-base mb-1">
                  Paste JSON on the left to validate
                </p>
                <p className="text-slate-600 text-sm">
                  Validation result and structure summary will appear here
                </p>
              </div>
            )}

            {/* STATE 2 — Valid */}
            {!isEmpty && output != null && isValid && (
              <>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
                  <p className="text-emerald-400 text-lg font-medium">
                    ✓ Valid JSON
                  </p>
                  {output.rootType && (
                    <p className="text-slate-400 text-sm mt-1">
                      Root type: {rootTypeLabel(output.rootType)}
                    </p>
                  )}
                </div>

                {/* Structure summary grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {output.depth != null && output.depth > 0 && (
                    <div className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                        Depth
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 text-lg font-mono">
                        {output.depth} level{output.depth !== 1 ? "s" : ""}
                      </div>
                    </div>
                  )}
                  {output.keyCount != null && output.keyCount > 0 && (
                    <div className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                        Keys
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 text-lg font-mono">
                        {output.keyCount} total
                      </div>
                    </div>
                  )}
                  {output.objectCount != null && output.objectCount > 0 && (
                    <div className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                        Objects
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 text-lg font-mono">
                        {output.objectCount}
                      </div>
                    </div>
                  )}
                  {output.arrayCount != null && output.arrayCount > 0 && (
                    <div className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                        Arrays
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 text-lg font-mono">
                        {output.arrayCount}
                      </div>
                    </div>
                  )}
                  {output.stringCount != null && output.stringCount > 0 && (
                    <div className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                        Strings
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 text-lg font-mono">
                        {output.stringCount}
                      </div>
                    </div>
                  )}
                  {output.numberCount != null && output.numberCount > 0 && (
                    <div className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                        Numbers
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 text-lg font-mono">
                        {output.numberCount}
                      </div>
                    </div>
                  )}
                  {output.booleanCount != null && output.booleanCount > 0 && (
                    <div className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                        Booleans
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 text-lg font-mono">
                        {output.booleanCount}
                      </div>
                    </div>
                  )}
                  {output.nullCount != null && output.nullCount > 0 && (
                    <div className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                        Nulls
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 text-lg font-mono">
                        {output.nullCount}
                      </div>
                    </div>
                  )}
                  {output.maxArrayLength != null &&
                    output.maxArrayLength > 0 && (
                      <div className="bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                        <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                          Longest array
                        </div>
                        <div className="text-slate-800 dark:text-slate-200 text-lg font-mono">
                          {output.maxArrayLength} items
                        </div>
                      </div>
                    )}
                </div>

                {output.hasDuplicateKeys && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-sm mb-4">
                    ⚠ Duplicate keys detected
                  </div>
                )}

                {/* Formatted preview (collapsible) */}
                {output.formatted && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setShowFormattedPreview((v) => !v)
                      }
                      className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-medium mb-2"
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        aria-hidden
                      >
                        {showFormattedPreview
                          ? "expand_less"
                          : "expand_more"}
                      </span>
                      Formatted Preview
                    </button>
                    {showFormattedPreview && (
                      <CodeBlock
                        code={output.formatted}
                        language="json"
                        maxHeight="300px"
                        showCopyButton
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* STATE 3 — Invalid */}
            {!isEmpty && output != null && !output.isValid && (
              <>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                  <p className="text-red-600 dark:text-red-400 text-lg font-medium">
                    ✗ Invalid JSON
                  </p>
                </div>

                <div className="bg-panel-light dark:bg-panel-dark border border-red-500/20 rounded-lg p-4 mb-4">
                  {output.error && (
                    <p className="text-red-300 text-sm font-mono mb-2">
                      {output.error}
                    </p>
                  )}
                  {output.errorLine != null && output.errorColumn != null && (
                    <p className="text-slate-400 text-xs mb-3">
                      Line {output.errorLine}, Column {output.errorColumn}
                    </p>
                  )}
                  {output.errorContext && (
                    <div className="bg-background-light dark:bg-background-dark rounded p-3 font-mono text-xs text-slate-500 dark:text-slate-400 mb-2 break-all">
                      {output.errorContext}
                    </div>
                  )}
                  {output.errorContext &&
                    output.errorColumn != null &&
                    output.errorColumn > 0 && (
                      <p className="font-mono text-xs text-red-400">
                        {" ".repeat(
                          Math.min(
                            output.errorColumn - 1,
                            output.errorContext.length
                          )
                        )}
                        ^
                      </p>
                    )}
                </div>

                {/* Common mistakes (collapsible) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMistakes((v) => !v)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium mb-2"
                  >
                    <span
                      className="material-symbols-outlined text-base"
                      aria-hidden
                    >
                      {showMistakes ? "expand_less" : "expand_more"}
                    </span>
                    Common JSON mistakes
                  </button>
                  {showMistakes && (
                    <ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
                      {COMMON_MISTAKES.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer — actions only */}
      <footer className="flex items-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <div
          className="flex flex-col gap-1 ml-auto"
          role="group"
          aria-label="Actions"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyInput}
              disabled={!inputValue}
              className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Copy Input
            </button>
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

export default JsonValidatorTool;
