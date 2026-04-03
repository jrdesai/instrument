import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { CopyButton, ToolbarFooter } from "../../components/tool";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { AnnotatedLine } from "../../bindings/TextDiffAnnotatedLine";
import type { DiffGranularity } from "../../bindings/DiffGranularity";
import type { TextDiffInput } from "../../bindings/TextDiffInput";
import type { TextDiffOutput } from "../../bindings/TextDiffOutput";
import type { LineAnnotation } from "../../bindings/TextDiffLineAnnotation";
import type { InlineSpan } from "../../bindings/TextDiffSpan";

const RUST_COMMAND = "text_diff_process";
const TOOL_ID = "text-diff";
const DEBOUNCE_MS = 300;
const HISTORY_DEBOUNCE_MS = 1500;

function toAnnotatedLines(value: unknown): AnnotatedLine[] {
  if (Array.isArray(value)) return value as AnnotatedLine[];
  return [];
}

function lineClass(annotation: LineAnnotation, side: "left" | "right", hasSpans = false): string {
  const base = "flex min-w-0";
  if (annotation === "unchanged") return `${base} text-slate-400 hover:bg-white/3`;
  if (side === "left" && annotation === "removed") {
    // When inline spans are present, drop the full-line background so span
    // highlights are clearly visible against the neutral background.
    return hasSpans
      ? `${base} text-slate-300 border-l-2 border-red-500/50 pl-3`
      : `${base} bg-red-500/10 text-red-300 border-l-2 border-red-500/50 pl-3`;
  }
  if (side === "right" && annotation === "added") {
    return hasSpans
      ? `${base} text-slate-300 border-l-2 border-emerald-500/50 pl-3`
      : `${base} bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500/50 pl-3`;
  }
  return `${base} text-slate-400`;
}

function prefix(annotation: LineAnnotation, side: "left" | "right"): string {
  if (annotation === "unchanged") return " ";
  if (side === "left") return annotation === "removed" ? "-" : " ";
  return annotation === "added" ? "+" : " ";
}

function InlineContent({
  spans,
  side,
  fallback,
}: {
  spans: InlineSpan[];
  side: "left" | "right";
  fallback: boolean;
}) {
  if (spans.length === 0 || fallback) return null;

  const highlightClass =
    side === "left"
      ? "bg-red-500/50 text-red-100 rounded-sm px-0.5"
      : "bg-emerald-500/50 text-emerald-100 rounded-sm px-0.5";

  return (
    <>
      {spans.map((span, i) => (
        <span key={i} className={span.highlighted ? highlightClass : undefined}>
          {span.text}
        </span>
      ))}
    </>
  );
}

function TextDiffTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const [leftFileName, setLeftFileName] = useState<string | null>(null);
  const [rightFileName, setRightFileName] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<DiffGranularity>("word");
  useRestoreDraft(TOOL_ID, (raw) => {
    const v = raw as { left?: string; right?: string };
    if (typeof v?.left === "string") setLeftInput(v.left);
    if (typeof v?.right === "string") setRightInput(v.right);
  });
  const [output, setOutput] = useState<TextDiffOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const handleLeftUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setLeftFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          setLeftInput(text);
          setDraft({ left: text, right: rightInput });
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [rightInput, setDraft]
  );

  const handleRightUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setRightFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          setRightInput(text);
          setDraft({ left: leftInput, right: text });
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [leftInput, setDraft]
  );

  const handleLeftScroll = useCallback(() => {
    if (isSyncing.current || !rightRef.current || !leftRef.current) return;
    isSyncing.current = true;
    rightRef.current.scrollTop = leftRef.current.scrollTop;
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, []);

  const handleRightScroll = useCallback(() => {
    if (isSyncing.current || !leftRef.current || !rightRef.current) return;
    isSyncing.current = true;
    leftRef.current.scrollTop = rightRef.current.scrollTop;
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, []);

  const runProcess = useCallback(
    async (
      currentLeft: string,
      currentRight: string,
      currentGranularity: DiffGranularity
    ) => {
      const leftTrim = currentLeft.trim();
      const rightTrim = currentRight.trim();
      if (leftTrim === "" && rightTrim === "") {
        setOutput(null);
        setError(null);
        return;
      }
      try {
        const payload: TextDiffInput = {
          left: currentLeft,
          right: currentRight,
          granularity: currentGranularity,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload,
          { skipHistory: true }
        )) as TextDiffOutput;
        setOutput(result);
        setError(null);

        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        historyDebounceRef.current = setTimeout(() => {
          addHistoryEntry(TOOL_ID, {
            input: payload,
            output: result,
            timestamp: Date.now(),
          });
          historyDebounceRef.current = null;
        }, HISTORY_DEBOUNCE_MS);
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
                  : "Diff failed";
        setError(message);
        setOutput(null);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(leftInput, rightInput, granularity);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [leftInput, rightInput, granularity, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleSwap = useCallback(() => {
    const newLeft = rightInput;
    const newRight = leftInput;
    const newLeftName = rightFileName;
    const newRightName = leftFileName;
    setLeftInput(newLeft);
    setRightInput(newRight);
    setLeftFileName(newLeftName);
    setRightFileName(newRightName);
    setDraft({ left: newLeft, right: newRight });
    runProcess(newLeft, newRight, granularity);
  }, [
    leftInput,
    rightInput,
    leftFileName,
    rightFileName,
    granularity,
    runProcess,
    setDraft,
  ]);

  const handleClear = useCallback(() => {
    setLeftInput("");
    setRightInput("");
    setLeftFileName(null);
    setRightFileName(null);
    setDraft({ left: "", right: "" });
    setOutput(null);
    setError(null);
  }, [setDraft]);

  const isEmpty = leftInput.trim() === "" && rightInput.trim() === "";
  const bothHaveContent = leftInput.trim() !== "" && rightInput.trim() !== "";
  const hasResult = output != null;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-col md:flex-row shrink-0 border-b border-border-light dark:border-border-dark md:h-[35%]">
        <div className="flex flex-col flex-1 min-w-0 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {leftFileName ?? "Before"}
              </span>
              {leftFileName ? (
                <button
                  type="button"
                  onClick={() => {
                    setLeftFileName(null);
                    setLeftInput("");
                    setDraft({ left: "", right: rightInput });
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              ) : null}
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload file
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleLeftUpload}
                />
              </label>
            </div>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {leftInput.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            aria-label="Left text"
            className="flex-1 w-full min-h-[160px] md:min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste first text..."
            value={leftInput}
            onChange={(e) => {
              const value = e.target.value;
              setLeftInput(value);
              setDraft({ left: value, right: rightInput });
            }}
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {rightFileName ?? "After"}
              </span>
              {rightFileName ? (
                <button
                  type="button"
                  onClick={() => {
                    setRightFileName(null);
                    setRightInput("");
                    setDraft({ left: leftInput, right: "" });
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              ) : null}
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload file
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleRightUpload}
                />
              </label>
            </div>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {rightInput.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            aria-label="Right text"
            className="flex-1 w-full min-h-[160px] md:min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste second text..."
            value={rightInput}
            onChange={(e) => {
              const value = e.target.value;
              setRightInput(value);
              setDraft({ left: leftInput, right: value });
            }}
          />
        </div>
      </div>

      {bothHaveContent && hasResult && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[40px]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {error && <span className="text-red-400 text-xs">{error}</span>}
            {output?.isIdentical && (
              <span className="text-emerald-400 text-sm">
                ✓ Identical — no differences found
              </span>
            )}
            {!output?.isIdentical && (
              <>
                {output?.addedCount > 0 && (
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs">
                    + {output.addedCount} added
                  </span>
                )}
                {output?.removedCount > 0 && (
                  <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs">
                    - {output.removedCount} removed
                  </span>
                )}
                {output?.unchangedCount > 0 && (
                  <span className="bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded text-xs">
                    {output.unchangedCount} unchanged
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-1 uppercase tracking-wide">
              Granularity
            </span>
            {(["line", "word", "char"] as DiffGranularity[]).map((g) => {
              const labels: Record<DiffGranularity, string> = {
                line: "Line",
                word: "Word",
                char: "Char",
              };
              const isActive = granularity === g;
              const showFallbackIndicator =
                g === "char" && granularity === "char" && output?.hasFallback;

              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  className={`relative flex items-center gap-0.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                  title={
                    showFallbackIndicator
                      ? "Some lines have too many changes and are shown as full-line diffs"
                      : undefined
                  }
                >
                  {labels[g]}
                  {showFallbackIndicator && (
                    <span
                      className="material-symbols-outlined text-[11px] opacity-80"
                      aria-label="Some lines fell back to full-line highlight"
                    >
                      info
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        {isEmpty && (
          <div className="flex flex-1 items-center justify-center text-slate-600 text-sm">
            Paste text into both panels to compare
          </div>
        )}
        {!isEmpty && (
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            <div
              ref={leftRef}
              onScroll={handleLeftScroll}
              className="flex-1 min-w-0 overflow-y-auto md:h-full min-h-[200px] font-mono text-xs leading-relaxed custom-scrollbar border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark"
            >
              <div className="p-4">
                {toAnnotatedLines(output?.leftAnnotated).length === 0 && (
                  <span className="text-slate-500">—</span>
                )}
                {toAnnotatedLines(output?.leftAnnotated).map((line, i) => (
                  <div key={i} className={lineClass(line.annotation, "left", line.spans.length > 0 && !line.fellBack)}>
                    <span className="select-none text-slate-700 w-8 text-right mr-3 flex-shrink-0 inline-block">
                      {line.lineNumber}
                    </span>
                    <span className="w-4 flex-shrink-0 inline-block mr-1">
                      {prefix(line.annotation, "left")}
                    </span>
                    <span className="min-w-0 break-all">
                      {line.spans.length > 0 && !line.fellBack ? (
                        <InlineContent
                          spans={line.spans}
                          side="left"
                          fallback={line.fellBack}
                        />
                      ) : (
                        line.content
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div
              ref={rightRef}
              onScroll={handleRightScroll}
              className="flex-1 min-w-0 overflow-y-auto md:h-full min-h-[200px] font-mono text-xs leading-relaxed custom-scrollbar"
            >
              <div className="p-4">
                {toAnnotatedLines(output?.rightAnnotated).length === 0 && (
                  <span className="text-slate-500">—</span>
                )}
                {toAnnotatedLines(output?.rightAnnotated).map((line, i) => (
                  <div key={i} className={lineClass(line.annotation, "right", line.spans.length > 0 && !line.fellBack)}>
                    <span className="select-none text-slate-700 w-8 text-right mr-3 flex-shrink-0 inline-block">
                      {line.lineNumber}
                    </span>
                    <span className="w-4 flex-shrink-0 inline-block mr-1">
                      {prefix(line.annotation, "right")}
                    </span>
                    <span className="min-w-0 break-all">
                      {line.spans.length > 0 && !line.fellBack ? (
                        <InlineContent
                          spans={line.spans}
                          side="right"
                          fallback={line.fellBack}
                        />
                      ) : (
                        line.content
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ToolbarFooter
        className="items-center justify-end gap-2"
        groups={[
          {
            children: (
              <>
                <CopyButton
                  value={leftInput || undefined}
                  label="Copy Left"
                  variant="outline"
                  className="px-3 py-2"
                />
                <CopyButton
                  value={rightInput || undefined}
                  label="Copy Right"
                  variant="outline"
                  className="px-3 py-2"
                />
              </>
            ),
          },
          {
            children: (
              <>
                <button
                  type="button"
                  onClick={handleSwap}
                  className="rounded-lg border border-border-light bg-panel-light px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:border-border-dark dark:bg-panel-dark dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Swap
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg border border-border-light bg-panel-light px-4 py-2 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

export default TextDiffTool;

