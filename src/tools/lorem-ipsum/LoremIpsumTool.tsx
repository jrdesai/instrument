import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import { callTool } from "../../bridge";
import { CopyButton } from "../../components/tool";
import type { LoremIpsumInput } from "../../bindings/LoremIpsumInput";
import type { LoremIpsumOutput } from "../../bindings/LoremIpsumOutput";
import type { LoremOutputType } from "../../bindings/LoremOutputType";
import { extractErrorMessage } from "../../lib/extractErrorMessage";
import { useHistoryStore } from "../../store";

export const TOOL_ID = "lorem-ipsum";
const RUST_COMMAND = "tool_lorem_ipsum_process";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const COUNT_RANGES = {
  paragraphs: { min: 1, max: 15, default: 3 },
  sentences: { min: 1, max: 30, default: 5 },
  words: { min: 10, max: 200, default: 50 },
} as const;

function OptionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border-light bg-transparent text-slate-500 hover:text-primary dark:border-border-dark dark:text-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

function LoremIpsumTool() {
  const [outputType, setOutputType] =
    useState<LoremOutputType>("paragraphs");
  const [count, setCount] = useState<number>(
    COUNT_RANGES.paragraphs.default
  );
  const [sentencesPerParagraph, setSentencesPerParagraph] = useState(4);
  const [startWithClassic, setStartWithClassic] = useState(true);
  const [asHtml, setAsHtml] = useState(false);
  const [offset, setOffset] = useState(() =>
    Math.floor(Math.random() * 1000)
  );
  const [output, setOutput] = useState<LoremIpsumOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      type: LoremOutputType,
      cnt: number,
      spp: number,
      classic: boolean,
      off: number
    ) => {
      setIsLoading(true);
      try {
        const payload: LoremIpsumInput = {
          outputType: type,
          count: cnt,
          startWithClassic: classic,
          offset: off,
          sentencesPerParagraph: spp,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as LoremIpsumOutput;
        setOutput(result);

        if (!result.error && result.result.length > 0) {
          if (historyDebounceRef.current) {
            clearTimeout(historyDebounceRef.current);
          }
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
        setOutput({
          result: "",
          wordCount: 0,
          paragraphCount: 0,
          sentenceCount: 0,
          error: extractErrorMessage(e, "Failed to generate"),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  const debouncedRun = useDebouncedCallback(runProcess, DEBOUNCE_MS, {
    leading: true,
    trailing: true,
  });

  useEffect(() => {
    void debouncedRun(
      outputType,
      count,
      sentencesPerParagraph,
      startWithClassic,
      offset
    );
  }, [
    outputType,
    count,
    sentencesPerParagraph,
    startWithClassic,
    offset,
    debouncedRun,
  ]);

  useEffect(() => {
    return () => {
      debouncedRun.cancel();
      if (historyDebounceRef.current) {
        clearTimeout(historyDebounceRef.current);
      }
    };
  }, [debouncedRun]);

  const handleOutputTypeChange = (type: LoremOutputType) => {
    setOutputType(type);
    setCount(COUNT_RANGES[type].default);
  };

  const handleRegenerate = () => {
    setOffset(Math.floor(Math.random() * 10000));
  };

  const displayText = useMemo(() => {
    if (!output?.result || output.error) return output?.result ?? "";
    if (!asHtml) return output.result;
    return output.result
      .split("\n\n")
      .filter(Boolean)
      .map((p) => `<p>${p}</p>`)
      .join("\n");
  }, [output, asHtml]);

  const hasStatsRow =
    output != null &&
    !output.error &&
    output.result.length > 0 &&
    !isLoading;

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border-light dark:border-border-dark">
        {hasStatsRow && output && (
          <div className="flex shrink-0 items-center gap-3 border-b border-border-light bg-panel-light px-4 py-1.5 text-xs text-slate-500 dark:border-border-dark dark:bg-panel-dark">
            <span>{output.wordCount} words</span>
            <span>·</span>
            <span>{output.sentenceCount} sentences</span>
            <span>·</span>
            <span>{output.paragraphCount} paragraphs</span>
            <div className="ml-auto">
              <CopyButton value={displayText} label="Copy" />
            </div>
          </div>
        )}

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
          {isLoading && (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              <span className="animate-pulse">Generating…</span>
            </div>
          )}
          {!isLoading && output?.error && (
            <p className="font-mono text-sm text-red-500">{output.error}</p>
          )}
          {!isLoading && output && !output.error && (
            <>
              {asHtml ? (
                <pre className="break-words whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {displayText}
                </pre>
              ) : (
                <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {output.result
                    .split("\n\n")
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-start gap-x-6 gap-y-3 border-t border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-400">
            Type
          </div>
          <div className="flex gap-1">
            {(["paragraphs", "sentences", "words"] as const).map((t) => (
              <OptionPill
                key={t}
                active={outputType === t}
                onClick={() => handleOutputTypeChange(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </OptionPill>
            ))}
          </div>
        </div>

        <div className="hidden w-px self-stretch bg-border-light dark:bg-border-dark md:block" />

        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-400">
            Count{" "}
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {count}
            </span>
          </div>
          <input
            type="range"
            min={COUNT_RANGES[outputType].min}
            max={COUNT_RANGES[outputType].max}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-32 accent-primary"
            aria-label="Count"
          />
        </div>

        {outputType === "paragraphs" && (
          <>
            <div className="hidden w-px self-stretch bg-border-light dark:bg-border-dark md:block" />
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-400">
                Sentences / para{" "}
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {sentencesPerParagraph}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={sentencesPerParagraph}
                onChange={(e) =>
                  setSentencesPerParagraph(Number(e.target.value))
                }
                className="w-28 accent-primary"
                aria-label="Sentences per paragraph"
              />
            </div>
          </>
        )}

        <div className="hidden w-px self-stretch bg-border-light dark:bg-border-dark md:block" />

        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-400">
            Options
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={startWithClassic}
                onChange={(e) => setStartWithClassic(e.target.checked)}
                className="rounded border-border-light text-primary focus:ring-primary dark:border-border-dark"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Start with &quot;Lorem ipsum&quot;
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={asHtml}
                onChange={(e) => setAsHtml(e.target.checked)}
                className="rounded border-border-light text-primary focus:ring-primary dark:border-border-dark"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                HTML output
              </span>
            </label>
          </div>
        </div>

        <div className="ml-auto flex items-end pb-0.5">
          <button
            type="button"
            onClick={handleRegenerate}
            title="Regenerate with different text"
            className="flex items-center gap-1.5 rounded border border-border-light px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-primary/30 hover:text-primary dark:border-border-dark"
          >
            <span className="material-symbols-outlined text-[14px]">
              refresh
            </span>
            Regenerate
          </button>
        </div>
      </footer>
    </div>
  );
}

export default LoremIpsumTool;
