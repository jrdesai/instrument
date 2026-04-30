import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { LineOperation } from "../../bindings/LineOperation";
import type { LineToolsInput } from "../../bindings/LineToolsInput";
import type { LineToolsOutput } from "../../bindings/LineToolsOutput";

const RUST_COMMAND = "tool_line_tools_process";
const TOOL_ID = "line-tools";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

/** Sort is mutually exclusive — at most one direction, or none. */
type SortMode =
  | "none"
  | "sortAsc"
  | "sortDesc"
  | "sortNaturalAsc"
  | "sortNaturalDesc";

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

function LineToolsTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [text, setText] = useState("");
  useRestoreStringDraft(TOOL_ID, setText);
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [deduplicate, setDeduplicate] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [trimWhitespace, setTrimWhitespace] = useState(false);
  const [removeEmpty, setRemoveEmpty] = useState(false);
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [keepFirst, setKeepFirst] = useState(true);
  const [output, setOutput] = useState<LineToolsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const operations = useMemo<LineOperation[]>(() => {
    const ops: LineOperation[] = [];
    if (sortMode !== "none") ops.push(sortMode);
    if (deduplicate) ops.push("deduplicate");
    if (reverse) ops.push("reverse");
    if (trimWhitespace) ops.push("trimWhitespace");
    if (removeEmpty) ops.push("removeEmpty");
    return ops;
  }, [sortMode, deduplicate, reverse, trimWhitespace, removeEmpty]);

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

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

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
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-300 dark:placeholder:text-slate-500"
            placeholder={
              text.trim()
                ? undefined
                : "Paste or type lines on the left — output updates as you change sort and transform options."
            }
            value={output?.result ?? ""}
          />
        </div>
      </div>

      {error && (
        <div className="border-t border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <footer className="flex shrink-0 flex-wrap items-start gap-x-6 gap-y-3 border-t border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-400">
            Sort
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { value: "none" as const, label: "None" },
                { value: "sortAsc" as const, label: "A → Z" },
                { value: "sortDesc" as const, label: "Z → A" },
                { value: "sortNaturalAsc" as const, label: "Natural A → Z" },
                { value: "sortNaturalDesc" as const, label: "Natural Z → A" },
              ] as const
            ).map(({ value, label }) => (
              <OptionPill
                key={value}
                active={sortMode === value}
                onClick={() => setSortMode(value)}
              >
                {label}
              </OptionPill>
            ))}
          </div>
        </div>

        <div className="hidden w-px self-stretch bg-border-light dark:bg-border-dark md:block" />

        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-400">
            Transform
          </div>
          <div className="flex flex-wrap gap-1">
            <OptionPill
              active={deduplicate}
              onClick={() => setDeduplicate((v) => !v)}
            >
              Deduplicate
            </OptionPill>
            <OptionPill active={reverse} onClick={() => setReverse((v) => !v)}>
              Reverse
            </OptionPill>
            <OptionPill
              active={trimWhitespace}
              onClick={() => setTrimWhitespace((v) => !v)}
            >
              Trim Whitespace
            </OptionPill>
            <OptionPill
              active={removeEmpty}
              onClick={() => setRemoveEmpty((v) => !v)}
            >
              Remove Empty
            </OptionPill>
          </div>
        </div>

        {(sortMode !== "none" || deduplicate) && (
          <>
            <div className="hidden w-px self-stretch bg-border-light dark:bg-border-dark md:block" />
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-400">
                Options
              </div>
              <div className="flex flex-col gap-1.5">
                {sortMode !== "none" || deduplicate ? (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={caseInsensitive}
                      onChange={(e) => setCaseInsensitive(e.target.checked)}
                      className="h-3 w-3 accent-primary"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Case-insensitive
                    </span>
                  </label>
                ) : null}
                {deduplicate ? (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={keepFirst}
                      onChange={(e) => setKeepFirst(e.target.checked)}
                      className="h-3 w-3 accent-primary"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Keep first occurrence
                    </span>
                  </label>
                ) : null}
              </div>
            </div>
          </>
        )}

        <div className="ml-auto flex items-end gap-2 pb-0.5">
          {output && (
            <span className="self-center text-xs text-slate-500 dark:text-slate-400">
              {output.inputLineCount} → {output.outputLineCount} lines
            </span>
          )}
          <CopyButton
            value={output?.result || undefined}
            label="Copy"
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
        </div>
      </footer>
    </div>
  );
}

export default LineToolsTool;
