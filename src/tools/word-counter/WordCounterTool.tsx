import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { WordCounterInput } from "../../bindings/WordCounterInput";
import type { WordCounterOutput } from "../../bindings/WordCounterOutput";

const RUST_COMMAND = "word_counter_process";
const TOOL_ID = "word-counter";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const STAT_KEYS: {
  key: keyof Omit<WordCounterOutput, "error">;
  label: string;
}[] = [
  { key: "words", label: "Words" },
  { key: "charactersWithSpaces", label: "Characters" },
  { key: "charactersWithoutSpaces", label: "Characters (no spaces)" },
  { key: "lines", label: "Lines" },
  { key: "sentences", label: "Sentences" },
  { key: "paragraphs", label: "Paragraphs" },
  { key: "uniqueWords", label: "Unique Words" },
  { key: "avgWordLength", label: "Avg Word Length" },
  { key: "readingTimeSeconds", label: "Reading Time" },
];

function formatReadingTime(seconds: number): string {
  if (seconds < 60) return "< 1 min";
  if (seconds < 120) return "1 min";
  const mins = Math.round(seconds / 60);
  return `${mins} mins`;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const display = value === "—" || value === "" ? "—" : String(value);
  return (
    <div className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3 hover:border-primary/40 transition-colors">
      <span className="font-mono text-2xl font-bold text-primary">
        {display}
      </span>
      <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
        {label}
      </span>
    </div>
  );
}

function WordCounterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState<WordCounterOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (currentInput: string) => {
      if (!currentInput.trim()) {
        setOutput(null);
        setError(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: WordCounterInput = { text: currentInput };
        const result = (await callTool(
          RUST_COMMAND,
          payload,
          { skipHistory: true }
        )) as WordCounterOutput;
        setOutput(result);
        setError(result.error ?? null);
        // Schedule a history entry 1.5s after the last successful run.
        // If the user keeps typing the timer resets, so only the settled
        // value (when they pause) is recorded.
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

  // Cancel pending history capture on unmount to avoid writing stale state.
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

  const hasOutput = output != null && !output.error;

  function getStatDisplay(key: keyof Omit<WordCounterOutput, "error">): string | number {
    if (!hasOutput || !output) return "—";
    if (key === "readingTimeSeconds") {
      return output.readingTimeSeconds > 0 ? formatReadingTime(output.readingTimeSeconds) : "—";
    }
    if (key === "avgWordLength") {
      return output.words > 0 ? Number(output.avgWordLength.toFixed(1)) : "—";
    }
    return output[key] as number;
  }

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex-1 flex min-h-0">
        {/* Left panel: input textarea (~60% height via flex) */}
        <div className="flex flex-col w-[55%] min-w-0 border-r border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
          <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
            <span className="text-xs text-slate-500 dark:text-slate-400">Input</span>
          </div>
          <div className="flex-1 min-h-0 p-4">
            <textarea
              aria-label="Text to analyse"
              className="w-full h-full min-h-[200px] p-3 bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 font-mono text-sm resize-none outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg"
              placeholder="Paste or type text to analyse..."
              value={input}
              onChange={(e) => {
                const v = e.target.value;
                setInput(v);
                setDraft(v);
              }}
            />
          </div>
        </div>

        {/* Right panel: stats grid */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
          {error ? (
            <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STAT_KEYS.map(({ key, label }) => (
                <StatCard
                  key={key}
                  label={label}
                  value={getStatDisplay(key)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
        >
          Clear
        </button>
        {isLoading && (
          <span className="text-xs text-primary">Analysing…</span>
        )}
      </footer>
    </div>
  );
}

export default WordCounterTool;
