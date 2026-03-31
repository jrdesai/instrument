import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader, ToolbarFooter } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { LineOperation } from "../../bindings/LineOperation";
import type { LineToolsInput } from "../../bindings/LineToolsInput";
import type { LineToolsOutput } from "../../bindings/LineToolsOutput";

const RUST_COMMAND = "line_tools_process";
const TOOL_ID = "line-tools";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const AVAILABLE_OPS: { label: string; value: LineOperation }[] = [
  { label: "Sort A->Z", value: "sortAsc" },
  { label: "Sort Z->A", value: "sortDesc" },
  { label: "Natural A->Z", value: "sortNaturalAsc" },
  { label: "Natural Z->A", value: "sortNaturalDesc" },
  { label: "Deduplicate", value: "deduplicate" },
  { label: "Reverse", value: "reverse" },
  { label: "Trim Whitespace", value: "trimWhitespace" },
  { label: "Remove Empty", value: "removeEmpty" },
];

function LineToolsTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [text, setText] = useState("");
  useRestoreStringDraft(TOOL_ID, setText);
  const [operations, setOperations] = useState<LineOperation[]>(["sortAsc"]);
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [keepFirst, setKeepFirst] = useState(true);
  const [output, setOutput] = useState<LineToolsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (currentText: string, currentOperations: LineOperation[]) => {
      if (!currentText.trim()) {
        setOutput(null);
        setError(null);
        return;
      }
      const payload: LineToolsInput = {
        text: currentText,
        operations: currentOperations,
        keepFirst,
        caseInsensitive,
      };
      try {
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as LineToolsOutput;
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
        setError(e instanceof Error ? e.message : "Line tools failed");
        setOutput(null);
      }
    },
    [addHistoryEntry, caseInsensitive, keepFirst]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(text, operations);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, operations, runProcess]);

  const hasSortOrDedup = operations.some((op) =>
    [
      "sortAsc",
      "sortDesc",
      "sortNaturalAsc",
      "sortNaturalDesc",
      "deduplicate",
    ].includes(op)
  );
  const hasDedup = operations.includes("deduplicate");

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col border-r border-border-light dark:border-border-dark">
          <PanelHeader
            label="Input"
            meta={`${text.split("\n").length.toLocaleString()} lines`}
          />
          <textarea
            aria-label="Input text"
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-700 placeholder:text-slate-500 focus:outline-none dark:text-slate-300"
            placeholder="Paste text..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDraft(e.target.value);
            }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <PanelHeader
            label="Output"
            meta={
              output
                ? `${output.outputLineCount.toLocaleString()} lines`
                : "No result yet"
            }
          />
          <textarea
            aria-label="Output text"
            readOnly
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-200 focus:outline-none"
            value={output?.result ?? ""}
          />
        </div>
      </div>

      {error && (
        <div className="border-t border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <ToolbarFooter
        groups={[
          {
            label: "Chain",
            children: (
              <div className="flex flex-wrap items-center gap-1.5">
                {operations.map((op, idx) => {
                  const label = AVAILABLE_OPS.find((o) => o.value === op)?.label ?? op;
                  return (
                    <span
                      key={`${op}-${idx}`}
                      className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {idx > 0 && <span className="mr-0.5 text-slate-500">{"->"}</span>}
                      {label}
                      <button
                        type="button"
                        onClick={() =>
                          setOperations((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="ml-0.5 text-primary/60 hover:text-primary"
                        aria-label="Remove step"
                      >
                        x
                      </button>
                    </span>
                  );
                })}
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setOperations((prev) => [...prev, e.target.value as LineOperation]);
                      e.target.value = "";
                    }
                  }}
                  className="rounded border border-border-light bg-panel-light px-2 py-1 text-xs text-slate-500 dark:border-border-dark dark:bg-panel-dark"
                >
                  <option value="">+ Add step</option>
                  {AVAILABLE_OPS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
            ),
          },
          {
            label: "Options",
            children: (
              <>
                {hasSortOrDedup && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={caseInsensitive}
                      onChange={(e) => setCaseInsensitive(e.target.checked)}
                      className="h-3 w-3 accent-primary"
                    />
                    Case-insensitive
                  </label>
                )}
                {hasDedup && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={keepFirst}
                      onChange={(e) => setKeepFirst(e.target.checked)}
                      className="h-3 w-3 accent-primary"
                    />
                    Keep first
                  </label>
                )}
              </>
            ),
          },
          {
            end: true,
            label: "Actions",
            children: (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {output
                    ? `${output.inputLineCount} lines -> ${output.outputLineCount} lines`
                    : "No output"}
                </span>
                {output?.lineEnding === "crlf" && (
                  <span className="text-[10px] text-slate-500">CRLF</span>
                )}
                <CopyButton
                  value={output?.result || undefined}
                  label="Copy Output"
                  variant="outline"
                />
                <button
                  type="button"
                  onClick={() => {
                    setText("");
                    setDraft("");
                    setOutput(null);
                    setError(null);
                  }}
                  className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-600 transition-colors hover:text-primary dark:border-border-dark dark:bg-panel-dark dark:text-slate-400"
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

export default LineToolsTool;
