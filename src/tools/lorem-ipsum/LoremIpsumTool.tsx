import { useCallback, useState } from "react";
import { callTool } from "../../bridge";
import { useHistoryStore } from "../../store";

type LoremOutputType = "paragraphs" | "sentences" | "words";

/** Matches Rust LoremIpsumInput (camelCase). */
interface LoremIpsumInputPayload {
  outputType: LoremOutputType;
  count: number;
  startWithClassic: boolean;
}

/** Matches Rust LoremIpsumOutput (camelCase). */
interface LoremIpsumOutputPayload {
  result: string;
  wordCount: number;
  paragraphCount: number;
  sentenceCount: number;
  error?: string | null;
}

const RUST_COMMAND = "lorem_ipsum_process";
const TOOL_ID = "lorem-ipsum";
const COPIED_DURATION_MS = 1500;
const DEFAULT_COUNT = 3;

function LoremIpsumTool() {
  const [outputType, setOutputType] = useState<LoremOutputType>("paragraphs");
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [startWithClassic, setStartWithClassic] = useState(true);
  const [output, setOutput] = useState<LoremIpsumOutputPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      currentType: LoremOutputType,
      currentCount: number,
      currentStartClassic: boolean
    ) => {
      setIsLoading(true);
      setOutput(null);
      try {
        const payload: LoremIpsumInputPayload = {
          outputType: currentType,
          count: currentCount,
          startWithClassic: currentStartClassic,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as LoremIpsumOutputPayload;
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
          wordCount: 0,
          paragraphCount: 0,
          sentenceCount: 0,
          error: message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  const handleGenerate = useCallback(() => {
    runProcess(outputType, count, startWithClassic);
  }, [outputType, count, startWithClassic, runProcess]);

  const handleCountChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.min(50, Math.max(1, value));
    setCount(clamped);
  }, []);

  const handleCopy = useCallback(async () => {
    const text = output?.result ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy"), COPIED_DURATION_MS);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy"), COPIED_DURATION_MS);
    }
  }, [output?.result]);

  const handleClear = useCallback(() => {
    setOutput(null);
  }, []);

  const hasContent = output != null && !output.error && output.result !== "";
  const stats =
    hasContent && output
      ? `${output.wordCount} words · ${output.sentenceCount} sentences · ${output.paragraphCount} paragraphs`
      : null;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Output panel */}
      <div className="flex flex-col flex-1 min-h-0 border-b border-border-light dark:border-border-dark">
        {stats && (
          <div className="px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 shrink-0">
            {stats}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
          {output?.error ? (
            <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap">
              {output.error}
            </div>
          ) : !hasContent ? (
            <p className="text-slate-500 text-sm">
              Click Generate to create lorem ipsum text
            </p>
          ) : (
            <div className="font-mono text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {output.result.split("\n\n").map((para, i) => (
                <p key={i} className="mb-4 last:mb-0">
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer: Type | Count | Options | Actions */}
      <footer className="flex items-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Type */}
        <div className="flex flex-col gap-1" role="group" aria-label="Type">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Type
          </span>
          <div className="flex gap-1">
            {(
              [
                { value: "paragraphs" as const, label: "Paragraphs" },
                { value: "sentences" as const, label: "Sentences" },
                { value: "words" as const, label: "Words" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-label={`Type: ${label}`}
                onClick={() => setOutputType(value)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  outputType === value
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

        {/* Count */}
        <div className="flex flex-col gap-1" role="group" aria-label="Count">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Count
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease count"
              onClick={() => handleCountChange(count - 1)}
              className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => handleCountChange(Number(e.target.value))}
              className="w-14 px-2 py-1 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              aria-label="Increase count"
              onClick={() => handleCountChange(count + 1)}
              className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

        {/* Options */}
        <div className="flex flex-col gap-1" role="group" aria-label="Options">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Options
          </span>
          <div className="flex gap-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                aria-label='Start with "Lorem ipsum..."'
                checked={startWithClassic}
                onChange={(e) => setStartWithClassic(e.target.checked)}
                className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">
                Start with &quot;Lorem ipsum...&quot;
              </span>
            </label>
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
              onClick={handleGenerate}
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading && (
                <span
                  className="w-3 h-3 rounded-full border-2 border-border-dark border-t-white animate-spin"
                  aria-hidden
                />
              )}
              {isLoading ? "Generating…" : "Generate"}
            </button>
            {hasContent && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 text-sm font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {copyLabel}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LoremIpsumTool;
