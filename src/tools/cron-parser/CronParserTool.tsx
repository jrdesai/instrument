import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";

const RUST_COMMAND = "cron_process";
const TOOL_ID = "cron-parser";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;
const COPIED_DURATION_MS = 1500;
const NEXT_RUN_COUNT = 5;

interface CronInputPayload {
  expression: string;
  count?: number;
}

interface CronOutputPayload {
  isValid: boolean;
  description: string;
  nextRuns: string[];
  error?: string | null;
}

function CronParserTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [expression, setExpression] = useState("");
  useRestoreStringDraft(TOOL_ID, setExpression);
  const [output, setOutput] = useState<CronOutputPayload | null>(null);
  const [copyExprLabel, setCopyExprLabel] = useState("Copy expression");
  const [cheatOpen, setCheatOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (expr: string) => {
      const trimmed = expr.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: CronInputPayload = {
          expression: trimmed,
          count: NEXT_RUN_COUNT,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as CronOutputPayload;
        setOutput(result);
        if (result.isValid) {
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
          e instanceof Error ? e.message : String(e ?? "Cron parse failed");
        setOutput({
          isValid: false,
          description: "",
          nextRuns: [],
          error: message,
        });
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = expression.trim();
    if (trimmed === "") {
      setOutput(null);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    debounceRef.current = setTimeout(() => {
      runProcess(expression);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [expression, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleCopyExpression = useCallback(async () => {
    const text = expression.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyExprLabel("Copied");
      setTimeout(() => setCopyExprLabel("Copy expression"), COPIED_DURATION_MS);
    } catch {
      setCopyExprLabel("Copy failed");
      setTimeout(() => setCopyExprLabel("Copy expression"), COPIED_DURATION_MS);
    }
  }, [expression]);

  const isEmpty = expression.trim() === "";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {/* Expression */}
        <div className="shrink-0 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              Cron expression
            </span>
            <div className="flex items-center gap-2">
              {!isEmpty && (
                <span className="text-slate-600 dark:text-slate-400 text-xs">
                  {expression.length} chars
                </span>
              )}
              <button
                type="button"
                onClick={handleCopyExpression}
                disabled={isEmpty}
                className="px-2 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {copyExprLabel}
              </button>
            </div>
          </div>
          <textarea
            aria-label="Cron expression"
            className="w-full min-h-[100px] max-h-[200px] p-4 font-mono text-sm text-slate-800 dark:text-slate-200 bg-background-light dark:bg-background-dark resize-y outline-none focus:ring-0 border-0 placeholder:text-slate-500"
            placeholder={'e.g. 0 0 * * *  (every day at midnight UTC)'}
            spellCheck={false}
            value={expression}
            onChange={(e) => {
              const v = e.target.value;
              setExpression(v);
              setDraft(v);
            }}
          />
        </div>

        {/* Quick reference */}
        <div className="shrink-0 border-b border-border-light dark:border-border-dark">
          <button
            type="button"
            onClick={() => setCheatOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-2 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <span>Cron quick reference</span>
            <span className="material-symbols-outlined text-base" aria-hidden>
              {cheatOpen ? "expand_less" : "expand_more"}
            </span>
          </button>
          {cheatOpen && (
            <div className="px-4 pb-3 text-xs text-slate-600 dark:text-slate-400 font-mono space-y-1 border-t border-border-light dark:border-border-dark bg-panel-light/50 dark:bg-panel-dark/30">
              <p className="pt-2 text-slate-500 dark:text-slate-500 not-italic font-sans">
                Use standard{" "}
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  5-field Unix cron
                </span>{" "}
                (minute first). A leading{" "}
                <span className="font-mono text-primary">0</span> second is added for parsing.
              </p>
              <p className="text-slate-500 dark:text-slate-500 not-italic font-sans">
                Field order:{" "}
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  minute · hour · day-of-month · month · day-of-week
                </span>
              </p>
              <p>
                <span className="text-primary">*</span> any value
              </p>
              <p>
                <span className="text-primary">*/5</span> every 5 units (in minute
                field → every 5 minutes)
              </p>
              <p>
                <span className="text-primary">1-5</span> range
              </p>
              <p>
                <span className="text-primary">1,3</span> list
              </p>
            </div>
          )}
        </div>

        {/* Status + description */}
        <div className="shrink-0 px-4 py-3 border-b border-border-light dark:border-border-dark space-y-2">
          {!isEmpty && output && (
            <>
              <div className="flex items-center gap-2 text-sm">
                {output.isValid ? (
                  <>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Valid
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      Invalid
                    </span>
                    {output.error && (
                      <span className="text-red-600/90 dark:text-red-400/90 text-xs font-mono">
                        {output.error}
                      </span>
                    )}
                  </>
                )}
              </div>
              {output.isValid && output.description && (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-500 mr-1">
                    Description:
                  </span>
                  {output.description}
                </p>
              )}
            </>
          )}
          {isEmpty && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter a 5-field cron expression (UTC). Results update as you type.
            </p>
          )}
        </div>

        {/* Next runs */}
        <div className="flex-1 min-h-0 px-4 py-3">
          {!isEmpty && output?.isValid && output.nextRuns.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Next {output.nextRuns.length} runs (UTC)
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 font-mono text-sm text-slate-800 dark:text-slate-200">
                {output.nextRuns.map((run, i) => (
                  <li key={`${run}-${i}`} className="break-all">
                    {run}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CronParserTool;
