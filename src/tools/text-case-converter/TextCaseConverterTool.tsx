import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CopyButton } from "../../components/tool";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { CaseInput } from "../../bindings/CaseInput";
import type { CaseOutput } from "../../bindings/CaseOutput";

const RUST_COMMAND = "case_process";
const TOOL_ID = "text-case-converter";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const CASES: {
  id: keyof Omit<CaseOutput, "wordCount" | "error">;
  label: string;
}[] = [
  { id: "camelCase", label: "camelCase" },
  { id: "pascalCase", label: "PascalCase" },
  { id: "snakeCase", label: "snake_case" },
  { id: "screamingCase", label: "SCREAMING_SNAKE_CASE" },
  { id: "kebabCase", label: "kebab-case" },
  { id: "titleCase", label: "Title Case" },
  { id: "upperCase", label: "UPPER CASE" },
  { id: "lowerCase", label: "lower case" },
  { id: "dotCase", label: "dot.case" },
  { id: "pathCase", label: "path/case" },
];

function TextCaseConverterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState<CaseOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setOutput(null);
        setError(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: CaseInput = { text };
        const result = (await callTool(
          RUST_COMMAND,
          payload,
          { skipHistory: true }
        )) as CaseOutput;
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
      runProcess(input);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput(null);
    setError(null);
  }, [setDraft]);

  const copyAllValue = useMemo(() => {
    if (!output) return "";
    return CASES.map(({ id, label }) => {
      const v = output[id] || "";
      return `${label}: ${v}`;
    }).join("\n");
  }, [output]);

  const wordCount = output?.wordCount ?? 0;
  const wordLabel = wordCount === 1 ? "word" : "words";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Input */}
      <div className="flex flex-col px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span>Input</span>
          <span>
            {wordCount} {wordLabel}
          </span>
        </div>
        <textarea
          aria-label="Text to convert between cases"
          className="w-full h-28 p-3 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm resize-none outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg"
          placeholder="Enter text to convert..."
          value={input}
          onChange={(e) => {
            const v = e.target.value;
            setInput(v);
            setDraft(v);
          }}
        />
      </div>

      {/* Output cards */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {error ? (
          <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CASES.map(({ id, label }) => {
              const value = output?.[id] ?? "";
              const display = value || "—";
              return (
                <div
                  key={id}
                  className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                    <CopyButton
                      value={value || undefined}
                      label="Copy"
                      variant="outline"
                      className="px-2 py-0.5 text-[10px] font-medium"
                    />
                  </div>
                  <pre className="font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
                    {display}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <CopyButton
          value={copyAllValue || undefined}
          label="Copy all"
          variant="outline"
          className="px-3 py-2"
        />

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

export default TextCaseConverterTool;

