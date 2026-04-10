import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { UnicodeChar } from "../../bindings/UnicodeChar";
import type { UnicodeInspectInput } from "../../bindings/UnicodeInspectInput";
import type { UnicodeInspectOutput } from "../../bindings/UnicodeInspectOutput";

const TOOL_ID = "unicode-inspector";
const RUST_COMMAND = "tool_unicode_inspect";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

export default function UnicodeInspectorTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState<UnicodeInspectOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runInspect = useCallback(
    async (text: string) => {
      if (text === "") {
        setOutput(null);
        return;
      }
      setIsLoading(true);
      try {
        const payload: UnicodeInspectInput = { text };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as UnicodeInspectOutput;
        setOutput(result);
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
          e instanceof Error ? e.message : e != null ? String(e) : "Inspection failed";
        setOutput({
          chars: [],
          totalChars: 0,
          totalBytes: 0,
          error: message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runInspect(input);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, runInspect]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const rows = output?.chars ?? [];
  const showTable = input.length > 0 && rows.length > 0 && !output?.error;

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <div className="shrink-0 border-b border-border-light px-4 py-3 dark:border-border-dark">
        <textarea
          className="h-[120px] w-full resize-none rounded-lg border border-border-light bg-panel-light p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-border-dark dark:bg-panel-dark"
          placeholder="Type or paste any text…"
          value={input}
          spellCheck={false}
          onChange={(e) => {
            setInput(e.target.value);
            setDraft(e.target.value);
          }}
        />
      </div>

      {output?.error ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {output.error}
        </div>
      ) : null}

      <div className="custom-scrollbar min-h-0 flex-1 overflow-auto">
        {!input ? (
          <div className="flex h-full items-center justify-center px-4 text-sm text-slate-500 dark:text-slate-400">
            Enter text above to inspect characters
          </div>
        ) : isLoading && !output ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">…</div>
        ) : showTable ? (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark">
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Character</th>
                <th className="px-3 py-2">Codepoint</th>
                <th className="px-3 py-2">Hex</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Block</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">UTF-8 Bytes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: UnicodeChar, i: number) => (
                <tr
                  key={`${i}-${row.codepoint}`}
                  className="border-b border-border-light/80 dark:border-border-dark/80"
                >
                  <td
                    className={`px-3 py-2 font-mono text-lg ${
                      row.category === "Control"
                        ? "text-slate-400 italic dark:text-slate-500"
                        : ""
                    }`}
                  >
                    {row.char === " " ? "␠" : row.char}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">
                    {row.codepoint}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">
                    {row.hex}
                  </td>
                  <td className="max-w-[200px] px-3 py-2 text-slate-700 dark:text-slate-200">
                    {row.name}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{row.block}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{row.category}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {row.utf8Hex}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            No characters to show
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-border-light bg-panel-light px-4 py-2 text-xs text-slate-600 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400">
        {output && !output.error ? (
          <span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {output.totalChars.toLocaleString()}
            </span>{" "}
            characters ·{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {output.totalBytes.toLocaleString()}
            </span>{" "}
            UTF-8 bytes
          </span>
        ) : (
          <span>—</span>
        )}
      </footer>
    </div>
  );
}
