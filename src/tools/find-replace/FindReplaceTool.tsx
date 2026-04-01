import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton } from "../../components/tool";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { FindReplaceInput } from "../../bindings/FindReplaceInput";
import type { FindReplaceOutput } from "../../bindings/FindReplaceOutput";

const RUST_COMMAND = "find_replace_process";
const TOOL_ID = "find-replace";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

function isFindReplaceDraft(
  raw: unknown
): raw is { text: string; find: string; replace: string } {
  if (typeof raw !== "object" || raw === null) return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.text === "string" &&
    typeof o.find === "string" &&
    typeof o.replace === "string"
  );
}

/** Convert byte ranges (from Rust) to character ranges for JS string.slice. */
function byteRangesToCharRanges(
  text: string,
  byteRanges: number[][]
): number[][] {
  if (byteRanges.length === 0) return [];
  const encoder = new TextEncoder();
  return byteRanges.map(([startByte, endByte]) => {
    let byteCount = 0;
    let charStart = text.length;
    let charEnd = text.length;
    for (let i = 0; i < text.length; i++) {
      const charBytes = encoder.encode(text[i]).length;
      if (byteCount <= startByte && startByte < byteCount + charBytes)
        charStart = i;
      if (byteCount < endByte && endByte <= byteCount + charBytes) {
        charEnd = i + 1;
        break;
      }
      byteCount += charBytes;
    }
    return [charStart, charEnd];
  });
}

/** Build segments for highlight layer. Uses character ranges (after byte→char conversion). */
function buildHighlightedSegments(
  text: string,
  byteRanges: number[][]
): React.ReactNode[] {
  const charRanges = byteRangesToCharRanges(text, byteRanges);
  if (charRanges.length === 0) return [text];
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  charRanges.forEach(([start, end], i) => {
    if (start > lastIndex) {
      segments.push(text.slice(lastIndex, start));
    }
    segments.push(
      <span key={i} className="bg-yellow-400/30 rounded-sm">
        {text.slice(start, end)}
      </span>
    );
    lastIndex = end;
  });
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }
  return segments;
}

function FindReplaceTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [text, setText] = useState("");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");

  useRestoreDraft(TOOL_ID, (raw) => {
    if (!isFindReplaceDraft(raw)) return;
    setText(raw.text);
    setFind(raw.find);
    setReplace(raw.replace);
  });
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regexMode, setRegexMode] = useState(false);
  const [replaceAll, setReplaceAll] = useState(true);
  const [output, setOutput] = useState<FindReplaceOutput | null>(null);
  const [matchRanges, setMatchRanges] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      currentText: string,
      currentFind: string,
      currentReplace: string,
      currentCaseSensitive: boolean,
      currentWholeWord: boolean,
      currentRegexMode: boolean,
      currentReplaceAll: boolean
    ) => {
      setIsLoading(true);
      try {
        const payload: FindReplaceInput = {
          text: currentText,
          find: currentFind,
          replace: currentReplace,
          caseSensitive: currentCaseSensitive,
          wholeWord: currentWholeWord,
          regexMode: currentRegexMode,
          replaceAll: currentReplaceAll,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload,
          { skipHistory: true }
        )) as FindReplaceOutput;
        setOutput(result);
        if (result.error || currentFind.trim() === "") {
          setMatchRanges([]);
        } else {
          setMatchRanges(result.matchRanges ?? []);
        }
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
        setOutput({
          result: currentText,
          matchCount: 0,
          replacedCount: 0,
          matchRanges: [],
          error: message,
        });
        setMatchRanges([]);
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(
        text,
        find,
        replace,
        caseSensitive,
        wholeWord,
        regexMode,
        replaceAll
      );
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, find, replace, caseSensitive, wholeWord, regexMode, replaceAll, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleClear = useCallback(() => {
    setText("");
    setFind("");
    setReplace("");
    setDraft({ text: "", find: "", replace: "" });
    setOutput(null);
    setMatchRanges([]);
  }, [setDraft]);

  const matchCount = output?.matchCount ?? 0;
  const replacedCount = output?.replacedCount ?? 0;
  const hasError = Boolean(output?.error);
  const resultText = output?.result ?? "";
  const showMatchCount = find.trim() !== "";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Top: Find and Replace inputs side by side */}
      <div className="flex gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <div className="flex-1 flex flex-col min-w-0">
          <span className="text-slate-500 text-xs uppercase tracking-wider mb-1">
            Find
          </span>
          <input
            type="text"
            aria-label="Find"
            className="w-full px-3 py-2 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg"
            placeholder="Find..."
            value={find}
            onChange={(e) => {
              const v = e.target.value;
              setFind(v);
              setDraft({ text, find: v, replace });
            }}
            spellCheck={false}
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <span className="text-slate-500 text-xs uppercase tracking-wider mb-1">
            Replace with
          </span>
          <input
            type="text"
            aria-label="Replace with"
            className="w-full px-3 py-2 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg"
            placeholder="Replace with..."
            value={replace}
            onChange={(e) => {
              const v = e.target.value;
              setReplace(v);
              setDraft({ text, find, replace: v });
            }}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Middle: main text area (~50%) with match highlighting */}
      <div className="flex flex-col flex-1 min-h-0 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs shrink-0">
          <span className="text-slate-500">Input</span>
          {showMatchCount && (
            <span
              className={
                matchCount > 0 ? "text-primary" : "text-slate-500"
              }
            >
              {matchCount === 0
                ? "No matches"
                : `${matchCount} ${matchCount === 1 ? "match" : "matches"}`}
            </span>
          )}
        </div>
        <div className="relative flex-1 min-h-[120px] overflow-hidden rounded-lg border border-border-light dark:border-border-dark focus-within:border-primary/40">
          {/* Layer 1 — Highlight div (behind textarea) */}
          <div
            ref={highlightRef}
            aria-hidden="true"
            className="absolute inset-0 p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words overflow-y-auto pointer-events-none select-none text-transparent"
          >
            {buildHighlightedSegments(text, matchRanges)}
          </div>
          {/* Layer 2 — Textarea (on top, transparent background) */}
          <textarea
            aria-label="Text to search in"
            className="absolute inset-0 w-full h-full p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap bg-transparent text-slate-700 dark:text-slate-300 resize-none focus:outline-none overflow-y-auto"
            placeholder="Paste text here..."
            value={text}
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              setDraft({ text: v, find, replace });
            }}
            onScroll={(e) => {
              if (highlightRef.current) {
                highlightRef.current.scrollTop = (
                  e.target as HTMLTextAreaElement
                ).scrollTop;
              }
            }}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Bottom: output panel (~30%) */}
      <div className="flex flex-col h-[30%] min-h-[140px] shrink-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs shrink-0">
          <span className="text-slate-500">Output</span>
          <div className="flex items-center gap-2">
            {resultText !== "" && (
              <span className="text-slate-500 dark:text-slate-400">
                {replacedCount === 0
                  ? "No replacements"
                  : `${replacedCount} replacement${replacedCount === 1 ? "" : "s"} made`}
              </span>
            )}
            <CopyButton
              value={resultText || undefined}
              label="Copy"
              variant="primary"
              className="py-1 text-sm"
              aria-label="Copy output to clipboard"
            />
          </div>
        </div>
        <pre
          aria-live="polite"
          aria-label="Find replace output"
          className={`flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all ${
            hasError ? "text-red-400" : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {hasError
            ? output?.error
            : resultText || (isLoading ? "…" : "Output will appear here")}
        </pre>
      </div>

      {/* Footer: Options | Actions */}
      <footer className="flex items-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Options */}
        <div
          className="flex flex-col gap-1"
          role="group"
          aria-label="Options"
        >
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Options
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              aria-label="Case sensitive"
              onClick={() => setCaseSensitive((v) => !v)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                caseSensitive
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Case sensitive
            </button>
            <button
              type="button"
              aria-label="Whole word"
              disabled={regexMode}
              onClick={() => !regexMode && setWholeWord((v) => !v)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                regexMode
                  ? "opacity-50 cursor-not-allowed text-slate-500"
                  : wholeWord
                    ? "bg-primary text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Whole word
            </button>
            <button
              type="button"
              aria-label="Regex mode"
              onClick={() => setRegexMode((v) => !v)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                regexMode
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Regex
            </button>
            <button
              type="button"
              aria-label="Replace all"
              onClick={() => setReplaceAll((v) => !v)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                replaceAll
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Replace all
            </button>
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
              aria-label="Clear all"
              onClick={handleClear}
              className="px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default FindReplaceTool;
