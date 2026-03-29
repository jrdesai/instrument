import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { AnnotatedLine } from "../../bindings/TextDiffAnnotatedLine";
import type { TextDiffInput } from "../../bindings/TextDiffInput";
import type { TextDiffOutput } from "../../bindings/TextDiffOutput";
import type { LineAnnotation } from "../../bindings/TextDiffLineAnnotation";

const RUST_COMMAND = "text_diff_process";
const TOOL_ID = "text-diff";
const DEBOUNCE_MS = 300;
const HISTORY_DEBOUNCE_MS = 1500;

function toAnnotatedLines(value: unknown): AnnotatedLine[] {
  if (Array.isArray(value)) return value as AnnotatedLine[];
  return [];
}

function lineClass(annotation: LineAnnotation, side: "left" | "right"): string {
  const base = "flex min-w-0";
  if (annotation === "unchanged") return `${base} text-slate-400 hover:bg-white/3`;
  if (side === "left" && annotation === "removed") {
    return `${base} bg-red-500/10 text-red-300 border-l-2 border-red-500/50 pl-3`;
  }
  if (side === "right" && annotation === "added") {
    return `${base} bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500/50 pl-3`;
  }
  return `${base} text-slate-400`;
}

function prefix(annotation: LineAnnotation, side: "left" | "right"): string {
  if (annotation === "unchanged") return " ";
  if (side === "left") return annotation === "removed" ? "-" : " ";
  return annotation === "added" ? "+" : " ";
}

function TextDiffTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
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
    async (currentLeft: string, currentRight: string) => {
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
      runProcess(leftInput, rightInput);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [leftInput, rightInput, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleSwap = useCallback(() => {
    const newLeft = rightInput;
    const newRight = leftInput;
    setLeftInput(newLeft);
    setRightInput(newRight);
    setDraft({ left: newLeft, right: newRight });
    runProcess(newLeft, newRight);
  }, [leftInput, rightInput, runProcess, setDraft]);

  const handleClear = useCallback(() => {
    setLeftInput("");
    setRightInput("");
    setDraft({ left: "", right: "" });
    setOutput(null);
    setError(null);
  }, [setDraft]);

  const copyLeft = useCallback(async () => {
    if (leftInput) await navigator.clipboard.writeText(leftInput);
  }, [leftInput]);

  const copyRight = useCallback(async () => {
    if (rightInput) await navigator.clipboard.writeText(rightInput);
  }, [rightInput]);

  const isEmpty = leftInput.trim() === "" && rightInput.trim() === "";
  const bothHaveContent = leftInput.trim() !== "" && rightInput.trim() !== "";
  const hasResult = output != null;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div
        className="flex shrink-0 border-b border-border-light dark:border-border-dark"
        style={{ height: "35%" }}
      >
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              LEFT
            </span>
            <span className="text-slate-600 text-xs">
              {leftInput.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            aria-label="Left text"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
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
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              RIGHT
            </span>
            <span className="text-slate-600 text-xs">
              {rightInput.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            aria-label="Right text"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
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
      )}

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        {isEmpty && (
          <div className="flex flex-1 items-center justify-center text-slate-600 text-sm">
            Paste text into both panels to compare
          </div>
        )}
        {!isEmpty && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div
              ref={leftRef}
              onScroll={handleLeftScroll}
              className="flex-1 min-w-0 overflow-y-auto h-full font-mono text-xs leading-relaxed custom-scrollbar border-r border-border-light dark:border-border-dark"
            >
              <div className="p-4">
                {toAnnotatedLines(output?.leftAnnotated).length === 0 && (
                  <span className="text-slate-500">—</span>
                )}
                {toAnnotatedLines(output?.leftAnnotated).map((line, i) => (
                  <div key={i} className={lineClass(line.annotation, "left")}>
                    <span className="select-none text-slate-700 w-8 text-right mr-3 flex-shrink-0 inline-block">
                      {line.lineNumber}
                    </span>
                    <span className="w-4 flex-shrink-0 inline-block mr-1">
                      {prefix(line.annotation, "left")}
                    </span>
                    <span className="min-w-0 break-all">{line.content}</span>
                  </div>
                ))}
              </div>
            </div>
            <div
              ref={rightRef}
              onScroll={handleRightScroll}
              className="flex-1 min-w-0 overflow-y-auto h-full font-mono text-xs leading-relaxed custom-scrollbar"
            >
              <div className="p-4">
                {toAnnotatedLines(output?.rightAnnotated).length === 0 && (
                  <span className="text-slate-500">—</span>
                )}
                {toAnnotatedLines(output?.rightAnnotated).map((line, i) => (
                  <div key={i} className={lineClass(line.annotation, "right")}>
                    <span className="select-none text-slate-700 w-8 text-right mr-3 flex-shrink-0 inline-block">
                      {line.lineNumber}
                    </span>
                    <span className="w-4 flex-shrink-0 inline-block mr-1">
                      {prefix(line.annotation, "right")}
                    </span>
                    <span className="min-w-0 break-all">{line.content}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <button
          type="button"
          onClick={copyLeft}
          className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Copy Left
        </button>
        <button
          type="button"
          onClick={copyRight}
          className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Copy Right
        </button>
        <button
          type="button"
          onClick={handleSwap}
          className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Swap
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
        >
          Clear
        </button>
      </footer>
    </div>
  );
}

export default TextDiffTool;

