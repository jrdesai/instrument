import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CopyButton, PanelHeader, ToolbarFooter } from "../../components/tool";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useFileDrop } from "../../hooks/useFileDrop";
import { useHistoryStore } from "../../store";
import type { AnnotatedLine } from "../../bindings/JsonDiffAnnotatedLine";
import type { JsonDiffOutput } from "../../bindings/JsonDiffOutput";
import type { LineAnnotation } from "../../bindings/JsonDiffLineAnnotation";

const RUST_COMMAND = "tool_json_diff";
const TOOL_ID = "json-diff";
const DEBOUNCE_MS = 300;
const HISTORY_DEBOUNCE_MS = 1500;
const TRUNCATE_LEN = 40;

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "…";
}

/** Normalize backend response to an array (handles string/other if IPC or web layer changes). */
function toAnnotatedLines(value: unknown): AnnotatedLine[] {
  if (Array.isArray(value)) return value as AnnotatedLine[];
  return [];
}

function prefixForAnnotation(annotation: LineAnnotation, side: "left" | "right"): string {
  if (annotation === "unchanged") return " ";
  if (side === "left") return annotation === "removed" || annotation === "changed" ? (annotation === "removed" ? "-" : "~") : " ";
  return annotation === "added" || annotation === "changed" ? (annotation === "added" ? "+" : "~") : " ";
}

function lineClassForAnnotation(annotation: LineAnnotation, side: "left" | "right"): string {
  const base = "flex min-w-0";
  if (annotation === "unchanged") return `${base} text-slate-400 hover:bg-white/3`;
  if (side === "left") {
    if (annotation === "removed") return `${base} bg-red-500/10 text-red-300 border-l-2 border-red-500/50 pl-3`;
    if (annotation === "changed") return `${base} bg-amber-500/10 text-amber-300 border-l-2 border-amber-500/50 pl-3`;
  } else {
    if (annotation === "added") return `${base} bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500/50 pl-3`;
    if (annotation === "changed") return `${base} bg-amber-500/10 text-amber-300 border-l-2 border-amber-500/50 pl-3`;
  }
  return `${base} text-slate-400 hover:bg-white/3`;
}

function JsonDiffTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  useRestoreDraft(TOOL_ID, (raw) => {
    const v = raw as { left?: string; right?: string };
    if (typeof v?.left === "string") setLeftInput(v.left);
    if (typeof v?.right === "string") setRightInput(v.right);
  });
  const [output, setOutput] = useState<JsonDiffOutput | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [leftFileDropError, setLeftFileDropError] = useState<string | null>(null);
  const [rightFileDropError, setRightFileDropError] = useState<string | null>(null);
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
        return;
      }
      try {
        const result = (await callTool(RUST_COMMAND, {
          left: currentLeft,
          right: currentRight,
        }, { skipHistory: true })) as JsonDiffOutput;
        setOutput(result);
        if (result.leftValid && result.rightValid) {
          if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
          historyDebounceRef.current = setTimeout(() => {
            addHistoryEntry(TOOL_ID, {
              input: { left: currentLeft, right: currentRight },
              output: result,
              timestamp: Date.now(),
            });
            historyDebounceRef.current = null;
          }, HISTORY_DEBOUNCE_MS);
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : String(e ?? "Diff failed");
        setOutput({
          isIdentical: false,
          leftValid: leftTrim === "" ? true : false,
          rightValid: rightTrim === "" ? true : false,
          changes: [],
          addedCount: 0,
          removedCount: 0,
          changedCount: 0,
          unchangedCount: 0,
          leftAnnotated: [],
          rightAnnotated: [],
          error: message,
        });
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

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

  const { isDragging: isDraggingLeft, dropZoneProps: dropLeft } = useFileDrop({
    onFile: (text) => {
      setLeftFileDropError(null);
      setLeftInput(text);
      setDraft({ left: text, right: rightInput });
    },
    onError: (m) => setLeftFileDropError(m),
  });

  const { isDragging: isDraggingRight, dropZoneProps: dropRight } = useFileDrop({
    onFile: (text) => {
      setRightFileDropError(null);
      setRightInput(text);
      setDraft({ left: leftInput, right: text });
    },
    onError: (m) => setRightFileDropError(m),
  });

  const handleSwap = useCallback(() => {
    const newLeft = rightInput;
    const newRight = leftInput;
    setLeftFileDropError(null);
    setRightFileDropError(null);
    setLeftInput(newLeft);
    setRightInput(newRight);
    setDraft({ left: newLeft, right: newRight });
    runProcess(newLeft, newRight);
  }, [leftInput, rightInput, runProcess, setDraft]);

  const handleClear = useCallback(() => {
    setLeftInput("");
    setRightInput("");
    setLeftFileDropError(null);
    setRightFileDropError(null);
    setDraft({ left: "", right: "" });
    setOutput(null);
  }, [setDraft]);

  const isEmpty = leftInput.trim() === "" && rightInput.trim() === "";
  const bothHaveContent = leftInput.trim() !== "" && rightInput.trim() !== "";
  const hasResult = output != null;
  const changeCount = output?.changes?.length ?? 0;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Section 1 — Input panels (35% height) */}
      <div className="flex flex-col md:flex-row shrink-0 border-b border-border-light dark:border-border-dark md:h-[35%]">
        <div
          className="relative flex flex-col flex-1 min-w-0 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark"
          {...dropLeft}
        >
          {isDraggingLeft && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[32px] text-primary/60">
                upload_file
              </span>
              <span className="text-sm font-medium text-primary/70">Drop file to load</span>
            </div>
          )}
          {leftFileDropError ? (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {leftFileDropError}
            </p>
          ) : null}
          <PanelHeader
            label="Left"
            meta={`${leftInput.length.toLocaleString()} chars`}
          />
          <textarea
            aria-label="Left JSON"
            className="flex-1 w-full min-h-[160px] md:min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste first JSON..."
            value={leftInput}
            onChange={(e) => {
              const value = e.target.value;
              setLeftFileDropError(null);
              setLeftInput(value);
              setDraft({ left: value, right: rightInput });
            }}
          />
        </div>
        <div className="relative flex flex-col flex-1 min-w-0" {...dropRight}>
          {isDraggingRight && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[32px] text-primary/60">
                upload_file
              </span>
              <span className="text-sm font-medium text-primary/70">Drop file to load</span>
            </div>
          )}
          {rightFileDropError ? (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {rightFileDropError}
            </p>
          ) : null}
          <PanelHeader
            label="Right"
            meta={`${rightInput.length.toLocaleString()} chars`}
          />
          <textarea
            aria-label="Right JSON"
            className="flex-1 w-full min-h-[160px] md:min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder="Paste second JSON..."
            value={rightInput}
            onChange={(e) => {
              const value = e.target.value;
              setRightFileDropError(null);
              setRightInput(value);
              setDraft({ left: leftInput, right: value });
            }}
          />
        </div>
      </div>

      {/* Section 2 — Summary bar (only when both have content) */}
      {bothHaveContent && hasResult && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0 min-h-[40px]">
          {!output?.leftValid && (
            <span className="text-red-400 text-xs">Left: invalid JSON</span>
          )}
          {!output?.rightValid && (
            <span className="text-red-400 text-xs">
              {!output?.leftValid && " · "}
              Right: invalid JSON
            </span>
          )}
          {output?.error && output?.leftValid && output?.rightValid && (
            <span className="text-red-400 text-xs">{output.error}</span>
          )}
          {output?.isIdentical && (
            <span className="text-emerald-400 text-sm">
              ✓ Identical — no differences found
            </span>
          )}
          {!output?.isIdentical && output?.leftValid && output?.rightValid && (
            <>
              {output.addedCount > 0 && (
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs">
                  + {output.addedCount} added
                </span>
              )}
              {output.removedCount > 0 && (
                <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs">
                  − {output.removedCount} removed
                </span>
              )}
              {output.changedCount > 0 && (
                <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs">
                  ~ {output.changedCount} changed
                </span>
              )}
              {output.unchangedCount > 0 && (
                <span className="bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded text-xs">
                  {" "}
                  {output.unchangedCount} unchanged
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Section 3 — Inline diff panels */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        {isEmpty && (
          <div className="flex flex-1 items-center justify-center text-slate-600 text-sm">
            Paste JSON into both panels to compare
          </div>
        )}
        {!isEmpty && (
          <>
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
                  {toAnnotatedLines(output?.leftAnnotated).map((line) => (
                    <div
                      key={`left-${line.lineNumber}-${line.annotation}`}
                      className={lineClassForAnnotation(line.annotation, "left")}
                    >
                      <span className="select-none text-slate-700 w-8 text-right mr-3 flex-shrink-0 inline-block">
                        {line.lineNumber}
                      </span>
                      <span className="w-4 flex-shrink-0 inline-block mr-1">
                        {prefixForAnnotation(line.annotation, "left")}
                      </span>
                      <span className="min-w-0 break-all">{line.content}</span>
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
                  {toAnnotatedLines(output?.rightAnnotated).map((line) => (
                    <div
                      key={`right-${line.lineNumber}-${line.annotation}`}
                      className={lineClassForAnnotation(line.annotation, "right")}
                    >
                      <span className="select-none text-slate-700 w-8 text-right mr-3 flex-shrink-0 inline-block">
                        {line.lineNumber}
                      </span>
                      <span className="w-4 flex-shrink-0 inline-block mr-1">
                        {prefixForAnnotation(line.annotation, "right")}
                      </span>
                      <span className="min-w-0 break-all">{line.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {changeCount > 0 && (
              <div className="border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
                <button
                  type="button"
                  onClick={() => setChangesOpen((o) => !o)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm"
                >
                  <span className="text-xs uppercase tracking-wider">
                    Changes ({changeCount})
                  </span>
                  <span className="material-symbols-outlined text-base">
                    {changesOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {changesOpen && (
                  <div className="max-h-48 overflow-auto custom-scrollbar px-4 pb-4 space-y-2">
                    {output?.changes?.map((c, i) => (
                      <div
                        key={`${c.changeType}-${c.path}-${i}`}
                        className="flex flex-wrap items-center gap-2 text-xs"
                      >
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${
                            c.changeType === "added"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : c.changeType === "removed"
                                ? "bg-red-500/10 text-red-400"
                                : c.changeType === "changed"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {c.changeType === "added"
                            ? "+"
                            : c.changeType === "removed"
                              ? "−"
                              : c.changeType === "changed"
                                ? "~"
                                : "T"}
                        </span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {c.path}
                        </span>
                        {(c.changeType === "changed" ||
                          c.changeType === "typeChanged") && (
                          <span className="text-slate-500">
                            <span className="text-red-400">
                              {truncate(
                                c.leftValue ?? "null",
                                TRUNCATE_LEN
                              )}
                            </span>
                            {" → "}
                            <span className="text-emerald-400">
                              {truncate(
                                c.rightValue ?? "null",
                                TRUNCATE_LEN
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
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

export default JsonDiffTool;
